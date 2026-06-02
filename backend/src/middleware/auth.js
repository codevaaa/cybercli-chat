import { verifyJWT } from '../config/supabase.js'
import supabase from '../config/supabase.js'
import ApiKey from '../models/ApiKey.js'
import CLISession from '../models/CLISession.js'
import User from '../models/User.js'

// Short-lived in-memory cache of user_id -> plan to avoid a Supabase lookup on
// every API-key request. Entries expire after 60s so plan upgrades take effect
// quickly without hammering the auth DB under load.
const planCache = new Map()
const PLAN_TTL_MS = 60_000

// Short-lived cache of user_id -> ban status, so the global ban gate doesn't
// hit MongoDB on every request. A freshly banned user is locked out within 30s.
const banCache = new Map()
const BAN_TTL_MS = 30_000

async function resolveUserPlan(userId) {
  if (!userId) return 'free'
  const cached = planCache.get(userId)
  if (cached && Date.now() - cached.at < PLAN_TTL_MS) return cached.plan
  let plan = 'free'
  try {
    const { data } = await supabase.from('users').select('plan').eq('id', userId).single()
    if (data?.plan) plan = String(data.plan).toLowerCase()
  } catch {
    // Network/DB hiccup — fall back to free; cache briefly to avoid a storm.
  }
  planCache.set(userId, { plan, at: Date.now() })
  return plan
}

/**
 * Returns true if the user is banned/suspended in our registry.
 * Fails OPEN (returns false) on DB errors so an outage never locks everyone out,
 * but a definitive banned record is always enforced.
 */
async function isUserBanned(userId) {
  if (!userId) return false
  const cached = banCache.get(userId)
  if (cached && Date.now() - cached.at < BAN_TTL_MS) return cached.banned
  let banned = false
  try {
    const doc = await User.findOne({ supabase_id: userId }).select('status').lean()
    banned = doc ? (doc.status === 'banned' || doc.status === 'suspended') : false
  } catch {
    banned = false
  }
  banCache.set(userId, { banned, at: Date.now() })
  return banned
}

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  // Check if it's a Codeva API key
  let token = authHeader
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  }

  if (token.startsWith('sk_cyber_')) {
    try {
      const apiKeyDoc = await ApiKey.findOne({ key_hash: ApiKey.hashKey(token), is_active: true })
      if (!apiKeyDoc) {
        return res.status(401).json({ error: 'Invalid or deactivated API key' })
      }
      // Update last used time + usage count asynchronously
      ApiKey.updateOne(
        { _id: apiKeyDoc._id },
        { $set: { last_used_at: new Date() }, $inc: { usage_count: 1 } },
      ).catch(console.error)

      // Resolve the user's REAL plan (cached) so model access is plan-gated,
      // not hardcoded. API-key users get exactly what their subscription allows.
      const plan = await resolveUserPlan(apiKeyDoc.user_id)

      // Global ban gate also applies to API-key access.
      if (await isUserBanned(apiKeyDoc.user_id)) {
        return res.status(403).json({ error: 'Account suspended', banned: true })
      }

      req.user = {
        id: apiKeyDoc.user_id,
        email: `api-user-${apiKeyDoc.user_id.substring(0, 8)}@codeva.local`,
        plan,
        viaApiKey: true,
      }
      return next()
    } catch (err) {
      return next(err)
    }
  }

  // Fallback to Supabase JWT verification
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Invalid authorization header format' })
  }

  const { user, error } = await verifyJWT(token)

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  // Global ban gate — a suspended account cannot use the API at all.
  if (await isUserBanned(user.id)) {
    return res.status(403).json({ error: 'Account suspended', banned: true })
  }

  // Prefer the authoritative plan from the users table; fall back to JWT metadata.
  const dbPlan = await resolveUserPlan(user.id)
  req.user = {
    id: user.id,
    email: user.email,
    plan: dbPlan || user.user_metadata?.plan_tier || 'free',
  }

  next()
}

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return next()
  }

  let token = authHeader
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  }

  if (token.startsWith('sk_cyber_')) {
    try {
      const apiKeyDoc = await ApiKey.findOne({ key_hash: ApiKey.hashKey(token), is_active: true })
      if (apiKeyDoc) {
        ApiKey.updateOne(
          { _id: apiKeyDoc._id },
          { $set: { last_used_at: new Date() }, $inc: { usage_count: 1 } },
        ).catch(console.error)
        req.user = {
          id: apiKeyDoc.user_id,
          email: `api-user-${apiKeyDoc.user_id.substring(0, 8)}@codeva.local`,
          plan: 'pro',
        }
      }
    } catch (err) {
      // Ignore errors for optional authentication
    }
    return next()
  }

  // Fallback to Supabase JWT
  if (authHeader.startsWith('Bearer ')) {
    const { user } = await verifyJWT(token)
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        plan: user.user_metadata?.plan_tier || 'free',
      }
    }
  }

  next()
}

// CLI Session Authentication
export const authenticateCLI = async (req, res, next) => {
  const authHeader = req.headers.authorization
  const sessionHeader = req.headers['x-cli-session']

  if (!authHeader || !sessionHeader) {
    return res.status(401).json({ 
      error: 'Missing authorization or session header',
      hint: 'Include Authorization: Bearer <api_key> and X-CLI-Session: <session_id>'
    })
  }

  // Extract API key
  let apiKey = authHeader
  if (authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.split(' ')[1]
  }

  // Validate API key
  if (!apiKey.startsWith('sk_cyber_')) {
    return res.status(401).json({ error: 'Invalid API key format' })
  }

  const apiKeyDoc = await ApiKey.findOne({ key_hash: ApiKey.hashKey(apiKey), is_active: true })
  if (!apiKeyDoc) {
    return res.status(401).json({ error: 'Invalid or revoked API key' })
  }

  // Validate session
  const session = await CLISession.findOne({
    session_id: sessionHeader,
    user_id: apiKeyDoc.user_id,
    status: { $in: ['active', 'idle'] }
  })

  if (!session) {
    return res.status(401).json({ 
      error: 'Invalid or expired session',
      hint: 'Authenticate first with POST /api/v1/cli/auth'
    })
  }

  // Update last activity
  session.last_activity_at = new Date()
  await session.save()

  // Attach to request
  req.apiKey = apiKeyDoc
  req.session = session
  req.user = {
    id: apiKeyDoc.user_id,
    plan: 'pro'
  }

  next()
}
