import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

test('frozen fixture eval passes without network, and a changed expected dossier check exits nonzero', async () => {
  const root = path.dirname(fileURLToPath(import.meta.url))
  const clean = execFileSync(process.execPath, [path.join(root, 'run.mjs'), '--mode=fixture'], { encoding: 'utf8' })
  assert.match(clean, /50\/50 \(100.0%\)/)
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'codeva-eval-'))
  try {
    await fs.cp(path.join(root, 'frozen'), directory, { recursive: true })
    const file = path.join(directory, '01.json'), row = JSON.parse(await fs.readFile(file, 'utf8'))
    row.expected.original = false
    await fs.writeFile(file, JSON.stringify(row))
    const bad = spawnSync(process.execPath, [path.join(root, 'run.mjs'), '--mode=fixture', `--directory=${directory}`], { encoding: 'utf8' })
    assert.equal(bad.status, 1); assert.match(bad.stdout, /49\/50/)
  } finally {
    // Only fixed immediate files inside this freshly-created temporary directory.
    for (const file of await fs.readdir(directory)) await fs.unlink(path.join(directory, file))
    await fs.rmdir(directory)
  }
})
