/**
 * KeyBundleManager — X3DH Pre-Key Infrastructure
 *
 * Manages generation, publication, and fetching of X3DH Key Bundles.
 * Key Bundles are stored ONLY in Redis on the Relay Server (never MongoDB).
 *
 * REQ-2.1, REQ-2.4, REQ-2.5
 */

import { x25519 } from '@noble/curves/ed25519.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import type { AnonymousIdentity } from '../identity/IdentityManager.js'

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface SignedPreKey {
  keyId: number
  /** X25519 public key (32 bytes) */
  publicKey: Uint8Array
  /** Ed25519 signature over the X25519 public key bytes */
  signature: Uint8Array
}

export interface OneTimePreKey {
  keyId: number
  /** X25519 public key (32 bytes) */
  publicKey: Uint8Array
}

export interface KeyBundle {
  /** Ed25519 identity public key (32 bytes) */
  identityKey: Uint8Array
  signedPreKey: SignedPreKey
  oneTimePreKeys: Array<OneTimePreKey>
}

/**
 * Internal representation of a pre-key pair — holds the private key locally,
 * never sent over the wire.
 */
export interface PreKeyPair {
  keyId: number
  publicKey: Uint8Array
  privateKey: Uint8Array
}

/**
 * Local store of private pre-keys (never published).
 * In a full implementation this would be persisted to IndexedDB.
 */
export interface LocalPreKeyStore {
  signedPreKey: PreKeyPair
  oneTimePreKeys: PreKeyPair[]
}

/** Typed error emitted when OTKs are exhausted (REQ-2.4) */
export interface OtkExhaustedWarning {
  type: 'OTK_EXHAUSTED'
  message: string
}

/** Minimal interface for WebSocket transport — allows stub injection for testability */
export interface WsSender {
  send(type: string, payload: unknown): Promise<unknown>
}

// ---------------------------------------------------------------------------
// Minimum OTK thresholds
// ---------------------------------------------------------------------------

/** Initial number of one-time pre-keys generated per bundle (REQ-2.1) */
export const INITIAL_OTK_COUNT = 10

/** Replenish when local OTK count drops below this threshold (REQ-2.1) */
export const OTK_REPLENISH_THRESHOLD = 5

// ---------------------------------------------------------------------------
// Pure key-generation functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Generate a random X25519 key pair.
 */
export function generateX25519KeyPair(): { publicKey: Uint8Array; privateKey: Uint8Array } {
  const privateKey = x25519.utils.randomSecretKey()
  const publicKey = x25519.getPublicKey(privateKey)
  return { publicKey, privateKey }
}

/**
 * Sign `message` bytes using an Ed25519 private key.
 * Returns a 64-byte signature.
 */
export function signWithEd25519(message: Uint8Array, privateKey: Uint8Array): Uint8Array {
  return ed25519.sign(message, privateKey)
}

/**
 * Verify an Ed25519 signature.
 */
export function verifyEd25519Signature(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  try {
    return ed25519.verify(signature, message, publicKey)
  } catch {
    return false
  }
}

/**
 * Generate a Key Bundle for the given identity.
 *
 * Produces:
 *  - 1 signed pre-key (X25519), signed with the Ed25519 identity private key
 *  - `count` one-time pre-keys (X25519)
 *
 * Returns both the public KeyBundle (to be published) and the LocalPreKeyStore
 * (private keys, never sent over the wire).
 *
 * REQ-2.1
 */
export function generateBundle(
  identity: AnonymousIdentity,
  count = INITIAL_OTK_COUNT,
): { bundle: KeyBundle; localStore: LocalPreKeyStore } {
  // Generate signed pre-key
  const spkPair = generateX25519KeyPair()
  const spkSignature = signWithEd25519(spkPair.publicKey, identity.privateKey)

  const signedPreKeyPair: PreKeyPair = {
    keyId: 1,
    publicKey: spkPair.publicKey,
    privateKey: spkPair.privateKey,
  }

  // Generate one-time pre-keys
  const otkPairs: PreKeyPair[] = []
  for (let i = 0; i < count; i++) {
    const pair = generateX25519KeyPair()
    otkPairs.push({
      keyId: i + 1,
      publicKey: pair.publicKey,
      privateKey: pair.privateKey,
    })
  }

  const bundle: KeyBundle = {
    identityKey: identity.publicKey,
    signedPreKey: {
      keyId: signedPreKeyPair.keyId,
      publicKey: signedPreKeyPair.publicKey,
      signature: spkSignature,
    },
    oneTimePreKeys: otkPairs.map(({ keyId, publicKey }) => ({ keyId, publicKey })),
  }

  const localStore: LocalPreKeyStore = {
    signedPreKey: signedPreKeyPair,
    oneTimePreKeys: otkPairs,
  }

  return { bundle, localStore }
}

