import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import supabase from '../config/supabase.js'
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

// Get currently logged in user info
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
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

export default router
