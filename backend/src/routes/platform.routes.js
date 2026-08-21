/**
 * Platform Routes — Backend endpoints for the CodeVaa Agent Platform.
 */
import { Router } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import PlatformSettings from '../models/PlatformSettings.js'
import PlatformFeedback from '../models/PlatformFeedback.js'
import PlatformConversation from '../models/PlatformConversation.js'

const PLATFORM_URL = process.env.CODEVA_PLATFORM_URL || 'https://codeva-agent-platform.onrender.com'

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

// ═══════════════════════════════════════════════════════════════════════════
// FEEDBACK ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/platform/feedback
 * Submit user feedback (bug report, feature request, etc.)
 */
router.post('/feedback', requireAuth, async (req, res) => {
  try {
    const { type, description, steps, attachLogs } = req.body
    if (!type || !description) {
      return res.status(400).json({ error: 'type and description are required' })
    }
    const feedback = await PlatformFeedback.create({
      user_id:    req.user.id,
      user_email: req.user.email || '',
      type,
      description,
      steps:      steps || '',
      attachLogs: attachLogs || false,
      metadata:   { userAgent: req.headers['user-agent'], origin: req.headers.origin },
    })
    res.status(201).json({ success: true, id: feedback._id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/v1/platform/feedback
 * Get user's own feedback history.
 */
router.get('/feedback', requireAuth, async (req, res) => {
  try {
    const feedbacks = await PlatformFeedback.find({ user_id: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
    res.json({ feedbacks })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATION ENDPOINTS (real history persistence)
// ═══════════════════════════════════════════════════════════════════════════

/** GET /api/v1/platform/conversations — list user's conversations */
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const { status, project, limit = 50 } = req.query
    const filter = { user_id: req.user.id }
    if (status) filter.status = status
    if (project) filter.project = project

    const conversations = await PlatformConversation.find(filter)
      .sort({ pinned: -1, updatedAt: -1 })
      .limit(parseInt(limit))
      .select('-messages') // Don't send all messages in list view
    res.json({ conversations })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** POST /api/v1/platform/conversations — create new conversation */
router.post('/conversations', requireAuth, async (req, res) => {
  try {
    const { title, model, autonomous, project, session_id } = req.body
    const conv = await PlatformConversation.create({
      user_id:    req.user.id,
      title:      title || 'New Session',
      model:      model || 'auto',
      autonomous: autonomous || false,
      project:    project || '',
      session_id: session_id || '',
    })
    res.status(201).json(conv)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** GET /api/v1/platform/conversations/:id — get full conversation with messages */
router.get('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const conv = await PlatformConversation.findOne({ _id: req.params.id, user_id: req.user.id })
    if (!conv) return res.status(404).json({ error: 'Conversation not found' })
    res.json(conv)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** POST /api/v1/platform/conversations/:id/messages — add message to conversation */
router.post('/conversations/:id/messages', requireAuth, async (req, res) => {
  try {
    const { role, content, model, agentType } = req.body
    if (!role || !content) return res.status(400).json({ error: 'role and content required' })

    const conv = await PlatformConversation.findOne({ _id: req.params.id, user_id: req.user.id })
    if (!conv) return res.status(404).json({ error: 'Conversation not found' })

    conv.messages.push({ role, content, model: model || '', agentType: agentType || '' })

    // Auto-generate title from first user message
    if (conv.title === 'New Session' && role === 'user') {
      conv.title = content.slice(0, 60) + (content.length > 60 ? '...' : '')
    }

    await conv.save()
    res.json({ success: true, messageCount: conv.messages.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** PATCH /api/v1/platform/conversations/:id — update conversation metadata */
router.patch('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const updates = {}
    const allowed = ['title', 'status', 'pinned', 'project', 'task_stats', 'model', 'autonomous']
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }
    const conv = await PlatformConversation.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { $set: updates },
      { new: true }
    )
    if (!conv) return res.status(404).json({ error: 'Conversation not found' })
    res.json(conv)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** DELETE /api/v1/platform/conversations/:id — delete conversation */
router.delete('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const result = await PlatformConversation.deleteOne({ _id: req.params.id, user_id: req.user.id })
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Conversation not found' })
    res.json({ success: true })
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
