// Exercise the installed Electron workbench, not an extension-development host.
// Run after the current-user setup. Never treats a fixture account as live auth.
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { IDE_PRODUCT_NAME, IDE_PRODUCTION_API } from '../../shared/editor-release.mjs'
const root = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(path.join(root, 'backend/package.json'))
const { _electron: electron } = require('playwright')
const appDir = process.env.CODEVA_EDITOR_INSTALL_DIR || path.join(process.env.LOCALAPPDATA, 'Programs', IDE_PRODUCT_NAME)
const executablePath = path.join(appDir, `${IDE_PRODUCT_NAME}.exe`)
const evidenceDir = path.join(root, 'artifacts/codeva-editor/installed-smoke')
await fs.mkdir(evidenceDir, { recursive: true })
const product = JSON.parse(await fs.readFile(path.join(appDir, 'resources/app/product.json'), 'utf8'))
const release = JSON.parse(await fs.readFile(path.join(root, 'artifacts/codeva-editor/release-win32.json'), 'utf8'))
assert.equal(product.commit, release.release_id, 'Install the current release before checking its UI')
const manifest = JSON.parse(await fs.readFile(path.join(appDir, 'resources/app/extensions/codeva-studio/package.json'), 'utf8'))
assert.equal(product.nameLong, IDE_PRODUCT_NAME)
assert.equal(manifest.contributes.configuration.properties['codeva.apiBaseUrl'].default, IDE_PRODUCTION_API)
const profile = await fs.mkdtemp(path.join(evidenceDir, 'profile-'))
await fs.mkdir(path.join(profile, 'User'))
await fs.writeFile(path.join(profile, 'User/settings.json'), JSON.stringify({ 'window.titleBarStyle': 'custom' }))
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE
let app
try {
  app = await electron.launch({ executablePath, cwd: profile, args: ['--user-data-dir', profile, '--extensions-dir', path.join(profile, 'extensions'), '--skip-welcome', '--skip-release-notes', '--new-window'], env, timeout: 90000 })
  const window = await app.firstWindow()
  await window.locator('.monaco-workbench').waitFor({ timeout: 90000 })
  await window.waitForFunction(() => document.title.includes('MrCodevaa'), { timeout: 30000 })
  const title = await window.title()
  assert.ok(title.includes(IDE_PRODUCT_NAME))
  await window.getByText('Tell MrCodevaa what to build.', { exact: true }).waitFor({ state: 'visible', timeout: 15000 })
  const palette = await window.locator('.monaco-workbench').evaluate(element => {
    const style = getComputedStyle(element);
    return { button: style.getPropertyValue('--vscode-button-background').trim(), focus: style.getPropertyValue('--vscode-focusBorder').trim(), editor: style.getPropertyValue('--vscode-editor-background').trim() };
  })
  assert.equal(palette.button.toLowerCase(), '#c4622d')
  assert.equal(palette.focus.toLowerCase(), '#c4622d')
  assert.equal(palette.editor.toLowerCase(), '#0b0c0f')
  await window.screenshot({ path: path.join(evidenceDir, 'empty-window.png') })
  // Use the native command palette. No mocked workbench APIs supply About text.
  await window.keyboard.press('Control+Shift+P')
  const input = window.locator('.quick-input-box input')
  await input.fill('>Help: About')
  await window.locator('.quick-input-list .monaco-list-row').filter({ hasText: 'Help: About' }).first().click({ timeout: 30000 })
  const about = window.locator('.monaco-dialog-box')
  await about.waitFor({ timeout: 15000 })
  const aboutText = await about.innerText()
  assert.ok(aboutText.includes(IDE_PRODUCT_NAME))
  assert.ok(!/Visual Studio Code|Cursor|GitHub Copilot|@github\/copilot/i.test(title + aboutText))
  assert.ok(aboutText.includes('1.139.0'))
  await window.screenshot({ path: path.join(evidenceDir, 'about.png') })
  await window.keyboard.press('Escape')
  await window.keyboard.press('Control+Shift+P')
  await input.fill('>MrCodevaa: Account and Settings')
  await input.press('Enter')
  await window.locator('iframe.webview').waitFor({ timeout: 30000 })
  await window.screenshot({ path: path.join(evidenceDir, 'sidebar.png') })
  const main = await app.evaluate(({ app }) => ({ executable: process.execPath, argv: process.argv, name: app.getName() }))
  assert.equal(path.resolve(main.executable).toLowerCase(), path.resolve(executablePath).toLowerCase())
  assert.ok(!main.argv.some(argument => argument.includes('--extensionDevelopmentPath')))
  const evidence = { installed_executable: executablePath, product_name: product.nameLong, api_default: IDE_PRODUCTION_API, release_id: product.commit, title, about: aboutText, main, executed_at: new Date().toISOString(), live_account_project_test: 'NOT RUN: an existing non-production account/session is required', clean_windows_account: 'NOT RUN: current Windows user, isolated new app profile only' }
  await fs.writeFile(path.join(evidenceDir, 'native.json'), JSON.stringify(evidence, null, 2) + '\n')
  console.log(JSON.stringify(evidence))
} finally { await app?.close() }
