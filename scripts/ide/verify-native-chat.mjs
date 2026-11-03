// Installed workbench UI only. No account or provider is mocked by this check.
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../../', import.meta.url))
const { _electron: electron } = createRequire(path.join(root, 'backend/package.json'))('playwright')
const output = path.join(root, 'artifacts/codeva-editor/native-chat')
await fs.mkdir(output, { recursive: true })
const profile = await fs.mkdtemp(path.join(output, 'profile-'))
const executablePath = path.join(process.env.CODEVA_EDITOR_INSTALL_DIR || path.join(process.env.LOCALAPPDATA, 'Programs/MrCodevaa'), 'MrCodevaa.exe')
const product = JSON.parse(await fs.readFile(path.join(path.dirname(executablePath), 'resources/app/product.json'), 'utf8'))
const release = JSON.parse(await fs.readFile(path.join(root, 'artifacts/codeva-editor/release-win32.json'), 'utf8'))
assert.equal(product.commit, release.release_id, 'Install the current release before checking its UI')
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE
let app, window
const evidence = { scope: 'Actual installed editor, fresh signed-out profile. No authenticated response or production login certified.', release_id: product.commit, executed_at: new Date().toISOString() }
try {
  app = await electron.launch({ executablePath, cwd: profile, args: ['--user-data-dir', profile, '--extensions-dir', path.join(profile, 'extensions'), '--skip-release-notes', '--new-window'], env, timeout: 90000 })
  window = await app.firstWindow()
  await window.locator('.monaco-workbench').waitFor({ timeout: 90000 })
  const command = async title => {
    const shellInput = window.locator('.xterm-helper-textarea').last()
    if (await shellInput.count()) await shellInput.focus()
    else await window.locator('.interactive-input-part .monaco-editor').last().click()
    await window.keyboard.press('Control+Shift+P')
    await window.locator('.quick-input-box input').fill('>'+title)
    await window.locator('.quick-input-list .monaco-list-row').filter({ hasText: title }).first().click({ timeout: 30000 })
  }
  await window.getByText('Open MrCodevaa Chat...', { exact: true }).waitFor({ timeout: 30000 })
  for (const label of ['New File...', 'Open Folder...', 'Clone Git Repository...']) assert.ok(await window.getByText(label, { exact: true }).first().isVisible())
  await window.screenshot({ path: path.join(output, 'welcome.png') })
  evidence.welcome = 'PASS: native Start/Recent and Codeva actions'
  await window.getByText('Open MrCodevaa Chat...', { exact: true }).click()
  const input = window.locator('.interactive-input-part .monaco-editor').last()
  await input.waitFor({ timeout: 30000 })
  const welcomeMark = await window.locator('.chat-welcome-view-container .codicon-chat-sparkle').last().evaluate(element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height, image: getComputedStyle(element).backgroundImage }))
  assert.ok(welcomeMark.width >= 32 && welcomeMark.height >= 32 && welcomeMark.image.includes('data:image/svg+xml;base64,'), 'Prism M must be visible in Chat, not collapsed after hiding the vendor glyph')
  await window.screenshot({ path: path.join(output, 'chat.png') })
  const text = await window.locator('body').innerText()
  await fs.writeFile(path.join(output, 'signed-out-ui.txt'), text)
  assert.ok(text.includes('Sign in to Codeva...'), 'Native Welcome must use the existing Codeva login')
  assert.ok(text.includes('Open MrCodevaa Projects'), 'Native project action must be branded')
  assert.ok(text.includes('Open Codeva Projects'), 'The walkthrough must open the Codeva project flow')
  assert.ok(!/Sign in to (?:GitHub|use Copilot)|Get started with (?:GitHub )?Copilot|Try out the new Agents window|Open Agents Window|MrCodevaa: Open Agents/.test(text), 'Vendor setup and Agents labels must not replace Codeva chat')
  await input.click()
  await window.keyboard.type('Explain this editor.')
  await window.keyboard.press('Enter')
  await window.getByText('Sign in on the Codeva website first', { exact: false }).first().waitFor({ timeout: 30000 })
  await window.screenshot({ path: path.join(output, 'account-required.png') })
  evidence.native_participant = 'PASS: real Chat routes to bundled Codeva participant and requires existing account'
  const controls = await window.locator('.titlebar [aria-label]').evaluateAll(elements => elements.map(element => ({ label: element.getAttribute('aria-label'), title: element.getAttribute('title') })))
  await fs.writeFile(path.join(output, 'titlebar-controls.json'), JSON.stringify(controls, null, 2))
  await window.locator('.titlebar [aria-label="MrCodevaa Preferences"]').click()
  const sidebar = await (async () => {
    for (let attempt = 0; attempt < 100; attempt++) {
      for (const frame of window.frames()) if (await frame.locator('#app .settings-panel').count().catch(() => 0)) return frame
      await window.waitForTimeout(100)
    }
    throw new Error('Codeva sidebar did not become ready')
  })()
  await sidebar.locator('.settings-panel').waitFor({ state: 'visible' })
  await sidebar.getByLabel('Response style', { exact: true }).selectOption('detailed')
  await sidebar.getByLabel('Response language', { exact: true }).selectOption('hi')
  let stored
  for (let attempt = 0; attempt < 100; attempt++) {
    stored = JSON.parse(await fs.readFile(path.join(profile, 'User/settings.json'), 'utf8').catch(() => '{}'))
    if (stored['codeva.chat.responseStyle'] === 'detailed' && stored['codeva.chat.responseLanguage'] === 'hi') break
    await window.waitForTimeout(100)
  }
  assert.equal(stored['codeva.chat.responseStyle'], 'detailed')
  assert.equal(stored['codeva.chat.responseLanguage'], 'hi')
  await window.screenshot({ path: path.join(output, 'preferences.png') })
  await window.locator('.titlebar [aria-label="Codeva Account"]').click()
  await sidebar.getByRole('button', { name: 'Sign in to Codeva', exact: true }).waitFor({ state: 'visible' })
  assert.equal(await sidebar.locator('.brand-mark').getAttribute('alt'), 'Prism M')
  assert.equal(await window.locator('.activitybar .global-activity-actionbar').count(), 0)
  evidence.account_preferences = 'PASS: title-bar controls open the ready sidebar; real settings persist style/language; bottom account/settings controls moved'
  await command('Terminal: Create New Terminal')
  const terminal = window.locator('.xterm-helper-textarea').last()
  await terminal.waitFor({ state: 'attached', timeout: 30000 })
  await window.getByText('Select terminal output, then', { exact: false }).first().waitFor({ timeout: 15000 })
  const terminalText = await window.locator('body').innerText()
  assert.ok(!terminalText.includes('Type copilot to use Copilot CLI.'), 'Terminal onboarding must not invoke the excluded vendor CLI')
  assert.ok(terminalText.includes('ask MrCodevaa'), 'The terminal hint must point at the working Codeva action')
  await terminal.focus()
  await window.keyboard.type("Write-Output 'Codeva terminal integration check'")
  await window.keyboard.press('Enter')
  // Wait for the actual shell output before asking the extension to read a selection.
  await window.waitForTimeout(2000)
  await command('Terminal: Select All')
  await command('MrCodevaa: Explain Selected Terminal Output')
  await window.locator('.interactive-input-part .monaco-editor .view-lines').last().getByText('Codeva terminal integration check', { exact: false }).first().waitFor({ timeout: 15000 })
  await window.screenshot({ path: path.join(output, 'terminal-draft.png') })
  evidence.terminal_assistance = 'PASS: real terminal selection opens a reviewable chat draft without automatic submission or execution'
  const logs = []
  async function collectLogs(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true }).catch(() => [])) {
      const filename = path.join(directory, entry.name)
      if (entry.isDirectory()) await collectLogs(filename)
      else if (entry.name.endsWith('.log')) logs.push(await fs.readFile(filename, 'utf8').catch(() => ''))
    }
  }
  await collectLogs(path.join(profile, 'logs'))
  assert.ok(!logs.some(value => /GitHub\.copilot-chat/i.test(value)), 'Copilot Chat must not auto-install or activate in a fresh MrCodevaa profile')
  evidence.no_copilot_autoinstall = 'PASS: fresh extension host logs contain no GitHub.copilot-chat activation'
  evidence.result = 'PASS'
  console.log(JSON.stringify(evidence))
} catch (error) {
  evidence.result = 'FAIL'; evidence.error = error.message
  if (window) { await window.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {}); await fs.writeFile(path.join(output, 'failure-ui.txt'), await window.locator('body').innerText()).catch(() => {}) }
  console.error(error.message); process.exitCode = 1
} finally { await fs.writeFile(path.join(output, 'evidence.json'), JSON.stringify(evidence, null, 2)+'\n'); await app?.close() }
