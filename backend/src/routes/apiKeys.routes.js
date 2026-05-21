import { Router } from 'express'
import crypto from 'crypto'
import ApiKey from '../models/ApiKey.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Apply requireAuth to all endpoints in this router
router.use(requireAuth)

// GET /api/v1/api-keys
router.get('/', async (req, res, next) => {
  try {
    const keys = await ApiKey.find({ user_id: req.user.id })
    
    // Redact the middle part of the keys for security
    const redactedKeys = keys.map(k => {
      const keyStr = k.key
      // sk_cyber_ + 48 hex chars
      const prefix = 'sk_cyber_'
      const visibleStart = keyStr.substring(0, 14) // sk_cyber_ + 5 chars
      const visibleEnd = keyStr.substring(keyStr.length - 4)
      return {
        _id: k._id,
        name: k.name,
        key: `${visibleStart}...${visibleEnd}`,
        created_at: k.created_at,
        last_used_at: k.last_used_at,
        is_active: k.is_active,
      }
    })
    
    res.json(redactedKeys)
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/api-keys
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' })
    }

    // Generate cryptographically secure API key
    // Prefix: sk_cyber_ followed by 24 random bytes (48 hex characters)
    const randomHex = crypto.randomBytes(24).toString('hex')
    const fullKey = `sk_cyber_${randomHex}`

    const newKey = new ApiKey({
      user_id: req.user.id,
      name: name.trim(),
      key: fullKey,
      is_active: true
    })

    await newKey.save()

    // Return the full key only once
    res.status(201).json({
      _id: newKey._id,
      name: newKey.name,
      key: fullKey, // Return the full key
      created_at: newKey.created_at,
      is_active: newKey.is_active,
    })
  } catch (err) {
    next(err)
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
    next(err)
  }
})

export default router
