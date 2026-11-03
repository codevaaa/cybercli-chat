import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import readline from 'node:readline'
import fs from 'node:fs/promises'
import { DockerSandbox, previewPath } from './sandbox.js'

test('real Chromium logs into the owned fixture, records a PNG and replays the exact click without external requests', { timeout: 60000 }, async () => {
  const child = spawn('python', ['-u', new URL('./sandbox/browser_fixture.py', import.meta.url).pathname.replace(/^\/([A-Z]:)/i, '$1')], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
  const lines = readline.createInterface({ input: child.stdout }), iterator = lines[Symbol.asyncIterator]()
  let errors = ''; child.stderr.on('data', data => { errors += data })
  const closed = new Promise(resolve => child.once('exit', resolve))
  try {
    const ready = await iterator.next()
    assert.equal(JSON.parse(ready.value).ready, true, errors)
    const sandbox = new DockerSandbox(), paths = []
    sandbox.request = async (_id, payload) => {
      paths.push(previewPath(payload.path))
      child.stdin.write(JSON.stringify(payload) + '\n')
      const reply = await iterator.next()
      if (reply.done) throw new Error(errors || 'Trusted fixture stopped')
      return JSON.parse(reply.value)
    }
    const click = { path: '/', button_label: 'View notes' }
    const initial = await sandbox.browser('507f1f77bcf86cd799439011')
    assert.match(initial.text, /Owner notes/)
    assert.match(initial.text, /sample-a row 1/)
    assert.ok(!initial.text.includes('sample-b row'))
    const result = await sandbox.browser('507f1f77bcf86cd799439011', click)
    const replay = await sandbox.browser('507f1f77bcf86cd799439011', click)
    assert.match(result.text, /Notes opened/); assert.match(replay.text, /Notes opened/)
    assert.deepEqual(result.click, replay.click)
    const hindi = await sandbox.browser('507f1f77bcf86cd799439011', undefined, 'hi')
    assert.match(hindi.text, /मेरे नोट्स/)
    assert.match(hindi.text, /नोट्स देखें/)
    const comparison = await sandbox.compare(initial.screenshot, result.screenshot)
    assert.ok(comparison.ratio > 0)
    assert.equal((await sandbox.artifact(comparison.screenshot)).subarray(1, 4).toString(), 'PNG')
    assert.ok(paths.every(p => p === '/' || p === '/login'))
    for (const screen of [initial, result, replay]) {
      const file = new URL(`../../../data/${screen.screenshot_path}`, import.meta.url)
      const png = await fs.readFile(file)
      assert.equal(png.subarray(1, 4).toString(), 'PNG')
    }
    // Keep a clearly labelled test fixture image as reviewable evidence.
    await fs.mkdir(new URL('../../../../docs/evidence/', import.meta.url), { recursive: true })
    await fs.copyFile(new URL(`../../../data/${replay.screenshot_path}`, import.meta.url), new URL('../../../../docs/evidence/dossier-preview-fixture.png', import.meta.url))
  } finally { child.stdin.end(); await closed; lines.close() }
})
