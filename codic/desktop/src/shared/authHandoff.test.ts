import { describe, expect, it } from 'vitest'
import { findCodicAuthCallback, parseCodicAuthCallback } from './authHandoff.js'

const ticket = 'a'.repeat(43)

describe('Codic protocol handoff', () => {
  it('accepts and canonicalizes only an opaque callback ticket', () => {
    expect(parseCodicAuthCallback(`codic://auth/callback?ticket=${ticket}`)).toBe(`codic://auth/callback?ticket=${ticket}`)
    expect(parseCodicAuthCallback(`CODIC://AUTH/callback?ticket=${ticket}`)).toBe(`codic://auth/callback?ticket=${ticket}`)
  })

  it('rejects malformed links and links carrying credentials or extra data', () => {
    expect(parseCodicAuthCallback('codic://auth/callback?ticket=bad')).toBeNull()
    expect(parseCodicAuthCallback(`codic://auth/other?ticket=${ticket}`)).toBeNull()
    expect(parseCodicAuthCallback(`codic://auth/callback?ticket=${ticket}&token=secret`)).toBeNull()
    expect(parseCodicAuthCallback(`codic://auth/callback?ticket=${ticket}#fragment`)).toBeNull()
    expect(parseCodicAuthCallback(`https://example.test/?ticket=${ticket}`)).toBeNull()
  })

  it('finds the callback argument among Windows installer startup arguments', () => {
    expect(findCodicAuthCallback(['--hidden', `codic://auth/callback?ticket=${ticket}`])).toBe(`codic://auth/callback?ticket=${ticket}`)
    expect(findCodicAuthCallback(['--hidden', 'codic://auth/callback?ticket=bad'])).toBeNull()
  })
})
