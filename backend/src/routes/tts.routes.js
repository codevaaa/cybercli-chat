import { Router } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { generateGeminiTTS } from '../services/tts/gemini-tts.js'

const router = Router()

router.post('/', optionalAuth, async (req, res) => {
  const { text, voice_id, speed = 1.0 } = req.body

  try {
    const validVoices = ['ava', 'nova', 'luna', 'orion', 'echo', 'gemini', 'sol', 'cove', 'breeze']
    const voiceLower = (voice_id || 'sol').toLowerCase()
    
    if (validVoices.includes(voiceLower)) {
      // Map male/deep voices to orion (Charon), others to ava (Aoede)
      const mappedVoice = (voiceLower === 'orion' || voiceLower === 'echo' || voiceLower === 'cove') ? 'orion' : 'ava'
      const audio = await generateGeminiTTS(text, mappedVoice, speed)
      res.setHeader('Content-Type', 'audio/mp3')
      res.send(audio)
    } else {
      res.status(400).json({ error: 'Voice not yet implemented on backend.' })
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/stt', requireAuth, (req, res) => {
  res.json({ text: 'Transcription not yet implemented.' })
})

export default router
