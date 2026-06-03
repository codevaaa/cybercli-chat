/**
 * Universal API Key Pool with Smart Rotation
 * 
 * Reads keys from .env using a clean naming convention:
 *   GROQ_API_KEY1, GROQ_API_KEY2, GROQ_API_KEY3, ...
 *   GEMINI_API_KEY1, GEMINI_API_KEY2, ...
 *   OPENROUTER_API_KEY1, OPENROUTER_API_KEY2, ...
 *   etc.
 * 
 * Also supports the legacy single-key format (GROQ_API_KEY) as a fallback.
 * 
 * Features:
 * - Round-robin rotation across all keys per provider
 * - Automatic cooldown on rate-limited/failed keys (60s cooldown)
 * - Health tracking per key (success/failure counts)
 * - Never exposes keys to clients — all rotation is server-side
 * - Supports: groq, gemini, openrouter, cerebras, mistral, nvidia, bytez,
 *   huggingface, opencode, apifreellm, cloudflare
 */

// Cooldown duration for a key that hit a rate limit or auth error
const COOLDOWN_MS = 60_000 // 1 minute

/**
 * Per-provider key pool. Each entry tracks:
 * - key: the actual API key string
 * - failures: consecutive failure count
 * - cooldownUntil: timestamp after which this key can be used again
 * - totalSuccess: lifetime success count
 * - totalFailure: lifetime failure count
 */
const pools = {}

// Round-robin index per provider
const indices = {}

/**
 * Load all keys for a given provider from process.env.
 * Convention: PROVIDER_API_KEY1, PROVIDER_API_KEY2, ... PROVIDER_API_KEY30
 * Also accepts the legacy PROVIDER_API_KEY (no number) as the first key.
 */
function loadKeysForProvider(providerEnvPrefix) {
  const keys = []

  // Legacy single key (GROQ_API_KEY, GEMINI_API_KEY, etc.)
  const legacyKey = process.env[`${providerEnvPrefix}_API_KEY`]
  if (legacyKey && legacyKey.trim()) {
    keys.push(legacyKey.trim())
  }

  // Numbered keys: GROQ_API_KEY1, GROQ_API_KEY2, ... up to 50
  for (let i = 1; i <= 50; i++) {
    const envName = `${providerEnvPrefix}_API_KEY${i}`
    const val = process.env[envName]
    if (val && val.trim()) {
      // Avoid duplicates (if legacy key is same as KEY1)
      const trimmed = val.trim()
      if (!keys.includes(trimmed)) keys.push(trimmed)
    }
  }

  return keys
}

/**
 * Initialize (or re-initialize) the pool for a provider.
 * Called lazily on first access.
 */
function ensurePool(provider) {
  if (pools[provider]) return

  const prefixMap = {
    groq: 'GROQ',
    gemini: 'GEMINI',
    openrouter: 'OPENROUTER',
    cerebras: 'CEREBRAS',
    mistral: 'MISTRAL',
    nvidia: 'NVIDIA',
    bytez: 'BYTEZ',
    huggingface: 'HUGGINGFACE',
    opencode: 'OPENCODE',
    apifreellm: 'APIFREELLM',
    cloudflare: 'CLOUDFLARE',
    llm7: 'LLM7',
  }

  const prefix = prefixMap[provider]
  if (!prefix) { pools[provider] = []; return }

  const rawKeys = loadKeysForProvider(prefix)
  pools[provider] = rawKeys.map((key) => ({
    key,
    failures: 0,
    cooldownUntil: 0,
    totalSuccess: 0,
    totalFailure: 0,
  }))
  indices[provider] = 0

  if (pools[provider].length > 0) {
    console.log(`[KeyPool] ${provider}: ${pools[provider].length} key(s) loaded`)
  }
}

/**
 * Get the next available key for a provider via round-robin.
 * Skips keys that are currently in cooldown.
 * Returns null if no keys available (all in cooldown or none configured).
 */
export function getKey(provider) {
  ensurePool(provider)
  const pool = pools[provider]
  if (!pool || pool.length === 0) return null

  const now = Date.now()
  const startIdx = indices[provider] || 0

  // Try each key starting from the current index
  for (let attempt = 0; attempt < pool.length; attempt++) {
    const idx = (startIdx + attempt) % pool.length
    const entry = pool[idx]

    if (entry.cooldownUntil > now) continue // skip — still cooling down

    // This key is available. Advance the index for next call.
    indices[provider] = (idx + 1) % pool.length
    return entry.key
  }

  // All keys are in cooldown — return the one that cools down soonest
  // (better to retry with a possibly-recovered key than to fail entirely)
  let soonest = pool[0]
  for (const entry of pool) {
    if (entry.cooldownUntil < soonest.cooldownUntil) soonest = entry
  }
  indices[provider] = (pool.indexOf(soonest) + 1) % pool.length
  return soonest.key
}

/**
 * Report a successful request for a key. Resets failure count.
 */
export function reportSuccess(provider, key) {
  ensurePool(provider)
  const pool = pools[provider] || []
  const entry = pool.find((e) => e.key === key)
  if (entry) {
    entry.failures = 0
    entry.totalSuccess++
  }
}

/**
 * Report a failed request for a key. If it's a rate-limit (429) or auth
 * error (401/403), put the key in cooldown so it's skipped temporarily.
 */
export function reportFailure(provider, key, statusCode) {
  ensurePool(provider)
  const pool = pools[provider] || []
  const entry = pool.find((e) => e.key === key)
  if (!entry) return

  entry.failures++
  entry.totalFailure++

  // Rate-limited or auth failure → cool down this key
  if (statusCode === 429 || statusCode === 401 || statusCode === 403) {
    // Exponential cooldown: 60s, 120s, 240s (max 5 min)
    const multiplier = Math.min(entry.failures, 4)
    entry.cooldownUntil = Date.now() + COOLDOWN_MS * multiplier
  }
}

/**
 * Get pool health stats (for monitoring/admin).
 */
export function getPoolStats() {
  const stats = {}
  for (const [provider, pool] of Object.entries(pools)) {
    const now = Date.now()
    stats[provider] = {
      total: pool.length,
      available: pool.filter((e) => e.cooldownUntil <= now).length,
      inCooldown: pool.filter((e) => e.cooldownUntil > now).length,
      totalSuccess: pool.reduce((s, e) => s + e.totalSuccess, 0),
      totalFailure: pool.reduce((s, e) => s + e.totalFailure, 0),
    }
  }
  return stats
}

/**
 * Check if a provider has ANY keys configured.
 */
export function hasKeys(provider) {
  ensurePool(provider)
  return (pools[provider] || []).length > 0
}

/**
 * Get the total number of keys for a provider.
 */
export function keyCount(provider) {
  ensurePool(provider)
  return (pools[provider] || []).length
}
