import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { IDE_ARTIFACTS, IDE_BASE_COMMIT, IDE_BASE_TAG, publicApiUrl } from '../../../../shared/editor-release.mjs'

const defaultDirectory = fileURLToPath(new URL('../../../../artifacts/codeva-editor/', import.meta.url))
export const releaseDirectory = () => path.resolve(process.env.CODEVA_IDE_RELEASE_DIR || defaultDirectory)
const verifiedFiles = new Map()
async function matchesManifest(file, stat, entry) {
  const key = `${file}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}:${entry.sha256}:${entry.sha1}`
  if (!verifiedFiles.has(key)) {
    // Hash once per immutable file revision, including equal-sized replacements.
    // Download/feed metadata must never certify bytes from a partial rebuild.
    const verification = (async () => {
      const sha256 = createHash('sha256'), sha1 = createHash('sha1')
      for await (const bytes of createReadStream(file)) { sha256.update(bytes); sha1.update(bytes) }
      const after = await fs.stat(file)
      return after.size === stat.size && after.mtimeMs === stat.mtimeMs && after.ctimeMs === stat.ctimeMs && sha256.digest('hex') === entry.sha256 && sha1.digest('hex') === entry.sha1
    })()
    if (verifiedFiles.size >= 8) verifiedFiles.delete(verifiedFiles.keys().next().value)
    verifiedFiles.set(key, verification)
    verification.catch(() => verifiedFiles.delete(key))
  }
  return verifiedFiles.get(key)
}
function remoteBase() {
  if (!process.env.CODEVA_IDE_RELEASE_MANIFEST_BASE_URL) return null
  const url = new URL(process.env.CODEVA_IDE_RELEASE_MANIFEST_BASE_URL)
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Editor release manifest base must be a public HTTPS URL')
  return url.href.replace(/\/$/, '')
}
export async function editorArtifact(filename) {
  if (!Object.hasOwn(IDE_ARTIFACTS, filename)) return null
  const directory = releaseDirectory(), meta = IDE_ARTIFACTS[filename]
  let release
  const remote = remoteBase()
  try {
    if (remote) {
      const response = await fetch(`${remote}/release-${meta.os}.json`, { signal: AbortSignal.timeout(5000) })
      if (response.status === 404) return null
      if (!response.ok) throw new Error('Release metadata unavailable')
      const data = await response.text()
      if (Buffer.byteLength(data) > 32768) throw new Error('Release metadata exceeds limits')
      release = JSON.parse(data)
    } else release = JSON.parse(await fs.readFile(path.join(directory, `release-${meta.os}.json`), 'utf8'))
  } catch (error) { if (error.code === 'ENOENT') return null; throw new Error('Editor release manifest is unreadable') }
  const entry = release.artifacts?.find(item => item.filename === filename)
  if (release.base_tag !== IDE_BASE_TAG || release.base_commit !== IDE_BASE_COMMIT || !/^[a-f0-9]{40}$/.test(release.release_id) || !/^1\.139\.0-codeva\.[0-9]+$/.test(release.version) || !entry || !/^[a-f0-9]{64}$/.test(entry.sha256) || !/^[a-f0-9]{40}$/.test(entry.sha1) || !Number.isSafeInteger(entry.size) || entry.size < 1 || !Number.isFinite(Date.parse(release.created_at))) throw new Error('Editor release manifest is invalid')
  if (remote) return { ...meta, ...entry, release_id: release.release_id, version: release.version, created_at: release.created_at, signed: entry.signed === true, remoteUrl: `${remote}/${filename}` }
  const file = path.join(directory, filename)
  try {
    const realDirectory = await fs.realpath(directory), realFile = await fs.realpath(file), stat = await fs.stat(realFile)
    if (path.dirname(realFile) !== realDirectory || !stat.isFile() || stat.size !== entry.size || !await matchesManifest(realFile, stat, entry)) return null
  } catch (error) { if (error.code === 'ENOENT') return null; throw error }
  return { ...meta, ...entry, release_id: release.release_id, version: release.version, created_at: release.created_at, signed: entry.signed === true, file }
}
export async function editorCatalog() {
  return Promise.all(Object.entries(IDE_ARTIFACTS).map(async ([filename, meta]) => {
    const artifact = await editorArtifact(filename)
    return { ...meta, filename, available: Boolean(artifact), url: `/api/v1/downloads/editor/${filename}`, ...(artifact ? { size: artifact.size, sha256: artifact.sha256, version: artifact.version, signed: artifact.signed } : {}) }
  }))
}
export async function editorUpdate(platform, quality, current) {
  if (quality !== 'stable' || !/^[a-f0-9]{40}$/.test(current)) return null
  const filename = Object.keys(IDE_ARTIFACTS).find(key => IDE_ARTIFACTS[key].feedPlatforms.includes(platform))
  if (!filename) return null
  const artifact = await editorArtifact(filename)
  if (!artifact || artifact.release_id === current) return null
  return { url: `${publicApiUrl(process.env.CODEVA_PUBLIC_API_URL)}/downloads/editor/${filename}`, name: artifact.release_id, version: artifact.release_id, productVersion: artifact.version, sha256hash: artifact.sha256, hash: artifact.sha1, timestamp: Date.parse(artifact.created_at), supportsFastUpdate: false }
}
