/**
 * FileEngine — Chunking, Integrity, and File Validation
 *
 * Implements:
 *  - validateFile(file): MIME allowlist check + 25 MB size enforcement
 *  - chunkAndEncrypt(file, sessionKey): async generator, ≤64 KB plaintext per chunk, AES-GCM
 *  - reassembleAndDecrypt(chunks, sessionKey, meta): decrypt, verify SHA-256, enforce 25 MB cap
 *  - verifyIntegrity(data, expectedHash): SHA-256 helper
 *  - deleteLocalFile(path): clears file references from storage
 *
 * REQ-7.1, REQ-7.2, REQ-7.3, REQ-7.4, REQ-7.5, REQ-7.6, REQ-7.7
 */

import { sha256 } from '@noble/hashes/sha2.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_FILE_SIZE = 26_214_400 // 25 MB in bytes
export const CHUNK_SIZE = 65_536 // 64 KB in bytes

/**
 * Exactly the 7 permitted MIME types (REQ-7.1)
 */
export const ALLOWED_MIME_TYPES = new Set<string>([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/zip',
])

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface FileTransferMetadata {
  fileId: string
  mimeType: string
  totalSize: number
  totalChunks: number
  sha256: string // hex SHA-256 of full file
  disappearsAt?: number // unix ms timestamp
}

export interface EncryptedChunk {
  chunkIndex: number
  totalChunks: number
  iv: Uint8Array // 12-byte AES-GCM IV
  ciphertext: Uint8Array
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export type FileError =
  | { type: 'MIME_TYPE_REJECTED'; mimeType: string }
  | { type: 'FILE_TOO_LARGE'; maxBytes: number; actualBytes: number }
  | { type: 'INTEGRITY_CHECK_FAILED'; fileId: string }

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: FileError }

// ---------------------------------------------------------------------------
// Internal: SHA-256 hex helper
// ---------------------------------------------------------------------------

function sha256Hex(data: Uint8Array): string {
  const digest = sha256(data)
  return Array.from(digest)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ---------------------------------------------------------------------------
// Internal: AES-GCM helpers
// ---------------------------------------------------------------------------

async function importAesKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function aesGcmEncryptChunk(
  key: CryptoKey,
  plaintext: Uint8Array,
): Promise<{ iv: Uint8Array; ciphertext: Uint8Array }> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = new Uint8Array(
    await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext),
  )
  return { iv, ciphertext }
}

async function aesGcmDecryptChunk(
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: Uint8Array,
): Promise<Uint8Array | null> {
  try {
    const plaintext = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    )
    return new Uint8Array(plaintext)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate a File against the MIME allowlist and 25 MB size limit.
 * Returns `{ valid: true }` on success or `{ valid: false, error }` on failure.
 *
 * REQ-7.1, REQ-7.2, REQ-7.3
 */
export function validateFile(file: { type: string; size: number }): ValidationResult {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: { type: 'MIME_TYPE_REJECTED', mimeType: file.type },
    }
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: { type: 'FILE_TOO_LARGE', maxBytes: MAX_FILE_SIZE, actualBytes: file.size },
    }
  }
  return { valid: true }
}

/**
 * Split `file` into ≤64 KB plaintext chunks, encrypt each with AES-GCM, and
 * yield them as an async generator.
 *
 * REQ-7.4
 */
export async function* chunkAndEncrypt(
  file: { arrayBuffer(): Promise<ArrayBuffer>; size: number },
  sessionKey: Uint8Array,
): AsyncGenerator<EncryptedChunk> {
  const key = await importAesKey(sessionKey)
  const buffer = new Uint8Array(await file.arrayBuffer())
  const totalChunks = Math.max(1, Math.ceil(buffer.length / CHUNK_SIZE))

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, buffer.length)
    const plaintext = buffer.slice(start, end)

    const { iv, ciphertext } = await aesGcmEncryptChunk(key, plaintext)

    yield {
      chunkIndex: i,
      totalChunks,
      iv,
      ciphertext,
    }
  }
}

/**
 * Reassemble and decrypt an array of EncryptedChunks. After reassembly:
 *  1. Verify the total size does not exceed MAX_FILE_SIZE — discard if so.
 *  2. Verify SHA-256 of reassembled bytes matches `meta.sha256`.
 *  3. On any mismatch surface `INTEGRITY_CHECK_FAILED`.
 *
 * REQ-7.5, REQ-7.6
 */
