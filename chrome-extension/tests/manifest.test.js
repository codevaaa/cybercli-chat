import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
const root = new URL('../', import.meta.url)
test('all manifest entry points and the internal capture page exist', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'))
  const paths = [manifest.background.service_worker, manifest.side_panel.default_path, manifest.options_page,
    ...manifest.content_scripts.flatMap(entry => [...entry.js, ...entry.css]), ...Object.values(manifest.icons), 'src/capture/capture.html']
  await Promise.all(paths.map(file => access(new URL(file, root))))
  assert.ok(manifest.host_permissions.includes('https://www.cybermindcli.info/*'))
  assert.ok(!manifest.web_accessible_resources.some(entry => entry.resources.some(path => path.includes('capture'))))
})
test('extension surfaces have no inline JavaScript or event handlers blocked by MV3 CSP', async () => {
  for (const file of ['src/options/options.html', 'src/sidepanel/sidepanel.html', 'src/capture/capture.html']) {
    const html = await readFile(new URL(file, root), 'utf8')
    assert.ok(!/\son\w+\s*=/i.test(html), file)
    assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), file)
  }
})
