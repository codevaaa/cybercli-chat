import { chromium } from '../../backend/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Run after `npm run build` in frontend. No live auth, mail or AI calls are made.
const extension = fileURLToPath(new URL('../', import.meta.url))
const dist = fileURLToPath(new URL('../../frontend/dist/', import.meta.url))
const profile = await mkdtemp(path.join(tmpdir(), 'codeva-auth-browser-'))
const context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] })
context.setDefaultTimeout(20000)
const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker')
const id = new URL(worker.url()).host, origin = 'https://www.cybermindcli.info'
const user = { id: '12345678-1234-4234-9234-123456789012', aud: 'authenticated', role: 'authenticated', email: 'browser@example.test',
  app_metadata: { provider: 'google', providers: ['google'] }, user_metadata: { name: 'Browser fixture' }, created_at: new Date().toISOString() }
const expires = Math.floor(Date.now() / 1000) + 3600
const token = `header.${Buffer.from(JSON.stringify({ sub: user.id, exp: expires, aud: 'authenticated' })).toString('base64url')}.signature`
const session = { access_token: token, refresh_token: 'browser-refresh-fixture-value', token_type: 'bearer', expires_in: 3600, expires_at: expires, user }
let available = false, registryStatus = 200, syncs = 0, authorizeCalls = 0, resendCalls = 0
const errors = [], responses = []
context.on('response', response => { const url = new URL(response.url()); responses.push({ host: url.hostname, path: url.pathname, status: response.status(), type: response.request().resourceType() }) })
context.on('weberror', event => errors.push(event.error().stack || event.error().message))
await worker.evaluate(async ({ user }) => {
  await chrome.storage.local.set({ extensionSignedOut: false })
  globalThis.fetch = async () => Response.json({ user, plan: 'free' })
}, { user })
await context.route('**/api/v1/**', async route => {
  const url = new URL(route.request().url())
  if (url.pathname.endsWith('/auth/health')) return route.fulfill({ status: available ? 200 : 503, json: available ? { ready: true } : { ready: false, message: 'Authentication project needs to be restored. Please try again shortly.' } })
  if (url.pathname.endsWith('/auth/sync')) {
    syncs++
    assert.equal(route.request().headers().authorization, `Bearer ${token}`)
    assert.equal(route.request().postDataJSON().platform, 'extension')
    return route.fulfill({ status: registryStatus, json: registryStatus === 200 ? { banned: false, status: 'active', plan: 'free' } : { error: 'Registry temporarily unavailable. Please retry.' } })
  }
  if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { user, plan: 'free' } })
  return route.fulfill({ json: { models: [], threads: [], data: [] } })
})
await context.route('**/auth/v1/**', async route => {
  const url = new URL(route.request().url())
  if (url.pathname.endsWith('/authorize')) {
    authorizeCalls++
    const callback = new URL(url.searchParams.get('redirect_to'))
    assert.equal(callback.searchParams.get('from'), 'extension')
    assert.ok(url.searchParams.get('code_challenge'))
    callback.searchParams.set('code', `browser-code-${authorizeCalls}`)
    // A fresh navigation keeps the callback under local interception; Chromium
    // follows a fulfilled HTTP redirect before attaching the next route hook.
    return route.fulfill({ contentType: 'text/html', body: `<script>location.replace(${JSON.stringify(callback.href)})</script>` })
  }
  if (url.pathname.endsWith('/token')) {
    assert.equal(url.searchParams.get('grant_type'), 'pkce')
    assert.ok(route.request().postDataJSON().code_verifier)
    return route.fulfill({ json: session })
  }
  if (url.pathname.endsWith('/user')) return route.fulfill({ json: user })
  if (url.pathname.endsWith('/signup')) return route.fulfill({ json: { ...user, identities: [{ id: user.id }] } })
  if (url.pathname.endsWith('/resend')) { resendCalls++; assert.ok(route.request().url().includes('from%3Dextension')); return route.fulfill({ json: {} }) }
  return route.fulfill({ json: {} })
})
await context.route(`${origin}/**`, async route => {
  const url = new URL(route.request().url())
  const asset = /\.[a-z0-9]{1,8}$/i.test(url.pathname)
  const target = asset ? path.resolve(dist, `.${decodeURIComponent(url.pathname)}`) : path.join(dist, 'index.html')
  if (!target.startsWith(path.resolve(dist) + path.sep)) return route.abort()
  try {
    const contentType = target.endsWith('.js') ? 'application/javascript' : target.endsWith('.css') ? 'text/css' : target.endsWith('.svg') ? 'image/svg+xml' : target.endsWith('.png') ? 'image/png' : 'text/html'
    await route.fulfill({ contentType, body: await readFile(target) })
  } catch { await route.fulfill({ status: 404, body: '' }) }
})
try {
  const panel = await context.newPage(); await panel.goto(`chrome-extension://${id}/src/sidepanel/sidepanel.html`)
  const website = await context.newPage(); await website.goto(`${origin}/auth/login?from=extension`)
  await website.getByRole('button', { name: 'Essential Only' }).click()
  await website.getByRole('button', { name: 'Continue with Google' }).click()
  await website.getByText('Authentication project needs to be restored.', { exact: false }).waitFor()
  assert.equal(authorizeCalls, 0)
  available = true
  await website.getByRole('button', { name: 'Continue with Google' }).click()
  await website.getByRole('heading', { name: 'Your workspace is ready.' }).waitFor().catch(async error => {
    console.error(JSON.stringify({ path: new URL(website.url()).pathname, text: (await website.locator('body').innerText()).slice(-2500), syncs, errors, responses: responses.slice(-20) }))
    throw error
  })
  assert.equal(syncs, 1); assert.equal(authorizeCalls, 1)
  assert.equal(new URL(website.url()).pathname, '/auth/extension')
  assert.equal(await website.evaluate(() => localStorage.getItem('codeva-account-ready')), 'true')
  await panel.locator('#sp-chat-view:not([hidden])').waitFor()
  assert.equal(await worker.evaluate(() => chrome.storage.local.get('authRefreshToken').then(value => value.authRefreshToken)), session.refresh_token)
  await website.evaluate(() => { const consent = localStorage.getItem('cookie-consent'); localStorage.clear(); localStorage.setItem('cookie-consent', consent) })
  await website.goto(`${origin}/auth/signup?from=extension`)
  await website.locator('#fullName').fill('Browser fixture'); await website.locator('#email').fill(user.email)
  await website.locator('#password').fill('Strong-fixture-pass1!'); await website.locator('#confirmPassword').fill('Strong-fixture-pass1!')
  await website.locator('#agree-checkbox').check(); await website.getByRole('button', { name: 'Create account' }).click()
  await website.waitForURL('**/auth/verify-email?from=extension')
  assert.ok((await website.locator('body').innerText()).includes(user.email))
  await website.getByRole('button', { name: /Resend/ }).click()
  await website.getByText('Verification email resent', { exact: false }).waitFor()
  assert.equal(resendCalls, 1)
  registryStatus = 503
  await website.evaluate(() => { const consent = localStorage.getItem('cookie-consent'); localStorage.clear(); localStorage.setItem('cookie-consent', consent) }); await website.goto(`${origin}/auth/login?from=extension`)
  await website.getByRole('button', { name: 'Continue with Google' }).click()
  await website.getByText('Registry temporarily unavailable.', { exact: false }).waitFor()
  assert.equal(await website.evaluate(() => localStorage.getItem('codeva-account-ready')), 'false')
  assert.equal(await worker.evaluate(() => chrome.storage.local.get('authToken').then(value => value.authToken)), undefined)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: true, checks: ['built React website with real MV3 extension', 'outage preflight', 'Google PKCE callback', 'single registry provisioning', 'extension acknowledgement and rotated credential capture', 'signup email and extension context', 'verification resend', 'registry outage preserves website session without false extension success'] }))
} finally {
  await context.close()
  const absoluteProfile = path.resolve(profile)
  if (absoluteProfile.startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(absoluteProfile).startsWith('codeva-auth-browser-')) await rm(absoluteProfile, { recursive: true, force: true })
}