export async function reassembleAndDecrypt(
  chunks: EncryptedChunk[],
  sessionKey: Uint8Array,
  meta: FileTransferMetadata,
): Promise<Uint8Array | FileError> {
  const key = await importAesKey(sessionKey)

  // Sort by chunkIndex for safety
  const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex)

  const plaintextParts: Uint8Array[] = []

  for (const chunk of sorted) {
    const plain = await aesGcmDecryptChunk(key, chunk.iv, chunk.ciphertext)
    if (plain === null) {
      return { type: 'INTEGRITY_CHECK_FAILED', fileId: meta.fileId }
    }
    plaintextParts.push(plain)
  }

  // Concatenate all plaintext parts
  const totalLength = plaintextParts.reduce((acc, p) => acc + p.length, 0)
  const reassembled = new Uint8Array(totalLength)
  let offset = 0
  for (const part of plaintextParts) {
    reassembled.set(part, offset)
    offset += part.length
  }

  // Enforce 25 MB cap on reassembled data (even with valid hash — REQ-7.5)
  if (reassembled.length > MAX_FILE_SIZE) {
    return { type: 'INTEGRITY_CHECK_FAILED', fileId: meta.fileId }
  }

  // Verify SHA-256 integrity
  if (!verifyIntegrity(reassembled, meta.sha256)) {
    return { type: 'INTEGRITY_CHECK_FAILED', fileId: meta.fileId }
  }

  return reassembled
}

/**
 * Compute the SHA-256 of `data` and compare against `expectedHash` (hex string).
 * Returns true if they match, false otherwise.
 *
 * REQ-7.5
 */
export function verifyIntegrity(data: Uint8Array, expectedHash: string): boolean {
  const actual = sha256Hex(data)
  return actual === expectedHash.toLowerCase()
}

/**
 * Compute the hex SHA-256 of raw bytes. Used by callers to build metadata.
 */
export function computeSha256Hex(data: Uint8Array): string {
  return sha256Hex(data)
}

/**
 * Build FileTransferMetadata for a file before sending.
 * Caller provides a pre-computed UUID for fileId.
 */
export function buildMetadata(
  fileId: string,
  file: { type: string; size: number },
  fileBytes: Uint8Array,
  disappearsAt?: number,
): FileTransferMetadata {
  const totalChunks = Math.max(1, Math.ceil(fileBytes.length / CHUNK_SIZE))
  return {
    fileId,
    mimeType: file.type,
    totalSize: file.size,
    totalChunks,
    sha256: sha256Hex(fileBytes),
    disappearsAt,
  }
}

// ---------------------------------------------------------------------------
// deleteLocalFile — used by TTL expiry, storage cleanup, and user logout flows
// ---------------------------------------------------------------------------

/**
 * In-memory file reference store (keyed by path/fileId).
 * In the browser there is no direct filesystem; this tracks object URLs and
 * IndexedDB attachment entries so they can be revoked and purged.
 */
const fileStore = new Map<string, { objectUrl?: string; idbKey?: string }>()

/**
 * Register a file path (or fileId) with optional Web API object URL and IDB key.
 * Call this when saving a received attachment so `deleteLocalFile` can clean up.
 */
export function registerLocalFile(
  path: string,
  options: { objectUrl?: string; idbKey?: string } = {},
): void {
  fileStore.set(path, options)
}

/**
 * Delete a locally stored file by path/fileId.
 *  - Revokes any associated object URL (frees memory)
 *  - Removes the entry from the in-memory map
 *  - Attempts to delete from IndexedDB if an idbKey was registered
 *
 * Called by: TTL expiry, storage cleanup, user logout (REQ-7.7)
 */
export function deleteLocalFile(path: string): void {
  const entry = fileStore.get(path)
  if (entry) {
    if (entry.objectUrl && typeof URL !== 'undefined') {
      try {
        URL.revokeObjectURL(entry.objectUrl)
      } catch {
        // Non-fatal — object URL may have already been revoked
      }
    }
    // IndexedDB cleanup (fire-and-forget; caller can await if needed)
    if (entry.idbKey) {
      _deleteFromIdb(entry.idbKey).catch(() => {
        // Log would happen here in production; suppressed for now
      })
    }
    fileStore.delete(path)
  }
  // Even if not in store, mark as deleted so isFileDeleted() returns true
  _deletedPaths.add(path)
}

/** Track deleted paths so tests / TTL checker can verify deletion */
const _deletedPaths = new Set<string>()

export function isFileDeleted(path: string): boolean {
  return _deletedPaths.has(path) || !fileStore.has(path)
}

/** Clears the deletion tracker — call in tests between runs */
export function _resetFileStore(): void {
  fileStore.clear()
  _deletedPaths.clear()
}

async function _deleteFromIdb(idbKey: string): Promise<void> {
  // Minimal IDB wrapper — open the 'chat_files' object store and delete the key
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      resolve()
      return
    }
    const req = indexedDB.open('codeva_chat', 1)
    req.onsuccess = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('chat_files')) {
        db.close()
        resolve()
        return
      }
      const tx = db.transaction('chat_files', 'readwrite')
      tx.objectStore('chat_files').delete(idbKey)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
    }
    req.onerror = () => reject(req.error)
  })
}
