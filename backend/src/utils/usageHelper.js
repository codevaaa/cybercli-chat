import User from '../models/User.js'

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  Usage Helper — Kali Kal & Sandbox daily-reset counters with plan limits
 * ═══════════════════════════════════════════════════════════════════════
 */

// ── Plan limits ──────────────────────────────────────────────────────────
const KALI_LIMITS = { free: 20, pro: 100, max: 1000, team: 1000, enterprise: Infinity }
const SANDBOX_LIMITS = { free: 10, pro: 40, max: Infinity, team: Infinity, enterprise: Infinity }

export function getKaliLimit(plan) {
  return KALI_LIMITS[plan] || KALI_LIMITS.free
}

export function getSandboxLimit(plan) {
  return SANDBOX_LIMITS[plan] || SANDBOX_LIMITS.free
}

// ── Helper: check if the stored date is from a previous day (UTC) ────────
function isNewDay(lastDate) {
  if (!lastDate) return true
  const now = new Date()
  const last = new Date(lastDate)
  return (
    now.getUTCFullYear() !== last.getUTCFullYear() ||
    now.getUTCMonth() !== last.getUTCMonth() ||
    now.getUTCDate() !== last.getUTCDate()
  )
}

// ── Kali Kal usage ───────────────────────────────────────────────────────
/**
 * Check + increment Kali usage. Returns { allowed, used, limit, remaining }.
 * Resets daily. If not allowed, caller should 403.
 */
export async function checkAndIncrementKali(userId, plan) {
  const user = await User.findOne({ supabase_id: userId })
  if (!user) return { allowed: false, used: 0, limit: 0, remaining: 0, error: 'User not found' }

  const limit = getKaliLimit(plan || user.plan || 'free')

  // Daily reset
  if (isNewDay(user.kali_last_usage_date)) {
    user.kali_usage_count = 0
    user.kali_last_usage_date = new Date()
  }

  if (user.kali_usage_count >= limit) {
    return { allowed: false, used: user.kali_usage_count, limit, remaining: 0 }
  }

  user.kali_usage_count += 1
  user.kali_last_usage_date = new Date()
  await user.save()

  return {
    allowed: true,
    used: user.kali_usage_count,
    limit,
    remaining: Math.max(0, limit - user.kali_usage_count),
  }
}

/**
 * Read-only: get current Kali usage without incrementing.
 */
export async function getKaliUsage(userId, plan) {
  const user = await User.findOne({ supabase_id: userId }).lean()
  if (!user) return { used: 0, limit: getKaliLimit(plan || 'free'), remaining: getKaliLimit(plan || 'free') }

  const limit = getKaliLimit(plan || user.plan || 'free')
  let used = user.kali_usage_count || 0

  // If it's a new day the count is effectively 0
  if (isNewDay(user.kali_last_usage_date)) used = 0

  return { used, limit, remaining: Math.max(0, limit - used) }
}

// ── Sandbox usage ────────────────────────────────────────────────────────
/**
 * Check + increment Sandbox usage. Returns { allowed, used, limit, remaining }.
 * Resets daily.
 */
export async function checkAndIncrementSandbox(userId, plan) {
  const user = await User.findOne({ supabase_id: userId })
  if (!user) return { allowed: false, used: 0, limit: 0, remaining: 0, error: 'User not found' }

  const limit = getSandboxLimit(plan || user.plan || 'free')

  // Daily reset
  if (isNewDay(user.sandbox_last_execution_date)) {
    user.sandbox_executions_count = 0
    user.sandbox_last_execution_date = new Date()
  }

  if (limit !== Infinity && user.sandbox_executions_count >= limit) {
    return { allowed: false, used: user.sandbox_executions_count, limit, remaining: 0 }
  }

  user.sandbox_executions_count += 1
  user.sandbox_last_execution_date = new Date()
  await user.save()

  return {
    allowed: true,
    used: user.sandbox_executions_count,
    limit: limit === Infinity ? 'unlimited' : limit,
    remaining: limit === Infinity ? 'unlimited' : Math.max(0, limit - user.sandbox_executions_count),
  }
}

/**
 * Read-only: get current Sandbox usage without incrementing.
 */
export async function getSandboxUsage(userId, plan) {
  const user = await User.findOne({ supabase_id: userId }).lean()
  if (!user) return { used: 0, limit: getSandboxLimit(plan || 'free'), remaining: getSandboxLimit(plan || 'free') }

  const limit = getSandboxLimit(plan || user.plan || 'free')
  let used = user.sandbox_executions_count || 0

  if (isNewDay(user.sandbox_last_execution_date)) used = 0

  return {
    used,
    limit: limit === Infinity ? 'unlimited' : limit,
    remaining: limit === Infinity ? 'unlimited' : Math.max(0, limit - used),
  }
}
