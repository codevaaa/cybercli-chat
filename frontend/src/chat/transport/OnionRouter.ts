/**
 * OnionRouter — Sphinx-inspired layered encryption and route selection.
 *
 * Implements a 3-hop onion routing scheme for MAX plan users, and a single-hop
 * plain TLS path for Basic plan users.
 *
 * Cryptographic primitives:
 *   - Curve25519 (X25519) ECDH via @noble/curves for per-hop shared secrets
 *   - HKDF-SHA256 via @noble/hashes for per-hop AES key derivation
 *   - AES-256-GCM (SubtleCrypto) for per-hop encryption / decryption
 *
 * Packet format inspired by Lightning Network BOLT-04 Sphinx:
 *   - Fixed-size routingInfo (1300 bytes) prevents hop-count leakage
 *   - Each layer wraps only the address of the next hop + inner packet
 *
 * REQ-9.1, REQ-9.2, REQ-9.3, REQ-9.4, REQ-9.5, REQ-9.6
 */

import { x25519 } from '@noble/curves/ed25519.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

/** A single relay hop — node identity and WebSocket address. */
export interface RelayHop {
  /** Relay node Curve25519 public key, hex-encoded (32 bytes). */
  nodeId: string
  /** WebSocket address, e.g. ws://relay-1.codeva.app */
  address: string
}

/**
 * Onion packet inspired by Lightning Network BOLT-04 Sphinx.
 * Fixed-size `routingInfo` (1300 bytes) prevents hop-count inference.
 */
export interface OnionPacket {
  version: 1
  /** Ephemeral Curve25519 public key used for ECDH at this layer (32 bytes). */
  ephemeralKey: Uint8Array
  /** Encrypted per-hop routing headers, always padded to exactly 1300 bytes. */
  routingInfo: Uint8Array
  /** Layered-encrypted message payload. */
  payload: Uint8Array
}

/**
 * Result of a successful `peelLayer` call that reveals the next relay hop.
 */
export interface PeelResult {
  /** The address of the next relay node. */
  nextHop: string
  /** The inner packet to forward to the next hop. */
  innerPacket: OnionPacket
}

/**
 * Result of a `peelLayer` call at the final relay — exposes the plaintext payload.
 */
export interface FinalPayload {
  /** The decrypted plaintext payload. */
  payload: Uint8Array
}

/** Discriminated union returned by `peelLayer`. */
export type PeelLayerResult = PeelResult | FinalPayload

/** Type guard — true if the peel result is a final payload (last hop). */
export function isFinalPayload(result: PeelLayerResult): result is FinalPayload {
  return 'payload' in result && !('nextHop' in result)
}

// ---------------------------------------------------------------------------
// ROUTING_INFO_SIZE constant
// ---------------------------------------------------------------------------

/** Fixed size of routingInfo in bytes (prevents hop-count leakage). */
export const ROUTING_INFO_SIZE = 1300

// ---------------------------------------------------------------------------
// In-memory relay node registry (mock for testing / client-side)
// ---------------------------------------------------------------------------

/**
 * Fixed-seed private keys for the default relay registry.
 * These are valid X25519 private keys (clamped bytes).
 * In production, relay nodes generate their own key pairs; public keys are
 * fetched from the `relay:nodes` Redis key.
 *
 * Private keys are listed here so tests can instantiate peelLayer on any hop.
 * They must NOT be used outside of tests.
 */
