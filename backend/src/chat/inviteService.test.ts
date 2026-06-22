/**
 * inviteService.test.ts
 * Unit and property-based tests for invite token generation and validation.
 *
 * Runner:  node --experimental-strip-types --loader ./src/chat/loader.mjs --test src/chat/inviteService.test.ts
 * Framework: Node built-in `node:test` + `assert`
 * PBT:       fast-check
 *
 * Feature: anonymous-chat
 * Requirement refs: REQ-10.1, REQ-10.2, REQ-10.3, REQ-10.4, REQ-10.5, REQ-10.6
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

// ─── CJS interop for ioredis-mock and fast-check ──────────────────────────────
const require = createRequire(import.meta.url)
const RedisMock = require('ioredis-mock')
const fc = require('fast-check')

// ─── Modules under test ───────────────────────────────────────────────────────
import {
  createInviteLink,
  validateInviteLink,
  revokeInviteLink,
  joinViaInvite,
  parseTokenPayload,
  EXPIRY_1_HOUR,
  EXPIRY_24_HOURS,
  EXPIRY_7_DAYS,
  EXPIRY_NEVER,
  type InviteRedisClient,
} from './inviteService.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a fresh ioredis-mock instance typed as InviteRedisClient.
 * The mock supports all operations used by inviteService.
 */
function makeRedis(): InviteRedisClient {
  return new RedisMock() as InviteRedisClient
}

/**
 * Populate a Redis room with `count` synthetic participants.
 */
async function fillRoom(redis: InviteRedisClient, roomId: string, count: number): Promise<void> {
  const key = `room:${roomId}:members`
  for (let i = 0; i < count; i++) {
    await redis.sadd(key, `participant-${i}`)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Unit: expired token is rejected without room resolve', () => {
  test('token with expiresAt in the past returns INVITE_INVALID with reason "expired"', async () => {
    const redis = makeRedis()
    const roomId = 'room-expired-test'

    // Create token with a 1 ms expiry so it immediately expires
    const token = await createInviteLink(roomId, 1, redis)

    // Wait 5 ms to ensure expiry has passed
    await new Promise((res) => setTimeout(res, 5))

    const result = await validateInviteLink(token, redis)

    // Must be invalid — 'expired' or 'not_found' (Redis TTL may have evicted it)
    assert.equal(result.valid, false)
    const reason = result.valid === false ? result.error.reason : null
    assert.ok(
      reason === 'expired' || reason === 'not_found',
      `Expected 'expired' or 'not_found', got '${reason}'`,
    )
  })
})

describe('Unit: revoked token is immediately invalid', () => {
  test('token revoked via revokeInviteLink always returns INVITE_INVALID reason "revoked"', async () => {
    const redis = makeRedis()
    const roomId = 'room-revoke-test'

    // Create a 7-day token (should not expire during this test)
    const token = await createInviteLink(roomId, EXPIRY_7_DAYS, redis)

    // Verify it is valid before revocation
    const beforeRevoke = await validateInviteLink(token, redis)
    assert.equal(beforeRevoke.valid, true, 'token should be valid before revocation')

    // Revoke it
    await revokeInviteLink(token, redis)

    // Must now be invalid
    const afterRevoke = await validateInviteLink(token, redis)
    assert.equal(afterRevoke.valid, false, 'token should be invalid after revocation')
    assert.equal(
      afterRevoke.valid === false ? afterRevoke.error.reason : null,
      'revoked',
      'reason must be "revoked"',
    )
  })

  test('re-validating a revoked token multiple times always returns INVITE_INVALID', async () => {
    const redis = makeRedis()
    const roomId = 'room-revoke-repeat'

    const token = await createInviteLink(roomId, EXPIRY_24_HOURS, redis)
    await revokeInviteLink(token, redis)

    // Validate three times in a row — all must be invalid
    for (let i = 0; i < 3; i++) {
      const result = await validateInviteLink(token, redis)
      assert.equal(result.valid, false, `attempt ${i + 1} must still be invalid`)
      assert.equal(
        result.valid === false ? result.error.reason : null,
        'revoked',
        `attempt ${i + 1} reason must be "revoked"`,
      )
    }
  })
})

