/**
 * inviteService.ts
 * Creates, validates, and revokes HMAC-SHA256 signed Room invite tokens.
 *
 * Feature: anonymous-chat
 * Requirement refs: REQ-10.1, REQ-10.2, REQ-10.3, REQ-10.4, REQ-10.5, REQ-10.6
 */

import { createHmac, randomBytes } from 'node:crypto'
import type { Db } from 'mongodb'
import type { RedisClient } from './roomRegistry.js'

// ─── Constants ────────────────────────────────────────────────────────────────

/** HMAC secret used for token signing. Must be set in production via env var. */
const INVITE_HMAC_SECRET =
  process.env.INVITE_HMAC_SECRET ?? 'codeva_invite_hmac_secret_test_constant'

/** Redis key for an invite token */
const INVITE_KEY = (token: string) => `invite:${token}`

/** Maximum participants per Room (mirrors roomRegistry constant) */
const MAX_ROOM_PARTICIPANTS = 100

// ─── Expiry duration constants (ms) — REQ-10.2 ───────────────────────────────

/** Supported invite expiry durations in milliseconds. null = never-expire. */
export const EXPIRY_1_HOUR: number = 3_600_000
export const EXPIRY_24_HOURS: number = 86_400_000
export const EXPIRY_7_DAYS: number = 604_800_000
export const EXPIRY_NEVER: null = null

// ─── Payload stored in Redis ──────────────────────────────────────────────────

export interface InvitePayload {
  roomId: string
  createdAt: number          // unix ms
  expiresAt: number | null   // unix ms, null = never-expire
  revokedAt?: number | null  // unix ms when revoked, absent or null if active
}

// ─── Error types ──────────────────────────────────────────────────────────────

export interface InviteInvalidError {
  type: 'INVITE_INVALID'
  reason: 'expired' | 'revoked' | 'not_found' | 'bad_signature'
}

export interface RoomAtCapacityError {
  type: 'ROOM_AT_CAPACITY'
  roomId: string
}

/** Shape returned by joinRoom from roomRegistry */
export type JoinResult = { success: true } | { success: false; error: 'ROOM_AT_CAPACITY' | 'ALREADY_MEMBER' }

// ─── Extended Redis interface (includes invite-needed ops) ────────────────────

export interface InviteRedisClient extends RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<'OK'>
  setex(key: string, seconds: number, value: string): Promise<'OK'>
  del(...keys: string[]): Promise<number>
  /** expire in seconds */
  expire(key: string, seconds: number): Promise<number>
}

// ─── HMAC signing helpers ─────────────────────────────────────────────────────

/**
 * Sign a base64url-encoded payload string with HMAC-SHA256.
 * Returns the hex-encoded HMAC digest.
 */
function signPayload(encodedPayload: string): string {
  return createHmac('sha256', INVITE_HMAC_SECRET)
    .update(encodedPayload)
    .digest('hex')
}

/**
 * Encode an object as a base64url JSON string.
 */
function encodePayload(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url')
}

/**
 * Decode a base64url string back to a plain string.
 * Returns null if the string is not valid base64url JSON.
 */
function decodePayload(encoded: string): unknown | null {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

// ─── Token format ─────────────────────────────────────────────────────────────
//
// Token = base64url(JSON({ roomId, createdAt, expiresAt })).<hmac_hex>
//
// Two dot-separated parts:
//   Part 0: encoded payload
//   Part 1: HMAC-SHA256 hex of Part 0

/**
 * Assemble a full token string from a payload object.
 */
function assembleToken(payload: { roomId: string; createdAt: number; expiresAt: number | null }): string {
  const encodedPayload = encodePayload(payload)
  const sig = signPayload(encodedPayload)
  return `${encodedPayload}.${sig}`
}

/**
 * Verify the HMAC signature on a raw token string.
 * Returns the decoded payload on success, null on bad signature.
 */
function verifyToken(token: string): { roomId: string; createdAt: number; expiresAt: number | null } | null {
  const dotIndex = token.lastIndexOf('.')
  if (dotIndex === -1) return null

  const encodedPayload = token.slice(0, dotIndex)
  const providedSig = token.slice(dotIndex + 1)

  const expectedSig = signPayload(encodedPayload)
  if (providedSig !== expectedSig) return null

  const parsed = decodePayload(encodedPayload)
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).roomId !== 'string' ||
    typeof (parsed as Record<string, unknown>).createdAt !== 'number'
  ) {
    return null
  }

  return parsed as { roomId: string; createdAt: number; expiresAt: number | null }
}

