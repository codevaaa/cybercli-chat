import { Router } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { generateGeminiTTS } from '../services/tts/gemini-tts.js'

const router = Router()

const VALID_VOICES = new Set([
  'gemini_flash', 'gemini_pro', 'mistral_large',
  'ava', 'nova', 'luna', 'orion', 'echo', 'sol', 'cove', 'breeze'
])

router.post('/', optionalAuth, async (req, res) => {
  const { text, voice_id = 'gemini_flash', speed = 1.0 } = req.body

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' })
  }

  try {
    const voiceLower = voice_id.toLowerCase()
    const resolvedVoice = VALID_VOICES.has(voiceLower) ? voiceLower : 'gemini_flash'

    const audioBuffer = await generateGeminiTTS(text.trim(), resolvedVoice, speed)

    // Send WAV — browsers can decode WAV natively without any codec
    res.setHeader('Content-Type', 'audio/wav')
    res.setHeader('Content-Length', audioBuffer.length)
    res.send(audioBuffer)
  } catch (error) {
    console.error('TTS route error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

router.post('/stt', requireAuth, (req, res) => {
  res.json({ text: 'Transcription not yet implemented.' })
})

export default router

