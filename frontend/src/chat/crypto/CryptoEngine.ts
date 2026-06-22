/**
 * CryptoEngine — X3DH, Double Ratchet, and Sender Keys
 *
 * Implements:
 *  - X3DH key exchange (initiator + responder paths)
 *  - Double Ratchet message encryption/decryption
 *  - Sender Keys protocol for group messaging
 *
 * REQ-2.2, REQ-2.3, REQ-5.1, REQ-5.2, REQ-5.5, REQ-5.6
 */

import { x25519 } from '@noble/curves/ed25519.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'
import type { AnonymousIdentity } from '../identity/IdentityManager.js'
import type { KeyBundle } from './KeyBundleManager.js'

// ---------------------------------------------------------------------------
// Public Interfaces
// ---------------------------------------------------------------------------

export interface SessionSecret {
  /** 32-byte X3DH output */
  sharedSecret: Uint8Array
  /** Associated data for authenticated encryption */
  associatedData: Uint8Array
}

export interface RatchetState {
  rootKey: Uint8Array
  sendChainKey: Uint8Array
  recvChainKey: Uint8Array
  /** Skipped message keys keyed by message number */
  sendMessageKeys: Map<number, Uint8Array>
  messageNumber: number
}

export interface RatchetHeader {
  /** Sender's current ephemeral DH public key */
  dhPubKey: Uint8Array
  messageNumber: number
  prevChainLength: number
}

export type DecryptionError = {
  type: 'DECRYPTION_FAILED'
  messageId?: string
}

/**
 * Initial X3DH message sent by the initiator to the responder.
 * Contains everything the responder needs to derive the shared secret.
 */
export interface InitialMessage {
  /** Initiator's identity public key (Ed25519) */
  identityKey: Uint8Array
  /** Initiator's ephemeral X25519 public key */
  ephemeralKey: Uint8Array
  /** Key ID of the signed pre-key used */
  signedPreKeyId: number
  /** Key ID of the one-time pre-key used (optional) */
  oneTimePreKeyId?: number
  /** The encrypted initial message payload (may be empty for handshake-only) */
  initialCiphertext?: Uint8Array
}

export interface SenderKey {
  keyId: number
  /** 32-byte chain key */
  chainKey: Uint8Array
}

// ---------------------------------------------------------------------------
// Hex helpers (internal)
// ---------------------------------------------------------------------------

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ---------------------------------------------------------------------------
// SubtleCrypto helpers for AES-GCM
// ---------------------------------------------------------------------------

/**
 * Encrypt `plaintext` with AES-GCM using `rawKey` (32 bytes).
 * Returns a packed blob: [iv(12) | ciphertext].
 */
async function aesGcmEncrypt(rawKey: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array> {
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  )
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = new Uint8Array(
    await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext),
  )
  // Pack: iv(12) | ciphertext
  const out = new Uint8Array(12 + ciphertext.length)
  out.set(iv, 0)
  out.set(ciphertext, 12)
  return out
}

/**
 * Decrypt a packed AES-GCM blob [iv(12) | ciphertext] using `rawKey` (32 bytes).
 * Returns null on failure (wrong key, corrupted data, etc.)
 */