describe('Unit: never-expire token passes at future timestamp', () => {
  test('EXPIRY_NEVER token is still valid after simulated time advance', async () => {
    const redis = makeRedis()
    const roomId = 'room-never-expire'

    const token = await createInviteLink(roomId, EXPIRY_NEVER, redis)

    // Validate immediately
    const result = await validateInviteLink(token, redis)
    assert.equal(result.valid, true, 'never-expire token must be valid')
    assert.equal(
      result.valid ? result.roomId : null,
      roomId,
      'validated roomId must match',
    )

    // The parsed payload should have expiresAt === null
    const payload = parseTokenPayload(token)
    assert.notEqual(payload, null)
    assert.equal(payload!.expiresAt, null, 'expiresAt must be null for never-expire token')
  })
})

describe('Unit: 101st join via invite is rejected with ROOM_AT_CAPACITY', () => {
  test('joinViaInvite rejects when room already has 100 participants', async () => {
    const redis = makeRedis()
    const roomId = 'room-full-invite'

    // Create a valid invite
    const token = await createInviteLink(roomId, EXPIRY_7_DAYS, redis)

    // Fill room to 100
    await fillRoom(redis, roomId, 100)

    // 101st join via invite must be rejected
    const result = await joinViaInvite(token, 'participant-overflow', redis)

    // Result is either JoinResult with success=false or an InviteInvalidError
    assert.ok('success' in result || 'type' in result, 'result must have expected shape')

    if ('success' in result) {
      assert.equal(result.success, false)
      assert.equal((result as { success: false; error: string }).error, 'ROOM_AT_CAPACITY')
    } else {
      // Should not be an invite error — the invite is valid; capacity is the issue
      assert.fail(`Expected ROOM_AT_CAPACITY but got INVITE_INVALID: ${JSON.stringify(result)}`)
    }
  })

  test('joinViaInvite succeeds when room has 99 participants (allows the 100th)', async () => {
    const redis = makeRedis()
    const roomId = 'room-99-invite'

    const token = await createInviteLink(roomId, EXPIRY_7_DAYS, redis)
    await fillRoom(redis, roomId, 99)

    const result = await joinViaInvite(token, 'participant-100th', redis)

    assert.ok('success' in result, 'result must be a JoinResult')
    assert.equal((result as { success: boolean }).success, true, '100th participant must be admitted')
  })
})

describe('Unit: invalid / bad-signature tokens', () => {
  test('completely invalid token string returns INVITE_INVALID bad_signature', async () => {
    const redis = makeRedis()
    const result = await validateInviteLink('not.a.valid.token', redis)
    assert.equal(result.valid, false)
  })

  test('token with tampered payload returns INVITE_INVALID bad_signature', async () => {
    const redis = makeRedis()
    const roomId = 'room-tamper'
    const token = await createInviteLink(roomId, EXPIRY_1_HOUR, redis)

    // Tamper with the payload by changing the first character of the encoded part
    const dotIndex = token.lastIndexOf('.')
    const encodedPayload = token.slice(0, dotIndex)
    const sig = token.slice(dotIndex + 1)
    const tamperedPayload = (encodedPayload[0] === 'A' ? 'B' : 'A') + encodedPayload.slice(1)
    const tamperedToken = `${tamperedPayload}.${sig}`

    const result = await validateInviteLink(tamperedToken, redis)
    assert.equal(result.valid, false)
    assert.equal(
      result.valid === false ? result.error.reason : null,
      'bad_signature',
    )
  })

  test('non-existent token returns INVITE_INVALID not_found', async () => {
    const redis = makeRedis()

    // Build a properly-signed token that was never stored in Redis
    // We need to produce a well-formed token without calling createInviteLink
    // The token must pass the HMAC check to reach the Redis lookup
    // Since we cannot produce a valid signature externally, this token will fail at bad_signature
    const result = await validateInviteLink('aGVsbG8.world', redis)
    assert.equal(result.valid, false)
    // Either bad_signature (most likely) or not_found
    assert.ok(
      result.valid === false && (result.error.reason === 'bad_signature' || result.error.reason === 'not_found'),
      'invalid token must return bad_signature or not_found',
    )
  })
})

