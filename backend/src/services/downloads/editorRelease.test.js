import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import express from 'express'
import request from 'supertest'
import downloads from '../../routes/downloads.routes.js'
import updates from '../../routes/editorUpdates.routes.js'
import { editorArtifact, editorUpdate } from './editorRelease.js'
import { IDE_BASE_TAG, IDE_BASE_COMMIT } from '../../../../shared/editor-release.mjs'

const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'codeva-release-test-'))
const previous = { directory: process.env.CODEVA_IDE_RELEASE_DIR, remote: process.env.CODEVA_IDE_RELEASE_MANIFEST_BASE_URL, api: process.env.CODEVA_PUBLIC_API_URL }
process.env.CODEVA_IDE_RELEASE_DIR = temp
delete process.env.CODEVA_IDE_RELEASE_MANIFEST_BASE_URL
delete process.env.CODEVA_PUBLIC_API_URL
after(async () => {
  for (const [key, value] of Object.entries({ CODEVA_IDE_RELEASE_DIR: previous.directory, CODEVA_IDE_RELEASE_MANIFEST_BASE_URL: previous.remote, CODEVA_PUBLIC_API_URL: previous.api })) if (value === undefined) delete process.env[key]; else process.env[key] = value
  assert.equal(path.dirname(temp), path.resolve(os.tmpdir()))
  assert.ok(path.basename(temp).startsWith('codeva-release-test-'))
  await fs.rm(temp, { recursive: true, force: true })
})
const filename = 'MrCodevaa-win-x64-setup.exe', data = Buffer.from('MZ' + 'unit fixture only; not an installer\n'.repeat(100))
const release = { base_tag: IDE_BASE_TAG, base_commit: IDE_BASE_COMMIT, release_id: 'b'.repeat(40), version: '1.139.0-codeva.123', created_at: '2026-10-01T00:00:00Z', artifacts: [{ filename, size: data.length, sha256: createHash('sha256').update(data).digest('hex'), sha1: createHash('sha1').update(data).digest('hex'), signed: false }] }
const manifest = path.join(temp, 'release-win32.json')
await fs.writeFile(path.join(temp, filename), data)
await fs.writeFile(manifest, JSON.stringify(release))
const app = express()
app.use('/api/v1/downloads', downloads)
app.use('/api/v1/editor-updates', updates)
app.use((error, _req, res, _next) => res.status(500).json({ error: error.message }))

test('logged-out download streams the stored fixture bytes and update feed points to the identical artifact/hash', async () => {
  const res = await request(app).get(`/api/v1/downloads/editor/${filename}`).buffer(true).parse((response, callback) => { const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.on('end', () => callback(null, Buffer.concat(chunks))) }).expect(200)
  assert.deepEqual(res.body, data)
  assert.equal(res.headers['x-checksum-sha256'], release.artifacts[0].sha256)
  assert.match(res.headers['content-disposition'], /attachment.*MrCodevaa-win-x64-setup/)
  const feed = await request(app).get(`/api/v1/editor-updates/api/update/win32-x64-user/stable/${'a'.repeat(40)}`).expect(200)
  assert.equal(feed.body.url, `https://cybercli-api.onrender.com/api/v1/downloads/editor/${filename}`)
  assert.equal(feed.body.sha256hash, res.headers['x-checksum-sha256'])
  assert.equal(feed.body.version, release.release_id)
  assert.equal(feed.body.supportsFastUpdate, false)
  await request(app).get(`/api/v1/editor-updates/api/update/win32-x64-user/stable/${release.release_id}`).expect(204)
})
test('catalog preserves all OS formats and marks genuinely missing builds unavailable; unknown files and channels never escape allowlist', async () => {
  const catalog = await request(app).get('/api/v1/downloads/editor').expect(200)
  assert.equal(catalog.body.downloads.length, 4)
  assert.deepEqual(catalog.body.downloads.filter(item => item.available).map(item => item.filename), [filename])
  assert.equal(await editorArtifact('secret.env'), null)
  await request(app).get('/api/v1/downloads/editor/MrCodevaa-linux-x64.deb').expect(404)
  for (const [platform, quality, current] of [['unknown', 'stable', 'a'.repeat(40)], ['linux-x64', 'stable', 'a'.repeat(40)], ['win32-x64-user', 'insider', 'a'.repeat(40)], ['win32-x64-user', 'stable', 'invalid']]) assert.equal(await editorUpdate(platform, quality, current), null)
})
test('invalid manifest, wrong upstream base, missing bytes and changed size cannot become successful releases', async () => {
  await fs.writeFile(manifest, '{')
  await request(app).get(`/api/v1/downloads/editor/${filename}`).expect(500)
  for (const override of [{ base_tag: 'newer' }, { release_id: 'invalid' }, { artifacts: [{ ...release.artifacts[0], sha256: 'invalid' }] }]) {
    await fs.writeFile(manifest, JSON.stringify({ ...release, ...override }))
    await assert.rejects(editorArtifact(filename), /manifest is invalid/)
  }
  await fs.writeFile(manifest, JSON.stringify({ ...release, artifacts: [{ ...release.artifacts[0], size: data.length + 1 }] }))
  assert.equal(await editorArtifact(filename), null)
  await fs.writeFile(manifest, JSON.stringify(release))
  await fs.rename(path.join(temp, filename), path.join(temp, 'withheld.bin'))
  assert.equal(await editorArtifact(filename), null)
  await fs.rename(path.join(temp, 'withheld.bin'), path.join(temp, filename))
})

