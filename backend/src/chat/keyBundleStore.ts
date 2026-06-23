/**
 * keyBundleStore.ts
 * Redis-backed storage for X3DH Key Bundles (REQ-2.5).
 *
 * Privacy contract:
 *   - Key Bundles are stored ONLY in Redis with a 30-day TTL.
 *   - Key Bundles MUST NEVER be written to MongoDB or any durable store.
 *   - Any code path that attempts to write a Key Bundle to MongoDB MUST
 *     call `guardNoMongoDB()` first; that guard ALWAYS throws.
 *   - MongoDB metadata operations (e.g. room creation) MUST use
 *     `withMongoDbAvailability()`. If MongoDB is unreachable the operation
 *     fails hard — no Redis fallback is permitted (REQ-13.4).
 *
 * Feature: anonymous-chat
 * Requirement refs: REQ-2.5, REQ-13.4
 */

import type { Db } from 'mongodb'

// ─── Redis client interface ───────────────────────────────────────────────────

/**
 * Subset of the ioredis interface required by this module.
 * Compatible with both ioredis and ioredis-mock.
 */
export interface RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<'OK'>
  setex(key: string, seconds: number, value: string): Promise<'OK'>
  del(...keys: string[]): Promise<number>
  ttl(key: string): Promise<number>
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** 30-day TTL in seconds (REQ-2.5) */
export const KEY_BUNDLE_TTL_SECONDS = 30 * 24 * 60 * 60 // 2_592_000

/** Redis key prefix for key bundles */
const KEY_BUNDLE_KEY = (identifier: string) => `key_bundle:${identifier}`

// ─── Error types ──────────────────────────────────────────────────────────────

export interface KeyBundleMongoDbForbiddenError {
  type: 'KEY_BUNDLE_MONGODB_WRITE_FORBIDDEN'
}

export interface MongoDbUnavailableError {
  type: 'MONGODB_UNAVAILABLE'
  cause?: unknown
}

// ─── MongoDB write guard ──────────────────────────────────────────────────────

/**
 * Hard guard: ALWAYS throws `KEY_BUNDLE_MONGODB_WRITE_FORBIDDEN`.
 *
 * Any code path that would write Key Bundle data to MongoDB MUST call this
 * function first. Because it unconditionally throws, such writes are
 * impossible to execute without an unhandled error propagating to the caller.
 *
 * The `db` parameter is intentionally `unknown` — passing any value (including
 * `null` or `undefined`) still throws, reinforcing the constraint at the type
 * level.
 *
 * @throws {KeyBundleMongoDbForbiddenError} always
 *
 * Validates: REQ-2.5
 */
export function guardNoMongoDB(_db: unknown): never {
  throw { type: 'KEY_BUNDLE_MONGODB_WRITE_FORBIDDEN' } satisfies KeyBundleMongoDbForbiddenError
}

// ─── MongoDB availability wrapper ─────────────────────────────────────────────

/**
 * Run a MongoDB metadata `operation` and re-throw any connection/availability
 * error as `{ type: 'MONGODB_UNAVAILABLE' }`.
 *
 * Semantics (REQ-13.4):
 *   - If MongoDB is reachable, `operation()` result is returned as-is.
 *   - If MongoDB throws a connection or topology error, the error is wrapped
 *     and re-thrown — there is NO fallback to Redis or any alternative store.
 *
 * @param db        - MongoDB Db instance (used only to verify the parameter
 *                    is present; actual DB operations are inside `operation`)
 * @param operation - Async function performing MongoDB work
 *
 * Validates: REQ-13.4
 */
export async function withMongoDbAvailability<T>(
  db: Db,
  operation: () => Promise<T>,
): Promise<T> {
  if (!db) {
    const err: MongoDbUnavailableError = { type: 'MONGODB_UNAVAILABLE', cause: 'No db instance provided' }
    throw err
  }

  try {
    return await operation()
  } catch (cause: unknown) {
    // Re-throw connection/topology errors as MONGODB_UNAVAILABLE.
    // We detect MongoDB driver errors by checking common error name patterns
    // as well as a generic catch-all — per REQ-13.4 we must never silently
    // fall back to an alternative store.
    if (isMongoConnectionError(cause)) {
      const err: MongoDbUnavailableError = { type: 'MONGODB_UNAVAILABLE', cause }
      throw err
    }
    // Non-connection errors (e.g. validation, duplicate key) propagate as-is.
    throw cause
  }
}

/**
 * Heuristic to identify MongoDB connection / topology errors.
 * Covers the MongoDB Node.js driver's error class names.
 */
function isMongoConnectionError(err: unknown): boolean {
  if (err === null || err === undefined) return false

  const e = err as { name?: string; message?: string; code?: number | string }
  const name = e.name ?? ''
  const message = (e.message ?? '').toLowerCase()

  const mongoConnectionNames = [
    'MongoNetworkError',
    'MongoNetworkTimeoutError',
    'MongoServerSelectionError',
    'MongoTopologyClosedError',
    'MongoConnectionPoolClosedError',
    'MongoNotConnectedError',
  ]

  if (mongoConnectionNames.includes(name)) return true

  // Fallback: look for common connection-failure phrases in the message
  if (
    message.includes('econnrefused') ||
    message.includes('connection timed out') ||
    message.includes('topology was destroyed') ||
    message.includes('server selection timed out') ||
    message.includes('not connected') ||
    message.includes('connection closed') ||
    message.includes('MONGODB_UNAVAILABLE') // propagated re-throw
  ) {
    return true
  }

  return false
}

// ─── Key Bundle CRUD ──────────────────────────────────────────────────────────

/**
 * Store a Key Bundle in Redis under `key_bundle:{identifier}` with a 30-day
 * TTL (REQ-2.5).
 *
 * @param identifier  - The user's pseudonymous identifier (hex SHA-256 of public key)
 * @param bundle      - The Key Bundle object (serialised as JSON)
 * @param redisClient - ioredis-compatible client
 */
export async function storeKeyBundle(
  identifier: string,
  bundle: object,
  redisClient: RedisClient,
): Promise<void> {
  const key = KEY_BUNDLE_KEY(identifier)
  await redisClient.setex(key, KEY_BUNDLE_TTL_SECONDS, JSON.stringify(bundle))
}

/**
 * Fetch a Key Bundle from Redis.
 *
 * @param identifier  - The user's pseudonymous identifier
 * @param redisClient - ioredis-compatible client
 * @returns The Key Bundle object, or `null` if not found / expired
 */
export async function fetchKeyBundle(
  identifier: string,
  redisClient: RedisClient,
): Promise<object | null> {
  const key = KEY_BUNDLE_KEY(identifier)
  const raw = await redisClient.get(key)
  if (raw === null) return null
  return JSON.parse(raw) as object
}

/**
 * Delete a Key Bundle from Redis.
 *
 * @param identifier  - The user's pseudonymous identifier
 * @param redisClient - ioredis-compatible client
 */
export async function deleteKeyBundle(
  identifier: string,
  redisClient: RedisClient,
): Promise<void> {
  const key = KEY_BUNDLE_KEY(identifier)
  await redisClient.del(key)
}
