import { Router } from 'express'
import ApiKey from '../models/ApiKey.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Maximum API keys a single user may hold at once.
const MAX_KEYS_PER_USER = 25

// Apply requireAuth to all endpoints in this router
router.use(requireAuth)

/** Shape an ApiKey document into a display-safe JSON payload. */
function toClientShape(doc) {
  const maskedKey = typeof doc.masked === 'function'
    ? doc.masked()
    : `${doc.key_prefix}…${doc.last4}`
  return {
    _id: doc._id,
    name: doc.name,
    key: maskedKey,
    created_at: doc.created_at,
    last_used_at: doc.last_used_at,
    usage_count: doc.usage_count,
    is_active: doc.is_active,
  }
}

// GET /api/v1/api-keys
router.get('/', async (req, res, next) => {
  try {
    const keys = await ApiKey.find({ user_id: req.user.id }).sort({ created_at: -1 })
    res.json(keys.map(toClientShape))
  } catch (err) {
    console.error('[API Keys Route GET Error]:', err)
    res.status(500).json({ error: err.message || 'Failed to fetch API keys' })
  }
})

// POST /api/v1/api-keys
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' })
    }
    if (name.trim().length > 80) {
      return res.status(400).json({ error: 'Name must be 80 characters or fewer' })
    }

    const count = await ApiKey.countDocuments({ user_id: req.user.id })
    if (count >= MAX_KEYS_PER_USER) {
      return res.status(409).json({
        error: `You have reached the maximum of ${MAX_KEYS_PER_USER} API keys. Revoke one before creating another.`,
      })
    }

    const { rawKey, key_hash, key_prefix, last4 } = ApiKey.generate()

    const newKey = await ApiKey.create({
      user_id: req.user.id,
      name: name.trim(),
      key_hash,
      key_prefix,
      last4,
      is_active: true,
    })

    // Return the full plaintext key exactly once.
    res.status(201).json({
      _id: newKey._id,
      name: newKey.name,
      key: rawKey,
      key_prefix: newKey.key_prefix,
      last4: newKey.last4,
      created_at: newKey.created_at,
      is_active: newKey.is_active,
    })
  } catch (err) {
    console.error('[API Keys Route Create Error]:', err)
    res.status(500).json({ error: err.message || 'Failed to create API key due to database error' })
  }
})

// DELETE /api/v1/api-keys/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const deleted = await ApiKey.findOneAndDelete({ _id: id, user_id: req.user.id })

    if (!deleted) {
      return res.status(404).json({ error: 'API key not found' })
    }

    res.json({ message: 'API key revoked successfully' })
  } catch (err) {
    console.error('[API Keys Route DELETE Error]:', err)
    res.status(500).json({ error: err.message || 'Failed to revoke API key' })
  }
})

export default router
