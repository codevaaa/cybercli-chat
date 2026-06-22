/**
 * chatRelay.test.ts
 * Unit and property-based tests for the anonymous chat relay modules.
 *
 * Runner:  node --experimental-strip-types --test src/chat/chatRelay.test.ts
 * Framework: Node built-in `node:test` + `assert`
 * PBT:       fast-check
 *
 * Feature: anonymous-chat
 * Requirement refs: REQ-3.2, REQ-3.3, REQ-3.5, REQ-4.1, REQ-4.2, REQ-4.3,
 *                   REQ-4.5, REQ-11.2, REQ-11.4, REQ-12.4, REQ-13.1, REQ-13.2,
 *                   REQ-13.3, REQ-13.5
 */

import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

// ─── CJS interop for ioredis-mock and fast-check ──────────────────────────────
const require = createRequire(import.meta.url)
const RedisMock = require('ioredis-mock')
const { MongoMemoryServer } = require('mongodb-memory-server')
const { MongoClient } = require('mongodb')
const fc = require('fast-check')

// ─── Modules under test ───────────────────────────────────────────────────────
import {
  joinRoom,
  leaveRoom,
  getRoomMemberCount,
  getRoomMembers,
  createRoom,
  MAX_ROOM_PARTICIPANTS,
} from './roomRegistry.js'

import {
  checkPlan,
  MAX_ONLY_OPERATIONS,
  MAX_ONLY_EVENTS,
  planGuard,
} from './planGuard.js'

import {
  queueMessage,
  ackDelivery,
  setRedisClient,
} from './messageQueue.js'

import { handleChatFrame, relayLog } from './chatWsHandler.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a fresh ioredis-mock instance for each test */
function makeRedis() {
  return new RedisMock() as {
    sadd(key: string, ...members: string[]): Promise<number>
    srem(key: string, ...members: string[]): Promise<number>
    scard(key: string): Promise<number>
    smembers(key: string): Promise<string[]>
    sismember(key: string, member: string): Promise<number>
    rpush(key: string, ...values: string[]): Promise<number>
    lrange(key: string, start: number, stop: number): Promise<string[]>
    del(...keys: string[]): Promise<number>
    expire(key: string, seconds: number): Promise<number>
    get(key: string): Promise<string | null>
    set(key: string, value: string): Promise<'OK'>
    setex(key: string, seconds: number, value: string): Promise<'OK'>
  }
}

/**
 * Build a minimal base64url-encoded JWT-like token with the given payload.
 * Produces header.payload.sig where payload is base64url(JSON(claims)).
 */
function makeToken(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  const sig = 'fakesig'
  return `${header}.${payload}.${sig}`
}

const FREE_TOKEN = makeToken({ plan: 'free' })
const MAX_TOKEN = makeToken({ plan: 'max' })
const SUSPENDED_TOKEN = makeToken({ plan: 'max', suspended: true })

// ─── MongoDB helpers ──────────────────────────────────────────────────────────

let mongoServer: typeof MongoMemoryServer.prototype
let mongoClient: typeof MongoClient.prototype
let mongoDb: ReturnType<typeof mongoClient.db>

before(async () => {
  mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()
  mongoClient = new MongoClient(uri)
  await mongoClient.connect()
  mongoDb = mongoClient.db('chatrelay_test')
})

after(async () => {
  await mongoClient.close()
  await mongoServer.stop()
})

// ═══════════════════════════════════════════════════════════════════════════════
// UNIT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Unit: 100-participant cap', () => {
  test('101st join is rejected with ROOM_AT_CAPACITY', async () => {
    const redis = makeRedis()
    const roomId = 'room-cap-test'

    // Fill to exactly 100
    for (let i = 0; i < MAX_ROOM_PARTICIPANTS; i++) {
      const result = await joinRoom(roomId, `participant-${i}`, redis)
      assert.equal(result.success, true, `participant ${i} should join successfully`)
    }

    const count = await getRoomMemberCount(roomId, redis)
    assert.equal(count, 100, 'room should have 100 participants')

    // 101st should be rejected
    const result = await joinRoom(roomId, 'participant-overflow', redis)
    assert.equal(result.success, false)
    assert.equal((result as { success: false; error: string }).error, 'ROOM_AT_CAPACITY')

    // Count must remain 100
    const countAfter = await getRoomMemberCount(roomId, redis)
    assert.equal(countAfter, 100, 'count must remain 100 after rejected join')
  })
})