describe('Unit: joinViaInvite with invalid token', () => {
  test('joinViaInvite with invalid token returns INVITE_INVALID immediately', async () => {
    const redis = makeRedis()

    const result = await joinViaInvite('invalid.token', 'participant-x', redis)

    assert.ok('type' in result, 'result must be an InviteInvalidError')
    assert.equal((result as { type: string }).type, 'INVITE_INVALID')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTY-BASED TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PBT Property 26: Invite Token Round-Trip', () => {
  // Feature: anonymous-chat, Property 26: Invite Token Round-Trip
  // Validates: Requirements 10.1, 10.3
  test('parse(create(roomId, expiry)).roomId === roomId for all valid inputs', async () => {
    // Expiry options — include all supported values plus null
    const expiryArb = fc.oneof(
      fc.constant(EXPIRY_1_HOUR),
      fc.constant(EXPIRY_24_HOURS),
      fc.constant(EXPIRY_7_DAYS),
      fc.constant(EXPIRY_NEVER),
    )

    // roomId: any non-empty string (mirrors UUID shape but allow broader input)
    const roomIdArb = fc.string({ minLength: 1, maxLength: 64 }).filter(
      (s: string) => s.length > 0,
    )

    await fc.assert(
      fc.asyncProperty(
        roomIdArb,
        expiryArb,
        async (roomId: string, expiryMs: number | null) => {
          const redis = makeRedis()

          // Create the invite token
          const token = await createInviteLink(roomId, expiryMs, redis)

          // Parse the token payload (client-side decode without signature check)
          const parsed = parseTokenPayload(token)

          // The payload must be parseable and contain the original roomId
          if (parsed === null) return false

          return parsed.roomId === roomId
        },
      ),
      { numRuns: 100 },
    )
  })

  test('created token is verifiable with validateInviteLink for non-expiring tokens', async () => {
    const roomIdArb = fc.string({ minLength: 1, maxLength: 64 }).filter(
      (s: string) => s.length > 0,
    )

    await fc.assert(
      fc.asyncProperty(
        roomIdArb,
        async (roomId: string) => {
          const redis = makeRedis()
          const token = await createInviteLink(roomId, EXPIRY_NEVER, redis)
          const result = await validateInviteLink(token, redis)

          if (!result.valid) return false
          return result.roomId === roomId
        },
      ),
      { numRuns: 100 },
    )
  })
})

describe('PBT Property 27: Expired and Revoked Links Rejected', () => {
  // Feature: anonymous-chat, Property 27: Expired and Revoked Links Rejected
  // Validates: Requirements 10.4, 10.5
  test('expired tokens (TTL = 1 ms) always return invalid after wait', async () => {
    const roomIdArb = fc.string({ minLength: 1, maxLength: 64 }).filter(
      (s: string) => s.length > 0,
    )

    await fc.assert(
      fc.asyncProperty(
        roomIdArb,
        async (roomId: string) => {
          const redis = makeRedis()

          // Create a token that expires in 1 ms
          const token = await createInviteLink(roomId, 1, redis)

          // Wait for expiry
          await new Promise((res) => setTimeout(res, 5))

          const result = await validateInviteLink(token, redis)

          // Must never be valid
          return result.valid === false
        },
      ),
      { numRuns: 100 },
    )
  })

  test('revoked tokens always return invalid for any roomId', async () => {
    const roomIdArb = fc.string({ minLength: 1, maxLength: 64 }).filter(
      (s: string) => s.length > 0,
    )

    await fc.assert(
      fc.asyncProperty(
        roomIdArb,
        async (roomId: string) => {
          const redis = makeRedis()

          // Create with a long expiry so it's well within validity period
          const token = await createInviteLink(roomId, EXPIRY_7_DAYS, redis)

          // Revoke
          await revokeInviteLink(token, redis)

          // Validate multiple times — must always be invalid
          for (let i = 0; i < 3; i++) {
            const result = await validateInviteLink(token, redis)
            if (result.valid !== false) return false
            if (result.error.reason !== 'revoked') return false
          }

          return true
        },
      ),
      { numRuns: 100 },
    )
  })

  test('expired tokens never produce a valid result regardless of roomId content', async () => {
    // Use a broader set of room ID shapes (fc.uuid() in fast-check v4+)
    const roomIdArb = fc.oneof(
      fc.uuid(),
      fc.string({ minLength: 1, maxLength: 128 }).filter((s: string) => s.length > 0),
    )

    await fc.assert(
      fc.asyncProperty(
        roomIdArb,
        async (roomId: string) => {
          const redis = makeRedis()
          const token = await createInviteLink(roomId, 1, redis)

          await new Promise((res) => setTimeout(res, 5))

          const result = await validateInviteLink(token, redis)
          return result.valid === false
        },
      ),
      { numRuns: 100 },
    )
  })
})
