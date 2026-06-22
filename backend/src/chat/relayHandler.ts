/**
 * relayHandler.ts
 * Peels one onion layer from an OnionPacket and forwards the inner packet
 * to the next-hop address decoded from the routing header.
 *
 * Privacy contract (REQ-9.3, REQ-9.5):
 *   - The relay NEVER logs any association between incoming and outgoing
 *     connections, source addresses, destination addresses, or routing
 *     metadata.
 *   - Only the anonymised event label `onion_packet_forwarded` is emitted.
 *
 * Feature: anonymous-chat
 * Requirement refs: REQ-9.3, REQ-9.5
 */

import { createECDH, createDecipheriv, hkdfSync, createHmac } from 'node:crypto'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * An onion-routed packet as defined in the Onion Router design (Task 5).
 * Matches the interface in src/chat/transport/OnionRouter.ts on the client.
 */
export interface OnionPacket {
  version: 1
  /** Curve25519 ephemeral public key (32 bytes, Uint8Array) */
  ephemeralKey: Uint8Array
  /** Fixed-length encrypted routing headers (1300 bytes) */
  routingInfo: Uint8Array
  /** Layered-encrypted message payload */
  payload: Uint8Array
}

/**
 * Decoded routing header revealed after peeling one onion layer.
 */
export interface RoutingHeader {
  nextHop: string      // e.g. "ws://relay-2.codeva.app"
  innerPacket: OnionPacket
}

/**
 * Callback type for forwarding the inner packet to the next relay hop.
 * The implementation is provided by the caller (chatWsHandler / WS client).
 * Keeping it injectable makes the relay handler fully testable without a
 * real WebSocket.
 */
export type ForwardFn = (nextHop: string, innerPacket: OnionPacket) => Promise<void>

// ─── Constants ────────────────────────────────────────────────────────────────

/** HKDF info string used when deriving the per-hop AES key */
const HKDF_INFO = Buffer.from('anon_chat_onion_hop_key', 'utf8')

/** AES-256-GCM IV length in bytes */
const AES_GCM_IV_BYTES = 12

/** AES-256-GCM auth tag length in bytes */
const AES_GCM_TAG_BYTES = 16

/** AES-256-GCM key length in bytes */
const AES_KEY_BYTES = 32

// ─── Layer peeling ────────────────────────────────────────────────────────────

/**
 * Derive the AES-256-GCM key for this hop using ECDH + HKDF.
 *
 * 1. Compute ECDH shared secret: DH(myPrivateKey, packet.ephemeralKey)
 * 2. Expand via HKDF-SHA256 with a fixed info string
 *
 * @param myPrivateKey   - This relay node's Curve25519 private key (32 bytes)
 * @param ephemeralKey   - Sender's ephemeral public key from the packet
 */
function deriveHopKey(
  myPrivateKey: Uint8Array,
  ephemeralKey: Uint8Array,
): Buffer {
  const ecdh = createECDH('prime256v1')
  ecdh.setPrivateKey(Buffer.from(myPrivateKey))

  // computeSecret expects a Buffer of the peer public key
  const sharedSecret = ecdh.computeSecret(Buffer.from(ephemeralKey))

  // HKDF: extract + expand to 32-byte key
  const derived = hkdfSync('sha256', sharedSecret, Buffer.alloc(32), HKDF_INFO, AES_KEY_BYTES)
  return Buffer.from(derived)
}

/**
 * Decrypt the first `ciphertextLength` bytes of `routingInfo` using
 * AES-256-GCM and return the plaintext.
 *
 * Layout within `routingInfo`:
 *   [0..11]    IV (12 bytes)
 *   [12..27]   Auth tag (16 bytes)
 *   [28..N]    Ciphertext (variable length, JSON-encoded RoutingHeader)
 *
 * @param aesKey       - 32-byte AES-256-GCM key derived for this hop
 * @param routingInfo  - The full 1300-byte routing info buffer
 */
function decryptRoutingHeader(aesKey: Buffer, routingInfo: Uint8Array): RoutingHeader {
  const buf = Buffer.from(routingInfo)

  const iv = buf.subarray(0, AES_GCM_IV_BYTES)
  const tag = buf.subarray(AES_GCM_IV_BYTES, AES_GCM_IV_BYTES + AES_GCM_TAG_BYTES)
  const ciphertext = buf.subarray(AES_GCM_IV_BYTES + AES_GCM_TAG_BYTES)

  const decipher = createDecipheriv('aes-256-gcm', aesKey, iv)
  decipher.setAuthTag(tag)

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  const header = JSON.parse(plaintext.toString('utf8')) as RoutingHeader

  // Deserialise Uint8Array fields that were JSON-serialised as plain objects
  header.innerPacket = deserialisePacket(header.innerPacket)
  return header
}

/**
 * JSON round-trips Uint8Array as `{ type: 'Buffer', data: [...] }` when
 * sent over-the-wire. Restore them to proper Uint8Array instances.
 */
function deserialisePacket(raw: unknown): OnionPacket {
  const r = raw as Record<string, unknown>
  return {
    version: 1,
    ephemeralKey: toUint8Array(r.ephemeralKey),
    routingInfo: toUint8Array(r.routingInfo),
    payload: toUint8Array(r.payload),
  }
}

function toUint8Array(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value
  if (Buffer.isBuffer(value)) return new Uint8Array(value)
  if (Array.isArray(value)) return new Uint8Array(value as number[])
  // { type: 'Buffer', data: [...] }
  const v = value as { data?: number[] }
  if (v && Array.isArray(v.data)) return new Uint8Array(v.data)
  return new Uint8Array(0)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Handle one incoming onion packet:
 *   1. Derive the hop key via ECDH + HKDF
 *   2. Decrypt this relay's routing header to reveal `{ nextHop, innerPacket }`
 *   3. Forward the inner packet to `nextHop` via `forwardFn`
 *
 * Privacy invariant: this function MUST NOT log any association between the
 * packet source and the `nextHop` destination. Only the anonymised event label
 * `onion_packet_forwarded` is emitted after a successful forward.
 *
 * @param packet       - The onion packet received by this relay node
 * @param myPrivateKey - This node's Curve25519 private key (32 bytes)
 * @param forwardFn    - Async callback that sends the inner packet to the next hop
 *
 * Validates: REQ-9.3, REQ-9.5
 */
export async function handleOnionPacket(
  packet: OnionPacket,
  myPrivateKey: Uint8Array,
  forwardFn: ForwardFn,
): Promise<void> {
  const aesKey = deriveHopKey(myPrivateKey, packet.ephemeralKey)
  const { nextHop, innerPacket } = decryptRoutingHeader(aesKey, packet.routingInfo)

  await forwardFn(nextHop, innerPacket)

  // ONLY emit the anonymised event label — never log nextHop, source, or any
  // routing association (REQ-9.3, REQ-9.5).
  relayLog('onion_packet_forwarded')
}

// ─── Relay log ────────────────────────────────────────────────────────────────

/**
 * Emit an anonymised event label. No payload, address, or routing metadata
 * is ever included in relay log records (REQ-13.5).
 */
export function relayLog(eventTypeLabel: string): void {
  console.log(JSON.stringify({ event: eventTypeLabel }))
}