export const DEFAULT_RELAY_PRIVATE_KEYS: Uint8Array[] = [
  // Relay 1 — deterministic seed 0x01 × 32
  (() => {
    const k = new Uint8Array(32)
    k.fill(0x01)
    k[0] &= 248; k[31] &= 127; k[31] |= 64
    return k
  })(),
  // Relay 2 — deterministic seed 0x02 × 32
  (() => {
    const k = new Uint8Array(32)
    k.fill(0x02)
    k[0] &= 248; k[31] &= 127; k[31] |= 64
    return k
  })(),
  // Relay 3 — deterministic seed 0x03 × 32
  (() => {
    const k = new Uint8Array(32)
    k.fill(0x03)
    k[0] &= 248; k[31] &= 127; k[31] |= 64
    return k
  })(),
  // Relay 4 — deterministic seed 0x04 × 32
  (() => {
    const k = new Uint8Array(32)
    k.fill(0x04)
    k[0] &= 248; k[31] &= 127; k[31] |= 64
    return k
  })(),
  // Relay 5 — deterministic seed 0x05 × 32
  (() => {
    const k = new Uint8Array(32)
    k.fill(0x05)
    k[0] &= 248; k[31] &= 127; k[31] |= 64
    return k
  })(),
]

/**
 * Default relay node registry — at least 5 nodes for route diversity.
 * In production this would be fetched from the `relay:nodes` Redis key.
 * Node IDs are valid X25519 public keys derived from the fixed private keys above.
 */
export const DEFAULT_RELAY_REGISTRY: RelayHop[] = DEFAULT_RELAY_PRIVATE_KEYS.map((privKey, i) => ({
  nodeId: toHex(x25519.getPublicKey(privKey)),
  address: `ws://relay-${i + 1}.codeva.app`,
}))

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

/**
 * Convert a 32-byte Uint8Array to a lowercase hex string.
 */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Convert a hex string to a Uint8Array.
 */
function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string length')
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return out
}

/**
 * Derive a 32-byte AES key and 12-byte IV from a shared secret and context label
 * using HKDF-SHA256.
 */
function deriveHopKeys(sharedSecret: Uint8Array, label: string): { key: Uint8Array; iv: Uint8Array } {
  const info = new TextEncoder().encode(label)
  const keyMaterial = hkdf(sha256, sharedSecret, undefined, info, 44) // 32 key + 12 IV
  return {
    key: keyMaterial.slice(0, 32),
    iv: keyMaterial.slice(32, 44),
  }
}

/**
 * Encrypt `plaintext` with AES-256-GCM using SubtleCrypto.
 * Returns the ciphertext with the GCM authentication tag appended (ciphertext is 16 bytes longer).
 */
async function aesgcmEncrypt(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['encrypt'])
  const ciphertextBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, plaintext)
  return new Uint8Array(ciphertextBuffer)
}

/**
 * Decrypt `ciphertext` (with appended GCM tag) with AES-256-GCM using SubtleCrypto.
 * Throws if authentication fails.
 */
async function aesgcmDecrypt(key: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['decrypt'])
  const plaintextBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext)
  return new Uint8Array(plaintextBuffer)
}

// ---------------------------------------------------------------------------
// Serialization helpers for per-hop routing headers
// ---------------------------------------------------------------------------

/**
 * Encodes the per-hop routing header:
 *   [1 byte: is_final (0=intermediate, 1=final)] [address bytes (up to 255)] [padding to fixed size]
 *
 * For an intermediate hop, the header encodes the address of the NEXT hop.
 * For the final hop, the header encodes a sentinel indicating the payload should be delivered.
 *
 * The serialized header is always padded to HOP_HEADER_SIZE bytes.
 */
const HOP_HEADER_SIZE = 256

function encodeHopHeader(nextAddress: string | null): Uint8Array {
  const header = new Uint8Array(HOP_HEADER_SIZE)
  if (nextAddress === null) {
    // Final hop sentinel: first byte = 1
    header[0] = 1
  } else {
    // Intermediate hop: first byte = 0, then 1-byte length, then address bytes
    header[0] = 0
    const addrBytes = new TextEncoder().encode(nextAddress)
    if (addrBytes.length > 253) throw new Error('Relay address too long')
    header[1] = addrBytes.length
    header.set(addrBytes, 2)
  }
  return header
}

