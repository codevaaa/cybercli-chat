/**
 * IdentityManager — Anonymous Identity lifecycle management.
 *
 * Handles Ed25519 key generation, SHA-256 identifier derivation,
 * secure IndexedDB storage (private key AES-GCM encrypted via SubtleCrypto),
 * and the load-or-generate initialization flow.
 *
 * REQ-1.1, REQ-1.2, REQ-1.3, REQ-1.4, REQ-1.5
 */

import { ed25519 } from '@noble/curves/ed25519.js'
import { sha256 } from '@noble/hashes/sha2.js'

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface AnonymousIdentity {
  /** Ed25519 public key (32 bytes) */
  publicKey: Uint8Array
  /** Ed25519 private key (32 bytes) — never leaves device */
  privateKey: Uint8Array
  /** hex(SHA-256(publicKey)) — displayed pseudonym (REQ-1.2) */
  identifier: string
  /** Unix epoch ms */
  createdAt: number
}

/** Stored in IndexedDB; private key is AES-GCM encrypted at rest */
export interface StoredIdentity {
  /** hex-encoded Ed25519 public key */
  publicKey: string
  /** hex-encoded AES-GCM encrypted private key  (iv:ciphertext) */
  privateKey: string
  /** hex(SHA-256(publicKey)) */
  identifier: string
  /** Unix epoch ms */
  createdAt: number
}

/** Typed error surfaced when any identity operation fails (REQ-1.4) */
export interface IdentityInitFailedError {
  type: 'IDENTITY_INIT_FAILED'
  reason: string
}

// ---------------------------------------------------------------------------
// Helpers — hex encoding / decoding
// ---------------------------------------------------------------------------

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string length')
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

// ---------------------------------------------------------------------------
// Core pure functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Generate a fresh Ed25519 key pair.
 */
export function generateIdentity(): { publicKey: Uint8Array; privateKey: Uint8Array } {
  const privateKey = ed25519.utils.randomSecretKey()
  const publicKey = ed25519.getPublicKey(privateKey)
  return { publicKey, privateKey }
}

/**
 * Derive the pseudonymous identifier as lowercase hex of SHA-256(publicKey).
 * Deterministic: same publicKey always yields the same identifier (REQ-1.2).
 */
export function deriveIdentifier(publicKey: Uint8Array): string {
  const hash = sha256(publicKey)
  return toHex(hash)
}

// ---------------------------------------------------------------------------
// AES-GCM encryption helpers (SubtleCrypto, browser-native)
// ---------------------------------------------------------------------------

const AES_KEY_ALGORITHM = { name: 'AES-GCM', length: 256 } as const
const DB_ENCRYPTION_KEY_PURPOSE = ['encrypt', 'decrypt'] as const

/**
 * In-memory cache of the device AES key so we avoid repeatedly hitting IDB.
 * Reset when a new IDBFactory is installed (e.g., between tests).
 */
let _cachedAesKey: CryptoKey | null = null
let _cachedAesKeyRaw: ArrayBuffer | null = null

/** Clear the AES key cache (used in tests when IDB is reset). */
export function _clearAesKeyCache(): void {
  _cachedAesKey = null
  _cachedAesKeyRaw = null
}

// ---------------------------------------------------------------------------
// IndexedDB helpers
// ---------------------------------------------------------------------------

