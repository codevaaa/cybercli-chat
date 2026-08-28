/**
 * responseCache — Lightweight in-memory LRU cache for LLM responses.
 *
 * Used to serve identical requests (e.g. grammar checks of the same text)
 * instantly without hitting the LLM provider. This is the "biggest speed win"
 * for repeated content like grammar checking.
 *
 * For a distributed multi-instance deployment, swap this for Redis (ioredis).
 * The interface (get/set) is intentionally Redis-compatible so migration is easy.
 */

import crypto from 'crypto'

const MAX_ENTRIES = 500
const TTL_MS = 30 * 60 * 1000 // 30 minutes

const cache = new Map() // key → { value, expiresAt }

/** Build a stable cache key from messages + model */
export function cacheKeyFor(messages, model) {
  const raw = JSON.stringify({ messages, model })
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  // LRU: refresh position
  cache.delete(key)
  cache.set(key, entry)
  return entry.value
}

export function setCached(key, value) {
  if (cache.size >= MAX_ENTRIES) {
    // Evict oldest (first key)
    const oldest = cache.keys().next().value
    cache.delete(oldest)
  }
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS })
}

export function cacheStats() {
  return { size: cache.size, maxEntries: MAX_ENTRIES, ttlMinutes: TTL_MS / 60000 }
}