// ─── MongoDB document type ────────────────────────────────────────────────────

interface InviteTokenDocument {
  token: string
  roomId: string
  expiresAt: Date | null
  revokedAt: Date | null
  createdAt: Date
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a new invite link for a Room.
 *
 * Generates an HMAC-SHA256 signed token, stores metadata in Redis (with TTL
 * matching the expiry), and optionally writes an audit record to MongoDB.
 *
 * @param roomId    - UUID of the target Room
 * @param expiryMs  - Expiry duration in ms, or null for never-expire
 * @param redis     - ioredis (or ioredis-mock) client
 * @param db        - Optional MongoDB Db for audit record (REQ-13.4)
 * @returns The full token string (two dot-separated parts)
 *
 * Validates: REQ-10.1, REQ-10.2, Property 26 (Invite Token Round-Trip)
 */
export async function createInviteLink(
  roomId: string,
  expiryMs: number | null,
  redis: InviteRedisClient,
  db?: Db,
): Promise<string> {
  const createdAt = Date.now()
  const expiresAt = expiryMs !== null ? createdAt + expiryMs : null

  const token = assembleToken({ roomId, createdAt, expiresAt })

  const payload: InvitePayload = { roomId, createdAt, expiresAt, revokedAt: null }
  const serialized = JSON.stringify(payload)

  if (expiresAt !== null) {
    // Store with TTL (in seconds, rounded up)
    const ttlSeconds = Math.ceil((expiresAt - Date.now()) / 1000)
    if (ttlSeconds > 0) {
      await redis.setex(INVITE_KEY(token), ttlSeconds, serialized)
    }
    // If ttlSeconds <= 0 the token is already expired — store it briefly so
    // validateInviteLink can return 'expired' rather than 'not_found'
    else {
      await redis.setex(INVITE_KEY(token), 1, serialized)
    }
  } else {
    // Never-expire — no TTL in Redis
    await redis.set(INVITE_KEY(token), serialized)
  }

  // Optional MongoDB audit record (REQ-13.4)
  if (db) {
    const doc: InviteTokenDocument = {
      token,
      roomId,
      expiresAt: expiresAt !== null ? new Date(expiresAt) : null,
      revokedAt: null,
      createdAt: new Date(createdAt),
    }
    await db.collection<InviteTokenDocument>('chat_invite_tokens').insertOne(doc)
  }

  return token
}

/**
 * Validate an invite token.
 *
 * Checks:
 *   1. HMAC signature is valid
 *   2. Token exists in Redis (not expired by TTL)
 *   3. `expiresAt` is not in the past
 *   4. `revokedAt` is not set
 *
 * Returns the roomId on success. Never resolves the Room or initiates a join
 * on failure.
 *
 * @param token - The full token string
 * @param redis - ioredis (or ioredis-mock) client
 *
 * Validates: REQ-10.3, REQ-10.4, REQ-10.5, Property 27 (Expired/Revoked Rejected)
 */
export async function validateInviteLink(
  token: string,
  redis: InviteRedisClient,
): Promise<{ valid: true; roomId: string } | { valid: false; error: InviteInvalidError }> {
  // 1. Verify HMAC signature
  const parsed = verifyToken(token)
  if (parsed === null) {
    return {
      valid: false,
      error: { type: 'INVITE_INVALID', reason: 'bad_signature' },
    }
  }

  // 2. Check Redis for the stored payload (handles TTL expiry automatically)
  const raw = await redis.get(INVITE_KEY(token))
  if (raw === null) {
    return {
      valid: false,
      error: { type: 'INVITE_INVALID', reason: 'not_found' },
    }
  }

  let payload: InvitePayload
  try {
    payload = JSON.parse(raw) as InvitePayload
  } catch {
    return {
      valid: false,
      error: { type: 'INVITE_INVALID', reason: 'not_found' },
    }
  }

  // 3. Check revocation
  if (payload.revokedAt != null) {
    return {
      valid: false,
      error: { type: 'INVITE_INVALID', reason: 'revoked' },
    }
  }

  // 4. Check expiry (belt-and-suspenders, Redis TTL handles most cases)
  if (payload.expiresAt !== null && Date.now() > payload.expiresAt) {
    return {
      valid: false,
      error: { type: 'INVITE_INVALID', reason: 'expired' },
    }
  }

  return { valid: true, roomId: payload.roomId }
}

/**
 * Revoke an invite link immediately.
 *
 * Sets `revokedAt` in Redis. All subsequent `validateInviteLink` calls for
 * this token return `INVITE_INVALID` with reason `'revoked'`.
 *
 * @param token - The full token string to revoke
 * @param redis - ioredis (or ioredis-mock) client
 *
 * Validates: REQ-10.5, Property 27 (Expired/Revoked Rejected)
 */
export async function revokeInviteLink(
  token: string,
  redis: InviteRedisClient,
): Promise<void> {
  const raw = await redis.get(INVITE_KEY(token))
  if (raw === null) {
    // Token not found — nothing to revoke
    return
  }

  let payload: InvitePayload
  try {
    payload = JSON.parse(raw) as InvitePayload
  } catch {
    return
  }

  payload.revokedAt = Date.now()

  // Preserve any existing TTL by re-storing; if never-expire use plain SET
  if (payload.expiresAt !== null) {
    const remainingMs = payload.expiresAt - Date.now()
    const ttlSeconds = Math.ceil(remainingMs / 1000)
    if (ttlSeconds > 0) {
      await redis.setex(INVITE_KEY(token), ttlSeconds, JSON.stringify(payload))
    } else {
      // Already past expiry — store briefly so subsequent validate calls return 'revoked'
      await redis.setex(INVITE_KEY(token), 60, JSON.stringify(payload))
    }
  } else {
    // Never-expire token — keep without TTL
    await redis.set(INVITE_KEY(token), JSON.stringify(payload))
  }
}

/**
 * Join a Room via an invite link.
 *
 * Validates the invite first, then checks the 100-participant cap,
 * then adds the participant to the Room.
 *
 * @param token         - The invite token
 * @param participantId - The joining participant's identifier
 * @param redis         - ioredis (or ioredis-mock) client
 *
 * Validates: REQ-10.3, REQ-10.4, REQ-10.6, Property 11 (Room Capacity Invariant)
 */
export async function joinViaInvite(
  token: string,
  participantId: string,
  redis: InviteRedisClient,
): Promise<JoinResult | InviteInvalidError> {
  // Step 1: Validate the invite link — never resolve Room on failure
  const validation = await validateInviteLink(token, redis)
  if (!validation.valid) {
    return validation.error
  }

  const { roomId } = validation

  // Step 2: Capacity check — reject before admitting (REQ-10.6)
  const memberKey = `room:${roomId}:members`
  const currentCount = await redis.scard(memberKey)

  if (currentCount >= MAX_ROOM_PARTICIPANTS) {
    return { success: false, error: 'ROOM_AT_CAPACITY' }
  }

  // Step 3: Add participant
  await redis.sadd(memberKey, participantId)
  return { success: true }
}

/**
 * Parse the encoded payload portion of a token without verifying HMAC.
 * Used by the client-side `parseInviteToken` and for testing.
 *
 * @param token - The full token string
 * @returns Decoded payload or null if malformed
 */
export function parseTokenPayload(
  token: string,
): { roomId: string; createdAt: number; expiresAt: number | null } | null {
  const dotIndex = token.lastIndexOf('.')
  if (dotIndex === -1) return null
  const encodedPayload = token.slice(0, dotIndex)
  const decoded = decodePayload(encodedPayload)
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    typeof (decoded as Record<string, unknown>).roomId !== 'string' ||
    typeof (decoded as Record<string, unknown>).createdAt !== 'number'
  ) {
    return null
  }
  return decoded as { roomId: string; createdAt: number; expiresAt: number | null }
}
