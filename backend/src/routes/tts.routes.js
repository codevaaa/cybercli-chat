import { Router } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { generateGeminiTTS } from '../services/tts/gemini-tts.js'

const router = Router()

router.post('/', optionalAuth, async (req, res) => {
  const { text, voice_id, speed = 1.0 } = req.body

  try {
    if (voice_id === 'ava' || voice_id === 'orion' || voice_id === 'gemini') {
      const voice = voice_id === 'gemini' ? 'ava' : voice_id
      const audio = await generateGeminiTTS(text, voice, speed)
      res.setHeader('Content-Type', 'audio/mp3')
      res.send(audio)
    } else {
      res.status(400).json({ error: 'Voice not yet implemented on backend. Use Puter.js client-side for ElevenLabs voices.' })
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/stt', requireAuth, (req, res) => {
  res.json({ text: 'Transcription not yet implemented.' })
})

export default router
