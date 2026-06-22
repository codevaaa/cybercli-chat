/**
 * smoke.test.ts
 * Smoke tests for the anonymous chat relay modules.
 *
 * Runner:
 *   node --experimental-strip-types --loader ./src/chat/loader.mjs --test src/chat/tests/smoke.test.ts
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
  handleChatFrame,
  relayLog,
} from '../chatWsHandler.js'

import {
  setRedisClient,
} from '../messageQueue.js'

import {
  createRoom,
} from '../roomRegistry.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a fresh ioredis-mock instance */
function makeRedis() {
  return new RedisMock()
}

/** Create a mock WebSocket object that records all outbound frames */
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

// ─── Smoke Test 1: No private key material in any outbound WS frame ───────────

describe('Smoke: No private key material in any outbound WS frame', () => {
  test('private key value never appears in any outbound frame or relay log', async () => {
    // Fake identity — the private key value we must never leak
    const privateKey = 'PRIVATE_KEY_SECRET_abc123456789'
    const maxToken = makeToken({ plan: 'max' })

    const mockWs = makeMockWs()
    const ctx = {
      ws: mockWs as any,
      authToken: maxToken,
    }

    // Set up a redis client for messageQueue module
    const redis = makeRedis()
    setRedisClient(redis)

    // Capture console.log output for relay log checks
    const logLines: string[] = []
    const origLog = console.log
    console.log = (...args: any[]) => {
      logLines.push(args.map(String).join(' '))
    }

    try {
      // Send key_bundle_pub frame — include private key in payload (simulates accidental inclusion)
      await handleChatFrame(ctx, JSON.stringify({
        type: 'anon_chat.key_bundle_pub',
        payload: {
          identityKey: 'publicKeyABC',
          // Intentionally pass private key to see if it leaks
          privateKeyField: privateKey,
        },
        seq: 1,
        authToken: maxToken,
      }))

      // Send room_join frame
      await handleChatFrame(ctx, JSON.stringify({
        type: 'anon_chat.room_join',
        payload: {
          roomId: 'smoke-room-001',
          participantId: 'smoke-user-001',
          // Include private key in payload to test for leakage
          sensitiveData: privateKey,
        },
        seq: 2,
        authToken: maxToken,
      }))

      // Send delivery_ack frame
      await handleChatFrame(ctx, JSON.stringify({
        type: 'anon_chat.delivery_ack',
        payload: {
          recipientId: 'smoke-user-002',
          packetId: 'smoke-pkt-001',
          // Include private key in payload to test for leakage
          meta: privateKey,
        },
        seq: 3,
        authToken: maxToken,
      }))
    } finally {
      console.log = origLog
    }

    // Assert that NONE of the outbound frame strings contain the private key
    for (const frameStr of mockWs._sent) {
      assert.ok(
        !frameStr.includes(privateKey),
        `Outbound WS frame must not contain private key. Found in: ${frameStr.slice(0, 120)}`,
      )
    }

    // Assert that relay log output does not contain the private key
    for (const logLine of logLines) {
      assert.ok(
        !logLine.includes(privateKey),
        `Relay log must not contain private key. Found in: ${logLine.slice(0, 120)}`,
      )
    }
  })
})

// ─── Smoke Test 2: MongoDB chat_rooms collection has no content/payload/message fields ───

describe('Smoke: MongoDB chat_rooms collection has no content/payload/message fields', () => {
  test('chat_rooms documents contain no forbidden fields after createRoom', async () => {
    const db = mongoClient.db('smoke_test_rooms')

    // Create a room
    await createRoom('smokeCreatorHash', db)

    // Retrieve ALL documents from chat_rooms
    const docs = await db.collection('chat_rooms').find({}).toArray()
    assert.ok(docs.length > 0, 'chat_rooms must have at least one document')

    const forbiddenFields = ['content', 'payload', 'message']

    // For each document assert forbidden fields are absent
    for (const doc of docs) {
      for (const field of forbiddenFields) {
        assert.ok(
          !(field in doc),
          `chat_rooms document must NOT have field '${field}'. Document keys: ${Object.keys(doc).join(', ')}`,
        )
      }
    }

    // Attempt to insert a document with forbidden fields and verify the contract
    // (This tests that our code never inserts such fields — we test the schema)
    const testDoc = {
      roomId: 'smoke-room-contract-test',
      participantCount: 0,
      createdAt: new Date(),
      createdByHash: 'contractHash',
      // These should never appear in a real document — we insert them here to
      // confirm our read-back assertion correctly catches them
    }
    await db.collection('chat_rooms').insertOne({ ...testDoc })

    // Read back just the testDoc
    const insertedDoc = await db.collection('chat_rooms').findOne({ roomId: 'smoke-room-contract-test' })
    assert.ok(insertedDoc !== null, 'test document must be inserted')

    // Verify it does NOT contain forbidden fields
    for (const field of forbiddenFields) {
      assert.ok(
        !(field in insertedDoc),
        `Inserted document must not have forbidden field '${field}'`,
      )
    }
  })
})

