/**
 * Tests for Identity Key Backup / Restore
 *
 * Covers:
 *  - Unit tests: correct passphrase round-trip, wrong passphrase, corrupted blob,
 *    blob too short, exported blob minimum length
 *  - PBT Property 34: Key Backup Passphrase Round-Trip
 *  - PBT Property 35: Wrong Passphrase Does Not Overwrite
 *
 * REQ-14.1, REQ-14.2, REQ-14.3, REQ-14.4, REQ-14.5
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import {
  exportEncryptedIdentity,
  importEncryptedIdentity,
  generateIdentity,
  _clearAesKeyCache,
} from './IdentityManager'

// ---------------------------------------------------------------------------
// Test environment setup (mirrors IdentityManager.test.ts)
//
// fake-indexeddb provides a full in-memory IDB implementation.
// Node 18+ exposes crypto.subtle via globalThis.crypto.
// ---------------------------------------------------------------------------

import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'

// Ensure crypto.subtle is available (Node 18+ via globalThis.crypto)
if (!globalThis.crypto?.subtle) {
  const { webcrypto } = await import('node:crypto')
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
    configurable: true,
  })
}

// ---------------------------------------------------------------------------
// Reset IDB between tests for full isolation
// ---------------------------------------------------------------------------

function resetIdb(): void {
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

/** Byte-for-byte comparison of two Uint8Arrays */
function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

// ---------------------------------------------------------------------------
// Unit Tests
// ---------------------------------------------------------------------------

describe('exportEncryptedIdentity / importEncryptedIdentity', () => {

  // 1. Export then import with correct passphrase restores byte-for-byte identical key pair
  it('export then import with correct passphrase restores byte-for-byte identical key pair', async () => {
    const { privateKey } = generateIdentity()
    const passphrase = 'correct-horse-battery-staple'

    const blob = await exportEncryptedIdentity(privateKey, passphrase)
    const restored = await importEncryptedIdentity(blob, passphrase)

    expect(arraysEqual(restored, privateKey)).toBe(true)
  })

  // 2. Wrong passphrase returns { type: 'KEY_BACKUP_WRONG_PASSPHRASE' } and does NOT return the key
  it('wrong passphrase returns KEY_BACKUP_WRONG_PASSPHRASE error', async () => {
    const { privateKey } = generateIdentity()
    const blob = await exportEncryptedIdentity(privateKey, 'correct-pass')

    let thrownError: unknown = undefined
    try {
      await importEncryptedIdentity(blob, 'wrong-pass')
    } catch (e) {
      thrownError = e
    }

    expect(thrownError).toBeDefined()
    expect((thrownError as { type: string }).type).toBe('KEY_BACKUP_WRONG_PASSPHRASE')
  })

  // 3. Corrupted blob (truncated to 10 bytes) returns { type: 'KEY_BACKUP_INTEGRITY_ERROR' }
  it('blob truncated to 10 bytes returns KEY_BACKUP_INTEGRITY_ERROR', async () => {
    const corruptedBlob = new Uint8Array(10)

    let thrownError: unknown = undefined
    try {
      await importEncryptedIdentity(corruptedBlob, 'any-pass')
    } catch (e) {
      thrownError = e
    }

    expect(thrownError).toBeDefined()
    expect((thrownError as { type: string }).type).toBe('KEY_BACKUP_INTEGRITY_ERROR')
  })

  // 4. Blob too short (< 44 bytes) returns { type: 'KEY_BACKUP_INTEGRITY_ERROR' }
  it('blob shorter than 44 bytes returns KEY_BACKUP_INTEGRITY_ERROR', async () => {
    // Test several lengths below the 44-byte minimum
    for (const len of [0, 1, 43]) {
      const shortBlob = new Uint8Array(len)

      let thrownError: unknown = undefined
      try {
        await importEncryptedIdentity(shortBlob, 'any-pass')
      } catch (e) {
        thrownError = e
      }

      expect(thrownError).toBeDefined()
      expect((thrownError as { type: string }).type).toBe('KEY_BACKUP_INTEGRITY_ERROR')
    }
  })

  // 5. Exported blob has length > 44 bytes (salt 32 + iv 12 + ciphertext with AES-GCM tag)
  it('exported blob has length > 44 bytes (salt 32 + iv 12 + ciphertext + 16-byte GCM tag)', async () => {
    const { privateKey } = generateIdentity()
    const blob = await exportEncryptedIdentity(privateKey, 'test-passphrase')

    // Minimum: 32 (salt) + 12 (iv) + 32 (plaintext) + 16 (GCM auth tag) = 92 bytes
    expect(blob.length).toBeGreaterThan(44)
    // Also confirm the exact expected minimum structure
    expect(blob.length).toBeGreaterThanOrEqual(92)
  })

})

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

// Feature: anonymous-chat, Property 34: Key Backup Passphrase Round-Trip
describe('PBT — Property 34: Key Backup Passphrase Round-Trip', () => {
  it(
    'import(export(privateKey, p), p) restores byte-for-byte identical key pair for any passphrase',
    async () => {
      // Validates: Requirements 14.1, 14.2
      await fc.assert(
        fc.asyncProperty(fc.string(), async (passphrase) => {
          const { privateKey } = generateIdentity()
          const blob = await exportEncryptedIdentity(privateKey, passphrase)
          const restored = await importEncryptedIdentity(blob, passphrase)
          return arraysEqual(restored, privateKey)
        }),
        { numRuns: 100 },
      )
    },
    // PBKDF2 at 100,000 iterations per run is intentionally slow — allow 60 s
    60_000,
  )
})

// Feature: anonymous-chat, Property 35: Wrong Passphrase Does Not Overwrite
describe('PBT — Property 35: Wrong Passphrase Does Not Overwrite', () => {
  it(
    'any wrong passphrase returns KEY_BACKUP_WRONG_PASSPHRASE and does not return the key',
    async () => {
      // Validates: Requirements 14.3
      await fc.assert(
        fc.asyncProperty(fc.string(), fc.string(), async (correctPass, wrongPass) => {
          // Only run when passphrase values are different
          fc.pre(wrongPass !== correctPass)

          const { privateKey } = generateIdentity()
          const blob = await exportEncryptedIdentity(privateKey, correctPass)

          let threw = false
          try {
            await importEncryptedIdentity(blob, wrongPass)
          } catch (e) {
            if ((e as { type?: string }).type === 'KEY_BACKUP_WRONG_PASSPHRASE') threw = true
          }
          return threw
        }),
        { numRuns: 100 },
      )
    },
    // PBKDF2 at 100,000 iterations per run is intentionally slow — allow 60 s
    60_000,
  )
})