describe('Unit: plan guard — free tier on MAX-only operation', () => {
  test('checkPlan returns allowed=false for free tier on MAX-only operation', () => {
    for (const op of MAX_ONLY_OPERATIONS) {
      const result = checkPlan(FREE_TOKEN, op)
      assert.equal(result.allowed, false, `op '${op}' should be blocked for free tier`)
      assert.equal(result.tier, 'free')
    }
  })

  test('checkPlan returns allowed=true for max tier on MAX-only operation', () => {
    for (const op of MAX_ONLY_OPERATIONS) {
      const result = checkPlan(MAX_TOKEN, op)
      assert.equal(result.allowed, true, `op '${op}' should be allowed for max tier`)
      assert.equal(result.tier, 'max')
    }
  })

  test('suspended max account is blocked immediately (REQ-11.4)', () => {
    for (const op of MAX_ONLY_OPERATIONS) {
      const result = checkPlan(SUSPENDED_TOKEN, op)
      assert.equal(result.allowed, false, 'suspended account must be blocked')
    }
  })

  test('planGuard async helper returns allowed=false for non-max token', async () => {
    const result = await planGuard({ authToken: FREE_TOKEN })
    assert.equal(result.allowed, false)
  })

  test('planGuard async helper returns allowed=true for max token', async () => {
    const result = await planGuard({ authToken: MAX_TOKEN })
    assert.equal(result.allowed, true)
  })
})

describe('Unit: delivery ACK deletes message from Redis', () => {
  test('ackDelivery removes the packet key from Redis', async () => {
    const redis = makeRedis()
    setRedisClient(redis)

    const recipientId = 'user-ack-test'
    const packetId = 'pkt-001'
    const data = { text: 'hello' }

    // Queue the message (stores under packet:{packetId})
    await queueMessage(recipientId, packetId, data)

    // Verify it was stored
    const before = await redis.get(`packet:${packetId}`)
    assert.notEqual(before, null, 'packet should be in Redis before ACK')

    // ACK delivery
    await ackDelivery(recipientId, packetId)

    // Verify it's gone
    const after = await redis.get(`packet:${packetId}`)
    assert.equal(after, null, 'packet must be null after ACK')
  })
})

describe('Unit: daemon frames not routed by chatWsHandler', () => {
  test('handleChatFrame returns false for non-anon_chat frames', async () => {
    // Construct a minimal mock WS context — no real socket needed
    const mockWs = {
      readyState: 1, // OPEN
      OPEN: 1,
      send: (_data: string) => { /* noop */ },
    }

    const ctx = { ws: mockWs as unknown as import('ws').WebSocket, authToken: MAX_TOKEN }

    // A daemon frame (no anon_chat. prefix) should be ignored by the handler
    const daemonFrame = JSON.stringify({ type: 'daemon.ping', payload: {}, seq: 1 })
    const handled = await handleChatFrame(ctx, daemonFrame)

    assert.equal(handled, false, 'daemon frames must not be handled by chatWsHandler')
  })

  test('handleChatFrame returns true for anon_chat frames', async () => {
    const messages: string[] = []
    const mockWs = {
      readyState: 1,
      OPEN: 1,
      send: (data: string) => { messages.push(data) },
    }

    const ctx = {
      ws: mockWs as unknown as import('ws').WebSocket,
      authToken: MAX_TOKEN,
    }

    // A valid anon_chat frame — use key_bundle_pub which requires no DB side effects
    const chatFrame = JSON.stringify({
      type: 'anon_chat.key_bundle_pub',
      payload: {},
      seq: 42,
      authToken: MAX_TOKEN,
    })
    const handled = await handleChatFrame(ctx, chatFrame)

    assert.equal(handled, true, 'anon_chat frames must be handled by chatWsHandler')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTY-BASED TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PBT Property 11: Room Capacity Invariant', () => {
  // Feature: anonymous-chat, Property 11: Room Capacity Invariant
  test('adding up to 150 participants never results in >100 in room', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 150 }),
        async (numParticipants: number) => {
          const redis = makeRedis()
          const roomId = `room-pbt-cap-${Math.random().toString(36).slice(2)}`

          let joined = 0
          for (let i = 0; i < numParticipants; i++) {
            const result = await joinRoom(roomId, `p-${i}`, redis)
            if (result.success) joined++
          }

          const count = await getRoomMemberCount(roomId, redis)

          // Invariant: count in Redis must never exceed 100
          return count <= MAX_ROOM_PARTICIPANTS
        },
      ),
      { numRuns: 100 },
    )
  })
})

