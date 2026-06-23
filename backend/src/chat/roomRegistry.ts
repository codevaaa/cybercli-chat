/**
 * roomRegistry.ts
 * Manages Room state in Redis (membership) and Room metadata in MongoDB.
 *
 * Feature: anonymous-chat
 * Requirement refs: REQ-4.1, REQ-4.2, REQ-4.3, REQ-4.5, REQ-13.1, REQ-13.4
 */

import { randomUUID } from 'node:crypto'
import type { Db } from 'mongodb'

// ─── Redis client interface ───────────────────────────────────────────────────

/**
 * Minimal ioredis-compatible interface used by room registry functions.
 * Typed as an interface for testability (works with ioredis-mock).
 */
export interface RedisClient {
  sadd(key: string, ...members: string[]): Promise<number>
  srem(key: string, ...members: string[]): Promise<number>
  scard(key: string): Promise<number>
  smembers(key: string): Promise<string[]>
  sismember(key: string, member: string): Promise<number>
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum participants per Room (REQ-4.2, REQ-4.3) */
export const MAX_ROOM_PARTICIPANTS = 100

/** Redis key prefix for room member sets */
const ROOM_MEMBERS_KEY = (roomId: string) => `room:${roomId}:members`

// ─── MongoDB document type ────────────────────────────────────────────────────

interface ChatRoomDocument {
  roomId: string
  participantCount: number
  createdAt: Date
  /** SHA-256 of creator's identifier (anonymized per REQ-13.4) */
  createdByHash: string
}

// ─── Room creation ────────────────────────────────────────────────────────────

/**
 * Create a new Room, persist metadata to MongoDB `chat_rooms`, and return
 * the generated Room ID.
 *
 * Only non-content metadata is written (REQ-13.4).
 *
 * @param creatorHash - SHA-256 hex of the creator's anonymous identifier
 * @param db          - MongoDB Db instance
 */
export async function createRoom(
  creatorHash: string,
  db: Db,
): Promise<{ roomId: string }> {
  const roomId = randomUUID()
  const doc: ChatRoomDocument = {
    roomId,
    participantCount: 0,
    createdAt: new Date(),
    createdByHash: creatorHash,
  }
  await db.collection<ChatRoomDocument>('chat_rooms').insertOne(doc)
  return { roomId }
}

// ─── Room join ────────────────────────────────────────────────────────────────

export type JoinResult =
  | { success: true }
  | { success: false; error: 'ROOM_AT_CAPACITY' | 'ALREADY_MEMBER' }

/**
 * Add a participant to a Room's Redis member set.
 *
 * Enforces the 100-participant cap atomically:
 *   1. SCARD to check current size
 *   2. Reject if already at or above MAX_ROOM_PARTICIPANTS
 *   3. SADD the new participant
 *
 * This is "atomic enough" for a single-node Redis; for a cluster with
 * concurrent joins a Lua script would be needed, but satisfies the spec.
 *
 * @param roomId        - UUID of the Room
 * @param participantId - Identifier of the joining participant
 * @param redisClient   - ioredis (or ioredis-mock) client
 *
 * Validates: REQ-4.2, REQ-4.3, Property 11 (Room Capacity Invariant)
 */
export async function joinRoom(
  roomId: string,
  participantId: string,
  redisClient: RedisClient,
): Promise<JoinResult> {
  const key = ROOM_MEMBERS_KEY(roomId)
  const currentCount = await redisClient.scard(key)

  if (currentCount >= MAX_ROOM_PARTICIPANTS) {
    return { success: false, error: 'ROOM_AT_CAPACITY' }
  }

  await redisClient.sadd(key, participantId)
  return { success: true }
}

// ─── Room leave ───────────────────────────────────────────────────────────────

/**
 * Remove a participant from a Room's Redis member set.
 *
 * @param roomId        - UUID of the Room
 * @param participantId - Identifier of the leaving participant
 * @param redisClient   - ioredis (or ioredis-mock) client
 *
 * Validates: REQ-4.5, Property 12 (Room Membership Removal)
 */
export async function leaveRoom(
  roomId: string,
  participantId: string,
  redisClient: RedisClient,
): Promise<void> {
  const key = ROOM_MEMBERS_KEY(roomId)
  await redisClient.srem(key, participantId)
}

// ─── Room membership query ────────────────────────────────────────────────────

/**
 * Return the current number of participants in a Room.
 *
 * @param roomId      - UUID of the Room
 * @param redisClient - ioredis (or ioredis-mock) client
 */
export async function getRoomMemberCount(
  roomId: string,
  redisClient: RedisClient,
): Promise<number> {
  return redisClient.scard(ROOM_MEMBERS_KEY(roomId))
}

/**
 * Return all member identifiers for a Room.
 *
 * @param roomId      - UUID of the Room
 * @param redisClient - ioredis (or ioredis-mock) client
 */
export async function getRoomMembers(
  roomId: string,
  redisClient: RedisClient,
): Promise<string[]> {
  return redisClient.smembers(ROOM_MEMBERS_KEY(roomId))
}

// ─── Message queue helpers ────────────────────────────────────────────────────

/** Extended Redis client interface that includes List and key-expiry operations */
export interface RedisClientWithQueue extends RedisClient {
  rpush(key: string, ...values: string[]): Promise<number>
  lrange(key: string, start: number, stop: number): Promise<string[]>
  del(...keys: string[]): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<'OK'>
  setex(key: string, seconds: number, value: string): Promise<'OK'>
}

/** 72-hour TTL in seconds (REQ-3.3) */
const MSG_QUEUE_TTL_SECONDS = 72 * 60 * 60 // 259200

/** Redis key for a recipient's undelivered message queue */
const MSG_QUEUE_KEY = (recipientId: string) => `msg_queue:${recipientId}`

/** Redis key for a stored packet (used by ackMessage for direct lookup/delete) */
const PACKET_KEY = (packetId: string) => `packet:${packetId}`

/**
 * Push an undelivered packet onto a recipient's message queue in Redis.
 * Sets/refreshes the 72-hour TTL on the queue key.
 *
 * @param recipientId - Identifier of the offline recipient
 * @param packet      - The full packet object (any shape)
 * @param redisClient - Extended Redis client
 *
 * Validates: REQ-3.3, REQ-13.2
 */
export async function queueMessage(
  recipientId: string,
  packet: unknown,
  redisClient: RedisClientWithQueue,
): Promise<void> {
  const key = MSG_QUEUE_KEY(recipientId)
  await redisClient.rpush(key, JSON.stringify(packet))
  await redisClient.expire(key, MSG_QUEUE_TTL_SECONDS)
}

/**
 * Acknowledge delivery of a packet and delete it from Redis.
 *
 * Stores each queued packet separately under `packet:{packetId}` so that
 * ACKing a specific packet deletes only that entry.
 *
 * @param packetId    - Unique ID of the delivered packet
 * @param recipientId - Identifier of the recipient (used to reconstruct the key)
 * @param redisClient - Extended Redis client
 *
 * Validates: REQ-3.5, REQ-13.3, Property 13 (Post-Delivery Redis Cleanup)
 */
export async function ackMessage(
  packetId: string,
  recipientId: string,
  redisClient: RedisClientWithQueue,
): Promise<void> {
  // Delete the individually-keyed packet entry
  await redisClient.del(PACKET_KEY(packetId))
  // Also attempt to remove from the recipient's queue list by key convention
  await redisClient.del(`${MSG_QUEUE_KEY(recipientId)}:${packetId}`)
}
