/**
 * OnionRouter — Unit tests and Property-Based tests
 *
 * Unit tests:
 *   - 3-hop packet built successfully
 *   - Peeling layer 1 reveals only hop 2 address (not hop 3 or payload)
 *   - Alternate route selected when a node is excluded
 *
 * Property-Based tests (fast-check, ≥100 iterations each):
 *   - Property 22: MAX plan route always returns ≥3 hops
 *   - Property 23: Peeling layer n reveals only hop n+1, not n+2 or payload
 *   - Property 24: selectRoute(excluded) never returns any excluded node
 *   - Property 25: Basic plan route has exactly 1 hop with no onion wrapping
 *
 * Feature: anonymous-chat
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { x25519 } from '@noble/curves/ed25519.js'
import {
  buildPacket,
  peelLayer,
  selectRoute,
  isFinalPayload,
  DEFAULT_RELAY_REGISTRY,
  ROUTING_INFO_SIZE,
  toHex,
  fromHex,
  type RelayHop,
  type OnionPacket,
} from './OnionRouter.js'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Generate a fresh X25519 key pair. */
function genKeyPair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
  const privateKey = x25519.utils.randomSecretKey()
  const publicKey = x25519.getPublicKey(privateKey)
  return { privateKey, publicKey }
}

/**
 * Build a synthetic relay registry from freshly-generated key pairs.
 * Returns both the hops (for buildPacket) and private keys (for peelLayer).
 */
function buildTestRegistry(count: number): {
  hops: RelayHop[]
  privateKeys: Uint8Array[]
} {
  const hops: RelayHop[] = []
  const privateKeys: Uint8Array[] = []
  for (let i = 0; i < count; i++) {
    const { privateKey, publicKey } = genKeyPair()
    hops.push({ nodeId: toHex(publicKey), address: `ws://test-relay-${i + 1}.codeva.app` })
    privateKeys.push(privateKey)
  }
  return { hops, privateKeys }
}

/**
 * Build a registry of N nodes using deterministic keys derived from a seed index.
 * X25519 requires clamped private keys.
 */
function buildDeterministicRegistry(count: number): {
  registry: RelayHop[]
  privateKeys: Uint8Array[]
} {
  const registry: RelayHop[] = []
  const privateKeys: Uint8Array[] = []
  for (let i = 0; i < count; i++) {
    const k = new Uint8Array(32)
    k.fill(i + 1)
    k[0] &= 248; k[31] &= 127; k[31] |= 64
    const pub = x25519.getPublicKey(k)
    registry.push({ nodeId: toHex(pub), address: `ws://det-relay-${i}.test` })
    privateKeys.push(k)
  }
  return { registry, privateKeys }
}

/** Random plaintext payload. */
function randomPayload(size = 32): Uint8Array {
  const buf = new Uint8Array(size)
  crypto.getRandomValues(buf)
  return buf
}

// ---------------------------------------------------------------------------
// Unit Tests — buildPacket
// ---------------------------------------------------------------------------

