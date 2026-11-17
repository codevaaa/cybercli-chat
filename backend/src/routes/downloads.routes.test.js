import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'

mock.module('../services/downloads/r2Service.js', {
  namedExports: {
    isR2Available: () => r2Available,
    r2FileExists: async () => r2ArtifactExists,
    getR2PublicUrl: () => r2PublicUrl,
  },
})
let r2Available = false
let r2ArtifactExists = false
let r2PublicUrl = 'https://cdn.example.test/codic/'
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
  assert.equal(pending.body.macos.available, false)
  assert.equal(pending.body.linux.available, false)
  await request(app).get('/downloads/codic/windows').expect(404)
  await request(app).get('/downloads/codic/macos').expect(404)
  await request(app).get('/downloads/codic/linux').expect(404)

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

test('Codic macOS and Linux installers appear only with checksummed, reachable HTTPS artifacts', async t => {
  const keys = [
    'CODEVA_CODIC_PUBLIC_RELEASE',
    'CODEVA_CODIC_MACOS_FILENAME', 'CODEVA_CODIC_MACOS_VERSION', 'CODEVA_CODIC_MACOS_SHA256', 'CODEVA_CODIC_MACOS_SIZE', 'CODEVA_CODIC_MACOS_URL', 'CODEVA_CODIC_MACOS_SIGNED', 'CODEVA_CODIC_MACOS_NOTARIZED',
    'CODEVA_CODIC_LINUX_FILENAME', 'CODEVA_CODIC_LINUX_VERSION', 'CODEVA_CODIC_LINUX_SHA256', 'CODEVA_CODIC_LINUX_SIZE', 'CODEVA_CODIC_LINUX_URL', 'CODEVA_CODIC_LINUX_SIGNED',
  ]
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  t.after(() => { for (const key of keys) if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key] })

  const releases = {
    macos: {
      filename: 'Codic-0.1.12-universal.dmg',
      version: '0.1.12',
      sha256: 'c'.repeat(64),
      size: '140000000',
      url: 'https://cdn.example.test/codic/Codic-0.1.12-universal.dmg',
      signed: true,
      notarized: true,
    },
    linux: {
      filename: 'Codic-0.1.12-x64.AppImage',
      version: '0.1.12',
      sha256: 'd'.repeat(64),
      size: '130000000',
      url: 'https://cdn.example.test/codic/Codic-0.1.12-x64.AppImage',
      signed: false,
    },
  }
  process.env.CODEVA_CODIC_PUBLIC_RELEASE = 'true'
  for (const [platform, release] of Object.entries(releases)) {
    const prefix = platform === 'macos' ? 'CODEVA_CODIC_MACOS' : 'CODEVA_CODIC_LINUX'
    process.env[`${prefix}_FILENAME`] = release.filename
    process.env[`${prefix}_VERSION`] = release.version
    process.env[`${prefix}_SHA256`] = release.sha256
    process.env[`${prefix}_SIZE`] = release.size
    process.env[`${prefix}_URL`] = release.url
    process.env[`${prefix}_SIGNED`] = String(release.signed)
    if (platform === 'macos') process.env.CODEVA_CODIC_MACOS_NOTARIZED = 'true'
  }
  let mismatchedMacSize = false
  let unsafeMacRedirect = false
  t.mock.method(globalThis, 'fetch', async (url, options) => ({
    ok: options.method === 'HEAD',
    url: String(url),
    status: unsafeMacRedirect && String(url).includes('universal.dmg') ? 302 : 200,
    headers: {
      get: name => {
        if (name === 'location' && unsafeMacRedirect && String(url).includes('universal.dmg')) return 'http://127.0.0.1/private'
        if (name === 'content-length' && mismatchedMacSize && String(url).includes('universal.dmg')) return '1'
        if (name === 'content-length' && String(url).includes('universal.dmg')) return '140000000'
        return null
      },
    },
  }))

  const catalog = await request(app).get('/downloads/codic').expect(200)
  for (const [platform, release] of Object.entries(releases)) {
    assert.equal(catalog.body[platform].available, true)
    assert.equal(catalog.body[platform].version, release.version)
    assert.equal(catalog.body[platform].sha256, release.sha256)
    assert.equal(catalog.body[platform].url, `/api/v1/downloads/codic/${platform}`)
    assert.equal(catalog.body[platform].signed, release.signed)
    if (release.notarized !== undefined) assert.equal(catalog.body[platform].notarized, release.notarized)
    await request(app).get(`/downloads/codic/${platform}`).expect(302).expect('Location', release.url)
  }
  await request(app).get('/downloads/codic/freebsd').expect(404)

  process.env.CODEVA_CODIC_MACOS_URL = 'http://cdn.example.test/codic/unsafe.dmg'
  const invalidUrlCatalog = await request(app).get('/downloads/codic').expect(200)
  assert.equal(invalidUrlCatalog.body.macos.available, false)
  assert.equal(invalidUrlCatalog.body.linux.available, true)

  mismatchedMacSize = true
  process.env.CODEVA_CODIC_MACOS_URL = releases.macos.url
  const invalidSizeCatalog = await request(app).get('/downloads/codic').expect(200)
  assert.equal(invalidSizeCatalog.body.macos.available, false)

  mismatchedMacSize = false
  process.env.CODEVA_CODIC_MACOS_SIZE = 'not-a-size'
  const invalidMetadataCatalog = await request(app).get('/downloads/codic').expect(200)
  assert.equal(invalidMetadataCatalog.body.macos.available, false)
  assert.equal(invalidMetadataCatalog.body.linux.available, true)

  process.env.CODEVA_CODIC_MACOS_SIZE = releases.macos.size
  process.env.CODEVA_CODIC_MACOS_FILENAME = '../unsafe.dmg'
  const invalidFilenameCatalog = await request(app).get('/downloads/codic').expect(200)
  assert.equal(invalidFilenameCatalog.body.macos.available, false)
  assert.equal(invalidFilenameCatalog.body.linux.available, true)

  delete process.env.CODEVA_CODIC_MACOS_FILENAME
  process.env.CODEVA_CODIC_MACOS_URL = 'https://127.0.0.1/codic/Codic-0.1.12-universal.dmg'
  const privateHostCatalog = await request(app).get('/downloads/codic').expect(200)
  assert.equal(privateHostCatalog.body.macos.available, false)

  process.env.CODEVA_CODIC_MACOS_URL = 'https://localhost./codic/Codic-0.1.12-universal.dmg'
  const trailingDotLocalHostCatalog = await request(app).get('/downloads/codic').expect(200)
  assert.equal(trailingDotLocalHostCatalog.body.macos.available, false)

  process.env.CODEVA_CODIC_MACOS_URL = releases.macos.url
  unsafeMacRedirect = true
  const unsafeRedirectCatalog = await request(app).get('/downloads/codic').expect(200)
  assert.equal(unsafeRedirectCatalog.body.macos.available, false)
})

