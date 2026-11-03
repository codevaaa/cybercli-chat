import { chromium } from '../../backend/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const extension = fileURLToPath(new URL('../', import.meta.url))
const profile = await mkdtemp(path.join(tmpdir(), 'codeva-extension-'))
const screenshots = fileURLToPath(new URL('../../artifacts/extension/', import.meta.url))
await mkdir(screenshots, { recursive: true })
const context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`], viewport: { width: 400, height: 850 } })
context.setDefaultTimeout(15000)
let worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker')
const id = new URL(worker.url()).host, errors = [], requests = []
context.on('weberror', error => errors.push(error.error().message))
const token = `header.${btoa(JSON.stringify({ sub: 'browser-fixture' }))}.signature`
await worker.evaluate(async ({ token }) => {
  await chrome.storage.local.set({ extensionSignedOut: true, settings: { theme: 'system', smartCompose: false } })
  globalThis.grammarCalls = 0
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/me')) return Response.json({ user: { id: 'browser-fixture' }, plan: 'pro' })
    if (!url.endsWith('/grammar')) return new Response(JSON.stringify({ content: 'Polished selected text.' }), { headers: { 'Content-Type': 'application/json' } })
    globalThis.grammarCalls++
    const text = JSON.parse(options?.body || '{}').text || ''
    if (text.includes('slow')) await new Promise(resolve => setTimeout(resolve, 1500))
    return new Response(JSON.stringify({ language: 'English', tone: 'neutral', issues: text.includes('teh') ? [{ original: 'teh', suggestion: 'the', type: 'spelling', start: text.indexOf('teh'), reason: 'Spelling' }] : [] }), { headers: { 'Content-Type': 'application/json' } })
  }
}, { token })
await context.route('https://cybercli-api.onrender.com/**', async route => {
  const url = route.request().url()
  if (url.endsWith('/auth/me')) return route.fulfill({ json: { user: { id: 'browser-fixture' }, plan: 'pro' } })
  if (url.endsWith('/models')) return route.fulfill({ json: { models: [{ id: 'fixture-model', name: 'Server model', free: true }] } })
  const body = route.request().postDataJSON(); requests.push(body)
  if (url.endsWith('/rewrite')) return route.fulfill({ json: { original: body.text, rewritten: 'Hello Codevaa, thank you for your help.', mode: body.mode } })
  if (url.endsWith('/grammar') && body.text.includes('Codevaa')) return route.fulfill({ json: { language: 'English', tone: 'neutral', issues: [{ original: 'Codevaa', suggestion: 'Codeva', start: body.text.indexOf('Codevaa'), type: 'spelling', reason: 'Fixture spelling' }] } })
  if (url.endsWith('/grammar')) return route.fulfill({ json: { language: 'English', tone: 'neutral', issues: [{ original: 'teh', suggestion: 'the', start: body.text.indexOf('teh'), type: 'spelling', reason: 'Spelling' }] } })
  if (body.messages.at(-1).content === 'Queued first') {
    await worker.evaluate(async () => {
      await chrome.storage.local.set({ pendingPrompt: 'Queued second', pendingAt: Date.now() })
    })
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return route.fulfill({ contentType: 'text/event-stream', body: 'data: {"type":"token","content":"## A useful answer\\n\\nGrounded in the source."}\n\ndata: [DONE]\n\n' })
})
await context.route(/https:\/\/(www\.)?cybermindcli\.info\//, route => route.fulfill({ contentType: 'text/html', body: `<html><body><p id="handoff">Waiting</p><script>
localStorage.setItem('sb-access-token', ${JSON.stringify(token)});
localStorage.setItem('codeva-account-ready', 'true');
localStorage.setItem('sb-fixture-auth-token', JSON.stringify({access_token:${JSON.stringify(token)},refresh_token:'browser-refresh-fixture',expires_at:9999999999}));
window.addEventListener('message', event => {if(event.data?.type==='CODEVA_EXTENSION_AUTH_RESULT' && event.data.requestId==='handoff-fixture') document.getElementById('handoff').textContent=event.data.ok?'Connected':event.data.error;});
</script></body></html>` }))
await context.route('https://codeva-fixture.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body><main><h1>Browser fixture article</h1><p>The project launch is scheduled for November 12. The budget is 400 units.</p></main><textarea id="draft" style="width:300px;height:120px"></textarea><textarea id="second" style="width:300px;height:80px"></textarea><div id="rich" contenteditable="true" style="width:300px;min-height:100px"><b>teh</b> team</div><input id="password" type="password"></body></html>' }))
try {
  const source = await context.newPage(); await source.goto('https://codeva-fixture.test/article')
  const panel = await context.newPage(); await panel.goto(`chrome-extension://${id}/src/sidepanel/sidepanel.html`)
  await panel.locator('#sp-auth:not([hidden])').waitFor()
  const opened = context.waitForEvent('page'); await panel.locator('#sp-signin').click()
  const website = await opened; await website.waitForURL(/https:\/\/(www\.)?cybermindcli\.info\//)
  // Extension-created tabs can begin navigating before Playwright attaches its
  // routing session. Reload once under interception before testing the bridge.
  await website.reload()
  await website.locator('#handoff').waitFor()
  await website.waitForFunction(() => document.documentElement.dataset.codevaTheme)
  await website.evaluate(() => window.postMessage({ type: 'CODEVA_EXTENSION_REQUEST_SYNC', requestId: 'handoff-fixture' }, location.origin))
  await website.waitForFunction(() => document.querySelector('#handoff')?.textContent === 'Connected')
  assert.equal(await worker.evaluate(() => chrome.storage.local.get('authRefreshToken').then(r => r.authRefreshToken)), 'browser-refresh-fixture')
  await panel.locator('#sp-chat-view:not([hidden])').waitFor()
  await panel.waitForFunction(() => document.querySelector('#sp-status').textContent.includes('Connected'))
  await panel.evaluate(async () => {
    const query = chrome.tabs.query.bind(chrome.tabs)
    chrome.tabs.query = async options => options.active ? (await query({})).filter(tab => tab.url.startsWith('https://codeva-fixture.test/')) : query(options)
  })
  assert.equal(await panel.locator('#sp-model option[value="fixture-model"]').count(), 1)
  await panel.screenshot({ path: path.join(screenshots, 'assistant-light.png') })
  await panel.locator('[data-action="summary"]').click()
  await panel.locator('.sp-msg.assistant .sp-bubble h2').waitFor()
  assert.ok(requests.at(-1).messages.at(-1).content.includes('budget is 400 units'))
  assert.ok(requests.at(-1).messages.at(-1).content.includes('https://codeva-fixture.test/article'))
  await panel.reload(); await panel.locator('.sp-msg.assistant .sp-bubble h2').waitFor()
  assert.equal(await panel.locator('.sp-msg.user').count(), 1)
  await panel.locator('[data-view="write"]').click(); await panel.locator('#sp-writing').fill('Hello teh team.')
  await panel.locator('#sp-check').click(); await panel.locator('[data-apply="0"]').waitFor()
  await panel.locator('[data-apply="0"]').click(); assert.equal(await panel.locator('#sp-writing').inputValue(), 'Hello the team.')
  await panel.locator('#sp-undo-writing').click(); assert.equal(await panel.locator('#sp-writing').inputValue(), 'Hello teh team.')
  await panel.locator('#sp-writing').fill('Hello Codevaa.'); await panel.locator('#sp-check').click(); await panel.locator('[data-learn="0"]').click()
  assert.ok((await worker.evaluate(() => chrome.storage.local.get('settings').then(r => r.settings.dictionary))).includes('Codevaa'))
  await panel.locator('#sp-check').click(); await panel.waitForFunction(() => !document.querySelector('#sp-check').disabled)
  assert.equal(await panel.locator('.issue').count(), 0); assert.ok(requests.at(-1).dictionary.includes('Codevaa'))
  await panel.locator('[data-rewrite="formal"]').click(); await panel.locator('#sp-rewrite-review:not([hidden])').waitFor()
  assert.equal(await panel.locator('#sp-writing').inputValue(), 'Hello Codevaa.')
  await panel.locator('#sp-rewrite-apply').click(); assert.equal(await panel.locator('#sp-writing').inputValue(), 'Hello Codevaa, thank you for your help.')
  await panel.locator('#sp-undo-writing').click(); assert.equal(await panel.locator('#sp-writing').inputValue(), 'Hello Codevaa.')
  await panel.locator('[data-rewrite="casual"]').click(); await panel.locator('#sp-rewrite-review:not([hidden])').waitFor()
  await panel.locator('#sp-writing').fill('My draft has changed.'); assert.equal(await panel.locator('#sp-rewrite-review').isVisible(), false)
  await panel.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  assert.equal(await panel.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(24, 25, 23)')
  assert.equal(await panel.locator('#sp-copy-draft').evaluate(button => getComputedStyle(button).backgroundColor), 'rgb(32, 33, 30)')
  await panel.locator('#sp-writing').fill('Hello teh team. Thank you for your help.')
  await panel.locator('#sp-check').click(); await panel.locator('[data-apply="0"]').waitFor()
  await panel.locator('#sp-write-view').evaluate(view => { view.scrollTop = 0 })
  await panel.screenshot({ path: path.join(screenshots, 'writing-dark.png') })
  await panel.setViewportSize({ width: 300, height: 720 }); assert.ok(await panel.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await panel.setViewportSize({ width: 400, height: 850 })
  await panel.locator('[data-view="history"]').click(); await panel.locator('.history-open').first().click()
  assert.equal(await panel.locator('.sp-msg.user').count(), 1)
  await worker.evaluate(() => chrome.storage.local.set({ pendingPrompt: 'Queued first', pendingAt: Date.now() }))
  await panel.waitForFunction(() => document.querySelectorAll('.sp-msg.assistant').length === 3 && document.querySelector('#sp-send').getAttribute('aria-label') === 'Send message')
  assert.equal(await panel.locator('.sp-msg.user').last().innerText(), 'You\nQueued second')
  await source.bringToFront(); await source.locator('#draft').fill('Hi teh team.')
  await source.locator('.cv-fab-issues').waitFor(); await source.locator('.cv-fab').click()
  await source.locator('.cv-apply').first().click(); assert.equal(await source.locator('#draft').inputValue(), 'Hi the team.')
  await source.locator('#draft').fill('slow teh result.'); await source.waitForTimeout(950)
  await source.locator('#second').fill('Everything looks correct.'); await source.waitForTimeout(1800)
  await source.locator('.cv-fab').click(); assert.ok(!(await source.locator('.cv-card').innerText()).includes('teh'))
  await source.locator('.cv-card-close').click()
  await source.locator('#rich').focus(); await source.locator('#rich').press('End'); await source.locator('#rich').press('Space')
  await source.locator('.cv-fab-issues').waitFor(); await source.locator('.cv-fab').click(); await source.locator('.cv-apply').first().click()
  assert.equal(await source.locator('#rich b').innerText(), 'the')
  assert.equal(await source.locator('#rich .cv-underline-overlay').count(), 0)
  const png = (await source.screenshot()).toString('base64'), captureId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  await worker.evaluate(async ({ png, captureId }) => {
    await chrome.storage.session.set({ [`capture:${captureId}`]: { viewportWidth: 400, totalHeight: 850, segments: [{ y: 0, dataUrl: `data:image/png;base64,${png}` }], title: 'Capture fixture', url: 'https://codeva-fixture.test/article' } })
  }, { png, captureId })
  const capture = await context.newPage(); await capture.goto(`chrome-extension://${id}/src/capture/capture.html?id=${captureId}`)
  await capture.locator('#download:not([hidden])').waitFor()
  assert.equal(await capture.locator('#canvas').evaluate(canvas => canvas.height), 850)
  assert.equal(await capture.locator('#download').getAttribute('download'), 'codeva-page.png')
  const options = await context.newPage(); await options.goto(`chrome-extension://${id}/src/options/options.html`)
  await options.locator('#disabled-sites').fill('codeva-fixture.test'); await options.locator('#save-sites').click()
  await source.waitForFunction(() => document.documentElement.dataset.codevaPaused === 'true')
  const previousCalls = await worker.evaluate(() => globalThis.grammarCalls)
  await source.locator('#draft').fill('teh paused draft.'); await source.waitForTimeout(1200)
  assert.equal(await worker.evaluate(() => globalThis.grammarCalls), previousCalls)
  await options.locator('#theme').selectOption('dark'); await options.locator('#grammar').uncheck()
  await options.waitForFunction(() => document.querySelector('#settings-status').textContent.includes('saved'))
  await options.reload(); assert.equal(await options.locator('#theme').inputValue(), 'dark'); assert.equal(await options.locator('#grammar').isChecked(), false)
  await options.screenshot({ path: path.join(screenshots, 'settings-dark.png'), fullPage: true })
  await options.locator('#sign-out').click(); await panel.locator('#sp-auth:not([hidden])').waitFor()
  assert.equal(await worker.evaluate(() => chrome.storage.local.get('authToken').then(r => r.authToken)), undefined)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: true, checks: ['real MV3 extension load', 'website session handoff', 'refresh credential capture', 'server catalog', 'page context', 'chat persistence', 'writing corrections', 'reviewed rewrite and undo', 'personal dictionary', 'website pause', 'system themes', '300px layout', 'history', 'queued actions', 'in-page grammar', 'stale responses', 'rich text preservation', 'capture preview and PNG', 'CSP-safe settings', 'sign out'], screenshots }))
} finally {
  await context.close()
  const absoluteProfile = path.resolve(profile), absoluteTemp = path.resolve(tmpdir()) + path.sep
  if (absoluteProfile.startsWith(absoluteTemp) && path.basename(absoluteProfile).startsWith('codeva-extension-')) await rm(absoluteProfile, { recursive: true, force: true })
}
