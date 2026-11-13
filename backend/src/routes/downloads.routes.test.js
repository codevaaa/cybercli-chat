import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'

mock.module('../services/downloads/r2Service.js', {
  namedExports: {
    isR2Available: () => false,
    r2FileExists: async () => false,
    getR2PublicUrl: () => { throw new Error('Unexpected R2 access') },
  },
})
const { default: downloadsRouter } = await import('./downloads.routes.js')
const app = express()
app.use('/downloads', downloadsRouter)

test('download catalog contains only main desktop builds', async () => {
  const response = await request(app).get('/downloads').expect(200)
  assert.deepEqual(response.body.downloads.map(item => item.filename), [
    'Codeva-win-x64.exe', 'Codeva-mac-universal.dmg',
    'Codeva-linux-x64.AppImage', 'Codeva-linux-x64.deb',
  ])
})

test('removed installers return 404 without requesting remote storage', async t => {
  t.mock.method(globalThis, 'fetch', async () => assert.fail('Removed downloads must not reach GitHub'))
  for (const filename of [
    'CodeVaa-Agent-Platform-win-x64.exe', 'CodeVaa-Agent-Platform-mac-x64.dmg',
    'CodeVaa-Agent-Platform-linux-x64.AppImage',
  ]) await request(app).get(`/downloads/${filename}`).expect(404)
})

test('main desktop download and Chrome extension update endpoints still work', async t => {
  let upstream
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    upstream = { url, method: options.method }
    return { ok: true }
  })
  const download = await request(app).get('/downloads/Codeva-win-x64.exe').expect(302)
  assert.match(download.headers.location, /\/latest\/download\/Codeva-win-x64\.exe$/)
  assert.equal(upstream.method, 'HEAD')
  const extension = await request(app).get('/downloads/extension/version').expect(200)
  assert.ok(extension.body.version)
  assert.match(extension.body.downloadUrl, /^https:\/\//)
})

test('Codic Windows release stays pending until a checksummed HTTPS artifact is reachable', async t => {
  const keys = ['CODEVA_CODIC_PUBLIC_RELEASE', 'CODEVA_CODIC_WINDOWS_FILENAME', 'CODEVA_CODIC_WINDOWS_VERSION', 'CODEVA_CODIC_WINDOWS_SHA256', 'CODEVA_CODIC_WINDOWS_SHA512', 'CODEVA_CODIC_WINDOWS_SIZE', 'CODEVA_CODIC_WINDOWS_URL']
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  t.after(() => { for (const key of keys) if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key] })
  keys.forEach(key => delete process.env[key])

  const pending = await request(app).get('/downloads/codic').expect(200)
  assert.equal(pending.body.windows.available, false)
  await request(app).get('/downloads/codic/windows').expect(404)

  process.env.CODEVA_CODIC_WINDOWS_FILENAME = 'Codic Setup 0.1.0.exe'
  process.env.CODEVA_CODIC_PUBLIC_RELEASE = 'true'
  process.env.CODEVA_CODIC_WINDOWS_VERSION = '0.1.0'
  process.env.CODEVA_CODIC_WINDOWS_SHA256 = 'a'.repeat(64)
  process.env.CODEVA_CODIC_WINDOWS_URL = 'https://cdn.example.test/codic/Codic%20Setup%200.1.0.exe'
  t.mock.method(globalThis, 'fetch', async (_url, options) => ({ ok: options.method === 'HEAD', url: 'https://cdn.example.test/codic/Codic%20Setup%200.1.0.exe' }))

  const catalog = await request(app).get('/downloads/codic').expect(200)
  assert.equal(catalog.body.windows.available, true)
  assert.equal(catalog.body.windows.signed, false)
  assert.equal(catalog.body.windows.sha256, 'a'.repeat(64))
  assert.equal(catalog.body.windows.url, '/api/v1/downloads/codic/windows')
  const download = await request(app).get('/downloads/codic/windows').expect(302)
  assert.equal(download.headers.location, process.env.CODEVA_CODIC_WINDOWS_URL)
  assert.equal(download.headers['x-checksum-sha256'], 'a'.repeat(64))
})

test('Codic updater publishes a checksum-backed generic manifest and only redirects the configured installer', async t => {
  const keys = ['CODEVA_CODIC_PUBLIC_RELEASE', 'CODEVA_CODIC_WINDOWS_FILENAME', 'CODEVA_CODIC_WINDOWS_VERSION', 'CODEVA_CODIC_WINDOWS_SHA256', 'CODEVA_CODIC_WINDOWS_SHA512', 'CODEVA_CODIC_WINDOWS_SIZE', 'CODEVA_CODIC_WINDOWS_URL']
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  t.after(() => { for (const key of keys) if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key] })
  process.env.CODEVA_CODIC_PUBLIC_RELEASE = 'true'
  process.env.CODEVA_CODIC_WINDOWS_FILENAME = 'Codic Setup 0.2.0.exe'
  process.env.CODEVA_CODIC_WINDOWS_VERSION = '0.2.0'
  process.env.CODEVA_CODIC_WINDOWS_SHA256 = 'b'.repeat(64)
  process.env.CODEVA_CODIC_WINDOWS_SHA512 = Buffer.alloc(64, 7).toString('base64')
  process.env.CODEVA_CODIC_WINDOWS_SIZE = '1024'
  process.env.CODEVA_CODIC_WINDOWS_URL = 'https://cdn.example.test/codic/Codic%20Setup%200.2.0.exe'
  t.mock.method(globalThis, 'fetch', async (_url, options) => ({ ok: options.method === 'HEAD', url: process.env.CODEVA_CODIC_WINDOWS_URL }))

  const manifest = await request(app).get('/downloads/codic/updates/latest.yml').expect(200)
  assert.match(manifest.headers['content-type'], /yaml/)
  assert.match(manifest.text, /version: 0\.2\.0/)
  assert.match(manifest.text, /Codic Setup 0\.2\.0\.exe/)
  assert.match(manifest.text, /sha512:/)
  assert.match(manifest.text, /size: 1024/)
  await request(app).get('/downloads/codic/updates/Codic%20Setup%200.2.0.exe').expect(302).expect('Location', process.env.CODEVA_CODIC_WINDOWS_URL)
  await request(app).get('/downloads/codic/updates/other.exe').expect(404)
})