test('Codic R2 artifacts stay unavailable unless their generated public URL is safe and reachable', async t => {
  const keys = ['CODEVA_CODIC_PUBLIC_RELEASE', 'CODEVA_CODIC_LINUX_SHA256', 'CODEVA_CODIC_LINUX_VERSION', 'CODEVA_CODIC_LINUX_SIZE', 'CODEVA_CODIC_LINUX_FILENAME', 'CODEVA_CODIC_LINUX_URL', 'R2_PUBLIC_URL']
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  const priorR2 = { r2Available, r2ArtifactExists, r2PublicUrl }
  t.after(() => {
    for (const key of keys) if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]
    r2Available = priorR2.r2Available
    r2ArtifactExists = priorR2.r2ArtifactExists
    r2PublicUrl = priorR2.r2PublicUrl
  })
  process.env.CODEVA_CODIC_PUBLIC_RELEASE = 'true'
  process.env.CODEVA_CODIC_LINUX_FILENAME = 'Codic-0.1.12-x64.AppImage'
  process.env.CODEVA_CODIC_LINUX_VERSION = '0.1.12'
  process.env.CODEVA_CODIC_LINUX_SHA256 = 'e'.repeat(64)
  process.env.CODEVA_CODIC_LINUX_SIZE = '130000000'
  delete process.env.CODEVA_CODIC_LINUX_URL
  process.env.R2_PUBLIC_URL = 'https://cdn.example.test/codic'
  r2Available = true
  r2ArtifactExists = true

  r2PublicUrl = 'http://cdn.example.test/codic/Codic-0.1.12-x64.AppImage'
  const unsafe = await request(app).get('/downloads/codic').expect(200)
  assert.equal(unsafe.body.linux.available, false)

  r2PublicUrl = 'https://cdn.example.test/codic/Codic-0.1.12-x64.AppImage'
  t.mock.method(globalThis, 'fetch', async (_url, options) => ({ ok: options.method === 'HEAD' }))
  const reachable = await request(app).get('/downloads/codic').expect(200)
  assert.equal(reachable.body.linux.available, true)
})

