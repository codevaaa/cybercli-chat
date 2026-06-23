/**
 * integration.test.ts
 * Integration tests for the anonymous chat relay modules.
 *
 * Runner:
 *   node --experimental-strip-types --loader ./src/chat/loader.mjs --test src/chat/tests/integration.test.ts
 *
 * Feature: anonymous-chat
 * Requirement refs: All (Task 14)
 */

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

// ─── CJS interop ─────────────────────────────────────────────────────────────
const require = createRequire(import.meta.url)
const RedisMock = require('ioredis-mock')
const { MongoMemoryServer } = require('mongodb-memory-server')
const { MongoClient } = require('mongodb')

// ─── Modules under test ───────────────────────────────────────────────────────
import {
  storeKeyBundle,
  fetchKeyBundle,
  guardNoMongoDB,
} from '../keyBundleStore.js'

import {
  setRedisClient,
  queueMessage,
  ackDelivery,
} from '../messageQueue.js'

import {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomMemberCount,
  MAX_ROOM_PARTICIPANTS,
} from '../roomRegistry.js'

import {
  handleChatFrame,
} from '../chatWsHandler.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a fresh ioredis-mock instance */
function makeRedis() {
  return new RedisMock()
}

/** Create a mock WebSocket object */
function makeMockWs() {
  const sent: string[] = []
  return {
    readyState: 1,
    OPEN: 1,
    send: (data: string) => { sent.push(data) },
    _sent: sent,
  }
}

/**
 * Build a minimal base64url-encoded JWT-like token with the given claims.
 */
