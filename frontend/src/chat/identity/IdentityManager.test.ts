/**
 * Tests for IdentityManager
 * REQ-1.1, REQ-1.2, REQ-1.3, REQ-1.4, REQ-1.5
 *
 * Covers:
 *  - Unit tests: first launch, idempotent second launch, malformed storage regeneration
 *  - PBT Property 1: Identity derivation is deterministic
 *  - PBT Property 2: Identity initialization is idempotent
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { sha256 } from '@noble/hashes/sha2.js'
import {
  generateIdentity,
  deriveIdentifier,
  persistIdentity,
  loadIdentity,
  IdentityManager,
  _clearAesKeyCache,
  type AnonymousIdentity,
} from './IdentityManager'

// ---------------------------------------------------------------------------
// Test environment setup
//
// Vitest runs in a jsdom environment but jsdom's indexedDB support is minimal.
// We install fake-indexeddb to provide a full in-memory IDB implementation.
// SubtleCrypto comes from Node's built-in WebCrypto.
// ---------------------------------------------------------------------------

// Install fake-indexeddb into the global scope before any tests run
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'

// Ensure crypto.subtle is available (Node 18+ exposes it via globalThis.crypto)
if (!globalThis.crypto?.subtle) {
  const { webcrypto } = await import('node:crypto')
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
    configurable: true,
  })
}

// ---------------------------------------------------------------------------
// Helper: reset IndexedDB between tests so they are independent
// ---------------------------------------------------------------------------

function resetIdb(): void {
  // Replace the global indexedDB with a fresh instance for each test suite run
  Object.defineProperty(globalThis, 'indexedDB', {
    value: new IDBFactory(),
    writable: true,
    configurable: true,
  })
}

beforeEach(() => {
  resetIdb()
  _clearAesKeyCache()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Lowercase hex of SHA-256(bytes) — reference implementation for PBT */
