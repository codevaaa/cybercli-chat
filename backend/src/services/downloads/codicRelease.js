import { getR2PublicUrl, isR2Available, r2FileExists } from './r2Service.js'

const PLATFORM_RELEASES = {
  windows: {
    filenameEnv: 'CODEVA_CODIC_WINDOWS_FILENAME',
    versionEnv: 'CODEVA_CODIC_WINDOWS_VERSION',
    sha256Env: 'CODEVA_CODIC_WINDOWS_SHA256',
    sha512Env: 'CODEVA_CODIC_WINDOWS_SHA512',
    sizeEnv: 'CODEVA_CODIC_WINDOWS_SIZE',
    urlEnv: 'CODEVA_CODIC_WINDOWS_URL',
    signedEnv: 'CODEVA_CODIC_WINDOWS_SIGNED',
    defaultFilename: 'Codic Setup 0.1.12.exe',
    arch: 'x64',
  },
  macos: {
    filenameEnv: 'CODEVA_CODIC_MACOS_FILENAME',
    versionEnv: 'CODEVA_CODIC_MACOS_VERSION',
    sha256Env: 'CODEVA_CODIC_MACOS_SHA256',
    sizeEnv: 'CODEVA_CODIC_MACOS_SIZE',
    urlEnv: 'CODEVA_CODIC_MACOS_URL',
    signedEnv: 'CODEVA_CODIC_MACOS_SIGNED',
    notarizedEnv: 'CODEVA_CODIC_MACOS_NOTARIZED',
    defaultFilename: 'Codic-0.1.12-universal.dmg',
    arch: 'universal',
  },
  linux: {
    filenameEnv: 'CODEVA_CODIC_LINUX_FILENAME',
    versionEnv: 'CODEVA_CODIC_LINUX_VERSION',
    sha256Env: 'CODEVA_CODIC_LINUX_SHA256',
    sizeEnv: 'CODEVA_CODIC_LINUX_SIZE',
    urlEnv: 'CODEVA_CODIC_LINUX_URL',
    signedEnv: 'CODEVA_CODIC_LINUX_SIGNED',
    defaultFilename: 'Codic-0.1.12-x64.AppImage',
    arch: 'x64',
  },
}

const releaseVersionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const releaseSha512Pattern = /^[A-Za-z0-9+/]{86}==$/

function releaseFilename(platform, config) {
  const filename = process.env[config.filenameEnv] || config.defaultFilename
  if (!/^[A-Za-z0-9._ -]{1,160}$/.test(filename) || filename.includes('..')) {
    return null
  }
  return filename
}

function requirePublicHttpsUrl(value, platform) {
  const url = new URL(value)
  const hostname = url.hostname.replace(/^\[|\]$/g, '').replace(/\.+$/, '').toLowerCase()
  const ipLiteral = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':')
  const localHost = hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname.endsWith('.internal')
    || hostname.endsWith('.lan')
    || hostname.endsWith('.home.arpa')
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || ipLiteral || localHost) {
    throw new Error('Codic ' + platform + ' release URL must use a public HTTPS hostname')
  }
  return url.href
}

function releaseUrl(platform, config) {
  const value = process.env[config.urlEnv]
  return value ? requirePublicHttpsUrl(value, platform) : null
}

export async function codicPlatformArtifact(platform) {
  const config = PLATFORM_RELEASES[platform]
  if (!config || process.env.CODEVA_CODIC_PUBLIC_RELEASE !== 'true') return null

  const filename = releaseFilename(platform, config)
  if (!filename) return null
  const sha256 = process.env[config.sha256Env]?.toLowerCase() || ''
  const version = process.env[config.versionEnv] || '0.1.12'
  const configuredSize = process.env[config.sizeEnv]?.trim() || ''
  const size = configuredSize ? Number(configuredSize) : 0
  if (!/^[a-f0-9]{64}$/.test(sha256) || !releaseVersionPattern.test(version)) return null
  if (configuredSize && (!/^\d+$/.test(configuredSize) || !Number.isSafeInteger(size) || size <= 0)) return null

  const sha512Value = config.sha512Env ? process.env[config.sha512Env]?.trim() || '' : ''
  const sha512 = releaseSha512Pattern.test(sha512Value) && Buffer.from(sha512Value, 'base64').length === 64
    ? sha512Value
    : null

  let url
  try {
    url = releaseUrl(platform, config)
    if (!url) {
      if (!process.env.R2_PUBLIC_URL || !isR2Available() || !await r2FileExists(filename)) return null
      url = requirePublicHttpsUrl(getR2PublicUrl(encodeURIComponent(filename)), platform)
    }
  } catch {
    return null
  }

  let response
  let checkedUrl = url
  const reachabilitySignal = AbortSignal.timeout(8000)
  try {
    // Validate every redirect before requesting it. `redirect: 'follow'` could
    // otherwise make the backend issue a request to a private or non-HTTPS URL.
    for (let redirects = 0; redirects <= 4; redirects += 1) {
      response = await fetch(checkedUrl, { method: 'HEAD', redirect: 'manual', signal: reachabilitySignal })
      const status = Number(response.status || 0)
      if (status < 300 || status >= 400) break
      const location = response.headers?.get?.('location')
      if (!location || redirects === 4) return null
      checkedUrl = requirePublicHttpsUrl(new URL(location, checkedUrl).href, platform)
    }
  } catch {
    return null
  }
  if (!response.ok) return null
  const contentLengthHeader = String(response.headers?.get?.('content-length') || '').trim()
  if (size > 0 && contentLengthHeader && (!/^\d+$/.test(contentLengthHeader) || Number(contentLengthHeader) !== size)) return null

  return {
    filename,
    version,
    platform,
    arch: config.arch,
    signed: process.env[config.signedEnv] === 'true',
    ...(config.notarizedEnv ? { notarized: process.env[config.notarizedEnv] === 'true' } : {}),
    sha256,
    sha512: platform === 'windows' ? sha512 : null,
    size: Number.isSafeInteger(size) && size > 0 ? size : null,
    url,
  }
}

export async function codicReleaseCatalog() {
  const platforms = Object.keys(PLATFORM_RELEASES)
  const releases = await Promise.all(platforms.map(async platform => [platform, await codicPlatformArtifact(platform)]))
  return Object.fromEntries(releases.map(([platform, release]) => [
    platform,
    release
      ? { ...release, available: true, url: '/api/v1/downloads/codic/' + platform }
      : { platform, arch: PLATFORM_RELEASES[platform].arch, available: false, signed: false },
  ]))
}

// Keep the updater endpoint Windows-specific; electron-updater uses its own
// checksum-backed latest.yml manifest and Authenticode publisher validation.
export async function codicWindowsArtifact() {
  return codicPlatformArtifact('windows')
}