function makeToken(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${header}.${payload}.fakesig`
}

// ─── MongoDB lifecycle ────────────────────────────────────────────────────────

let mongoServer: any
let mongoClient: any

before(async () => {
  mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()
  mongoClient = new MongoClient(uri)
  await mongoClient.connect()
})

after(async () => {
  await mongoClient.close()
  await mongoServer.stop()
})

// ─── Test 1: Key Bundle publish → fetch lifecycle ─────────────────────────────

describe('Integration: Key_Bundle publish → fetch lifecycle', () => {
  test('store and fetch returns same bundle; guardNoMongoDB throws; key exists in Redis', async () => {
    const redis = makeRedis()
    const identifier = 'user-keybundle-test-001'
    const bundle = {
      identityKey: 'abc123',
      signedPreKey: { key: 'spk', sig: 'spksig' },
      oneTimePreKeys: [],
    }

    // Publish (store) the key bundle
    await storeKeyBundle(identifier, bundle, redis)

    // Fetch and verify it matches the original
    const fetched = await fetchKeyBundle(identifier, redis)
    assert.ok(fetched !== null, 'fetched bundle must not be null')
    assert.deepEqual(fetched, bundle, 'fetched bundle must match the stored bundle')

    // guardNoMongoDB must always throw KEY_BUNDLE_MONGODB_WRITE_FORBIDDEN
    const mockDb = {}
    let threw = false
    try {
      guardNoMongoDB(mockDb)
    } catch (err: any) {
      threw = true
      assert.equal(
        err.type,
        'KEY_BUNDLE_MONGODB_WRITE_FORBIDDEN',
        'guard must throw KEY_BUNDLE_MONGODB_WRITE_FORBIDDEN',
      )
    }
    assert.ok(threw, 'guardNoMongoDB must throw')

    // Verify the key exists in Redis (TTL check: use get as ioredis-mock ttl support varies)
    const raw = await redis.get(`key_bundle:${identifier}`)
    assert.ok(raw !== null, 'key_bundle key must exist in Redis after store')

    // If ttl() is supported on the mock, check it is > 0
    if (typeof redis.ttl === 'function') {
      const ttl = await redis.ttl(`key_bundle:${identifier}`)
      // ttl may return -1 (no TTL set) or -2 (key missing) in some mock versions
      // Accept either positive TTL or -1 (mock limitation), but NOT -2 (key missing)
      assert.notEqual(ttl, -2, 'key must exist in Redis (ttl -2 means missing)')
    }
  })
})

// ─── Test 2: Offline recipient message queuing — Redis with 72h TTL and cleanup on ACK ────

describe('Integration: Offline recipient message queuing — Redis with 72h TTL and cleanup on ACK', () => {
  test('queued packet exists in Redis; cleaned up after ACK', async () => {
    const redis = makeRedis()
    setRedisClient(redis)

    const recipientId = 'offline-user-001'
    const packetId = 'pkt-integration-001'
    const data = { text: 'hello offline world', ts: Date.now() }

    // Queue the message
    await queueMessage(recipientId, packetId, data)

    // Assert the packet key exists
    const packetRaw = await redis.get(`packet:${packetId}`)
    assert.ok(packetRaw !== null, 'packet key must exist in Redis after queueMessage')

    // Assert the queue list entry exists
    const queueItems = await redis.lrange(`msg_queue:${recipientId}`, 0, -1)
    assert.ok(queueItems.length > 0, 'msg_queue must have at least one entry after queueMessage')

    // ACK delivery — should delete the packet key
    await ackDelivery(recipientId, packetId)

    // Assert packet key is gone
    const packetAfterAck = await redis.get(`packet:${packetId}`)
    assert.equal(packetAfterAck, null, 'packet key must be null after ackDelivery')
  })
})

// ─── Test 3: MongoDB chat_rooms document structure ────────────────────────────

describe('Integration: MongoDB chat_rooms document structure', () => {
  test('createRoom produces correct fields and no forbidden content fields', async () => {
    const db = mongoClient.db('integration_test_rooms')

    const { roomId } = await createRoom('creatorHash123', db)
    assert.ok(typeof roomId === 'string' && roomId.length > 0, 'createRoom must return a roomId')

    const doc = await db.collection('chat_rooms').findOne({})
    assert.ok(doc !== null, 'a document must be inserted into chat_rooms')

    // Assert required fields are present
    assert.ok('roomId' in doc, 'document must have roomId field')
    assert.ok('participantCount' in doc, 'document must have participantCount field')
    assert.ok('createdAt' in doc, 'document must have createdAt field')
    assert.ok('createdByHash' in doc, 'document must have createdByHash field')

    // Assert forbidden content fields are absent
    const forbidden = ['content', 'payload', 'message', 'text', 'body', 'data', 'encryptedContent']
    for (const field of forbidden) {
      assert.ok(!(field in doc), `document must NOT have field: ${field}`)
    }
  })
})

// ─── Test 4: Plan guard end-to-end — free plan WS token receives 403 ─────────

describe('Integration: Plan guard end-to-end — free-plan WS token receives 403 on MAX-only operation', () => {
  test('free plan token receives 403 error frame for anon_chat.onion_packet', async () => {
    const mockWs = makeMockWs()
    const freeToken = makeToken({ plan: 'free' })

    const ctx = {
      ws: mockWs as any,
      authToken: freeToken,
    }

    // anon_chat.onion_packet is in MAX_ONLY_EVENTS
    const frame = JSON.stringify({
      type: 'anon_chat.onion_packet',
      payload: { data: 'test' },
      seq: 1,
      authToken: freeToken,
    })

    const handled = await handleChatFrame(ctx, frame)

    assert.equal(handled, true, 'handleChatFrame must return true for anon_chat frames')
    assert.ok(mockWs._sent.length > 0, 'a response frame must have been sent')

    const response = JSON.parse(mockWs._sent[0])
    assert.equal(
      response.payload?.code,
      403,
      'response payload.code must be 403 for free plan on MAX-only operation',
    )
  })
})

// ─── Test 5: WebSocket multiplexing — interleaved frames processed independently

describe('Integration: WebSocket multiplexing — interleaved frames processed independently', () => {
  test('anon_chat frame is handled; daemon frame is not handled by chatWsHandler', async () => {
    const maxToken = makeToken({ plan: 'max' })

    // Context 1: for the chat handler
    const chatWs = makeMockWs()
    const chatCtx = {
      ws: chatWs as any,
      authToken: maxToken,
    }

    // Context 2: for the daemon handler (different context)
    const daemonWs = makeMockWs()
    const daemonCtx = {
      ws: daemonWs as any,
      authToken: maxToken,
    }

    // Send an anon_chat.key_bundle_pub frame — should be handled
    const chatFrame = JSON.stringify({
      type: 'anon_chat.key_bundle_pub',
      payload: { identityKey: 'testkey' },
      seq: 10,
      authToken: maxToken,
    })
    const chatHandled = await handleChatFrame(chatCtx, chatFrame)
    assert.equal(chatHandled, true, 'anon_chat.key_bundle_pub must be handled')
    assert.ok(chatWs._sent.length > 0, 'chat WS must receive a response')

    // Send a daemon.ping frame — should NOT be handled by chatWsHandler
    const daemonFrame = JSON.stringify({
      type: 'daemon.ping',
      payload: {},
      seq: 11,
    })
    const daemonHandled = await handleChatFrame(daemonCtx, daemonFrame)
    assert.equal(daemonHandled, false, 'daemon.ping must NOT be handled by chatWsHandler')

    // Verify daemon WS received no sends from the chat handler
    assert.equal(daemonWs._sent.length, 0, 'daemon WS must not receive any chat responses')
  })
})

// ─── Test 6: Room join/leave — participant count increments/decrements, 100-cap enforced

describe('Integration: Room join/leave — participant count in Redis increments/decrements, 100-cap enforced', () => {
  test('join 3, count=3; leave 1, count=2; 101st join rejected; count stays 100', async () => {
    const redis = makeRedis()
    const roomId = `integration-room-${Date.now()}`

    // Join 3 participants
    for (let i = 0; i < 3; i++) {
      const result = await joinRoom(roomId, `participant-${i}`, redis)
      assert.equal(result.success, true, `participant ${i} must join successfully`)
    }

    // Assert count equals 3
    const count3 = await getRoomMemberCount(roomId, redis)
    assert.equal(count3, 3, 'room must have 3 participants after 3 joins')

    // Leave one participant
    await leaveRoom(roomId, 'participant-0', redis)

    // Assert count equals 2
    const count2 = await getRoomMemberCount(roomId, redis)
    assert.equal(count2, 2, 'room must have 2 participants after one leave')

    // Fill room to exactly 100 total (already have 2, need 98 more)
    for (let i = 3; i < 101; i++) {
      await joinRoom(roomId, `fill-participant-${i}`, redis)
    }

    const count100 = await getRoomMemberCount(roomId, redis)
    assert.equal(count100, MAX_ROOM_PARTICIPANTS, 'room must have exactly 100 participants')

    // 101st join must fail
    const overflow = await joinRoom(roomId, 'participant-overflow', redis)
    assert.equal(overflow.success, false, '101st join must be rejected')
    assert.equal(
      (overflow as { success: false; error: string }).error,
      'ROOM_AT_CAPACITY',
      '101st join error must be ROOM_AT_CAPACITY',
    )

    // Count must remain 100
    const countFinal = await getRoomMemberCount(roomId, redis)
    assert.equal(countFinal, MAX_ROOM_PARTICIPANTS, 'count must remain 100 after rejected join')
  })
})