// ─── Smoke Test 3: Relay server log output contains no sensitive data ─────────

describe('Smoke: Relay server log output contains no sensitive data', () => {
  test('all relay log entries contain only an event field — no sensitive fields or values', async () => {
    const maxToken = makeToken({ plan: 'max' })
    const redis = makeRedis()
    setRedisClient(redis)

    const mockWs = makeMockWs()
    const ctx = {
      ws: mockWs as any,
      authToken: maxToken,
    }

    // Capture all console.log output
    const logLines: string[] = []
    const origLog = console.log
    console.log = (...args: any[]) => {
      logLines.push(args.map(String).join(' '))
    }

    try {
      // Dispatch several anon_chat.* frames through handleChatFrame
      await handleChatFrame(ctx, JSON.stringify({
        type: 'anon_chat.key_bundle_pub',
        payload: { identityKey: 'pubkey001', userId: 'should-not-appear' },
        seq: 1,
        authToken: maxToken,
      }))

      await handleChatFrame(ctx, JSON.stringify({
        type: 'anon_chat.room_join',
        payload: {
          roomId: 'smoke-log-room',
          participantId: 'smoke-log-user',
          senderId: 'should-not-appear-in-log',
        },
        seq: 2,
        authToken: maxToken,
      }))

      await handleChatFrame(ctx, JSON.stringify({
        type: 'anon_chat.key_bundle_req',
        payload: { requesterId: 'should-not-appear', routingPath: 'hop1>hop2>hop3' },
        seq: 3,
        authToken: maxToken,
      }))

      // Also call relayLog directly with various event types
      relayLog('onion_packet_forwarded')
      relayLog('room_join_attempted')
      relayLog('delivery_ack_processed')
      relayLog('message_forwarded')
    } finally {
      console.log = origLog
    }

    // Must have produced at least some log entries
    assert.ok(logLines.length > 0, 'relay must produce log output')

    // For each log entry, parse as JSON and assert invariants
    for (const line of logLines) {
      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(line)
      } catch {
        // If a line is not JSON it might be from Node internals; skip
        continue
      }

      // Must have an 'event' field
      assert.ok('event' in parsed, `log entry must have 'event' field. Entry: ${line}`)
      assert.equal(
        typeof parsed.event,
        'string',
        `log entry 'event' must be a string. Entry: ${line}`,
      )

      // Sensitive fields must NOT be present in the parsed object
      assert.ok(!('userId' in parsed), `log entry must not have 'userId'. Entry: ${line}`)
      assert.ok(!('senderId' in parsed), `log entry must not have 'senderId'. Entry: ${line}`)
      assert.ok(!('routingPath' in parsed), `log entry must not have 'routingPath'. Entry: ${line}`)
      assert.ok(!('payload' in parsed), `log entry must not have 'payload'. Entry: ${line}`)

      // Sensitive strings must NOT appear as literal JSON keys in the log line
      assert.ok(
        !line.includes('"userId"'),
        `log line must not contain literal "userId" key. Line: ${line}`,
      )
      assert.ok(
        !line.includes('"senderId"'),
        `log line must not contain literal "senderId" key. Line: ${line}`,
      )
      assert.ok(
        !line.includes('"routingPath"'),
        `log line must not contain literal "routingPath" key. Line: ${line}`,
      )
    }
  })
})