function sha256Hex(bytes: Uint8Array): string {
  const hash = sha256(bytes)
  return Array.from(hash)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ---------------------------------------------------------------------------
// Unit Tests — generateIdentity
// ---------------------------------------------------------------------------

describe('generateIdentity', () => {
  it('returns a 32-byte Ed25519 public key and 32-byte private key', () => {
    const { publicKey, privateKey } = generateIdentity()
    expect(publicKey).toBeInstanceOf(Uint8Array)
    expect(publicKey.length).toBe(32)
    expect(privateKey).toBeInstanceOf(Uint8Array)
    expect(privateKey.length).toBe(32)
  })

  it('generates unique key pairs on successive calls', () => {
    const a = generateIdentity()
    const b = generateIdentity()
    // Public keys should differ (astronomically unlikely to collide)
    expect(Buffer.from(a.publicKey).toString('hex')).not.toBe(
      Buffer.from(b.publicKey).toString('hex'),
    )
  })
})

// ---------------------------------------------------------------------------
// Unit Tests — deriveIdentifier
// ---------------------------------------------------------------------------

describe('deriveIdentifier', () => {
  it('returns a 64-character lowercase hex string', () => {
    const { publicKey } = generateIdentity()
    const id = deriveIdentifier(publicKey)
    expect(id).toMatch(/^[0-9a-f]{64}$/)
  })

  it('equals sha256Hex(publicKey)', () => {
    const { publicKey } = generateIdentity()
    expect(deriveIdentifier(publicKey)).toBe(sha256Hex(publicKey))
  })

  it('returns identical results for identical inputs', () => {
    const { publicKey } = generateIdentity()
    expect(deriveIdentifier(publicKey)).toBe(deriveIdentifier(publicKey))
  })
})

// ---------------------------------------------------------------------------
// Unit Tests — IdentityManager first launch
// ---------------------------------------------------------------------------

describe('IdentityManager — first launch generates a key', () => {
  it('initialize() returns an AnonymousIdentity with a 64-char identifier on first launch', async () => {
    const manager = new IdentityManager()
    const identity = await manager.initialize()

    expect(identity.publicKey).toBeInstanceOf(Uint8Array)
    expect(identity.publicKey.length).toBe(32)
    expect(identity.privateKey).toBeInstanceOf(Uint8Array)
    expect(identity.privateKey.length).toBe(32)
    expect(identity.identifier).toMatch(/^[0-9a-f]{64}$/)
    expect(identity.createdAt).toBeGreaterThan(0)
  })

  it('getIdentity() returns null before initialize() is called', () => {
    const manager = new IdentityManager()
    expect(manager.getIdentity()).toBeNull()
  })

  it('getIdentity() returns the same identity after initialize()', async () => {
    const manager = new IdentityManager()
    const identity = await manager.initialize()
    expect(manager.getIdentity()).toBe(identity)
  })
})

// ---------------------------------------------------------------------------
// Unit Tests — second launch returns same key (REQ-1.3)
// ---------------------------------------------------------------------------

describe('IdentityManager — second launch returns the same key (REQ-1.3)', () => {
  it('two IdentityManager instances share the same identifier via IndexedDB', async () => {
    const manager1 = new IdentityManager()
    const identity1 = await manager1.initialize()

    // Second manager simulates a new page load (same IDB instance in this test)
    const manager2 = new IdentityManager()
    const identity2 = await manager2.initialize()

    expect(identity2.identifier).toBe(identity1.identifier)
    expect(Buffer.from(identity2.publicKey).toString('hex')).toBe(
      Buffer.from(identity1.publicKey).toString('hex'),
    )
  })
})

// ---------------------------------------------------------------------------
// Unit Tests — malformed storage triggers regeneration (REQ-1.3)
// ---------------------------------------------------------------------------

describe('IdentityManager — malformed storage triggers regeneration (REQ-1.3)', () => {
  it('loadIdentity() returns null when stored record has garbage data', async () => {
    // Write garbage directly to IndexedDB
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('codeva_identity', 1)
      req.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('identity')) {
          db.createObjectStore('identity')
        }
        if (!db.objectStoreNames.contains('aes_key')) {
          db.createObjectStore('aes_key')
        }
      }
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('identity', 'readwrite')
        const store = tx.objectStore('identity')
        store.put(
          {
            publicKey: 'tooshort',
            privateKey: 'notencrypted',
            identifier: 'badhash',
            createdAt: 123,
          },
          'current',
        )
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }
      req.onerror = () => reject(req.error)
    })

    const identity = await loadIdentity()
    // Malformed data → treated as missing, returns null
    expect(identity).toBeNull()
  })

  it('initialize() generates a fresh valid identity when stored data is malformed', async () => {
    // Write garbage to IDB first
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('codeva_identity', 1)
      req.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('identity')) {
          db.createObjectStore('identity')
        }
        if (!db.objectStoreNames.contains('aes_key')) {
          db.createObjectStore('aes_key')
        }
      }
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('identity', 'readwrite')
        const store = tx.objectStore('identity')
        store.put(
          { publicKey: null, privateKey: null, identifier: null, createdAt: null },
          'current',
        )
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }
      req.onerror = () => reject(req.error)
    })

    const manager = new IdentityManager()
    const identity = await manager.initialize()

    // Should return a valid, freshly-generated identity
    expect(identity.publicKey.length).toBe(32)
    expect(identity.identifier).toMatch(/^[0-9a-f]{64}$/)
  })
})

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

// Feature: anonymous-chat, Property 1: Identity derivation is deterministic
describe('PBT — Property 1: Identity Derivation is Deterministic', () => {
  it('deriveIdentifier returns identical hex on every call and equals sha256Hex(pubKey)', () => {
    // Validates: Requirements 1.2
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 32, maxLength: 32 }),
        (pubKey) => {
          const id1 = deriveIdentifier(pubKey)
          const id2 = deriveIdentifier(pubKey)
          const expected = sha256Hex(pubKey)
          return id1 === id2 && id1 === expected
        },
      ),
      { numRuns: 100 },
    )
  })
})

// Feature: anonymous-chat, Property 2: Identity Initialization is Idempotent
describe('PBT — Property 2: Identity Initialization is Idempotent', () => {
  it('two consecutive initialize() calls return the same identifier', async () => {
    // Validates: Requirements 1.3
    //
    // Strategy: for each run we reset IDB to a clean state, then call initialize()
    // twice. Both calls must produce the same identifier, proving idempotence.
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          // Fresh IDB for each PBT run to ensure isolation
          resetIdb()
          _clearAesKeyCache()

          const manager1 = new IdentityManager()
          const identity1 = await manager1.initialize()

          const manager2 = new IdentityManager()
          const identity2 = await manager2.initialize()

          return identity1.identifier === identity2.identifier
        },
      ),
      { numRuns: 100 },
    )
  })
})