// ---------------------------------------------------------------------------
// KeyBundleManager class
// ---------------------------------------------------------------------------

/**
 * Manages the X3DH pre-key lifecycle:
 *  - `generateBundle`: produce a fresh bundle for an identity
 *  - `publishBundle`: send bundle to Relay Server over WS `anon_chat.key_bundle_pub`
 *  - `fetchBundle`: request a recipient's bundle via `anon_chat.key_bundle_req`
 *  - `replenishOneTimePreKeys`: refill OTKs when count drops below threshold
 *
 * The `wsSender` parameter is an optional injectable WS transport interface.
 * When omitted (or null), the manager operates in offline/test mode:
 *  - `publishBundle` will be a no-op
 *  - `fetchBundle` will throw unless a mock is provided
 *
 * Task 4 (WsMultiplexer) will supply a real WsSender once implemented.
 */
export class KeyBundleManager {
  private _wsSender: WsSender | null

  /**
   * In-memory cache of the local pre-key store.
   * In a full implementation this would be persisted to IndexedDB.
   */
  private _localStore: LocalPreKeyStore | null = null

  constructor(wsSender: WsSender | null = null) {
    this._wsSender = wsSender
  }

  /**
   * Set or replace the WS sender (called by WsMultiplexer once connected — Task 4).
   */
  setWsSender(sender: WsSender): void {
    this._wsSender = sender
  }

  /**
   * Generate a fresh Key Bundle for `identity` and cache the local private key store.
   * REQ-2.1
   */
  generateBundle(identity: AnonymousIdentity, count = INITIAL_OTK_COUNT): KeyBundle {
    const { bundle, localStore } = generateBundle(identity, count)
    this._localStore = localStore
    return bundle
  }

  /**
   * Publish a Key Bundle to the Relay Server via WS frame `anon_chat.key_bundle_pub`.
   * Key bundles are stored ONLY in Redis on the server side (REQ-2.5).
   *
   * If no WS sender is available (offline / pre-Task 4), the method silently
   * returns without throwing — callers can retry after connection is established.
   */
  async publishBundle(bundle: KeyBundle): Promise<void> {
    if (!this._wsSender) {
      // No transport yet — WsMultiplexer (Task 4) will supply one
      return
    }

    await this._wsSender.send('anon_chat.key_bundle_pub', serializeBundle(bundle))
  }

  /**
   * Fetch a recipient's Key Bundle from the Relay Server.
   * Sends WS frame `anon_chat.key_bundle_req` and awaits the response.
   *
   * If one-time pre-keys are exhausted, the server will respond without OTKs.
   * This method detects that case and emits an `OTK_EXHAUSTED` warning (REQ-2.4).
   *
   * @throws {Error} if no WS sender is configured
   */
  async fetchBundle(recipientId: string): Promise<KeyBundle> {
    if (!this._wsSender) {
      throw new Error(
        'KeyBundleManager: no WS sender configured. Assign a WsSender via setWsSender() first.',
      )
    }

    const response = await this._wsSender.send('anon_chat.key_bundle_req', { recipientId })
    const bundle = deserializeBundle(response as SerializedBundle)

    // Check for OTK exhaustion and emit warning (REQ-2.4)
    if (bundle.oneTimePreKeys.length === 0) {
      const warning: OtkExhaustedWarning = {
        type: 'OTK_EXHAUSTED',
        message:
          'Recipient has no remaining one-time pre-keys. Session will be established using ' +
          'the signed pre-key only. Forward secrecy is reduced for this session.',
      }
      this._emitOtkExhausted(warning)
    }

    return bundle
  }

