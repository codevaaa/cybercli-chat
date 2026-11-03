import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertNoSecrets, fault } from './domain.js'
import { visualDiff } from './visual.js'
import { previewTestInput } from './gates.js'

const artifacts = fileURLToPath(new URL('../../../data/dossier-artifacts/', import.meta.url))
export const TEST_COMMAND = 'python /runtime/runtime.py test'
export const PREVIEW_CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'"
export function projectName(id) {
  if (!/^[a-f0-9]{24}$/.test(String(id))) throw fault('Invalid project id', 400)
  return `codeva-dossier-${id}`
}
export function previewPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x1f]/.test(value) || value.length > 1024) throw fault('Only relative preview paths are accepted', 400)
  return value
}
export function validateClick(value) {
  const click = { path: previewPath(value.path) }
  const key = value.button_label !== undefined ? 'button_label' : 'selector'
  if (value.button_label !== undefined && value.selector !== undefined || typeof value[key] !== 'string' || !value[key].trim() || value[key].length > 200 || /[\x00-\x1f]/.test(value[key])) throw fault('Choose a button label or one valid selector', 400)
  click[key] = value[key]
  assertNoSecrets(JSON.stringify(click))
  return click
}
export function validateFiles(files) {
  if (!Array.isArray(files) || !files.length || files.length > 30) throw fault('Builder must return 1–30 files', 422)
  let bytes = 0
  for (const file of files) {
    if (!file || typeof file.path !== 'string' || !/^[a-zA-Z0-9_/-]+\.(py|html|css|js|json|md)$/.test(file.path) || file.path.split('/').some(p => !p || p === '..') || file.path.startsWith('/') || file.path.length > 180 || typeof file.content !== 'string') throw fault('Invalid generated file', 422)
    bytes += Buffer.byteLength(file.content)
    assertNoSecrets(file.content)
  }
  if (bytes > 200000 || new Set(files.map(f => f.path)).size !== files.length) throw fault('Generated files exceed limits or repeat paths', 422)
}
export class DockerSandbox {
  constructor({ execute = execFile, launchBrowser = async () => (await import('playwright')).chromium.launch({ headless: true }) } = {}) { Object.assign(this, { execute, launchBrowser }) }
  async docker(args, input = '', timeout = 30000) {
    return new Promise((resolve, reject) => {
      const child = this.execute('docker', args, { windowsHide: true, timeout, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) return reject(fault(error.code === 'ENOENT' ? 'DOCKER_UNAVAILABLE: install Docker on the sandbox host' : `Sandbox command failed (${error.code ?? 'timeout'})`, 503))
        resolve(stdout.trim())
      })
      child.stdin?.on('error', () => {})
      child.stdin?.end(input)
    })
  }
  async control(id, action, payload = {}) {
    const output = await this.docker(['exec', '-i', projectName(id), 'python', '/runtime/runtime.py', action], JSON.stringify(payload))
    const value = JSON.parse(output)
    if (value.exit_code && !['test', 'security', 'perf', 'resilience', 'contract'].includes(action)) throw fault('Sandbox operation failed', 422)
    return value
  }
  async ensure(id) {
    const name = projectName(id)
    const image = 'codeva-dossier-python:3.12.8-2'
    const existing = await this.docker(['ps', '-a', '--filter', `name=^/${name}$`, '--format', '{{.Names}}'])
    if (!existing) {
      await this.docker(['image', 'inspect', image]) // Never pull floating images during a task.
      // Named volume keeps model-written symlinks and code off the host filesystem.
      await this.docker(['volume', 'create', `${name}-data`])
      await this.docker(['run', '-d', '--name', name, '--network', 'none', '--cpus', '1', '--memory', '256m', '--memory-swap', '256m', '--pids-limit', '64',
        '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only', '--tmpfs', '/tmp:rw,noexec,nosuid,size=32m',
        '--mount', `type=volume,source=${name}-data,target=/workspace`, '--user', '0:0', image])
    } else {
      const config = JSON.parse(await this.docker(['inspect', name]))[0]
      const h = config.HostConfig
      if (!['codeva-dossier-python:3.12.8-1', image].includes(config.Config.Image) || h.NetworkMode !== 'none' || h.Memory !== 268435456 || h.MemorySwap !== 268435456 || h.NanoCpus !== 1000000000 || h.PidsLimit !== 64 || !h.ReadonlyRootfs || h.Privileged || !h.CapDrop?.includes('ALL') || !h.SecurityOpt?.some(s => /^no-new-privileges(?::true)?$/.test(s)) || h.Binds?.length || h.Devices?.length || h.PortBindings && Object.keys(h.PortBindings).length || config.Mounts?.length !== 1 || config.Mounts[0].Type !== 'volume' || config.Mounts[0].Name !== `${name}-data` || config.Mounts[0].Destination !== '/workspace') throw fault('Container isolation does not match dossier policy', 503)
      if (!config.State.Running) await this.docker(['start', name])
    }
    for (let retry = 0; retry < 20; retry++) {
      try { const r = await this.request(id, { path: '/health' }); if (r.status === 200) return } catch { /* boot in progress */ }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw fault('Preview did not boot', 503)
  }
  async write(id, files) { validateFiles(files); return this.control(id, 'write', { files }) }
  async contract(id, files) { validateFiles(files); return this.control(id, 'contract', { files }) }
  async read(id) { return this.control(id, 'read') }
  async search(id, query) {
    if (typeof query !== 'string' || !query || query.length > 100) throw fault('Bounded search text required', 400)
    const files = await this.read(id)
    return files.flatMap(f => f.content.split('\n').flatMap((text, index) => text.includes(query) ? [{ path: f.path, line: index + 1, text: text.slice(0, 500) }] : [])).slice(0, 100)
  }
  async compare(before, after) {
    const result = visualDiff(await this.artifact(before), await this.artifact(after))
    const name = `${randomUUID()}.png`
    await fs.writeFile(path.join(artifacts, name), result.png)
    return { previous_screenshot: before, current_screenshot: after, ratio: result.ratio, changed_pixels: result.changed_pixels, screenshot: name, path: `dossier-artifacts/${name}` }
  }
  async test(id, command = TEST_COMMAND) {
    if (command !== TEST_COMMAND) throw fault('Tester command is not allowlisted', 400)
    // Exit status is evidence; no model-provided "passed" field is consumed.
    try { return await this.control(id, 'test') } catch (error) { return { exit_code: 1, output: error.message, tests: [] } }
  }
  async request(id, request) {
    previewPath(request.path || '/')
    if (!['GET', 'POST'].includes(request.method || 'GET')) throw fault('Preview method is not allowed', 400)
    if (Buffer.byteLength(request.body || '') > 65536) throw fault('Preview request too large', 413)
    return this.control(id, 'request', request)
  }
  async snapshot(id) { return this.control(id, 'snapshot') }
  async health(id) { const r = await this.request(id, { path: '/health' }); return { exit_code: r.status === 200 ? 0 : 1, tests: ['preview_health'], status: r.status } }
  async logs(id) { return { output: (await this.docker(['logs', '--tail', '50', projectName(id)])).slice(-16000) } }
  async migrate(id, down = false) { return this.control(id, 'migrate', { down }) }
  async security(id, input = {}) { previewTestInput(input); return this.control(id, 'security') }
  async perf(id, budget_ms) {
    if (!Number.isFinite(budget_ms) || budget_ms <= 0 || budget_ms > 60000) throw fault('Performance budget must be between 0 and 60000ms', 400)
    return this.control(id, 'perf', { budget_ms })
  }
  async resilience(id) {
    const snapshot = await this.snapshot(id)
    try {
      await this.docker(['kill', projectName(id)])
      await this.ensure(id)
      const recovered = await this.browser(id)
      const cases = await this.control(id, 'resilience')
      return { ...cases, screenshot: recovered.screenshot, tests: ['process_kill_recovery', ...cases.tests] }
    } finally { await this.restore(id, snapshot) }
  }
  async restore(id, snapshot) {
    await this.docker(['stop', projectName(id)])
    // Restart then restore only while the preview is gated off at the API.
    await this.docker(['start', projectName(id)])
    await this.control(id, 'restore', snapshot)
    await this.docker(['restart', projectName(id)])
    await this.ensure(id)
  }
  async browser(id, click, language = 'en') {
    if (!['en', 'hi'].includes(language)) throw fault('Preview language must be English or Hindi', 400)
    const browser = await this.launchBrowser()
    try {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' })
      await context.routeWebSocket('**/*', socket => socket.close())
      await context.addInitScript(() => {
        for (const name of ['RTCPeerConnection', 'webkitRTCPeerConnection']) Object.defineProperty(window, name, { value: undefined, configurable: false, writable: false })
      })
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url())
        if (url.origin !== 'http://codeva-preview.invalid' || !['GET', 'POST'].includes(request.method())) return route.abort()
        try {
          const result = await this.request(id, { path: url.pathname + url.search, method: request.method(), body: request.postData() || '', headers: request.headers() })
          const headers = Object.fromEntries(Object.entries(result.headers).filter(([key]) => !['content-length', 'transfer-encoding', 'connection'].includes(key.toLowerCase())))
          headers['Content-Security-Policy'] = PREVIEW_CSP
          await route.fulfill({ status: result.status, headers, body: Buffer.from(result.body_base64, 'base64') })
        } catch { await route.abort() }
      })
      const page = await context.newPage()
      await page.goto('http://codeva-preview.invalid/')
      await page.getByLabel('User', { exact: true }).fill('sample-a')
      await page.getByLabel('Password', { exact: true }).fill('Demo-2026!')
      await page.getByRole('button', { name: 'Log in', exact: true }).click()
      await page.waitForFunction(() => !document.querySelector('#login'))
      if ((await page.goto('http://codeva-preview.invalid/')).status() !== 200) throw fault('Preview failed to render after login', 422)
      if (language === 'hi') await page.getByLabel('Language', { exact: true }).selectOption('hi')
      if (click) {
        click = validateClick(click)
        if ((await page.goto(`http://codeva-preview.invalid${click.path}`)).status() !== 200) throw fault('Click page failed to render', 422)
        if (click.button_label) await page.getByRole('button', { name: click.button_label, exact: true }).click({ timeout: 5000 })
        else await page.locator(click.selector).click({ timeout: 5000 })
      }
      const html = await page.content()
      assertNoSecrets(html)
      const text = (await page.locator('body').innerText()).slice(0, 12000)
      if (text.trim().length < 5) throw fault('Empty preview screen', 422)
      const screenshot = `${randomUUID()}.png`
      await fs.mkdir(artifacts, { recursive: true })
      await page.screenshot({ path: path.join(artifacts, screenshot), fullPage: false })
      return { screenshot, screenshot_path: `dossier-artifacts/${screenshot}`, title: await page.title(), text, click: click || null, language }
    } finally { await browser.close() }
  }
  async artifact(name) {
    if (!/^[a-f0-9-]{36}\.png$/.test(name)) throw fault('Artifact not found', 404)
    return fs.readFile(path.join(artifacts, name))
  }
  async remove(id, names = []) {
    const container = projectName(id)
    if (await this.docker(['ps', '-a', '--filter', `name=^/${container}$`, '--format', '{{.Names}}'])) await this.docker(['rm', '-f', container])
    if (await this.docker(['volume', 'ls', '--filter', `name=^${container}-data$`, '--format', '{{.Name}}'])) await this.docker(['volume', 'rm', `${container}-data`])
    for (const name of new Set(names.filter(n => /^[a-f0-9-]{36}\.png$/.test(n)))) await fs.unlink(path.join(artifacts, name)).catch(error => { if (error.code !== 'ENOENT') throw error })
    return { removed: true }
  }
}
