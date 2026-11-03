// Real release bytes through the existing public routers. No auth/provider mocks.
// This is a local HTTP acceptance subcheck, not a deployed production assertion.
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import downloads from '../../backend/src/routes/downloads.routes.js'
import updates from '../../backend/src/routes/editorUpdates.routes.js'
const root = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(path.join(root, 'backend/package.json'))
const express = require('express')
const app = express()
app.use('/api/v1/downloads', downloads)
app.use('/api/v1/editor-updates', updates)
app.use((error, _req, res, _next) => res.status(500).json({ error: error.message }))
const server = app.listen(0, '127.0.0.1')
await new Promise(resolve => server.once('listening', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
try {
  const catalog = await (await fetch(`${origin}/api/v1/downloads/editor`)).json()
  const windows = catalog.downloads.find(file => file.format === 'setup')
  assert.equal(windows.available, true)
  const response = await fetch(`${origin}${windows.url}`)
  assert.equal(response.status, 200)
  assert.ok(response.headers.get('content-disposition').includes(windows.filename))
  const hash = createHash('sha256'); let bytes = 0
  for await (const part of response.body) { bytes += part.length; hash.update(part) }
  const sha256 = hash.digest('hex')
  assert.equal(bytes, windows.size)
  assert.equal(sha256, windows.sha256)
  assert.equal(sha256, response.headers.get('x-checksum-sha256'))
  const feed = await fetch(`${origin}/api/v1/editor-updates/api/update/win32-x64-user/stable/${'0'.repeat(40)}`)
  assert.equal(feed.status, 200)
  const update = await feed.json()
  assert.equal(new URL(update.url).pathname, windows.url)
  assert.equal(update.sha256hash, sha256)
  const current = await fetch(`${origin}/api/v1/editor-updates/api/update/win32-x64-user/stable/${update.version}`)
  assert.equal(current.status, 204)
  const evidence = { executed_at: new Date().toISOString(), scope: 'Actual installer bytes; existing routers locally mounted, not production deployment', anonymous: true, filename: windows.filename, bytes, sha256, catalog: catalog.downloads, update }
  await fs.writeFile(path.join(root, 'artifacts/codeva-editor/http-smoke.json'), JSON.stringify(evidence, null, 2) + '\n')
  console.log(JSON.stringify(evidence))
} finally { await new Promise(resolve => server.close(resolve)) }