function decodeHopHeader(header: Uint8Array): { isFinal: boolean; nextAddress: string } {
  const isFinal = header[0] === 1
  if (isFinal) {
    return { isFinal: true, nextAddress: '' }
  }
  const addrLen = header[1]
  const addrBytes = header.slice(2, 2 + addrLen)
  return { isFinal: false, nextAddress: new TextDecoder().decode(addrBytes) }
}

// ---------------------------------------------------------------------------
// OnionRouter implementation
// ---------------------------------------------------------------------------

/**
 * Builds a layered Sphinx-inspired onion packet for the given hops and payload.
 *
 * For each hop (outermost = first hop, innermost = last hop):
 *   1. Generate a fresh X25519 ephemeral key pair
 *   2. Compute ECDH shared secret with the hop's public key
 *   3. Derive AES key + IV via HKDF
 *   4. Encrypt the hop header (next-hop address) and accumulated inner payload
 *
 * The routingInfo field is always padded to exactly 1300 bytes (REQ-9.2).
 *
 * @param hops - Ordered relay hops (index 0 = first relay, last = exit relay)
 * @param payload - Plaintext message payload to be delivered
 * @returns An OnionPacket ready to send to hops[0]
 *
 * REQ-9.1, REQ-9.2
 */
export async function buildPacket(hops: RelayHop[], payload: Uint8Array): Promise<OnionPacket> {
  if (hops.length === 0) throw new Error('At least one hop is required')

  // We build layers from the innermost hop outward (last → first).
  // After all wrapping, the outermost layer is for hops[0].

  // Step 1: Produce an inner structure for the final hop.
  //
  // At the final hop (hops[hops.length-1]) we deliver the raw payload.
  // We treat it as: encrypt(payload) using final hop's key.
  // The "nextHop" for the final hop is null (sentinel).

  // We accumulate the encrypted inner data layer by layer.
  // innerData starts as the raw payload and gets re-encrypted at each wrap.

  let innerData = payload

  // We process hops from last (exit) to first (entry).
  // For each layer we store the ephemeral public key so the outermost layer's
  // ephemeralKey is for hops[0].
  let outerEphemeralKey = new Uint8Array(32)

  for (let i = hops.length - 1; i >= 0; i--) {
    const hop = hops[i]
    const hopPublicKey = fromHex(hop.nodeId)

    // Generate ephemeral X25519 key pair for this hop
    const ephemeralPrivKey = x25519.utils.randomSecretKey()
    const ephemeralPubKey = x25519.getPublicKey(ephemeralPrivKey)

    // ECDH: sharedSecret = X25519(ephemeralPrivKey, hopPublicKey)
    const sharedSecret = x25519.getSharedSecret(ephemeralPrivKey, hopPublicKey)

    // Derive AES key and IV for this hop
    const { key, iv } = deriveHopKeys(sharedSecret, `onion:hop:${i}:routing`)
    const { key: payloadKey, iv: payloadIv } = deriveHopKeys(sharedSecret, `onion:hop:${i}:payload`)

    // Determine the next-hop address for this layer's routing header
    const nextAddress = i < hops.length - 1 ? hops[i + 1].address : null
    const hopHeader = encodeHopHeader(nextAddress)

    // Encrypt the hop routing header
    const encryptedHeader = await aesgcmEncrypt(key, iv, hopHeader)

    // Build routingInfo: encrypted header + padding to ROUTING_INFO_SIZE
    const routingInfo = new Uint8Array(ROUTING_INFO_SIZE)
    const headerBytes = encryptedHeader.slice(0, Math.min(encryptedHeader.length, ROUTING_INFO_SIZE))
    routingInfo.set(headerBytes)

    // Encrypt the inner data (payload or previous layer's packet serialization)
    const encryptedInner = await aesgcmEncrypt(payloadKey, payloadIv, innerData)

    // Serialize the full packet at this layer into bytes to wrap further
    // Format: [32 ephemeralKey] [ROUTING_INFO_SIZE routingInfo] [4 bytes inner length] [inner data]
    const packet: OnionPacket = {
      version: 1,
      ephemeralKey: ephemeralPubKey,
      routingInfo,
      payload: encryptedInner,
    }

    if (i === 0) {
      // Outermost layer: return the packet directly
      return packet
    }

    // Serialize inner packet for the next outer layer to wrap
    innerData = serializePacket(packet)
    outerEphemeralKey = ephemeralPubKey
  }

  // If hops.length === 1, we return after the single loop iteration above.
  // This line is unreachable but satisfies TypeScript.
  return {
    version: 1,
    ephemeralKey: outerEphemeralKey,
    routingInfo: new Uint8Array(ROUTING_INFO_SIZE),
    payload: innerData,
  }
}

