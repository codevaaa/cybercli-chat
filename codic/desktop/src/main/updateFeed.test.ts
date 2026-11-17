import { describe, expect, it, vi } from 'vitest'
import { fetchCodicUpdateFeedReadiness, hasTrustedUpdatePublisher, inspectCodicUpdateCatalog } from './updateFeed.js'

const sha512 = Buffer.alloc(64, 7).toString('base64')

describe('Codic update feed readiness', () => {
  it('requires a configured publisher before enabling Windows auto-updates', () => {
    expect(hasTrustedUpdatePublisher('provider: generic\nurl: https://example.test/updates')).toBe(false)
    expect(hasTrustedUpdatePublisher('publisherName: null')).toBe(false)
    expect(hasTrustedUpdatePublisher('publisherName: false')).toBe(false)
    expect(hasTrustedUpdatePublisher('publisherName: ""')).toBe(false)
    expect(hasTrustedUpdatePublisher('publisherName: "Codeva Ltd."')).toBe(true)
    expect(hasTrustedUpdatePublisher('publisherName:\n  - "Codeva Ltd."\n  - "Codeva LLC"')).toBe(true)
  })

  it('requires an available Windows release with a version and electron-updater checksum', () => {
    expect(inspectCodicUpdateCatalog({ windows: { available: true, version: '0.2.0', sha512 } }))
      .toEqual({ ready: true, version: '0.2.0' })
    expect(inspectCodicUpdateCatalog({ windows: { available: false } }))
      .toEqual({ ready: false, version: null })
    expect(inspectCodicUpdateCatalog({ windows: { available: true, version: '0.2.0', sha512: null } }))
      .toEqual({ ready: false, version: '0.2.0' })
    expect(inspectCodicUpdateCatalog({ windows: { available: true, version: '../latest', sha512 } }))
      .toEqual({ ready: false, version: null })
  })

  it('reads the public catalog without caching and rejects an unavailable catalog safely', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      windows: { available: true, version: '0.2.0', sha512 },
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
    await expect(fetchCodicUpdateFeedReadiness('https://api.example.test/api/v1/downloads/codic', fetcher))
      .resolves.toEqual({ ready: true, version: '0.2.0' })
    expect(fetcher).toHaveBeenCalledWith('https://api.example.test/api/v1/downloads/codic', expect.objectContaining({
      cache: 'no-store', headers: { Accept: 'application/json' },
    }))

    const failedFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 }))
    await expect(fetchCodicUpdateFeedReadiness('https://api.example.test/api/v1/downloads/codic', failedFetch))
      .rejects.toThrow('Release catalog request failed (503).')
  })
})
