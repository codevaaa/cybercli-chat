import { describe, expect, it } from 'vitest'
import { toCodicApiPlatform } from './device-platform'

describe('toCodicApiPlatform', () => {
  it.each([
    ['darwin', 'macos'],
    ['win32', 'windows'],
    ['linux', 'linux'],
  ] as const)('maps %s to %s', (platform, expected) => {
    expect(toCodicApiPlatform(platform)).toBe(expected)
  })

  it('rejects platforms that Codic does not publish installers for', () => {
    expect(() => toCodicApiPlatform('freebsd')).toThrow('not supported')
  })
})
