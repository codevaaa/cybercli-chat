export type CodicApiPlatform = 'macos' | 'windows' | 'linux'

export function toCodicApiPlatform(platform: NodeJS.Platform): CodicApiPlatform {
  if (platform === 'darwin') return 'macos'
  if (platform === 'win32') return 'windows'
  if (platform === 'linux') return 'linux'
  throw new Error(`Device registration is not supported on ${platform}.`)
}
