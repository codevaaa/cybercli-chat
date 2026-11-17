import { Router } from 'express'
import mongoose from 'mongoose'
import { getPoolStats, getKey } from '../services/llm/keyPool.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// ── Cache layer (60s TTL) ──────────────────────────────────────────────────────
let cachedResult = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 60_000

const PROVIDER_CONFIGS = [
  {
    name: 'Madhav',
    type: 'OpenCode DeepSeek-v4-Pro',
    provider: 'opencode',
    pingUrl: 'https://opencode.ai/zen/v1/models',
    keyEnv: 'OPENCODE_API_KEY',
    method: 'GET',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  {
    name: 'Bheem',
    type: 'ApiFree GPT-4o Core',
    provider: 'apifreellm',
    pingUrl: 'https://apifreellm.com/api/v1/models',
    keyEnv: 'APIFREELLM_API_KEY',
    method: 'GET',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  {
    name: 'Nakul',
    type: 'OpenRouter GPT-4o Mini',
    provider: 'openrouter',
    pingUrl: 'https://openrouter.ai/api/v1/models',
    keyEnv: 'OPENROUTER_API_KEY',
    method: 'GET',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  {
    name: 'Arjun',
    type: 'Groq Llama-3.1-8B',
    provider: 'groq',
    pingUrl: 'https://api.groq.com/openai/v1/models',
    keyEnv: 'GROQ_API_KEY',
    method: 'GET',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  {
    name: 'Sahadeva',
    type: 'Gemini 2.5 Flash Core',
    provider: 'gemini',
    pingUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    keyEnv: 'GEMINI_API_KEY',
    buildUrl: (key) => `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
    method: 'GET',
  },
  {
    name: 'Vishwakarma',
    type: 'Qwen 2.5 Coder 32B',
    provider: 'huggingface',
    pingUrl: 'https://router.huggingface.co/v1/models',
    keyEnv: 'HUGGINGFACE_API_KEY',
    method: 'GET',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  {
    name: 'Abhimanyu',
    type: 'Cerebras Llama-3.1-8B',
    provider: 'cerebras',
    pingUrl: 'https://api.cerebras.ai/v1/models',
    keyEnv: 'CEREBRAS_API_KEY',
    method: 'GET',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  {
    name: 'Panchayat',
    type: 'Consensus API Synthesis Layer',
    provider: 'council',
    // Council is an internal layer — it's "up" if at least 2 of the providers above are up.
    pingUrl: null,
    keyEnv: null,
    method: null,
  },
  {
    name: 'Voice Streaming Sync',
    type: 'Gemini Flash TTS Bridge',
    provider: 'gemini-tts',
    pingUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    keyEnv: 'GEMINI_API_KEY',
    buildUrl: (key) => `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
    method: 'GET',
  },
]

// Provider model-list endpoints only prove that the endpoint is reachable. They
// do not prove that a Codic completion can be generated.
async function pingProvider(config) {
  // Use the key pool to get the current active key for this provider
  const key = config.keyEnv ? getKey(config.provider === 'gemini-tts' ? 'gemini' : config.provider) : null

  // Council is a virtual layer
  if (config.provider === 'council') {
    return { status: 'unknown', availability: 'unverified', configured: null, verified: false, probe: 'not_run', latency: null, reason: 'completion_probe_not_implemented' }
  }

  if (!key) {
    return { status: 'unknown', availability: 'not_configured', configured: false, verified: false, probe: 'not_run', latency: null, reason: 'no_api_key' }
  }

  const url = config.buildUrl ? config.buildUrl(key) : config.pingUrl
  const headers = config.headers ? config.headers(key) : {}

  const start = performance.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch(url, {
      method: config.method || 'GET',
      headers,
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const latency = Math.round(performance.now() - start)

    if (res.ok || res.status === 200) {
      return { status: 'unknown', availability: 'unverified', configured: true, verified: false, probe: 'model_catalog_reachable', latency, reason: 'completion_not_tested' }
    }
    if (res.status === 429) {
      return { status: 'degraded', availability: 'unknown', configured: true, verified: false, probe: 'rate_limited', latency, reason: 'rate_limited' }
    }
    if (res.status === 401 || res.status === 403) {
      return { status: 'degraded', availability: 'unknown', configured: true, verified: false, probe: 'authentication_failed', latency, reason: 'auth_issue' }
    }
    return { status: 'unknown', availability: 'unknown', configured: true, verified: false, probe: 'http_error', latency, reason: `http_${res.status}` }
  } catch (err) {
    clearTimeout(timeout)
    const latency = Math.round(performance.now() - start)
    if (err.name === 'AbortError') {
      return { status: 'unknown', availability: 'unknown', configured: true, verified: false, probe: 'timeout', latency, reason: 'timeout' }
    }
    return { status: 'unknown', availability: 'unknown', configured: true, verified: false, probe: 'network_error', latency, reason: 'network_error' }
  }
}

// ── Check MongoDB health ────────────────────────────────────────────────────────
async function checkMongo() {
  const start = performance.now()
  try {
    const state = mongoose.connection.readyState
    // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    if (state === 1) {
      await mongoose.connection.db.admin().ping()
      const latency = Math.round(performance.now() - start)
      return { status: 'operational', latency }
    }
    return { status: 'down', latency: 0, reason: `state_${state}` }
  } catch (err) {
    return { status: 'down', latency: Math.round(performance.now() - start), reason: 'ping_failed' }
  }
}

// ── Check Supabase health ───────────────────────────────────────────────────────
async function checkSupabase() {
  const start = performance.now()
  const url = process.env.SUPABASE_URL
  if (!url) return { status: 'down', latency: 0, reason: 'no_url' }
  
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY || '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY || ''}`,
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const latency = Math.round(performance.now() - start)
    return { status: res.ok || res.status === 200 ? 'operational' : 'degraded', latency }
  } catch (err) {
    return { status: 'down', latency: Math.round(performance.now() - start), reason: err.name === 'AbortError' ? 'timeout' : 'network_error' }
  }
}

// ── Compute overall status ─────────────────────────────────────────────────────
function computeOverall(infra) {
  // Provider probes only fetch model catalogs; without a completion probe,
  // provider health cannot make the overall AI service "operational".
  const allStatuses = [infra.mongodb.status, infra.supabase.status]
  const downCount = allStatuses.filter(s => s === 'down').length
  const degradedCount = allStatuses.filter(s => s === 'degraded').length

  if (downCount >= 2) return 'major_outage'
  if (downCount >= 1) return 'partial_outage'
  if (degradedCount >= 2) return 'degraded'
  if (degradedCount === 1) return 'degraded'
  return 'unknown'
}

// ── Main status endpoint ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  // Return cached result if still fresh
  if (cachedResult && (Date.now() - cacheTimestamp) < CACHE_TTL_MS) {
    return res.json(cachedResult)
  }

  try {
    // Ping all providers in parallel
    const providerResults = await Promise.allSettled(
      PROVIDER_CONFIGS.map(async (config) => {
        const result = await pingProvider(config)
        return {
          name: config.name,
          type: config.type,
          provider: config.provider,
          ...result,
        }
      })
    )

    const clusters = providerResults.map((r) => {
      if (r.status === 'fulfilled') return r.value
      return {
        name: 'Unknown',
        type: 'Unknown',
        provider: 'unknown',
        status: 'unknown',
        availability: 'unknown',
        configured: null,
        verified: false,
        probe: 'error',
        latency: null,
        reason: 'promise_rejected',
      }
    })

    // Infrastructure checks in parallel
    const [mongoResult, supabaseResult] = await Promise.all([
      checkMongo(),
      checkSupabase(),
    ])

    const infrastructure = {
      mongodb: mongoResult,
      supabase: supabaseResult,
      api: { status: 'operational', uptime: process.uptime() },
    }

    const overall = computeOverall(infrastructure)

    const result = {
      overall,
      // Keep this legacy field for clients, but do not claim a synthetic SLA.
      sla90Day: null,
      timestamp: new Date().toISOString(),
      availability: 'unverified',
      verification: {
        codicCompletion: 'not_checked',
        providerProbe: 'model_catalog_only',
        historicalUptime: 'not_available',
        incidentHistory: 'not_tracked',
      },
      clusters,
      infrastructure,
      incidents: null,
      incidentsAvailable: false,
    }

    // Cache the result
    cachedResult = result
    cacheTimestamp = Date.now()

    res.json(result)
  } catch (err) {
    console.error('Status check error:', err)
    res.status(500).json({
      overall: 'unknown',
      error: 'Failed to check system status',
      timestamp: new Date().toISOString(),
    })
  }
})

const requireStatusAdmin = (req, res, next) => {
  const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(value => value.trim()).filter(Boolean)
  if (req.user?.viaApiKey || !req.user?.id || !adminIds.includes(req.user.id)) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  return next()
}

// Retain the legacy operator route while keeping provider key counts and
// activity data out of the public status API.
router.get('/keys', requireAuth, requireStatusAdmin, (req, res) => {
  res.json({ pool: getPoolStats(), timestamp: new Date().toISOString() })
})

export default router