/**
 * Peels one layer of the onion packet using this relay node's private key.
 *
 * Steps:
 *   1. ECDH: sharedSecret = X25519(myPrivateKey, packet.ephemeralKey)
 *   2. Derive AES key + IV via HKDF (matching buildPacket labels)
 *   3. Decrypt routingInfo to reveal the hop header (next address or final sentinel)
 *   4. Decrypt the payload to reveal the inner packet or plaintext
 *   5. Return PeelResult (if intermediate) or FinalPayload (if final hop)
 *
 * The caller learns ONLY the address of the next hop — not any further hops or the payload.
 *
 * REQ-9.2, REQ-9.3
 *
 * @param myPrivateKey - This relay node's X25519 private key (32 bytes)
 * @param packet - The incoming OnionPacket
 * @param hopIndex - The logical hop index (used for HKDF label derivation, default 0)
 * @returns PeelResult with next hop address, or FinalPayload if this is the last hop
 */
export async function peelLayer(
  myPrivateKey: Uint8Array,
  packet: OnionPacket,
  hopIndex = 0,
): Promise<PeelLayerResult> {
  // ECDH: derive shared secret from ephemeral key in packet + our private key
  const sharedSecret = x25519.getSharedSecret(myPrivateKey, packet.ephemeralKey)

  // Derive keys matching what buildPacket used for this hop
  const { key, iv } = deriveHopKeys(sharedSecret, `onion:hop:${hopIndex}:routing`)
  const { key: payloadKey, iv: payloadIv } = deriveHopKeys(sharedSecret, `onion:hop:${hopIndex}:payload`)

  // Decrypt the routing header portion of routingInfo
  // The encrypted header is at the start of routingInfo (rest is padding)
  const encryptedHeader = packet.routingInfo.slice(0, HOP_HEADER_SIZE + 16) // +16 for GCM tag
  let hopHeader: Uint8Array
  try {
    hopHeader = await aesgcmDecrypt(key, iv, encryptedHeader)
  } catch {
    throw new Error('Failed to decrypt routing header — wrong key or corrupted packet')
  }

  const { isFinal, nextAddress } = decodeHopHeader(hopHeader)

  // Decrypt the inner payload
  let decryptedInner: Uint8Array
  try {
    decryptedInner = await aesgcmDecrypt(payloadKey, payloadIv, packet.payload)
  } catch {
    throw new Error('Failed to decrypt payload layer — wrong key or corrupted packet')
  }

  if (isFinal) {
    // This is the last hop — the decrypted inner IS the original plaintext payload
    return { payload: decryptedInner }
  }

  // Intermediate hop — deserialize the inner packet and return with next hop address
  const innerPacket = deserializePacket(decryptedInner)
  return { nextHop: nextAddress, innerPacket }
}

// ---------------------------------------------------------------------------
// Packet serialization / deserialization (for wrapping packets in packets)
// ---------------------------------------------------------------------------

/**
 * Serialize an OnionPacket to a flat Uint8Array for embedding as a payload.
 * Format:
 *   [1 byte version]
 *   [32 bytes ephemeralKey]
 *   [ROUTING_INFO_SIZE bytes routingInfo]
 *   [4 bytes payload length (big-endian uint32)]
 *   [payload bytes]
 */
