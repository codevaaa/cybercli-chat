// Release metadata shared by the existing API and the pinned editor packager.
export const IDE_BASE_TAG = '1.139.0'
export const IDE_PRODUCT_NAME = 'MrCodevaa'
export const IDE_BASE_COMMIT = '2242ebbb54efeeb0129e08e919e7e8d43033cd83'
export const IDE_PRODUCTION_API = 'https://cybercli-api.onrender.com/api/v1'
export const IDE_PRODUCTION_WEB = 'https://cybermindcli.info'
export const IDE_ARTIFACTS = Object.freeze({
  'MrCodevaa-win-x64-setup.exe': { os: 'win32', platform: 'windows', arch: 'x64', format: 'setup', feedPlatforms: ['win32-x64-user'] },
  'MrCodevaa-mac-universal.dmg': { os: 'darwin', platform: 'macos', arch: 'universal', format: 'dmg', feedPlatforms: ['darwin', 'darwin-arm64', 'darwin-universal'] },
  'MrCodevaa-linux-x64.deb': { os: 'linux', platform: 'linux', arch: 'amd64', format: 'deb', feedPlatforms: [] },
  'MrCodevaa-linux-x64.AppImage': { os: 'linux', platform: 'linux', arch: 'x64', format: 'AppImage', feedPlatforms: ['linux-x64'] },
})
export function publicApiUrl(value = IDE_PRODUCTION_API) {
  const url = new URL(value)
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/api/v1' || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) throw new Error('Codeva public API must be HTTPS or loopback, ending in /api/v1')
  return url.href.replace(/\/$/, '')
}