const DB_NAME = 'codeva_identity'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = globalThis.indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('identity')) {
        db.createObjectStore('identity')
      }
      if (!db.objectStoreNames.contains('aes_key')) {
        db.createObjectStore('aes_key')
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Read a value from an IDB object store by key (single, isolated transaction).
 */
function idbGet(db: IDBDatabase, storeName: string, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Write a value to an IDB object store (single, isolated transaction).
 */
function idbPut(db: IDBDatabase, storeName: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.put(value, key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/**
 * Get (or generate and persist) the per-device AES-GCM key.
 *
 * All async SubtleCrypto work happens *outside* IDB transactions to prevent
 * TransactionInactiveError from async microtask yielding.
 */
async function getOrCreateAesKey(): Promise<CryptoKey> {
  // Return in-memory cache if available
  if (_cachedAesKey) return _cachedAesKey

  const db = await openDb()

  // Step 1: Load existing raw key from IDB in an isolated read transaction
  const existingRaw = await idbGet(db, 'aes_key', 'device_aes_key') as ArrayBuffer | null

  if (existingRaw) {
    // Re-import outside any IDB transaction
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      existingRaw,
      AES_KEY_ALGORITHM,
      false,
      DB_ENCRYPTION_KEY_PURPOSE,
    )
    _cachedAesKey = key
    return key
  }

  // Step 2: Generate a brand-new AES key outside any IDB transaction
  const newKey = await globalThis.crypto.subtle.generateKey(
    AES_KEY_ALGORITHM,
    true,
    DB_ENCRYPTION_KEY_PURPOSE,
  )
  const rawBytes = await globalThis.crypto.subtle.exportKey('raw', newKey)

  // Step 3: Persist the raw bytes in an isolated write transaction
  await idbPut(db, 'aes_key', 'device_aes_key', rawBytes)

  _cachedAesKey = newKey
  _cachedAesKeyRaw = rawBytes
  return newKey
}

/**
 * Encrypt `plaintext` bytes using AES-GCM.
 * Returns a combined hex string of format `<iv_hex>:<ciphertext_hex>`.
 */
async function encryptBytes(plaintext: Uint8Array): Promise<string> {
  const key = await getOrCreateAesKey()
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return `${toHex(iv)}:${toHex(new Uint8Array(ciphertext))}`
}

/**
 * Decrypt an AES-GCM encrypted hex string (`<iv_hex>:<ciphertext_hex>`).
 */
async function decryptBytes(encoded: string): Promise<Uint8Array> {
  const colonIdx = encoded.indexOf(':')
  if (colonIdx === -1) throw new Error('Invalid encrypted format: missing colon separator')
  const iv = fromHex(encoded.slice(0, colonIdx))
  const ciphertext = fromHex(encoded.slice(colonIdx + 1))
  const key = await getOrCreateAesKey()
  const plain = await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new Uint8Array(plain)
}

// ---------------------------------------------------------------------------
// Persist / Load
// ---------------------------------------------------------------------------

/**
 * Persist an `AnonymousIdentity` to IndexedDB, encrypting the private key at rest.
 * REQ-1.1, REQ-1.5
 *
 * All SubtleCrypto work is done before any IDB transaction is opened to avoid
 * TransactionInactiveError from async microtask yielding.
 */
export async function persistIdentity(identity: AnonymousIdentity): Promise<void> {
  // Encrypt the private key BEFORE opening any IDB transaction
  const encryptedPrivateKey = await encryptBytes(identity.privateKey)

  const stored: StoredIdentity = {
    publicKey: toHex(identity.publicKey),
    privateKey: encryptedPrivateKey,
    identifier: identity.identifier,
    createdAt: identity.createdAt,
  }

  const db = await openDb()
  await idbPut(db, 'identity', 'current', stored)
}

/**
 * Load and validate the stored identity from IndexedDB.
 *
 * Validation rules (REQ-1.3):
 *  1. Record must exist in IDB.
 *  2. publicKey and privateKey hex strings must be present and correctly sized (32 bytes each).
 *  3. Ed25519 validity: re-derive publicKey from privateKey and confirm it matches.
 *  4. identifier must equal deriveIdentifier(publicKey).
 *
 * Returns `null` if no identity is stored or if stored data is malformed/incomplete
 * (caller should treat null as "generate a new one").
 * Throws an `IdentityInitFailedError` (or re-throws it) only for unexpected storage faults.
 */
export async function loadIdentity(): Promise<AnonymousIdentity | null> {
  let db: IDBDatabase
  try {
    db = await openDb()
  } catch (err) {
    throw {
      type: 'IDENTITY_INIT_FAILED',
      reason: `Failed to open IndexedDB: ${String(err)}`,
    } satisfies IdentityInitFailedError
  }

  const stored = await idbGet(db, 'identity', 'current') as StoredIdentity | null

  if (!stored) return null

  // --- structural validation ---
  if (
    typeof stored.publicKey !== 'string' ||
    typeof stored.privateKey !== 'string' ||
    typeof stored.identifier !== 'string' ||
    typeof stored.createdAt !== 'number'
  ) {
    // Malformed — treat as missing
    return null
  }

  let publicKeyBytes: Uint8Array
  let privateKeyBytes: Uint8Array

  try {
    publicKeyBytes = fromHex(stored.publicKey)
    if (publicKeyBytes.length !== 32) return null
  } catch {
    return null
  }

  try {
    const decrypted = await decryptBytes(stored.privateKey)
    if (decrypted.length !== 32) return null
    privateKeyBytes = decrypted
  } catch {
    // Decryption failure → treat as malformed/missing, generate new
    return null
  }

  // --- Ed25519 structural validity: re-derive public key and compare ---
  try {
    const rederived = ed25519.getPublicKey(privateKeyBytes)
    if (rederived.length !== 32) return null
    // Byte-for-byte match
    for (let i = 0; i < 32; i++) {
      if (rederived[i] !== publicKeyBytes[i]) return null
    }
  } catch {
    return null
  }

  // --- identifier consistency check ---
  const expectedIdentifier = deriveIdentifier(publicKeyBytes)
  if (stored.identifier !== expectedIdentifier) return null

  return {
    publicKey: publicKeyBytes,
    privateKey: privateKeyBytes,
    identifier: stored.identifier,
    createdAt: stored.createdAt,
  }
}

// ---------------------------------------------------------------------------
// IdentityManager class
// ---------------------------------------------------------------------------

/**
 * Manages the full Anonymous Identity lifecycle.
 *
 * Usage:
 *   const manager = new IdentityManager()
 *   const identity = await manager.initialize()
 */
export class IdentityManager {
  private _identity: AnonymousIdentity | null = null

  /**
   * Load-or-generate flow (REQ-1.1, REQ-1.3, REQ-1.4):
   *  1. Attempt to load a validated identity from secure storage.
   *  2. If absent or malformed, generate a new one and persist it.
   *  3. If any operation fails with an unexpected error, throw IDENTITY_INIT_FAILED.
   */
  async initialize(): Promise<AnonymousIdentity> {
    try {
      let identity = await loadIdentity()

      if (!identity) {
        // First launch or malformed stored data — generate fresh (REQ-1.1, REQ-1.3)
        const { publicKey, privateKey } = generateIdentity()
        const identifier = deriveIdentifier(publicKey)
        identity = {
          publicKey,
          privateKey,
          identifier,
          createdAt: Date.now(),
        }
        await persistIdentity(identity)
      }

      this._identity = identity
      return identity
    } catch (err) {
      // Propagate typed IDENTITY_INIT_FAILED errors as-is
      if (
        typeof err === 'object' &&
        err !== null &&
        (err as { type?: string }).type === 'IDENTITY_INIT_FAILED'
      ) {
        throw err
      }
      // Wrap unexpected errors
      throw {
        type: 'IDENTITY_INIT_FAILED',
        reason: `Unexpected identity initialization error: ${String(err)}`,
      } satisfies IdentityInitFailedError
    }
  }

  /** Return the in-memory identity (null if initialize() has not been called). */
  getIdentity(): AnonymousIdentity | null {
    return this._identity
  }

  /**
   * Export the private key as a passphrase-encrypted backup blob.
   * (Task 13 extension point — PBKDF2 + AES-256-GCM, REQ-14.1)
   */
  async exportEncrypted(passphrase: string): Promise<Uint8Array> {
    if (!this._identity) {
      throw {
        type: 'IDENTITY_INIT_FAILED',
        reason: 'Cannot export: identity not initialized',
      } satisfies IdentityInitFailedError
    }
    return exportEncryptedIdentity(this._identity.privateKey, passphrase)
  }

  /**
   * Import a passphrase-encrypted backup blob and restore the identity.
   * (Task 13 extension point — REQ-14.2, REQ-14.3)
   */
  async importEncrypted(data: Uint8Array, passphrase: string): Promise<void> {
    const privateKey = await importEncryptedIdentity(data, passphrase)
    const publicKey = ed25519.getPublicKey(privateKey)
    const identifier = deriveIdentifier(publicKey)
    const identity: AnonymousIdentity = {
      publicKey,
      privateKey,
      identifier,
      createdAt: Date.now(),
    }
    await persistIdentity(identity)
    this._identity = identity
  }
}

// ---------------------------------------------------------------------------
// Key backup helpers (REQ-14 extension — Task 13)
// ---------------------------------------------------------------------------

/** PBKDF2 parameters for passphrase-based key derivation */
const PBKDF2_ITERATIONS = 100_000
const PBKDF2_HASH = 'SHA-256'

/**
 * Encrypt `privateKey` using a passphrase-derived AES-256-GCM key (PBKDF2).
 * Returns a packed binary blob: [salt(32) | iv(12) | ciphertext(48)]
 */
export async function exportEncryptedIdentity(
  privateKey: Uint8Array,
  passphrase: string,
): Promise<Uint8Array> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(32))
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))

  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  const aesKey = await globalThis.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )

  const ciphertext = new Uint8Array(
    await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, privateKey),
  )

  // Pack: salt(32) | iv(12) | ciphertext
  const blob = new Uint8Array(32 + 12 + ciphertext.length)
  blob.set(salt, 0)
  blob.set(iv, 32)
  blob.set(ciphertext, 44)
  return blob
}

