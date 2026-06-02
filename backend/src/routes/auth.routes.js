import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import supabase from '../config/supabase.js'
import User from '../models/User.js'
import UserSettings from '../models/UserSettings.js'
import Thread from '../models/Thread.js'
import Message from '../models/Message.js'
import ApiKey from '../models/ApiKey.js'
import Folder from '../models/Folder.js'
import Persona from '../models/Persona.js'
import Snippet from '../models/Snippet.js'
import Project from '../models/Project.js'
import Workflow from '../models/Workflow.js'
import ImageUsage from '../models/ImageUsage.js'

const router = Router()

// Client IP, honouring the proxy (Render/Vercel) forwarding header.
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim()
  return req.ip || req.connection?.remoteAddress || ''
}

/**
 * POST /api/v1/auth/sync
 * Called by every client right after login/signup. Upserts the user in our
 * registry, records activity, and returns ban status. A banned account gets
 * a 403 so the client refuses entry.
 */
router.post('/sync', requireAuth, async (req, res, next) => {
  try {
    const { id, email } = req.user
    if (!id) return res.status(401).json({ error: 'Unauthorized' })

    const platform = (req.body?.platform || 'web').toString().slice(0, 20)
    const ip = clientIp(req)

    let user = await User.findOne({ supabase_id: id })

    if (user && user.isBanned()) {
      return res.status(403).json({
        banned: true,
        reason: user.ban_reason || 'This account has been suspended for violating our usage policy.',
      })
    }

    if (!user) {
      // Pull richer profile from Supabase if available.
      let name = ''
      let avatar = ''
      let provider = 'email'
      try {
        const { data } = await supabase.auth.admin.getUserById(id)
        const meta = data?.user?.user_metadata || {}
        name = meta.full_name || meta.name || ''
        avatar = meta.avatar_url || meta.picture || ''
        provider = data?.user?.app_metadata?.provider || 'email'
      } catch { /* best-effort enrichment */ }

      user = await User.create({
        supabase_id: id,
        email: email || '',
        name,
        avatar_url: avatar,
        provider,
        platforms: [platform],
        signup_ip: ip,
        last_ip: ip,
        login_count: 1,
        last_seen_at: new Date(),
      })
    } else {
      const platforms = new Set(user.platforms || [])
      platforms.add(platform)
      user.platforms = Array.from(platforms)
      user.last_ip = ip
      user.last_seen_at = new Date()
      user.login_count = (user.login_count || 0) + 1
      if (email && !user.email) user.email = email
      await user.save()
    }

    res.json({ banned: false, plan: user.plan || 'free', status: user.status })
  } catch (err) {
    next(err)
  }
})

// Get currently logged in user info
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

// Get profile stats (message + thread counts) for the logged-in user
router.get('/me/stats', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id
    const [threadsCreated, messagesSent] = await Promise.all([
      Thread.countDocuments({ user_id: userId }),
      Message.countDocuments({ user_id: userId, role: 'user' }),
    ])
    res.json({
      threadsCreated,
      messagesSent,
      plan: req.user.plan || 'free',
    })
  } catch (err) {
    next(err)
  }
})

// Mock/Token refresh endpoint
router.post('/refresh', (req, res) => {
  res.json({ message: 'Token refresh endpoint' })
})

// Revoke a session
router.delete('/sessions/:id', requireAuth, (req, res) => {
  res.json({ message: 'Session revoked', id: req.params.id })
})

// DELETE /api/v1/auth/delete-account
// Securely deletes user account from Supabase Auth and purges MongoDB records
router.delete('/delete-account', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // 1. Delete from Supabase Auth via Admin Client
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)
    if (authError) {
      console.error('[DeleteAccount] Supabase delete user error:', authError)
      return res.status(500).json({ error: `Auth deletion failed: ${authError.message}` })
    }

    // 2. Wipe all associated data from MongoDB
    await Promise.all([
      UserSettings.deleteOne({ user_id: userId }),
      Thread.deleteMany({ user_id: userId }),
      Message.deleteMany({ user_id: userId }),
      ApiKey.deleteMany({ user_id: userId }),
      Folder.deleteMany({ user_id: userId }),
      Persona.deleteMany({ user_id: userId }),
      Snippet.deleteMany({ user_id: userId }),
      Project.deleteMany({ user_id: userId }),
      Workflow.deleteMany({ user_id: userId }),
      ImageUsage.deleteMany({ identifier: userId }),
    ])

    console.log(`[DeleteAccount] Purged all full-stack records for user: ${userId}`)
    res.json({ success: true, message: 'Account and associated data deleted successfully' })
  } catch (err) {
    next(err)
  }
})

// ── Admin moderation ────────────────────────────────────────────────────────
// Gate: the caller must be an admin. Admin user ids live in ADMIN_USER_IDS
// (comma-separated Supabase ids) in the backend env.
function isAdmin(req) {
  const admins = (process.env.ADMIN_USER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean)
  return req.user?.id && admins.includes(req.user.id)
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin access required' })
  next()
}

// List users (paginated, newest first). Optional ?status= and ?q= filters.
router.get('/admin/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 50)
    const filter = {}
    if (req.query.status) filter.status = String(req.query.status)
    if (req.query.q) {
      const q = String(req.query.q)
      filter.$or = [{ email: new RegExp(q, 'i') }, { name: new RegExp(q, 'i') }, { supabase_id: q }]
    }
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(filter),
    ])
    res.json({ users, total, page, limit })
  } catch (err) { next(err) }
})

// Ban (or suspend) a user.
router.post('/admin/users/:id/ban', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { reason, status } = req.body || {}
    const newStatus = status === 'suspended' ? 'suspended' : 'banned'
    const user = await User.findOneAndUpdate(
      { supabase_id: req.params.id },
      {
        status: newStatus,
        ban_reason: (reason || 'Violated usage policy').toString().slice(0, 500),
        banned_at: new Date(),
        banned_by: req.user.id,
      },
      { new: true },
    )
    if (!user) return res.status(404).json({ error: 'User not found' })

    // Revoke all active sessions immediately via Supabase admin.
    try { await supabase.auth.admin.signOut(req.params.id) } catch { /* best effort */ }

    res.json({ success: true, user })
  } catch (err) { next(err) }
})

// Lift a ban.
router.post('/admin/users/:id/unban', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findOneAndUpdate(
      { supabase_id: req.params.id },
      { status: 'active', ban_reason: '', banned_at: null, banned_by: '' },
      { new: true },
    )
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ success: true, user })
  } catch (err) { next(err) }
})

// Add a moderation flag/strike. Three high-severity strikes auto-ban.
router.post('/admin/users/:id/flag', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { reason, severity = 'low', meta } = req.body || {}
    const user = await User.findOne({ supabase_id: req.params.id })
    if (!user) return res.status(404).json({ error: 'User not found' })

    user.flags.push({ reason: (reason || 'flag').toString().slice(0, 300), severity, meta })
    const weight = severity === 'high' ? 3 : severity === 'medium' ? 2 : 1
    user.strikes = (user.strikes || 0) + weight

    if (user.strikes >= 5 && user.status === 'active') {
      user.status = 'banned'
      user.ban_reason = 'Automatic ban: repeated policy violations'
      user.banned_at = new Date()
      user.banned_by = 'system'
      try { await supabase.auth.admin.signOut(req.params.id) } catch { /* best effort */ }
    }

    await user.save()
    res.json({ success: true, user })
  } catch (err) { next(err) }
})

export default router