function serializePacket(packet: OnionPacket): Uint8Array {
  const payloadLen = packet.payload.length
  const total = 1 + 32 + ROUTING_INFO_SIZE + 4 + payloadLen
  const out = new Uint8Array(total)
  let offset = 0

  out[offset++] = packet.version

  out.set(packet.ephemeralKey, offset)
  offset += 32

  const ri = new Uint8Array(ROUTING_INFO_SIZE)
  ri.set(packet.routingInfo.slice(0, ROUTING_INFO_SIZE))
  out.set(ri, offset)
  offset += ROUTING_INFO_SIZE

  const view = new DataView(out.buffer, out.byteOffset)
  view.setUint32(offset, payloadLen, false) // big-endian
  offset += 4

  out.set(packet.payload, offset)

  return out
}

/**
 * Deserialize a flat Uint8Array back into an OnionPacket.
 */
function deserializePacket(data: Uint8Array): OnionPacket {
  if (data.length < 1 + 32 + ROUTING_INFO_SIZE + 4) {
    throw new Error('Serialized packet too short')
  }
  let offset = 0

  const version = data[offset++]
  if (version !== 1) throw new Error(`Unknown packet version: ${version}`)

  const ephemeralKey = data.slice(offset, offset + 32)
  offset += 32

  const routingInfo = data.slice(offset, offset + ROUTING_INFO_SIZE)
  offset += ROUTING_INFO_SIZE

  const view = new DataView(data.buffer, data.byteOffset)
  const payloadLen = view.getUint32(offset, false) // big-endian
  offset += 4

  const payload = data.slice(offset, offset + payloadLen)

  return { version: 1, ephemeralKey, routingInfo, payload }
}

// ---------------------------------------------------------------------------
// selectRoute — relay node selection
// ---------------------------------------------------------------------------

/**
 * Select relay nodes for routing.
 *
 * MAX plan (default): returns exactly 3 hops, chosen from the registry,
 * excluding any nodes in `excludedNodes` (for retry after hop failure). (REQ-9.1, REQ-9.4)
 *
 * Basic plan: returns exactly 1 hop with no onion structure. (REQ-9.6)
 *
 * @param excludedNodes - Node IDs to exclude (e.g. unreachable nodes for retry)
 * @param plan - 'max' (default) or 'basic'
 * @param registry - Override the relay node registry (defaults to DEFAULT_RELAY_REGISTRY)
 * @returns Selected relay hops
 * @throws If not enough eligible nodes exist after exclusion
 */
export function selectRoute(
  excludedNodes: string[] = [],
  plan: 'max' | 'basic' = 'max',
  registry: RelayHop[] = DEFAULT_RELAY_REGISTRY,
): RelayHop[] {
  const excludedSet = new Set(excludedNodes)
  const eligible = registry.filter((node) => !excludedSet.has(node.nodeId))

  if (plan === 'basic') {
    if (eligible.length === 0) {
      throw new Error('No eligible relay nodes available for basic plan route')
    }
    // Select a single hop at random
    const idx = Math.floor(Math.random() * eligible.length)
    return [eligible[idx]]
  }

  // MAX plan: need at least 3 distinct nodes
  const required = 3
  if (eligible.length < required) {
    throw new Error(
      `Not enough relay nodes for MAX plan route: need ${required}, have ${eligible.length} eligible (${excludedNodes.length} excluded)`,
    )
  }

  // Fisher-Yates shuffle on eligible slice to pick 3 distinct nodes randomly
  const pool = [...eligible]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return pool.slice(0, required)
}

// ---------------------------------------------------------------------------
// Re-export helpers for use in tests
// ---------------------------------------------------------------------------

export { toHex, fromHex, encodeHopHeader, decodeHopHeader, serializePacket, deserializePacket }
