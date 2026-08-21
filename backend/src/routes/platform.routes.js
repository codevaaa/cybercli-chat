/**
 * Platform Routes — Backend endpoints for the CodeVaa Agent Platform.
 */
import { Router } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import PlatformSettings from '../models/PlatformSettings.js'

const PLATFORM_URL = process.env.CODEVA_PLATFORM_URL || 'http://localhost:4000'

const router = Router()

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS ENDPOINTS (persist to MongoDB)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/platform/settings
 * Get the authenticated user's platform settings.
 */
router.get('/settings', requireAuth, async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne({ user_id: req.user.id })
    if (!settings) {
      // Create default settings for new user
      settings = await PlatformSettings.create({ user_id: req.user.id })
    }
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * PUT /api/v1/platform/settings
 * Update the authenticated user's platform settings (partial update).
 */
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const updates = { ...req.body }
    delete updates._id
    delete updates.user_id
    delete updates.__v
    delete updates.createdAt
    delete updates.updatedAt

    const settings = await PlatformSettings.findOneAndUpdate(
      { user_id: req.user.id },
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * DELETE /api/v1/platform/settings
 * Reset all settings to defaults.
 */
router.delete('/settings', requireAuth, async (req, res) => {
  try {
    await PlatformSettings.deleteOne({ user_id: req.user.id })
    const settings = await PlatformSettings.create({ user_id: req.user.id })
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * Proxy helper — forwards request to agent platform server.
 */
async function proxyToPlatform(req, res, next) {
  const target = `${PLATFORM_URL}${req.path === '/' ? '' : req.path}`

  try {
    const body = req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    const fetchRes = await fetch(target, {
      method:  req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id':    req.user?.id  || 'anonymous',
        'x-user-plan':  req.user?.plan || 'free',
      },
      body,
      signal: AbortSignal.timeout(120_000),
    })

    const data = await fetchRes.json().catch(() => ({ error: 'Invalid response from platform' }))
    res.status(fetchRes.status).json(data)
  } catch (err) {
    if (err.name === 'TimeoutError' || err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error:   'Agent platform unavailable',
        message: 'Start it with: codeva start',
        url:     PLATFORM_URL,
      })
    }
    next(err)
  }
}

// Platform health check (public)
router.get('/health', (req, res, next) => proxyToPlatform(req, res, next))

// Platform status (auth required)
router.get('/status', optionalAuth, (req, res, next) => proxyToPlatform(req, res, next))

// Run a goal (auth required)
router.post('/run', requireAuth, async (req, res, next) => {
  const plan = req.user?.plan || 'free'

  // Plan-based parallel agent limits
  const planLimits = { free: 2, pro: 6, max: 12 }
  const maxParallel = planLimits[plan] || 2

  // Inject limit into body
  req.body = { ...req.body, maxParallel: Math.min(req.body.maxParallel || 4, maxParallel) }

  proxyToPlatform(req, res, next)
})

// Session management (auth required)
router.get('/sessions',      requireAuth, (req, res, next) => proxyToPlatform(req, res, next))
router.get('/sessions/:id',  requireAuth, (req, res, next) => proxyToPlatform(req, res, next))
router.delete('/sessions/:id', requireAuth, (req, res, next) => proxyToPlatform(req, res, next))

// Task graph for a session
router.get('/sessions/:id/graph',  requireAuth, (req, res, next) => proxyToPlatform(req, res, next))
router.get('/sessions/:id/memory', requireAuth, (req, res, next) => proxyToPlatform(req, res, next))

// Skills management
router.get('/skills',  optionalAuth, (req, res, next) => proxyToPlatform(req, res, next))
router.post('/skills', requireAuth,  (req, res, next) => proxyToPlatform(req, res, next))

// Agent types
router.get('/agents',      optionalAuth, (req, res, next) => proxyToPlatform(req, res, next))
router.get('/agents/:type', optionalAuth, (req, res, next) => proxyToPlatform(req, res, next))

export default router
