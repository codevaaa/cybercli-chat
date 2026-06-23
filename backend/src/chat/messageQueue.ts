/**
 * messageQueue.ts
 * Redis-backed message queue for undelivered packets.
 * Used by chatWsHandler.ts for offline message storage and delivery ACKs.
 *
 * Feature: anonymous-chat
 * Requirement refs: REQ-3.3, REQ-3.5, REQ-13.2, REQ-13.3
 */

// ─── Redis client interface ───────────────────────────────────────────────────

/**
 * Minimal ioredis-compatible interface for message queue operations.
 */
export interface QueueRedisClient {
  rpush(key: string, ...values: string[]): Promise<number>
  lrange(key: string, start: number, stop: number): Promise<string[]>
  del(...keys: string[]): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<'OK'>
  setex(key: string, seconds: number, value: string): Promise<'OK'>
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** 72-hour TTL in seconds (REQ-3.3) */
const MSG_QUEUE_TTL_SECONDS = 259200

const MSG_QUEUE_KEY = (recipientId: string) => `msg_queue:${recipientId}`
const PACKET_KEY = (packetId: string) => `packet:${packetId}`

// ─── Module-level Redis client reference ─────────────────────────────────────
// chatWsHandler.ts calls queueMessage / ackDelivery without passing a client
// explicitly. The client must be injected via setRedisClient before first use.

let _redis: QueueRedisClient | null = null

/**
 * Inject the Redis client used by this module.
 * Call this once during server initialisation, after the ioredis connection
 * is established.
 */
export function setRedisClient(client: QueueRedisClient): void {
  _redis = client
}

function getRedis(): QueueRedisClient {
  if (!_redis) {
    throw new Error('messageQueue: Redis client not initialised. Call setRedisClient() first.')
  }
  return _redis
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Push an undelivered packet onto a recipient's message queue.
 * Refreshes the 72-hour TTL on the queue key.
 *
 * @param recipientId - Identifier of the offline recipient
 * @param packetId    - Unique ID for this packet (UUID)
 * @param data        - The packet payload (any serialisable value)
 *
 * Validates: REQ-3.3, REQ-13.2, Property 13
 */
export async function queueMessage(
  recipientId: string,
  packetId: string,
  data: unknown,
): Promise<void> {
  const redis = getRedis()
  const packet = { packetId, data }

  // Push to recipient's queue list
  const queueKey = MSG_QUEUE_KEY(recipientId)
  await redis.rpush(queueKey, JSON.stringify(packet))
  await redis.expire(queueKey, MSG_QUEUE_TTL_SECONDS)

  // Also store individually-keyed for O(1) ACK deletion
  await redis.setex(PACKET_KEY(packetId), MSG_QUEUE_TTL_SECONDS, JSON.stringify(packet))
}

/**
 * Acknowledge delivery of a packet and delete it from Redis.
 *
 * Deletes the individually-keyed `packet:{packetId}` entry so that
 * querying Redis for that packet ID returns null after ACK.
 *
 * @param recipientId - Identifier of the recipient
 * @param packetId    - Unique ID of the delivered packet
 *
 * Validates: REQ-3.5, REQ-13.3, Property 13 (Post-Delivery Redis Cleanup)
 */
export async function ackDelivery(
  recipientId: string,
  packetId: string,
): Promise<void> {
  const redis = getRedis()
  await redis.del(PACKET_KEY(packetId))
}
