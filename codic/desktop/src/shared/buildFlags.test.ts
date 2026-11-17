import { describe, expect, it } from 'vitest'
import { isLocalPreviewEnabled } from './buildFlags.js'

describe('local preview build flag', () => {
  it('allows an explicitly enabled development server', () => {
    expect(isLocalPreviewEnabled('serve', 'true')).toBe(true)
  })

  it('keeps the sign-in bypass out of every build command', () => {
    expect(isLocalPreviewEnabled('build', 'true')).toBe(false)
  })

  it('fails closed unless the value is exactly true', () => {
    expect(isLocalPreviewEnabled('serve', 'TRUE')).toBe(false)
    expect(isLocalPreviewEnabled('serve', '1')).toBe(false)
    expect(isLocalPreviewEnabled('serve', undefined)).toBe(false)
  })
})