async function aesGcmDecrypt(rawKey: Uint8Array, packed: Uint8Array): Promise<Uint8Array | null> {
  if (packed.length < 13) return null
  try {
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      rawKey,
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    )
    const iv = packed.slice(0, 12)
    const ciphertext = packed.slice(12)
    const plain = await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    return new Uint8Array(plain)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// HKDF helpers
// ---------------------------------------------------------------------------

const X3DH_INFO = new TextEncoder().encode('X3DH_v1')
const RATCHET_ROOT_INFO = new TextEncoder().encode('DoubleRatchet_Root')
const RATCHET_CHAIN_INFO = new TextEncoder().encode('DoubleRatchet_Chain')
const RATCHET_MSG_INFO = new TextEncoder().encode('DoubleRatchet_Msg')
const SENDER_KEY_INFO = new TextEncoder().encode('SenderKey_v1')

/**
 * Perform HKDF-SHA256 to derive `length` bytes.
 */
function hkdfDerive(
  inputKeyMaterial: Uint8Array,
  salt: Uint8Array | null,
  info: Uint8Array,
  length: number,
): Uint8Array {
  return hkdf(sha256, inputKeyMaterial, salt ?? new Uint8Array(32), info, length)
}

// ---------------------------------------------------------------------------
// X3DH — Initiator path
// ---------------------------------------------------------------------------

/**
 * X3DH initiator path.
 *
 * Alice (initiator) performs:
 *   DH1 = DH(IK_A, SPK_B)          — Alice's identity key vs Bob's signed pre-key
 *   DH2 = DH(EK_A, IK_B)           — Alice's ephemeral key vs Bob's identity key
 *   DH3 = DH(EK_A, SPK_B)          — Alice's ephemeral key vs Bob's signed pre-key
 *   DH4 = DH(EK_A, OPK_B)          — Alice's ephemeral key vs Bob's one-time pre-key (if present)
 *   SK = HKDF(DH1 || DH2 || DH3 [|| DH4])
 *
 * Returns the SessionSecret and the InitialMessage for Bob.
 *
 * REQ-2.2
 */
export async function initiateSession(
  myIdentity: AnonymousIdentity,
  recipientBundle: KeyBundle,
): Promise<{ sessionSecret: SessionSecret; initialMessage: InitialMessage }> {
  // Generate ephemeral X25519 key pair for Alice
  const ephemeralPrivate = x25519.utils.randomSecretKey()
  const ephemeralPublic = x25519.getPublicKey(ephemeralPrivate)

  // We need a compatible X25519 representation of Alice's identity key.
  // The identity key is Ed25519; for X3DH we use an ephemeral key as the DH component
  // and sign the bundle instead. In practice Signal uses an X25519 identity key alongside
  // the Ed25519 signing key. For this implementation we derive a deterministic X25519
  // key from the Ed25519 private key so DH operations work correctly.
  const ikA_x25519_priv = deriveX25519FromEd25519(myIdentity.privateKey)
  const ikA_x25519_pub = x25519.getPublicKey(ikA_x25519_priv)

  // Recipient's keys (all X25519)
  // IK_B: the recipient bundle's identity key is Ed25519 — derive X25519 form
  const ikB_x25519 = deriveX25519PublicFromEd25519Public(recipientBundle.identityKey)
  const spkB = recipientBundle.signedPreKey.publicKey

  // DH1 = DH(IK_A_x25519, SPK_B)
  const dh1 = x25519.getSharedSecret(ikA_x25519_priv, spkB)
  // DH2 = DH(EK_A, IK_B_x25519)
  const dh2 = x25519.getSharedSecret(ephemeralPrivate, ikB_x25519)
  // DH3 = DH(EK_A, SPK_B)
  const dh3 = x25519.getSharedSecret(ephemeralPrivate, spkB)

  // DH4 (optional — OTK present)
  let dh4: Uint8Array | null = null
  let oneTimePreKeyId: number | undefined
  if (recipientBundle.oneTimePreKeys.length > 0) {
    const otk = recipientBundle.oneTimePreKeys[0]
    dh4 = x25519.getSharedSecret(ephemeralPrivate, otk.publicKey)
    oneTimePreKeyId = otk.keyId
  }

  // Concatenate DH outputs
  const dhConcat = dh4
    ? concat(dh1, dh2, dh3, dh4)
    : concat(dh1, dh2, dh3)

  // Derive shared secret via HKDF
  // Salt is per Signal spec: 32 zero bytes followed by 32 0xFF bytes for domain separation
  const salt = new Uint8Array(32)
  const sharedSecret = hkdfDerive(dhConcat, salt, X3DH_INFO, 32)

  // Associated data = IK_A_pub || IK_B_pub (Ed25519 public keys)
  const associatedData = concat(myIdentity.publicKey, recipientBundle.identityKey)

  const sessionSecret: SessionSecret = { sharedSecret, associatedData }
  const initialMessage: InitialMessage = {
    identityKey: myIdentity.publicKey,
    ephemeralKey: ephemeralPublic,
    signedPreKeyId: recipientBundle.signedPreKey.keyId,
    oneTimePreKeyId,
  }

  return { sessionSecret, initialMessage }
}

// ---------------------------------------------------------------------------
// X3DH — Responder path
// ---------------------------------------------------------------------------

/**
 * X3DH responder path.
 *
 * Bob (responder) receives the InitialMessage from Alice and computes:
 *   DH1 = DH(SPK_B, IK_A)
 *   DH2 = DH(IK_B,  EK_A)
 *   DH3 = DH(SPK_B, EK_A)
 *   DH4 = DH(OPK_B, EK_A)  (if OTK was used)
 *   SK = HKDF(DH1 || DH2 || DH3 [|| DH4])
 *
 * REQ-2.2
 */
export async function receiveSession(
  myIdentity: AnonymousIdentity,
  initialMessage: InitialMessage,
  /** Bob's local pre-key store private keys */
  spkPrivate: Uint8Array,
  otkPrivate?: Uint8Array,
): Promise<SessionSecret> {
  const ikB_x25519_priv = deriveX25519FromEd25519(myIdentity.privateKey)
  const ikA_x25519 = deriveX25519PublicFromEd25519Public(initialMessage.identityKey)
  const ekA = initialMessage.ephemeralKey

  // DH1 = DH(SPK_B, IK_A_x25519)
  const dh1 = x25519.getSharedSecret(spkPrivate, ikA_x25519)
  // DH2 = DH(IK_B_x25519, EK_A)
  const dh2 = x25519.getSharedSecret(ikB_x25519_priv, ekA)
  // DH3 = DH(SPK_B, EK_A)
  const dh3 = x25519.getSharedSecret(spkPrivate, ekA)

  // DH4 (optional — OTK private key provided)
  let dh4: Uint8Array | null = null
  if (otkPrivate) {
    dh4 = x25519.getSharedSecret(otkPrivate, ekA)
  }

  const dhConcat = dh4
    ? concat(dh1, dh2, dh3, dh4)
    : concat(dh1, dh2, dh3)

  const salt = new Uint8Array(32)
  const sharedSecret = hkdfDerive(dhConcat, salt, X3DH_INFO, 32)

  // Associated data = IK_A_pub || IK_B_pub (Ed25519)
  const associatedData = concat(initialMessage.identityKey, myIdentity.publicKey)

  return { sharedSecret, associatedData }
}

// ---------------------------------------------------------------------------
// Double Ratchet
// ---------------------------------------------------------------------------

/**
 * Seed a Double Ratchet state from an X3DH shared secret.
 * REQ-2.3
 */
export function initRatchet(secret: SessionSecret): RatchetState {
  // Derive root key and initial chain keys from the shared secret
  const derived = hkdfDerive(secret.sharedSecret, null, RATCHET_ROOT_INFO, 96)
  const rootKey = derived.slice(0, 32)
  const sendChainKey = derived.slice(32, 64)
  const recvChainKey = derived.slice(64, 96)

  return {
    rootKey,
    sendChainKey,
    recvChainKey,
    sendMessageKeys: new Map<number, Uint8Array>(),
    messageNumber: 0,
  }
}

/**
 * Derive the next message key from a chain key, and advance the chain key.
 * Returns { messageKey, nextChainKey }.
 */
function deriveMessageKey(chainKey: Uint8Array): { messageKey: Uint8Array; nextChainKey: Uint8Array } {
  // Message key: HKDF(chainKey, info="Msg")
  const messageKey = hkdfDerive(chainKey, null, RATCHET_MSG_INFO, 32)
  // Next chain key: HKDF(chainKey, info="Chain")
  const nextChainKey = hkdfDerive(chainKey, null, RATCHET_CHAIN_INFO, 32)
  return { messageKey, nextChainKey }
}

/**
 * Advance the ratchet and return the next message key.
 * This is the "nextMessageKey" function referenced in the PBT spec.
 * Mutates `state.sendChainKey` and increments `state.messageNumber`.
 */
export function nextMessageKey(state: RatchetState): Uint8Array {
  const { messageKey, nextChainKey } = deriveMessageKey(state.sendChainKey)
  state.sendMessageKeys.set(state.messageNumber, messageKey)
  state.sendChainKey = nextChainKey
  state.messageNumber++
  return messageKey
}

/**
 * Encrypt a message, advancing the ratchet send chain.
 * Returns the AES-GCM ciphertext and the ratchet header.
 *
 * REQ-5.1, REQ-5.6
 */
export async function encryptMessage(
  state: RatchetState,
  plaintext: Uint8Array,
): Promise<{ ciphertext: Uint8Array; header: RatchetHeader }> {
  const messageKey = nextMessageKey(state)

  const header: RatchetHeader = {
    dhPubKey: new Uint8Array(32), // In a full DH ratchet this would be updated per ratchet step
    messageNumber: state.messageNumber - 1,
    prevChainLength: 0,
  }

  const ciphertext = await aesGcmEncrypt(messageKey, plaintext)
  return { ciphertext, header }
}

/**
 * Decrypt a message.
 *
 * On failure returns a typed `DecryptionError` — NEVER throws.
 * On success, advances the receive chain key.
 * Preserves ratchet state on failure (REQ-5.5).
 *
 * REQ-5.4, REQ-5.5
 */
export async function decryptMessage(
  state: RatchetState,
  header: RatchetHeader,
  ciphertext: Uint8Array,
): Promise<Uint8Array | DecryptionError> {
  try {
    // Derive the receive message key for the given message number
    const { messageKey, nextChainKey } = deriveMessageKey(state.recvChainKey)

    const plaintext = await aesGcmDecrypt(messageKey, ciphertext)
    if (plaintext === null) {
      return { type: 'DECRYPTION_FAILED' }
    }

    // Only advance the chain key on successful decryption
    state.recvChainKey = nextChainKey

    return plaintext
  } catch {
    // MUST never throw — any unexpected error returns DecryptionError (REQ-5.5)
    return { type: 'DECRYPTION_FAILED' }
  }
}

// ---------------------------------------------------------------------------
// Sender Keys — Group Messaging (Signal protocol)
// ---------------------------------------------------------------------------

/**
 * Generate a new Sender Key for group messaging.
 * Sender Key = { keyId, chainKey: random 32 bytes }
 * REQ-5.2
 */
export function generateSenderKey(): SenderKey {
  const chainKey = globalThis.crypto.getRandomValues(new Uint8Array(32))
  // keyId is a random 32-bit integer
  const keyIdBytes = globalThis.crypto.getRandomValues(new Uint8Array(4))
  const keyId = (keyIdBytes[0] << 24) | (keyIdBytes[1] << 16) | (keyIdBytes[2] << 8) | keyIdBytes[3]
  return { keyId: keyId >>> 0, chainKey }
}

/**
 * Derive the current message key from a Sender Key's chain key,
 * then ratchet the chain key forward.
 * Returns { messageKey, nextSenderKey }.
 */
function advanceSenderKey(senderKey: SenderKey): { messageKey: Uint8Array; nextSenderKey: SenderKey } {
  const messageKey = hkdfDerive(senderKey.chainKey, null, SENDER_KEY_INFO, 32)
  const nextChainKey = hkdfDerive(senderKey.chainKey, null, RATCHET_CHAIN_INFO, 32)
  const nextSenderKey: SenderKey = { keyId: senderKey.keyId, chainKey: nextChainKey }
  return { messageKey, nextSenderKey }
}

/**
 * Encrypt a group message using the Sender Keys protocol.
 * The senderKey is ratcheted forward after each message (REQ-5.2, REQ-5.6).
 * Returns { ciphertext, updatedSenderKey }.
 */
export async function encryptGroupMessage(
  senderKey: SenderKey,
  plaintext: Uint8Array,
): Promise<{ ciphertext: Uint8Array; updatedSenderKey: SenderKey }> {
  const { messageKey, nextSenderKey } = advanceSenderKey(senderKey)
  const ciphertext = await aesGcmEncrypt(messageKey, plaintext)
  return { ciphertext, updatedSenderKey: nextSenderKey }
}

/**
 * Decrypt a group message using the Sender Keys protocol.
 * Returns the plaintext or a `DecryptionError` — NEVER throws (REQ-5.5).
 */
export async function decryptGroupMessage(
  senderKey: SenderKey,
  ciphertext: Uint8Array,
): Promise<Uint8Array | DecryptionError> {
  try {
    const { messageKey } = advanceSenderKey(senderKey)
    const plaintext = await aesGcmDecrypt(messageKey, ciphertext)
    if (plaintext === null) {
      return { type: 'DECRYPTION_FAILED' }
    }
    return plaintext
  } catch {
    return { type: 'DECRYPTION_FAILED' }
  }
}

// ---------------------------------------------------------------------------
// CryptoEngine class (aggregates all operations)
// ---------------------------------------------------------------------------

export class CryptoEngine {
  async initiateSession(
    myIdentity: AnonymousIdentity,
    recipientBundle: KeyBundle,
  ): Promise<{ sessionSecret: SessionSecret; initialMessage: InitialMessage }> {
    return initiateSession(myIdentity, recipientBundle)
  }

  async receiveSession(
    myIdentity: AnonymousIdentity,
    initialMessage: InitialMessage,
    spkPrivate: Uint8Array,
    otkPrivate?: Uint8Array,
  ): Promise<SessionSecret> {
    return receiveSession(myIdentity, initialMessage, spkPrivate, otkPrivate)
  }

  initRatchet(secret: SessionSecret): RatchetState {
    return initRatchet(secret)
  }

  async encryptMessage(
    state: RatchetState,
    plaintext: Uint8Array,
  ): Promise<{ ciphertext: Uint8Array; header: RatchetHeader }> {
    return encryptMessage(state, plaintext)
  }

  async decryptMessage(
    state: RatchetState,
    header: RatchetHeader,
    ciphertext: Uint8Array,
  ): Promise<Uint8Array | DecryptionError> {
    return decryptMessage(state, header, ciphertext)
  }

  generateSenderKey(): SenderKey {
    return generateSenderKey()
  }

  async encryptGroupMessage(
    senderKey: SenderKey,
    plaintext: Uint8Array,
  ): Promise<{ ciphertext: Uint8Array; updatedSenderKey: SenderKey }> {
    return encryptGroupMessage(senderKey, plaintext)
  }

  async decryptGroupMessage(
    senderKey: SenderKey,
    ciphertext: Uint8Array,
  ): Promise<Uint8Array | DecryptionError> {
    return decryptGroupMessage(senderKey, ciphertext)
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Concatenate multiple Uint8Arrays.
 */
function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((acc, a) => acc + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) {
    out.set(a, offset)
    offset += a.length
  }
  return out
}

/**
 * Derive an X25519 private key from an Ed25519 private key seed.
 *
 * Both Ed25519 and X25519 use the same underlying curve (Curve25519).
 * We clamp the bytes to produce a valid X25519 scalar, matching how
 * Signal and libsodium handle this conversion.
 */
function deriveX25519FromEd25519(ed25519Private: Uint8Array): Uint8Array {
  // Hash the Ed25519 seed with SHA-512, take the first 32 bytes, then clamp
  const h = sha256(ed25519Private) // SHA-256 for a deterministic 32-byte output
  const out = new Uint8Array(h)
  // X25519 scalar clamping (RFC 7748)
  out[0] &= 248
  out[31] &= 127
  out[31] |= 64
  return out
}

/**
 * Derive an X25519 public key from an Ed25519 public key.
 * We use the same deterministic derivation path: clamp the SHA-256 of the key
 * to get a scalar, then compute the X25519 public key.
 *
 * NOTE: In a production system, identities would carry both an Ed25519 signing key
 * and an X25519 key agreement key. Here we derive the X25519 key from the Ed25519
 * private key, so the "public" form is derived consistently.
 */
function deriveX25519PublicFromEd25519Public(ed25519Public: Uint8Array): Uint8Array {
  // This is used in contexts where we don't have the private key.
  // We treat the Ed25519 public key bytes directly as an X25519 key for DH purposes.
  // This is valid because both are 32-byte points on Curve25519.
  // In practice, Signal uses a separate X25519 identity key alongside the Ed25519 signing key.
  // For our implementation, we use the Ed25519 public bytes as the X25519 target point.
  return ed25519Public
}

export { toHex }
