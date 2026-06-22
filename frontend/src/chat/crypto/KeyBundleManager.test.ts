/**
 * Tests for KeyBundleManager
 * REQ-2.1, REQ-2.4, REQ-2.5
 *
 * Covers:
 *  - Unit tests: bundle contains ≥10 OTKs, signed pre-key signature verifies,
 *    OTK exhausted warning fires
 *  - PBT Property 3 (Key Bundle Structural Validity): generated bundle always has
 *    valid signature and ≥10 OTKs for any key pair
 */

import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'
import { ed25519 } from '@noble/curves/ed25519.js'
import {
  generateBundle,
  verifyEd25519Signature,
  serializeBundle,
  deserializeBundle,
  KeyBundleManager,
  INITIAL_OTK_COUNT,
  OTK_REPLENISH_THRESHOLD,
  type KeyBundle,
  type WsSender,
} from './KeyBundleManager.js'
import { generateIdentity, deriveIdentifier, type AnonymousIdentity } from '../identity/IdentityManager.js'

// ---------------------------------------------------------------------------
// Test environment — ensure SubtleCrypto / globalThis.dispatchEvent is available
// (jsdom already provides dispatchEvent; Node 18+ provides crypto)
// ---------------------------------------------------------------------------

if (!globalThis.crypto?.subtle) {
  const { webcrypto } = await import('node:crypto')
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
    configurable: true,
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeIdentity(): AnonymousIdentity {
  const { publicKey, privateKey } = generateIdentity()
  return {
    publicKey,
    privateKey,
    identifier: deriveIdentifier(publicKey),
    createdAt: Date.now(),
  }
}

/** Build a mock WsSender that responds with the given bundle */
function makeMockSender(responseBundle?: KeyBundle): WsSender {
  return {
    send: vi.fn(async (_type: string, _payload: unknown) => {
      if (responseBundle) {
        return serializeBundle(responseBundle)
      }
      return undefined
    }),
  }
}

// ---------------------------------------------------------------------------
// Unit Tests — generateBundle (pure function)
// ---------------------------------------------------------------------------

describe('generateBundle (pure)', () => {
  it('returns a bundle with identityKey matching the supplied identity public key', () => {
    const identity = makeIdentity()
    const { bundle } = generateBundle(identity)
    expect(bundle.identityKey).toEqual(identity.publicKey)
  })

  it('bundle contains exactly INITIAL_OTK_COUNT (10) one-time pre-keys by default', () => {
    const identity = makeIdentity()
    const { bundle } = generateBundle(identity)
    expect(bundle.oneTimePreKeys.length).toBeGreaterThanOrEqual(INITIAL_OTK_COUNT)
    expect(bundle.oneTimePreKeys.length).toBe(INITIAL_OTK_COUNT)
  })

  it('signed pre-key signature verifies against the identity public key', () => {
    const identity = makeIdentity()
    const { bundle } = generateBundle(identity)
    const valid = verifyEd25519Signature(
      bundle.signedPreKey.publicKey,
      bundle.signedPreKey.signature,
      identity.publicKey,
    )
    expect(valid).toBe(true)
  })

  it('signed pre-key signature is 64 bytes (Ed25519)', () => {
    const identity = makeIdentity()
    const { bundle } = generateBundle(identity)
    expect(bundle.signedPreKey.signature.length).toBe(64)
  })

  it('signed pre-key public key is 32 bytes (X25519)', () => {
    const identity = makeIdentity()
    const { bundle } = generateBundle(identity)
    expect(bundle.signedPreKey.publicKey.length).toBe(32)
  })

  it('all OTK public keys are 32 bytes (X25519)', () => {
    const identity = makeIdentity()
    const { bundle } = generateBundle(identity)
    for (const otk of bundle.oneTimePreKeys) {
      expect(otk.publicKey.length).toBe(32)
    }
  })

  it('all OTK key IDs are unique and sequentially numbered from 1', () => {
    const identity = makeIdentity()
    const { bundle } = generateBundle(identity)
    const ids = bundle.oneTimePreKeys.map((o) => o.keyId)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
    expect(ids[0]).toBe(1)
    expect(ids[ids.length - 1]).toBe(INITIAL_OTK_COUNT)
  })

  it('localStore holds private keys for all OTKs and the signed pre-key', () => {
    const identity = makeIdentity()
    const { localStore } = generateBundle(identity)
    expect(localStore.signedPreKey.privateKey.length).toBe(32)
    expect(localStore.oneTimePreKeys.length).toBe(INITIAL_OTK_COUNT)
    for (const otk of localStore.oneTimePreKeys) {
      expect(otk.privateKey.length).toBe(32)
    }
  })

  it('the signed pre-key signature is rejected for a different identity public key', () => {
    const identity = makeIdentity()
    const { bundle } = generateBundle(identity)
    const otherIdentity = makeIdentity()
    const valid = verifyEd25519Signature(
      bundle.signedPreKey.publicKey,
      bundle.signedPreKey.signature,
      otherIdentity.publicKey,
    )
    expect(valid).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Unit Tests — KeyBundleManager.publishBundle
// ---------------------------------------------------------------------------

describe('KeyBundleManager.publishBundle', () => {
  it('sends anon_chat.key_bundle_pub frame when WS sender is configured', async () => {
    const sender = makeMockSender()
    const manager = new KeyBundleManager(sender)
    const identity = makeIdentity()
    const bundle = manager.generateBundle(identity)

    await manager.publishBundle(bundle)

    expect(sender.send).toHaveBeenCalledOnce()
    const [frameType, payload] = (sender.send as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(frameType).toBe('anon_chat.key_bundle_pub')
    // Payload should be serialized (hex strings, not Uint8Arrays)
    expect(typeof (payload as { identityKey: unknown }).identityKey).toBe('string')
  })

  it('is a no-op (does not throw) when no WS sender is configured', async () => {
    const manager = new KeyBundleManager(null)
    const identity = makeIdentity()
    const bundle = manager.generateBundle(identity)
    // Must not throw
    await expect(manager.publishBundle(bundle)).resolves.toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Unit Tests — KeyBundleManager.fetchBundle
// ---------------------------------------------------------------------------

describe('KeyBundleManager.fetchBundle', () => {
  it('sends anon_chat.key_bundle_req and returns the deserialized bundle', async () => {
    const identity = makeIdentity()
    const { bundle: remoteBundle } = generateBundle(identity)
    const sender = makeMockSender(remoteBundle)
    const manager = new KeyBundleManager(sender)

    const fetched = await manager.fetchBundle('recipient-id-123')

    expect(sender.send).toHaveBeenCalledOnce()
    const [frameType, payload] = (sender.send as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(frameType).toBe('anon_chat.key_bundle_req')
    expect((payload as { recipientId: string }).recipientId).toBe('recipient-id-123')
    expect(fetched.identityKey).toEqual(remoteBundle.identityKey)
    expect(fetched.oneTimePreKeys.length).toBe(remoteBundle.oneTimePreKeys.length)
  })

  it('throws when no WS sender is configured', async () => {
    const manager = new KeyBundleManager(null)
    await expect(manager.fetchBundle('some-id')).rejects.toThrow()
  })

  it('emits OTK_EXHAUSTED warning when server response has zero OTKs (REQ-2.4)', async () => {
    const identity = makeIdentity()
    const { bundle: remoteBundle } = generateBundle(identity)
    // Simulate exhausted OTKs — server returns bundle with no OTKs
    const exhaustedBundle: KeyBundle = { ...remoteBundle, oneTimePreKeys: [] }
    const sender = makeMockSender(exhaustedBundle)
    const manager = new KeyBundleManager(sender)

    // Listen for the CustomEvent warning
    const warnings: CustomEvent[] = []
    const handler = (e: Event) => warnings.push(e as CustomEvent)
    globalThis.addEventListener('anon_chat:warning', handler)

    try {
      const fetched = await manager.fetchBundle('recipient-id')
      // Session should still be established (with signed pre-key only)
      expect(fetched.oneTimePreKeys.length).toBe(0)
      // Warning must have been emitted
      expect(warnings.length).toBe(1)
      expect(warnings[0].detail.type).toBe('OTK_EXHAUSTED')
    } finally {
      globalThis.removeEventListener('anon_chat:warning', handler)
    }
  })
})

// ---------------------------------------------------------------------------
// Unit Tests — OTK exhaustion and replenishment
// ---------------------------------------------------------------------------

describe('KeyBundleManager — OTK exhaustion', () => {
  it('consumeOneTimePreKey emits OTK_EXHAUSTED when store is empty', () => {
    const manager = new KeyBundleManager()

    // No bundle generated — store is empty
    const warnings: CustomEvent[] = []
    const handler = (e: Event) => warnings.push(e as CustomEvent)
    globalThis.addEventListener('anon_chat:warning', handler)

    try {
      const result = manager.consumeOneTimePreKey()
      expect(result).toBeNull()
      expect(warnings.length).toBe(1)
      expect(warnings[0].detail.type).toBe('OTK_EXHAUSTED')
    } finally {
      globalThis.removeEventListener('anon_chat:warning', handler)
    }
  })

  it('consumeOneTimePreKey returns the next OTK and decrements count', () => {
    const identity = makeIdentity()
    const manager = new KeyBundleManager()
    manager.generateBundle(identity)
    expect(manager.localOtkCount).toBe(INITIAL_OTK_COUNT)

    const otk = manager.consumeOneTimePreKey()
    expect(otk).not.toBeNull()
    expect(otk!.publicKey.length).toBe(32)
    expect(manager.localOtkCount).toBe(INITIAL_OTK_COUNT - 1)
  })

  it('replenishOneTimePreKeys sends WS frame and restores OTK count', async () => {
    const sender: WsSender = { send: vi.fn(async () => undefined) }
    const identity = makeIdentity()
    const manager = new KeyBundleManager(sender)
    manager.generateBundle(identity)

    // Consume OTKs until below threshold
    while (manager.localOtkCount >= OTK_REPLENISH_THRESHOLD) {
      manager.consumeOneTimePreKey()
    }
    expect(manager.localOtkCount).toBeLessThan(OTK_REPLENISH_THRESHOLD)

    await manager.replenishOneTimePreKeys(identity)

    // Should be restored to INITIAL_OTK_COUNT
    expect(manager.localOtkCount).toBe(INITIAL_OTK_COUNT)
    // WS frame must have been sent (replenish publish)
    expect(sender.send).toHaveBeenCalled()
  })

  it('replenishOneTimePreKeys is a no-op when count is above threshold', async () => {
    const sender: WsSender = { send: vi.fn(async () => undefined) }
    const identity = makeIdentity()
    const manager = new KeyBundleManager(sender)
    manager.generateBundle(identity)

    await manager.replenishOneTimePreKeys(identity)

    // Send should not have been called — count was sufficient
    expect(sender.send).not.toHaveBeenCalled()
    expect(manager.localOtkCount).toBe(INITIAL_OTK_COUNT)
  })
})

// ---------------------------------------------------------------------------
// Unit Tests — serialization round-trip
// ---------------------------------------------------------------------------

describe('serializeBundle / deserializeBundle', () => {
  it('round-trips a bundle with no data loss', () => {
    const identity = makeIdentity()
    const { bundle } = generateBundle(identity)
    const serialized = serializeBundle(bundle)
    const restored = deserializeBundle(serialized)

    expect(restored.identityKey).toEqual(bundle.identityKey)
    expect(restored.signedPreKey.keyId).toBe(bundle.signedPreKey.keyId)
    expect(restored.signedPreKey.publicKey).toEqual(bundle.signedPreKey.publicKey)
    expect(restored.signedPreKey.signature).toEqual(bundle.signedPreKey.signature)
    expect(restored.oneTimePreKeys.length).toBe(bundle.oneTimePreKeys.length)
    for (let i = 0; i < bundle.oneTimePreKeys.length; i++) {
      expect(restored.oneTimePreKeys[i].keyId).toBe(bundle.oneTimePreKeys[i].keyId)
      expect(restored.oneTimePreKeys[i].publicKey).toEqual(bundle.oneTimePreKeys[i].publicKey)
    }
  })

  it('serialized bundle uses hex strings, not Uint8Arrays', () => {
    const identity = makeIdentity()
    const { bundle } = generateBundle(identity)
    const serialized = serializeBundle(bundle)

    expect(typeof serialized.identityKey).toBe('string')
    expect(typeof serialized.signedPreKey.publicKey).toBe('string')
    expect(typeof serialized.signedPreKey.signature).toBe('string')
    for (const otk of serialized.oneTimePreKeys) {
      expect(typeof otk.publicKey).toBe('string')
    }
  })
})

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

// Feature: anonymous-chat, Property 3: Key Bundle Structural Validity
describe('PBT — Property 3: Key Bundle Structural Validity', () => {
  it(
    'generated bundle always has valid signature and ≥10 OTKs for any key pair',
    () => {
      // Validates: Requirements 2.1
      //
      // For any randomly generated Ed25519 key pair, generateBundle must produce:
      //  1. A signed pre-key whose Ed25519 signature verifies against the identity public key
      //  2. At least INITIAL_OTK_COUNT (10) one-time pre-keys
      //  3. Every OTK public key is 32 bytes
      //  4. The signed pre-key public key is 32 bytes
      fc.assert(
        fc.property(
          // Generate a random 32-byte private key seed; derive a real Ed25519 key pair from it
          fc.uint8Array({ minLength: 32, maxLength: 32 }),
          (privateKeySeed) => {
            const privateKey = privateKeySeed
            const publicKey = ed25519.getPublicKey(privateKey)
            const identity: AnonymousIdentity = {
              publicKey,
              privateKey,
              identifier: deriveIdentifier(publicKey),
              createdAt: Date.now(),
            }

            const { bundle } = generateBundle(identity)

            // 1. Identity key in bundle matches identity public key
            const identityKeyMatches =
              bundle.identityKey.length === 32 &&
              bundle.identityKey.every((byte, i) => byte === identity.publicKey[i])

            // 2. Signed pre-key signature is valid
            const signatureValid = verifyEd25519Signature(
              bundle.signedPreKey.publicKey,
              bundle.signedPreKey.signature,
              identity.publicKey,
            )

            // 3. At least 10 OTKs
            const hasEnoughOtks = bundle.oneTimePreKeys.length >= INITIAL_OTK_COUNT

            // 4. All OTK public keys are 32 bytes
            const allOtksValid = bundle.oneTimePreKeys.every((otk) => otk.publicKey.length === 32)

            // 5. Signed pre-key is 32 bytes
            const spkValid = bundle.signedPreKey.publicKey.length === 32

            // 6. Signature is 64 bytes (Ed25519)
            const sigLengthValid = bundle.signedPreKey.signature.length === 64

            return (
              identityKeyMatches &&
              signatureValid &&
              hasEnoughOtks &&
              allOtksValid &&
              spkValid &&
              sigLengthValid
            )
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})