describe('PBT Property 12: Room Membership Removal', () => {
  // Feature: anonymous-chat, Property 12: Room Membership Removal
  test('after leaveRoom, identifier is absent from member set', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 40 }),
        fc.array(fc.string({ minLength: 1, maxLength: 40 }), { minLength: 0, maxLength: 50 }),
        async (targetId: string, otherIds: string[]) => {
          const redis = makeRedis()
          const roomId = `room-leave-${Math.random().toString(36).slice(2)}`

          // Join target and some others (deduplicate to avoid set collisions)
          const uniqueOthers = [...new Set(otherIds)].filter(id => id !== targetId)
          const allIds = [targetId, ...uniqueOthers]

          for (const id of allIds.slice(0, MAX_ROOM_PARTICIPANTS)) {
            await joinRoom(roomId, id, redis)
          }

          // Leave
          await leaveRoom(roomId, targetId, redis)

          // Verify absent
          const members = await getRoomMembers(roomId, redis)
          return !members.includes(targetId)
        },
      ),
      { numRuns: 100 },
    )
  })
})

describe('PBT Property 13: Post-Delivery Redis Cleanup', () => {
  // Feature: anonymous-chat, Property 13: Post-Delivery Redis Cleanup
  test('every ACKed packet ID returns null on Redis lookup', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 64 }),
        fc.string({ minLength: 1, maxLength: 64 }),
        fc.jsonValue(),
        async (recipientId: string, packetId: string, payload: unknown) => {
          const redis = makeRedis()
          setRedisClient(redis)

          await queueMessage(recipientId, packetId, payload)
          await ackDelivery(recipientId, packetId)

          const stored = await redis.get(`packet:${packetId}`)
          return stored === null
        },
      ),
      { numRuns: 100 },
    )
  })
})

describe('PBT Property 29: Server Feature Gate', () => {
  // Feature: anonymous-chat, Property 29: Server Feature Gate
  test('non-MAX token always returns allowed=false for MAX-only operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('free'),
          fc.constant('pro'),
          fc.constant('basic'),
          fc.constant(''),
        ),
        fc.constantFrom(...MAX_ONLY_OPERATIONS),
        async (planTier: string, operation: string) => {
          const token = makeToken({ plan: planTier })
          const result = checkPlan(token, operation)
          return result.allowed === false
        },
      ),
      { numRuns: 100 },
    )
  })

  test('absent token always returns allowed=false for MAX-only operations', () => {
    for (const op of MAX_ONLY_OPERATIONS) {
      const result = checkPlan('', op)
      assert.equal(result.allowed, false, `empty token must be blocked for op '${op}'`)
    }
  })
})

describe('PBT Property 30: Log Entries Contain No Sensitive Data', () => {
  // Feature: anonymous-chat, Property 30: Log Entries Contain No Sensitive Data
  test('relayLog records contain only event type — no payload, sender, IP, or routing path', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 80 }),
        fc.string({ minLength: 0, maxLength: 200 }),
        fc.string({ minLength: 0, maxLength: 200 }),
        fc.string({ minLength: 0, maxLength: 200 }),
        (eventType: string, payload: string, senderId: string, routingPath: string) => {
          // Capture log output
          const captured: string[] = []
          const origLog = console.log
          console.log = (msg: string) => captured.push(msg)

          try {
            relayLog(eventType)
          } finally {
            console.log = origLog
          }

          assert.equal(captured.length, 1, 'relayLog must emit exactly one log entry')

          const logEntry = captured[0]
          const parsed: Record<string, unknown> = JSON.parse(logEntry)

          // The log must contain only the 'event' field
          const keys = Object.keys(parsed)
          assert.deepEqual(keys, ['event'], 'log entry must have exactly one key: event')
          assert.equal(typeof parsed.event, 'string', 'event value must be a string')

          // Sensitive fields must NOT appear
          const logStr = logEntry.toLowerCase()

          // The log string should not contain any content from payload/sender/routing
          // unless by coincidence the eventType itself contains those strings.
          // We check the parsed object has no extra fields beyond 'event'.
          return !('payload' in parsed)
            && !('sender' in parsed)
            && !('senderId' in parsed)
            && !('ip' in parsed)
            && !('routingPath' in parsed)
            && !('recipientId' in parsed)
        },
      ),
      { numRuns: 100 },
    )
  })
})
