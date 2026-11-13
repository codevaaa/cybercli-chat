import { getR2PublicUrl, isR2Available, r2FileExists } from './r2Service.js'

const DEFAULT_FILENAME = 'Codic Setup 0.1.7.exe'

function releaseFilename() {
  const filename = process.env.CODEVA_CODIC_WINDOWS_FILENAME || DEFAULT_FILENAME
  if (!/^[A-Za-z0-9._ -]{1,160}$/.test(filename) || filename.includes('..')) throw new Error('Codic Windows release filename is invalid')
  return filename
}

function releaseUrl() {
  const value = process.env.CODEVA_CODIC_WINDOWS_URL
  if (!value) return null
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('Codic Windows release URL must be public HTTPS')
  return url.href
}

export async function codicWindowsArtifact() {
  // Codic is preview-only until the release owner explicitly opens downloads.
  if (process.env.CODEVA_CODIC_PUBLIC_RELEASE !== 'true') return null
  const filename = releaseFilename()
  const sha256 = process.env.CODEVA_CODIC_WINDOWS_SHA256?.toLowerCase() || ''
  const sha512 = process.env.CODEVA_CODIC_WINDOWS_SHA512?.trim() || ''
  const size = Number(process.env.CODEVA_CODIC_WINDOWS_SIZE || 0)
  const version = process.env.CODEVA_CODIC_WINDOWS_VERSION || '0.1.7'
  if (!/^[a-f0-9]{64}$/.test(sha256) || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) return null
  const sha512Valid = /^[A-Za-z0-9+/]{86}==$/.test(sha512) && Buffer.from(sha512, 'base64').length === 64

  let url = releaseUrl()
  if (url) {
    let response
    try { response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(8000) }) } catch { return null }
    if (!response.ok || new URL(response.url || url).protocol !== 'https:') return null
  } else {
    if (!process.env.R2_PUBLIC_URL || !isR2Available() || !await r2FileExists(filename)) return null
    url = `${getR2PublicUrl(encodeURIComponent(filename))}`
  }

  return { filename, version, platform: 'windows', arch: 'x64', signed: false, sha256, sha512: sha512Valid ? sha512 : null, size: Number.isSafeInteger(size) && size > 0 ? size : null, url }
}