  /**
   * Replenish one-time pre-keys when the local store drops below OTK_REPLENISH_THRESHOLD.
   * Triggered automatically when OTK count falls below 5 (REQ-2.1).
   *
   * Requires the identity to re-sign the new keys. The caller must pass the identity
   * so this method can generate and sign fresh OTKs.
   */
  async replenishOneTimePreKeys(identity: AnonymousIdentity): Promise<void> {
    const currentCount = this._localStore?.oneTimePreKeys.length ?? 0

    if (currentCount >= OTK_REPLENISH_THRESHOLD) {
      // No replenishment needed yet
      return
    }

    // Generate enough new OTKs to bring count back to INITIAL_OTK_COUNT
    const needed = INITIAL_OTK_COUNT - currentCount
    const newOtkPairs: PreKeyPair[] = []
    const nextKeyId = (this._localStore?.oneTimePreKeys.at(-1)?.keyId ?? 0) + 1

    for (let i = 0; i < needed; i++) {
      const pair = generateX25519KeyPair()
      newOtkPairs.push({
        keyId: nextKeyId + i,
        publicKey: pair.publicKey,
        privateKey: pair.privateKey,
      })
    }

    // Update local store
    if (this._localStore) {
      this._localStore.oneTimePreKeys = [
        ...this._localStore.oneTimePreKeys,
        ...newOtkPairs,
      ]
    }

    // Build a partial bundle update — only new OTKs and identity key needed
    const partialBundle: Pick<KeyBundle, 'identityKey' | 'oneTimePreKeys'> = {
      identityKey: identity.publicKey,
      oneTimePreKeys: newOtkPairs.map(({ keyId, publicKey }) => ({ keyId, publicKey })),
    }

    if (this._wsSender) {
      await this._wsSender.send('anon_chat.key_bundle_pub', {
        identityKey: bytesToHex(partialBundle.identityKey),
        oneTimePreKeys: partialBundle.oneTimePreKeys.map(({ keyId, publicKey }) => ({
          keyId,
          publicKey: bytesToHex(publicKey),
        })),
        replenish: true,
      })
    }
  }

  /**
   * Check if OTK replenishment is needed and trigger it automatically.
   * Called after consuming an OTK from the local store.
   */
  async checkAndReplenish(identity: AnonymousIdentity): Promise<void> {
    const currentCount = this._localStore?.oneTimePreKeys.length ?? 0
    if (currentCount < OTK_REPLENISH_THRESHOLD) {
      await this.replenishOneTimePreKeys(identity)
    }
  }

  /**
   * Consume the next available OTK from the local store.
   * Returns null and emits OTK_EXHAUSTED if none remain.
   */
  consumeOneTimePreKey(): OneTimePreKey | null {
    if (!this._localStore || this._localStore.oneTimePreKeys.length === 0) {
      const warning: OtkExhaustedWarning = {
        type: 'OTK_EXHAUSTED',
        message:
          'No one-time pre-keys remain locally. The next session will use the signed pre-key ' +
          'only. Forward secrecy is reduced.',
      }
      this._emitOtkExhausted(warning)
      return null
    }

    const otk = this._localStore.oneTimePreKeys.shift()!
    return { keyId: otk.keyId, publicKey: otk.publicKey }
  }

  /** Expose local OTK count (used for testing and threshold checks) */
  get localOtkCount(): number {
    return this._localStore?.oneTimePreKeys.length ?? 0
  }

  /** Expose local store for testing */
  get localStore(): LocalPreKeyStore | null {
    return this._localStore
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Emit an OTK_EXHAUSTED warning.
   * In the browser this dispatches a CustomEvent on `window`; in Node/test
   * environments it emits on the global event target if available, or no-ops.
   */
  private _emitOtkExhausted(warning: OtkExhaustedWarning): void {
    if (typeof globalThis.dispatchEvent === 'function') {
      globalThis.dispatchEvent(
        new CustomEvent('anon_chat:warning', { detail: warning }),
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Serialization helpers (bundles are transmitted as plain JSON over WS)
// ---------------------------------------------------------------------------

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string')
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

interface SerializedBundle {
  identityKey: string
  signedPreKey: {
    keyId: number
    publicKey: string
    signature: string
  }
  oneTimePreKeys: Array<{ keyId: number; publicKey: string }>
}

export function serializeBundle(bundle: KeyBundle): SerializedBundle {
  return {
    identityKey: bytesToHex(bundle.identityKey),
    signedPreKey: {
      keyId: bundle.signedPreKey.keyId,
      publicKey: bytesToHex(bundle.signedPreKey.publicKey),
      signature: bytesToHex(bundle.signedPreKey.signature),
    },
    oneTimePreKeys: bundle.oneTimePreKeys.map(({ keyId, publicKey }) => ({
      keyId,
      publicKey: bytesToHex(publicKey),
    })),
  }
}

export function deserializeBundle(data: SerializedBundle): KeyBundle {
  return {
    identityKey: hexToBytes(data.identityKey),
    signedPreKey: {
      keyId: data.signedPreKey.keyId,
      publicKey: hexToBytes(data.signedPreKey.publicKey),
      signature: hexToBytes(data.signedPreKey.signature),
    },
    oneTimePreKeys: data.oneTimePreKeys.map(({ keyId, publicKey }) => ({
      keyId,
      publicKey: hexToBytes(publicKey),
    })),
  }
}
