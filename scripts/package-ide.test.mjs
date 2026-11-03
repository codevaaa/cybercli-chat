import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { identity, validateArtifact, publishManifest, verifyApp } from './package-ide.mjs'
import { IDE_PRODUCT_NAME, IDE_PRODUCTION_API, publicApiUrl } from '../shared/editor-release.mjs'
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'codeva-package-test-'))
after(async () => { assert.equal(path.dirname(directory), path.resolve(os.tmpdir())); assert.ok(path.basename(directory).startsWith('codeva-package-test-')); await fs.rm(directory, { recursive: true, force: true }) })
test('successive Codeva builds have distinct update identities while the underlying pinned version stays 1.139.0', () => {
  assert.notEqual(identity('1').release_id, identity('2').release_id)
  assert.equal(identity('1').version, '1.139.0-codeva.1')
  assert.throws(() => identity('new-upstream-tag'), /digits/)
  assert.equal(publicApiUrl(), IDE_PRODUCTION_API)
  assert.throws(() => publicApiUrl('http://external.test/api/v1'), /HTTPS/)
  assert.throws(() => publicApiUrl('https://user:password@example.test/api/v1'), /HTTPS/)
})
test('the automatic artifact/manifest step hashes newly produced bytes on each run; fixtures are not installable apps', async () => {
  const filename = path.join(directory, 'MrCodevaa-win-x64-setup.exe')
  await fs.writeFile(filename, 'MZ' + 'unit fixture; not an installer'.repeat(100))
  const first = await publishManifest('win32', identity('1'), false, directory)
  await fs.appendFile(filename, 'second fixture revision')
  const second = await publishManifest('win32', identity('2'), false, directory)
  assert.notEqual(first.artifacts[0].sha256, second.artifacts[0].sha256)
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory, 'release-win32.json'), 'utf8')), second)
  assert.equal(second.artifacts[0].signed, false)
})
test('renaming a file cannot turn it into a DMG, DEB, AppImage or executable release', async () => {
  for (const filename of ['MrCodevaa-win-x64-setup.exe', 'MrCodevaa-mac-universal.dmg', 'MrCodevaa-linux-x64.deb', 'MrCodevaa-linux-x64.AppImage']) {
    await fs.writeFile(path.join(directory, filename), 'not a native package'.repeat(100))
    await assert.rejects(validateArtifact(path.join(directory, filename)), /not a|not an/)
  }
  await assert.rejects(validateArtifact(path.join(directory, 'unapproved.exe')), /Unexpected/)
})
test('packaged app requires the existing API client and matching branding, and rejects credential files or actual configured secrets', async () => {
  const app = path.join(directory, 'resources/app'), extension = path.join(app, 'extensions/codeva-studio')
  await fs.mkdir(extension, { recursive: true })
  for (const file of ['auth.cjs', 'session.cjs', 'chat.cjs']) await fs.writeFile(path.join(extension, file), 'Codeva fixture client')
  const release = identity('1')
  await fs.writeFile(path.join(app, 'product.json'), JSON.stringify({ nameLong: IDE_PRODUCT_NAME, commit: release.release_id, updateUrl: `${IDE_PRODUCTION_API}/editor-updates` }))
  await fs.writeFile(path.join(extension, 'package.json'), JSON.stringify({ contributes: { configuration: { properties: { 'codeva.apiBaseUrl': { default: IDE_PRODUCTION_API } } } } }))
  await verifyApp(directory, 'win32', release.release_id)
  await assert.rejects(verifyApp(directory, 'win32', identity('2').release_id), /identity/)
  await fs.writeFile(path.join(app, '.env'), 'fixture')
  await assert.rejects(verifyApp(directory, 'win32', release.release_id), /Credential file/)
  await fs.unlink(path.join(app, '.env'))
  process.env.CODEVA_FIXTURE_API_KEY = 'fixture-secret-value-never-shipped'
  try {
    await fs.writeFile(path.join(app, 'bad.js'), process.env.CODEVA_FIXTURE_API_KEY)
    await assert.rejects(verifyApp(directory, 'win32', release.release_id), /configured server credential/)
  } finally { delete process.env.CODEVA_FIXTURE_API_KEY; await fs.unlink(path.join(app, 'bad.js')) }
})
