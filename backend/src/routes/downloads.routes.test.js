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