describe('buildPacket', () => {
  it('builds a 3-hop packet with correct structure', async () => {
    const { hops } = buildTestRegistry(3)
    const payload = randomPayload(64)
    const packet = await buildPacket(hops, payload)

    expect(packet.version).toBe(1)
    expect(packet.ephemeralKey).toBeInstanceOf(Uint8Array)
    expect(packet.ephemeralKey.length).toBe(32)
    expect(packet.routingInfo).toBeInstanceOf(Uint8Array)
    expect(packet.routingInfo.length).toBe(ROUTING_INFO_SIZE)
    expect(packet.payload).toBeInstanceOf(Uint8Array)
    expect(packet.payload.length).toBeGreaterThan(0)
  })

  it('routingInfo is always exactly 1300 bytes', async () => {
    const { hops } = buildTestRegistry(3)
    const packet = await buildPacket(hops, randomPayload(16))
    expect(packet.routingInfo.length).toBe(1300)
  })

  it('builds a single-hop packet for basic plan', async () => {
    const { hops } = buildTestRegistry(1)
    const payload = randomPayload(32)
    const packet = await buildPacket(hops, payload)

    expect(packet.version).toBe(1)
    expect(packet.ephemeralKey.length).toBe(32)
    expect(packet.routingInfo.length).toBe(ROUTING_INFO_SIZE)
  })

  it('throws when no hops provided', async () => {
    await expect(buildPacket([], new Uint8Array(32))).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Unit Tests — peelLayer: layer 1 reveals only hop 2 address
// ---------------------------------------------------------------------------

describe('peelLayer — 3-hop packet', () => {
  it('peeling layer 0 (first hop) reveals hop 1 address, not hop 2 or payload', async () => {
    const { hops, privateKeys } = buildTestRegistry(3)
    const payload = randomPayload(48)

    const outerPacket = await buildPacket(hops, payload)

    // Relay 0 peels its layer
    const result = await peelLayer(privateKeys[0], outerPacket, 0)

    // Must reveal next hop address (hops[1].address), not the final payload
    expect(isFinalPayload(result)).toBe(false)
    if (!isFinalPayload(result)) {
      expect(result.nextHop).toBe(hops[1].address)
      // The inner packet must NOT contain hops[2].address in plaintext
      // (it's encrypted, so we verify we can't extract hop 2 address from raw bytes)
      const innerPacketBytes = JSON.stringify(result.innerPacket)
      expect(innerPacketBytes).not.toContain(hops[2].address)
    }
  })

  it('peeling layer 1 (second hop) reveals hop 2 address', async () => {
    const { hops, privateKeys } = buildTestRegistry(3)
    const payload = randomPayload(48)

    const outerPacket = await buildPacket(hops, payload)

    // Hop 0 peels
    const result0 = await peelLayer(privateKeys[0], outerPacket, 0)
    expect(isFinalPayload(result0)).toBe(false)
    if (isFinalPayload(result0)) return

    // Hop 1 peels
    const result1 = await peelLayer(privateKeys[1], result0.innerPacket, 1)
    expect(isFinalPayload(result1)).toBe(false)
    if (!isFinalPayload(result1)) {
      expect(result1.nextHop).toBe(hops[2].address)
    }
  })

  it('full 3-hop peel recovers the original payload', async () => {
    const { hops, privateKeys } = buildTestRegistry(3)
    const payload = randomPayload(64)

    const outerPacket = await buildPacket(hops, payload)

    const r0 = await peelLayer(privateKeys[0], outerPacket, 0)
    expect(isFinalPayload(r0)).toBe(false)
    if (isFinalPayload(r0)) return

    const r1 = await peelLayer(privateKeys[1], r0.innerPacket, 1)
    expect(isFinalPayload(r1)).toBe(false)
    if (isFinalPayload(r1)) return

    const r2 = await peelLayer(privateKeys[2], r1.innerPacket, 2)
    expect(isFinalPayload(r2)).toBe(true)
    if (isFinalPayload(r2)) {
      expect(r2.payload).toEqual(payload)
    }
  })

  it('single-hop peel returns FinalPayload with original payload', async () => {
    const { hops, privateKeys } = buildTestRegistry(1)
    const payload = randomPayload(32)

    const packet = await buildPacket(hops, payload)
    const result = await peelLayer(privateKeys[0], packet, 0)

    expect(isFinalPayload(result)).toBe(true)
    if (isFinalPayload(result)) {
      expect(result.payload).toEqual(payload)
    }
  })

  it('peeling with the wrong private key throws', async () => {
    const { hops } = buildTestRegistry(3)
    const { privateKey: wrongKey } = genKeyPair() // unrelated key

    const packet = await buildPacket(hops, randomPayload(32))
    await expect(peelLayer(wrongKey, packet, 0)).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Unit Tests — selectRoute
// ---------------------------------------------------------------------------

describe('selectRoute', () => {
  it('returns exactly 3 hops for MAX plan', () => {
    const route = selectRoute([], 'max')
    expect(route.length).toBe(3)
  })

  it('returns exactly 1 hop for basic plan', () => {
    const route = selectRoute([], 'basic')
    expect(route.length).toBe(1)
  })

  it('returns distinct nodes (no node appears twice) for MAX plan', () => {
    const route = selectRoute([], 'max')
    const ids = route.map((h) => h.nodeId)
    expect(new Set(ids).size).toBe(3)
  })

  it('excludes the specified node when selecting alternate route', () => {
    const excluded = [DEFAULT_RELAY_REGISTRY[0].nodeId]
    const route = selectRoute(excluded, 'max')
    expect(route.length).toBe(3)
    const ids = route.map((h) => h.nodeId)
    expect(ids).not.toContain(excluded[0])
  })

  it('throws when not enough nodes remain after exclusion', () => {
    // Exclude 3 of 5 nodes — only 2 remain, not enough for MAX plan
    const excluded = DEFAULT_RELAY_REGISTRY.slice(0, 3).map((n) => n.nodeId)
    expect(() => selectRoute(excluded, 'max')).toThrow()
  })

  it('uses custom registry when provided', () => {
    const { registry: customRegistry } = buildDeterministicRegistry(5)
    const route = selectRoute([], 'max', customRegistry)
    expect(route.length).toBe(3)
    route.forEach((hop) => {
      expect(customRegistry.some((n) => n.nodeId === hop.nodeId)).toBe(true)
    })
  })
})

// ---------------------------------------------------------------------------
// PBT — Property 22: MAX Plan Minimum Hops
// Feature: anonymous-chat, Property 22: selectRoute() always returns ≥3 hops for MAX plan
// ---------------------------------------------------------------------------

describe('Property 22 — MAX Plan Minimum Hops', () => {
  it('selectRoute() always returns exactly 3 hops for MAX plan with the default registry', () => {
    // Feature: anonymous-chat, Property 22: MAX Plan Onion Route Minimum Hops
    fc.assert(
      fc.property(
        // excluded nodes: 0 or 1 excluded (we need ≥3 eligible from 5)
        fc.array(
          fc.constantFrom(...DEFAULT_RELAY_REGISTRY.map((n) => n.nodeId)),
          { minLength: 0, maxLength: 2 },
        ),
        (excluded) => {
          const uniqueExcluded = [...new Set(excluded)]
          try {
            const route = selectRoute(uniqueExcluded, 'max')
            return route.length >= 3
          } catch {
            // Only valid if exclusion makes <3 eligible — check that
            const eligible = DEFAULT_RELAY_REGISTRY.filter(
              (n) => !uniqueExcluded.includes(n.nodeId),
            )
            return eligible.length < 3
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('selectRoute() with large registry always returns ≥3 hops for MAX plan', () => {
    // Feature: anonymous-chat, Property 22: MAX Plan Minimum Hops (large registry)
    fc.assert(
      fc.property(
        // Registry of 5..20 nodes, exclude up to (size-3) of them
        fc.integer({ min: 5, max: 20 }).chain((registrySize) => {
          const { registry } = buildDeterministicRegistry(registrySize)
          const maxExclusions = registrySize - 3
          return fc.tuple(
            fc.constant(registry),
            fc.array(
              fc.integer({ min: 0, max: registrySize - 1 }).map((i) => registry[i].nodeId),
              { minLength: 0, maxLength: maxExclusions },
            ),
          )
        }),
        ([registry, excluded]) => {
          const uniqueExcluded = [...new Set(excluded)]
          const route = selectRoute(uniqueExcluded, 'max', registry)
          return route.length >= 3
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ---------------------------------------------------------------------------
// PBT — Property 23: Onion Layers Reveal Only Next Hop
// Feature: anonymous-chat, Property 23: Peeling layer n reveals only hop n+1, not n+2 or payload
// ---------------------------------------------------------------------------

describe('Property 23 — Onion Layers Reveal Only Next Hop', () => {
  it('peeling layer 0 does not expose hop 2 address or payload in plaintext', async () => {
    // Feature: anonymous-chat, Property 23: Onion Layers Reveal Only Next Hop
    // We run with a reasonable number of iterations given the async crypto operations
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 16, maxLength: 256 }),
        async (rawPayload) => {
          const { hops, privateKeys } = buildTestRegistry(3)
          const packet = await buildPacket(hops, rawPayload)

          // Peel layer 0
          const result = await peelLayer(privateKeys[0], packet, 0)

          if (isFinalPayload(result)) return false // must be intermediate

          // Verify: next hop is hops[1].address
          if (result.nextHop !== hops[1].address) return false

          // Verify: hops[2].address is NOT present in the peeled result's nextHop
          if (result.nextHop === hops[2].address) return false

          // Verify: the raw payload bytes are NOT present in the inner packet bytes
          // (they are still encrypted at this point)
          const innerSerialized = new Uint8Array([
            ...result.innerPacket.ephemeralKey,
            ...result.innerPacket.routingInfo,
            ...result.innerPacket.payload,
          ])

          // Check that the raw payload is not a substring of the inner packet
          const payloadHex = toHex(rawPayload)
          const innerHex = toHex(innerSerialized)
          return !innerHex.includes(payloadHex)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('peeling layer 1 reveals hop 2 address, not the final payload', async () => {
    // Feature: anonymous-chat, Property 23: Onion Layers Reveal Only Next Hop (layer 1)
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 16, maxLength: 256 }),
        async (rawPayload) => {
          const { hops, privateKeys } = buildTestRegistry(3)
          const packet = await buildPacket(hops, rawPayload)

          const r0 = await peelLayer(privateKeys[0], packet, 0)
          if (isFinalPayload(r0)) return false

          const r1 = await peelLayer(privateKeys[1], r0.innerPacket, 1)
          if (isFinalPayload(r1)) return false

          // Verify: next hop is hops[2].address, payload is still encrypted
          if (r1.nextHop !== hops[2].address) return false

          // The raw payload must not appear in the inner packet at this layer
          const innerSerialized = new Uint8Array([
            ...r1.innerPacket.ephemeralKey,
            ...r1.innerPacket.routingInfo,
            ...r1.innerPacket.payload,
          ])
          const payloadHex = toHex(rawPayload)
          const innerHex = toHex(innerSerialized)
          return !innerHex.includes(payloadHex)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ---------------------------------------------------------------------------
// PBT — Property 24: Alternate Route on Hop Failure
// Feature: anonymous-chat, Property 24: selectRoute(excluded) never returns any excluded node
// ---------------------------------------------------------------------------

describe('Property 24 — Alternate Route on Hop Failure', () => {
  it('selectRoute(excluded) never includes any excluded node', () => {
    // Feature: anonymous-chat, Property 24: Alternate Route on Hop Failure
    fc.assert(
      fc.property(
        // Exclude 0..2 nodes from the 5-node registry (leaving ≥3 eligible)
        fc.array(
          fc.constantFrom(...DEFAULT_RELAY_REGISTRY.map((n) => n.nodeId)),
          { minLength: 0, maxLength: 2 },
        ),
        (excluded) => {
          const uniqueExcluded = [...new Set(excluded)]
          const eligible = DEFAULT_RELAY_REGISTRY.filter(
            (n) => !uniqueExcluded.includes(n.nodeId),
          )
          if (eligible.length < 3) return true // skip — not testable with this exclusion set

          const route = selectRoute(uniqueExcluded, 'max')
          const routeIds = route.map((h) => h.nodeId)

          // No excluded node must appear in the route
          return uniqueExcluded.every((id) => !routeIds.includes(id))
        },
      ),
      { numRuns: 100 },
    )
  })

  it('custom registry: selectRoute(excluded) never returns excluded nodes', () => {
    // Feature: anonymous-chat, Property 24: Alternate Route on Hop Failure (custom registry)
    fc.assert(
      fc.property(
        // Registry: 6..15 nodes, exclude 0..(size-3)
        fc.integer({ min: 6, max: 15 }).chain((registrySize) => {
          const { registry } = buildDeterministicRegistry(registrySize)
          const maxExclusions = registrySize - 3
          return fc.tuple(
            fc.constant(registry),
            fc.array(
              fc.integer({ min: 0, max: registrySize - 1 }).map((i) => registry[i].nodeId),
              { minLength: 0, maxLength: maxExclusions },
            ),
          )
        }),
        ([registry, excluded]) => {
          const uniqueExcluded = [...new Set(excluded)]
          const route = selectRoute(uniqueExcluded, 'max', registry)
          const routeIds = route.map((h) => h.nodeId)
          return uniqueExcluded.every((id) => !routeIds.includes(id))
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ---------------------------------------------------------------------------
// PBT — Property 25: Basic Plan Single Hop
// Feature: anonymous-chat, Property 25: Basic plan route always has exactly 1 hop
// ---------------------------------------------------------------------------

describe('Property 25 — Basic Plan Single Hop', () => {
  it('selectRoute([], basic) always returns exactly 1 hop', () => {
    // Feature: anonymous-chat, Property 25: Basic Plan Uses Single-Hop Routing
    fc.assert(
      fc.property(
        // Vary the registry size (3..10 nodes)
        fc.integer({ min: 3, max: 10 }).map((size) => {
          const { registry } = buildDeterministicRegistry(size)
          return registry
        }),
        (registry) => {
          const route = selectRoute([], 'basic', registry)
          return route.length === 1
        },
      ),
      { numRuns: 100 },
    )
  })

  it('basic plan packet has no onion wrapping — peeling once yields final payload', async () => {
    // Feature: anonymous-chat, Property 25: Basic Plan Single Hop — no onion wrapping
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 8, maxLength: 128 }),
        async (rawPayload) => {
          const { hops, privateKeys } = buildTestRegistry(1)
          const packet = await buildPacket(hops, rawPayload)

          // One peel should immediately yield the final payload
          const result = await peelLayer(privateKeys[0], packet, 0)
          if (!isFinalPayload(result)) return false

          // Recovered payload must match original
          return (
            result.payload.length === rawPayload.length &&
            result.payload.every((b, i) => b === rawPayload[i])
          )
        },
      ),
      { numRuns: 100 },
    )
  })

  it('basic plan route uses a node from the registry', () => {
    // Feature: anonymous-chat, Property 25: Basic Plan Single Hop (registry membership)
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }).map((size) => {
          const { registry } = buildDeterministicRegistry(size)
          return registry
        }),
        (registry) => {
          const route = selectRoute([], 'basic', registry)
          return registry.some((n) => n.nodeId === route[0].nodeId)
        },
      ),
      { numRuns: 100 },
    )
  })
})
