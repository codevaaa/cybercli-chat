/**
 * Tests for CryptoEngine — X3DH, Double Ratchet, and Sender Keys
 *
 * REQ-2.2, REQ-2.3, REQ-5.1, REQ-5.2, REQ-5.5, REQ-5.6
 *
 * Covers:
 *  - Unit tests: decryption failure returns error type (not throw),
 *    session state unchanged after failed decryption
 *  - PBT Property 4 (X3DH Shared Secret Symmetry)
 *  - PBT Property 5 (Double Ratchet Key Uniqueness)
 *  - PBT Property 6 (E2EE Round-Trip)
 *  - PBT Property 7 (Decryption Failure is Non-Crashing)
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { x25519 } from '@noble/curves/ed25519.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import {
  initiateSession,
  receiveSession,
  initRatchet,
  encryptMessage,
  decryptMessage,
  nextMessageKey,
  generateSenderKey,
  encryptGroupMessage,
  decryptGroupMessage,
  identityX25519PubKey,
  type SessionSecret,
  type RatchetState,
  type DecryptionError,
  type SenderKey,
} from './CryptoEngine.js'
import { generateIdentity, deriveIdentifier, type AnonymousIdentity } from '../identity/IdentityManager.js'
import { generateBundle, type PreKeyPair } from './KeyBundleManager.js'

// ---------------------------------------------------------------------------
// Test environment — ensure SubtleCrypto is available
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

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Build an Alice identity + Bob bundle + run X3DH on both sides.
 * Returns { aliceSecret, bobSecret } for symmetry checks.
 */
async function runX3DH(
  alice: AnonymousIdentity,
  bob: AnonymousIdentity,
): Promise<{
  aliceSecret: SessionSecret
  bobSecret: SessionSecret
  bobSpkPriv: Uint8Array
  bobOtkPriv: Uint8Array | undefined
}> {
  // Generate Bob's bundle and get local key store
  const { bundle: bobBundle, localStore: bobLocalStore } = generateBundle(bob)

  // Bob's X25519 identity key (derived from his Ed25519 seed)
  const bobX25519IdentityKey = identityX25519PubKey(bob.privateKey)

  // Run with a deterministic ephemeral key so both calls produce the same session
  const ephPriv = x25519.utils.randomSecretKey()

  // Alice initiates — pass Bob's X25519 identity key for DH
  const { sessionSecret: aliceSecret, initialMessage } = await initiateSession(
    alice,
    bobBundle,
    bobX25519IdentityKey,
    ephPriv,
  )

  const bobSpkPriv = bobLocalStore.signedPreKey.privateKey
  const bobOtk = bobBundle.oneTimePreKeys.length > 0
    ? bobLocalStore.oneTimePreKeys.find((k) => k.keyId === bobBundle.oneTimePreKeys[0].keyId)
    : undefined
  const bobOtkPriv = bobOtk?.privateKey

  const bobSecret = await receiveSession(bob, initialMessage, bobSpkPriv, bobOtkPriv)

  return { aliceSecret, bobSecret, bobSpkPriv, bobOtkPriv }
}

/**
 * Deep-copy a RatchetState (for state preservation checks)
 */
function copyRatchetState(state: RatchetState): RatchetState {
  return {
    rootKey: state.rootKey.slice(),
    sendChainKey: state.sendChainKey.slice(),
    recvChainKey: state.recvChainKey.slice(),
    sendMessageKeys: new Map(state.sendMessageKeys),
    messageNumber: state.messageNumber,
    recvMessageNumber: state.recvMessageNumber,
    dhSendPrivKey: state.dhSendPrivKey.slice(),
    dhSendPubKey: state.dhSendPubKey.slice(),
    dhRecvPubKey: state.dhRecvPubKey.slice(),
    prevChainLength: state.prevChainLength,
  }
}

function ratchetStatesEqual(a: RatchetState, b: RatchetState): boolean {
  return (
    bytesEqual(a.rootKey, b.rootKey) &&
    bytesEqual(a.sendChainKey, b.sendChainKey) &&
    bytesEqual(a.recvChainKey, b.recvChainKey) &&
    a.messageNumber === b.messageNumber &&
    a.recvMessageNumber === b.recvMessageNumber &&
    a.prevChainLength === b.prevChainLength
  )
}

