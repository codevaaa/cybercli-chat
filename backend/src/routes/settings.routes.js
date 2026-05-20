import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import UserSettings from '../models/UserSettings.js'

const router = Router()

// Get user settings (or create defaults if none exist)
router.get('/', requireAuth, async (req, res) => {
  try {
    let settings = await UserSettings.findOne({ user_id: req.user.id })
    if (!settings) {
      settings = new UserSettings({ user_id: req.user.id })
      await settings.save()
    }
    res.json(settings)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update user settings
router.patch('/', requireAuth, async (req, res) => {
  try {
    const settings = await UserSettings.findOneAndUpdate(
      { user_id: req.user.id },
      { $set: req.body },
      { new: true, upsert: true }
    )
    res.json(settings)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