test('Codic updater publishes a checksum-backed generic manifest and only redirects the configured installer', async t => {
  const keys = ['CODEVA_CODIC_PUBLIC_RELEASE', 'CODEVA_CODIC_WINDOWS_FILENAME', 'CODEVA_CODIC_WINDOWS_VERSION', 'CODEVA_CODIC_WINDOWS_SHA256', 'CODEVA_CODIC_WINDOWS_SHA512', 'CODEVA_CODIC_WINDOWS_SIZE', 'CODEVA_CODIC_WINDOWS_URL', 'CODEVA_CODIC_WINDOWS_RELEASE_DATE']
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  t.after(() => { for (const key of keys) if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key] })
  process.env.CODEVA_CODIC_PUBLIC_RELEASE = 'true'
  process.env.CODEVA_CODIC_WINDOWS_FILENAME = 'Codic Setup 0.2.0.exe'
  process.env.CODEVA_CODIC_WINDOWS_VERSION = '0.2.0'
  process.env.CODEVA_CODIC_WINDOWS_SHA256 = 'b'.repeat(64)
  process.env.CODEVA_CODIC_WINDOWS_SHA512 = Buffer.alloc(64, 7).toString('base64')
  process.env.CODEVA_CODIC_WINDOWS_SIZE = '1024'
  process.env.CODEVA_CODIC_WINDOWS_URL = 'https://cdn.example.test/codic/Codic%20Setup%200.2.0.exe'
  process.env.CODEVA_CODIC_WINDOWS_RELEASE_DATE = '2026-11-17T10:30:00.000Z\nfiles: []'
  t.mock.method(globalThis, 'fetch', async (_url, options) => ({ ok: options.method === 'HEAD', url: process.env.CODEVA_CODIC_WINDOWS_URL }))

  const manifest = await request(app).get('/downloads/codic/updates/latest.yml').expect(200)
  assert.match(manifest.headers['content-type'], /yaml/)
  assert.match(manifest.text, /version: 0\.2\.0/)
  assert.match(manifest.text, /Codic Setup 0\.2\.0\.exe/)
  assert.match(manifest.text, /sha512:/)
  assert.match(manifest.text, /size: 1024/)
  assert.match(manifest.text, /releaseDate: '\d{4}-\d{2}-\d{2}T[^']+Z'/)
  assert.doesNotMatch(manifest.text, /files: \[\]/)
  await request(app).get('/downloads/codic/updates/Codic%20Setup%200.2.0.exe').expect(302).expect('Location', process.env.CODEVA_CODIC_WINDOWS_URL)
  await request(app).get('/downloads/codic/updates/other.exe').expect(404)
})