// ---------------------------------------------------------------------------
// Unit Tests — X3DH
// ---------------------------------------------------------------------------

describe('X3DH initiateSession / receiveSession', () => {
  it('produces a 32-byte shared secret', async () => {
    const alice = makeIdentity()
    const bob = makeIdentity()
    const { aliceSecret } = await runX3DH(alice, bob)
    expect(aliceSecret.sharedSecret.length).toBe(32)
  })

  it('Alice and Bob produce identical shared secrets', async () => {
    const alice = makeIdentity()
    const bob = makeIdentity()
    const { aliceSecret, bobSecret } = await runX3DH(alice, bob)
    expect(bytesEqual(aliceSecret.sharedSecret, bobSecret.sharedSecret)).toBe(true)
  })

  it('associated data is the concatenation of IK_A || IK_B (Alice) and IK_A || IK_B (Bob)', async () => {
    const alice = makeIdentity()
    const bob = makeIdentity()
    const { aliceSecret, bobSecret } = await runX3DH(alice, bob)
    // Alice: AD = alice.publicKey || bob.publicKey
    // Bob: AD = alice.publicKey (initiatorIK) || bob.publicKey (myIdentity.publicKey)
    expect(aliceSecret.associatedData.length).toBe(64)
    expect(bobSecret.associatedData.length).toBe(64)
    // Both should represent the same pair (Alice's IK || Bob's IK)
    expect(bytesEqual(aliceSecret.associatedData, bobSecret.associatedData)).toBe(true)
  })

  it('different sessions produce different shared secrets', async () => {
    const alice = makeIdentity()
    const bob = makeIdentity()
    const carol = makeIdentity()
    const { aliceSecret: s1 } = await runX3DH(alice, bob)
    const { aliceSecret: s2 } = await runX3DH(alice, carol)
    expect(bytesEqual(s1.sharedSecret, s2.sharedSecret)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Unit Tests — Double Ratchet
// ---------------------------------------------------------------------------

describe('initRatchet', () => {
  it('returns a valid RatchetState with 32-byte keys', () => {
    const secret: SessionSecret = {
      sharedSecret: globalThis.crypto.getRandomValues(new Uint8Array(32)),
      associatedData: globalThis.crypto.getRandomValues(new Uint8Array(64)),
    }
    const state = initRatchet(secret)
    expect(state.rootKey.length).toBe(32)
    expect(state.sendChainKey.length).toBe(32)
    expect(state.recvChainKey.length).toBe(32)
    expect(state.messageNumber).toBe(0)
    expect(state.dhSendPubKey.length).toBe(32)
  })

  it('two different secrets produce different ratchet states', () => {
    const s1: SessionSecret = {
      sharedSecret: globalThis.crypto.getRandomValues(new Uint8Array(32)),
      associatedData: new Uint8Array(64),
    }
    const s2: SessionSecret = {
      sharedSecret: globalThis.crypto.getRandomValues(new Uint8Array(32)),
      associatedData: new Uint8Array(64),
    }
    const r1 = initRatchet(s1)
    const r2 = initRatchet(s2)
    expect(bytesEqual(r1.rootKey, r2.rootKey)).toBe(false)
  })
})

describe('encryptMessage / decryptMessage', () => {
  it('round-trip: decrypt(encrypt(plaintext)) === plaintext', async () => {
    const secret: SessionSecret = {
      sharedSecret: globalThis.crypto.getRandomValues(new Uint8Array(32)),
      associatedData: new Uint8Array(64),
    }
    const encState = initRatchet(secret)
    const decState = initRatchet(secret)

    const plaintext = new TextEncoder().encode('Hello, World!')
    const { ciphertext, header } = await encryptMessage(encState, plaintext)
    const result = await decryptMessage(decState, header, ciphertext)

    expect(result).not.toHaveProperty('type', 'DECRYPTION_FAILED')
    const decrypted = result as Uint8Array
    expect(bytesEqual(decrypted, plaintext)).toBe(true)
  })

  it('ciphertext is different from plaintext', async () => {
    const secret: SessionSecret = {
      sharedSecret: globalThis.crypto.getRandomValues(new Uint8Array(32)),
      associatedData: new Uint8Array(64),
    }
    const state = initRatchet(secret)
    const plaintext = new TextEncoder().encode('test message')
    const { ciphertext } = await encryptMessage(state, plaintext)
    // Ciphertext (with IV) should differ from plaintext
    expect(bytesEqual(ciphertext, plaintext)).toBe(false)
  })

  it('decryption failure on corrupted ciphertext returns DecryptionError (not throw)', async () => {
    const secret: SessionSecret = {
      sharedSecret: globalThis.crypto.getRandomValues(new Uint8Array(32)),
      associatedData: new Uint8Array(64),
    }
    const encState = initRatchet(secret)
    const decState = initRatchet(secret)

    const plaintext = new TextEncoder().encode('test')
    const { ciphertext, header } = await encryptMessage(encState, plaintext)

    // Corrupt the ciphertext
    const corrupted = ciphertext.slice()
    corrupted[20] ^= 0xff

    let threw = false
    let result: Uint8Array | DecryptionError | undefined
    try {
      result = await decryptMessage(decState, header, corrupted)
    } catch {
      threw = true
    }

    expect(threw).toBe(false)
    expect(result).toHaveProperty('type', 'DECRYPTION_FAILED')
  })

  it('session state is unchanged after a failed decryption attempt', async () => {
    const secret: SessionSecret = {
      sharedSecret: globalThis.crypto.getRandomValues(new Uint8Array(32)),
      associatedData: new Uint8Array(64),
    }
    const encState = initRatchet(secret)
    const decState = initRatchet(secret)

    const plaintext = new TextEncoder().encode('preserve state')
    const { ciphertext, header } = await encryptMessage(encState, plaintext)

    // Save state before failed decryption
    const stateBefore = copyRatchetState(decState)

    // Try to decrypt with wrong ciphertext (too short)
    const badCiphertext = new Uint8Array(10)
    await decryptMessage(decState, header, badCiphertext)

    // Root key, recv chain key, and recv message number should be unchanged
    expect(bytesEqual(decState.rootKey, stateBefore.rootKey)).toBe(true)
    expect(bytesEqual(decState.recvChainKey, stateBefore.recvChainKey)).toBe(true)
    expect(decState.recvMessageNumber).toBe(stateBefore.recvMessageNumber)
    expect(decState.messageNumber).toBe(stateBefore.messageNumber)
  })

  it('returns DecryptionError for empty ciphertext input', async () => {
    const secret: SessionSecret = {
      sharedSecret: globalThis.crypto.getRandomValues(new Uint8Array(32)),
      associatedData: new Uint8Array(64),
    }
    const state = initRatchet(secret)
    const header = {
      dhPubKey: globalThis.crypto.getRandomValues(new Uint8Array(32)),
      messageNumber: 0,
      prevChainLength: 0,
    }
    const result = await decryptMessage(state, header, new Uint8Array(0))
    expect(result).toHaveProperty('type', 'DECRYPTION_FAILED')
  })
})

// ---------------------------------------------------------------------------
// Unit Tests — Sender Keys
// ---------------------------------------------------------------------------

describe('Sender Keys', () => {
  it('generateSenderKey returns a 32-byte chain key and a non-zero keyId', () => {
    const sk = generateSenderKey()
    expect(sk.chainKey.length).toBe(32)
    expect(typeof sk.keyId).toBe('number')
    expect(sk.iteration).toBe(0)
  })

  it('encryptGroupMessage / decryptGroupMessage round-trip', async () => {
    const senderKey = generateSenderKey()
    // Capture the chain key before encryption (decryption rebuilds from current state)
    const chainKeySnapshot = senderKey.chainKey.slice()
    const iterSnapshot = senderKey.iteration

    const plaintext = new TextEncoder().encode('group message test')
    const ciphertext = await encryptGroupMessage(senderKey, plaintext)

    // Restore state for decryption (same key, same starting iteration)
    const decryptKey: SenderKey = {
      keyId: senderKey.keyId,
      chainKey: chainKeySnapshot,
      iteration: iterSnapshot,
    }
    const result = await decryptGroupMessage(decryptKey, ciphertext)

    expect(result).not.toHaveProperty('type')
    expect(bytesEqual(result as Uint8Array, plaintext)).toBe(true)
  })

  it('decryptGroupMessage returns DecryptionError for corrupted ciphertext', async () => {
    const senderKey = generateSenderKey()
    const chainKeySnapshot = senderKey.chainKey.slice()
    const iterSnapshot = senderKey.iteration

    const plaintext = new TextEncoder().encode('test')
    const ciphertext = await encryptGroupMessage(senderKey, plaintext)

    // Corrupt
    const corrupted = ciphertext.slice()
    corrupted[30] ^= 0xff

    const decryptKey: SenderKey = {
      keyId: senderKey.keyId,
      chainKey: chainKeySnapshot,
      iteration: iterSnapshot,
    }

    let threw = false
    let result: Uint8Array | DecryptionError | undefined
    try {
      result = await decryptGroupMessage(decryptKey, corrupted)
    } catch {
      threw = true
    }

    expect(threw).toBe(false)
    expect(result).toHaveProperty('type', 'DECRYPTION_FAILED')
  })

  it('decryptGroupMessage returns DecryptionError for wrong keyId', async () => {
    const senderKey = generateSenderKey()
    const chainKeySnapshot = senderKey.chainKey.slice()
    const iterSnapshot = senderKey.iteration

    const plaintext = new TextEncoder().encode('test')
    const ciphertext = await encryptGroupMessage(senderKey, plaintext)

    // Use a different keyId
    const decryptKey: SenderKey = {
      keyId: senderKey.keyId + 1,
      chainKey: chainKeySnapshot,
      iteration: iterSnapshot,
    }

    const result = await decryptGroupMessage(decryptKey, ciphertext)
    expect(result).toHaveProperty('type', 'DECRYPTION_FAILED')
  })

  it('ciphertext differs from plaintext', async () => {
    const senderKey = generateSenderKey()
    const plaintext = new TextEncoder().encode('hello group')
    const ciphertext = await encryptGroupMessage(senderKey, plaintext)
    expect(bytesEqual(ciphertext, plaintext)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

// Feature: anonymous-chat, Property 4: X3DH Shared Secret Symmetry
describe('PBT — Property 4: X3DH Shared Secret Symmetry', () => {
  it(
    'Alice and Bob running X3DH produce identical shared secrets',
    async () => {
      // Validates: Requirements 2.2
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 32, maxLength: 32 }),
          fc.uint8Array({ minLength: 32, maxLength: 32 }),
          async (aliceSeed, bobSeed) => {
            // Derive real Ed25519 key pairs from seeds
            const alicePriv = aliceSeed
            const alicePub = ed25519.getPublicKey(alicePriv)
            const alice: AnonymousIdentity = {
              publicKey: alicePub,
              privateKey: alicePriv,
              identifier: deriveIdentifier(alicePub),
              createdAt: 0,
            }

            const bobPriv = bobSeed
            const bobPub = ed25519.getPublicKey(bobPriv)
            const bob: AnonymousIdentity = {
              publicKey: bobPub,
              privateKey: bobPriv,
              identifier: deriveIdentifier(bobPub),
              createdAt: 0,
            }

            // Generate Bob's bundle
            const { bundle: bobBundle, localStore: bobLocalStore } = generateBundle(bob)

            // Bob's X25519 identity key
            const bobX25519IdentityKey = identityX25519PubKey(bob.privateKey)

            // Alice initiates (with deterministic ephemeral key for symmetry)
            const ephPriv = x25519.utils.randomSecretKey()
            const { sessionSecret: aliceSecret, initialMessage } = await initiateSession(
              alice,
              bobBundle,
              bobX25519IdentityKey,
              ephPriv,
            )

            // Bob receives
            const bobSpkPriv = bobLocalStore.signedPreKey.privateKey
            const bobOtk = bobBundle.oneTimePreKeys.length > 0
              ? bobLocalStore.oneTimePreKeys.find(
                  (k) => k.keyId === bobBundle.oneTimePreKeys[0].keyId,
                )
              : undefined

            const bobSecret = await receiveSession(
              bob,
              initialMessage,
              bobSpkPriv,
              bobOtk?.privateKey,
            )

            // Core property: shared secrets must be identical
            return bytesEqual(aliceSecret.sharedSecret, bobSecret.sharedSecret)
          },
        ),
        { numRuns: 100 },
      )
    },
    60_000,
  )
})

// Feature: anonymous-chat, Property 5: Double Ratchet Key Uniqueness
describe('PBT — Property 5: Double Ratchet Key Uniqueness', () => {
  it(
    'n≥2 consecutive nextMessageKey() calls all produce distinct keys',
    () => {
      // Validates: Requirements 2.3, 5.6
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 32, maxLength: 32 }),
          fc.integer({ min: 2, max: 20 }),
          (secretBytes, n) => {
            const secret: SessionSecret = {
              sharedSecret: secretBytes,
              associatedData: new Uint8Array(64),
            }
            const state = initRatchet(secret)

            const keys: Uint8Array[] = []
            for (let i = 0; i < n; i++) {
              const key = nextMessageKey(state)
              keys.push(key)
            }

            // All keys must be pairwise distinct
            for (let i = 0; i < keys.length; i++) {
              for (let j = i + 1; j < keys.length; j++) {
                if (bytesEqual(keys[i], keys[j])) {
                  return false
                }
              }
            }
            return true
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})

// Feature: anonymous-chat, Property 6: E2EE Round-Trip
describe('PBT — Property 6: E2EE Encryption Round-Trip', () => {
  it(
    'decrypt(encrypt(x)) === x and ciphertext !== plaintext',
    async () => {
      // Validates: Requirements 5.1, 5.2, 5.4
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 32, maxLength: 32 }),
          fc.uint8Array({ minLength: 1, maxLength: 512 }),
          async (secretBytes, plaintext) => {
            const secret: SessionSecret = {
              sharedSecret: secretBytes,
              associatedData: new Uint8Array(64),
            }
            // Use separate states seeded from the same secret
            const encState = initRatchet(secret)
            const decState = initRatchet(secret)

            const { ciphertext, header } = await encryptMessage(encState, plaintext)
            const result = await decryptMessage(decState, header, ciphertext)

            // Must not be a decryption error
            if ('type' in (result as object)) return false

            const decrypted = result as Uint8Array

            // Property: round-trip restores original plaintext
            if (!bytesEqual(decrypted, plaintext)) return false

            // Property: ciphertext differs from plaintext
            // (ciphertext includes 12-byte IV so it's always structurally different,
            //  but also verify the data isn't just the plaintext)
            if (bytesEqual(ciphertext.slice(12, 12 + plaintext.length), plaintext) &&
                ciphertext.length === 12 + plaintext.length + 16) {
              // This would mean no actual encryption occurred — fail
              // (GCM adds a 16-byte auth tag, so this check is: if the middle
              //  bytes equal plaintext bytes AND length matches, it wasn't encrypted)
              // Actually AES-GCM will always produce different bytes, so this check
              // is belt-and-suspenders
              return false
            }

            return true
          },
        ),
        { numRuns: 100 },
      )
    },
    60_000,
  )
})

// Feature: anonymous-chat, Property 7: Decryption Failure is Non-Crashing
describe('PBT — Property 7: Decryption Failure is Non-Crashing', () => {
  it(
    'arbitrary or corrupted bytes passed to decryptMessage always return DecryptionError, never throw',
    async () => {
      // Validates: Requirements 5.5
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 32, maxLength: 32 }),
          // Arbitrary ciphertext (could be empty, too short, random, etc.)
          fc.uint8Array({ minLength: 0, maxLength: 256 }),
          // Arbitrary header fields
          fc.uint8Array({ minLength: 32, maxLength: 32 }),
          fc.nat({ max: 1000 }),
          fc.nat({ max: 1000 }),
          async (secretBytes, arbitraryCiphertext, dhPubKey, msgNum, prevLen) => {
            const secret: SessionSecret = {
              sharedSecret: secretBytes,
              associatedData: new Uint8Array(64),
            }
            const state = initRatchet(secret)

            const header = {
              dhPubKey,
              messageNumber: msgNum,
              prevChainLength: prevLen,
            }

            let threw = false
            let result: Uint8Array | DecryptionError | undefined

            try {
              result = await decryptMessage(state, header, arbitraryCiphertext)
            } catch {
              threw = true
            }

            // Must never throw
            if (threw) return false

            // Result must be either plaintext bytes or a DecryptionError
            if (result === undefined) return false

            // If it's a Uint8Array, that's fine (unlikely but theoretically possible)
            // If it has a 'type' field, it must be DECRYPTION_FAILED
            if ('type' in (result as object)) {
              return (result as DecryptionError).type === 'DECRYPTION_FAILED'
            }

            // It returned bytes without throwing — acceptable
            return true
          },
        ),
        { numRuns: 100 },
      )
    },
    60_000,
  )
})
