import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, (req, res) => {
  res.json({
    theme: 'dark',
    accent_color: '#7C3AED',
    density: 'comfortable',
    default_model: 'auto',
    tts_enabled: true,
    tts_voice_id: 'ava',
    tts_speed: 1.0,
    auto_send_voice: false,
    show_chain_of_thought: true,
    show_confidence: true,
    language: 'en',
  })
})

router.patch('/', requireAuth, (req, res) => {
  res.json({ ...req.body, updated: true })
})

export default router