/**
 * Decrypt an identity backup blob produced by `exportEncryptedIdentity`.
 * Throws `{ type: 'KEY_BACKUP_WRONG_PASSPHRASE' }` on decryption failure.
 * Throws `{ type: 'KEY_BACKUP_INTEGRITY_ERROR' }` on malformed input.
 */
export async function importEncryptedIdentity(
  data: Uint8Array,
  passphrase: string,
): Promise<Uint8Array> {
  if (data.length < 44) {
    throw { type: 'KEY_BACKUP_INTEGRITY_ERROR', reason: 'Backup blob too short' }
  }

  const salt = data.slice(0, 32)
  const iv = data.slice(32, 44)
  const ciphertext = data.slice(44)

  let keyMaterial: CryptoKey
  try {
    keyMaterial = await globalThis.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey'],
    )
  } catch {
    throw { type: 'KEY_BACKUP_INTEGRITY_ERROR', reason: 'Failed to import passphrase material' }
  }

  let aesKey: CryptoKey
  try {
    aesKey = await globalThis.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    )
  } catch {
    throw { type: 'KEY_BACKUP_INTEGRITY_ERROR', reason: 'Failed to derive decryption key' }
  }

  try {
    const plain = await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ciphertext)
    return new Uint8Array(plain)
  } catch {
    throw { type: 'KEY_BACKUP_WRONG_PASSPHRASE', reason: 'Decryption failed — wrong passphrase or corrupted file' }
  }
}