test('equal-sized corrupted or replaced artifacts cannot be advertised with a stale checksum', async () => {
  assert.ok(await editorArtifact(filename))
  await fs.writeFile(path.join(temp, filename), Buffer.alloc(data.length, 1))
  assert.equal(await editorArtifact(filename), null)
  await request(app).get(`/api/v1/downloads/editor/${filename}`).expect(404)
  await request(app).get(`/api/v1/editor-updates/api/update/win32-x64-user/stable/${'a'.repeat(40)}`).expect(204)
  await fs.writeFile(path.join(temp, filename), data)
  assert.ok(await editorArtifact(filename))
})
test('immutable remote manifest uses the same anonymous download URL without depending on API-host disk', async t => {
  process.env.CODEVA_IDE_RELEASE_MANIFEST_BASE_URL = 'https://release.example.test/codeva-editor-123'
  t.mock.method(globalThis, 'fetch', async url => { assert.equal(url, 'https://release.example.test/codeva-editor-123/release-win32.json'); return new Response(JSON.stringify(release)) })
  const res = await request(app).get(`/api/v1/downloads/editor/${filename}`).expect(302)
  assert.equal(res.headers.location, `https://release.example.test/codeva-editor-123/${filename}`)
  const feed = await request(app).get(`/api/v1/editor-updates/api/update/win32-x64-user/stable/${'a'.repeat(40)}`).expect(200)
  assert.equal(feed.body.url, `https://cybercli-api.onrender.com/api/v1/downloads/editor/${filename}`)
  process.env.CODEVA_IDE_RELEASE_MANIFEST_BASE_URL = 'http://unsafe.test'
  await assert.rejects(editorArtifact(filename), /public HTTPS/)
  delete process.env.CODEVA_IDE_RELEASE_MANIFEST_BASE_URL
})
test('remote metadata 404 is unavailable, malformed/network failures fail closed, and public URL configuration is validated', async t => {
  process.env.CODEVA_IDE_RELEASE_MANIFEST_BASE_URL = 'https://release.example.test/codeva-editor-123'
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 404 }))
  assert.equal(await editorArtifact(filename), null)
  t.mock.method(globalThis, 'fetch', async () => new Response('invalid', { status: 503 }))
  await assert.rejects(editorArtifact(filename), /unreadable/)
  t.mock.method(globalThis, 'fetch', async () => new Response('x'.repeat(32769)))
  await assert.rejects(editorArtifact(filename), /unreadable/)
  delete process.env.CODEVA_IDE_RELEASE_MANIFEST_BASE_URL
  process.env.CODEVA_PUBLIC_API_URL = 'https://example.test/wrong'
  await assert.rejects(editorUpdate('win32-x64-user', 'stable', 'a'.repeat(40)), /Codeva public API/)
  delete process.env.CODEVA_PUBLIC_API_URL
})
