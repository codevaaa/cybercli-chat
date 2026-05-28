import { Router } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { generateGeminiTTS } from '../services/tts/gemini-tts.js'

const router = Router()

const VALID_VOICES = new Set([
  'gemini_female', 'gemini_male_1', 'gemini_male_2',
  'gemini_flash', 'gemini_pro', 'mistral_large',
  'ava', 'nova', 'luna', 'orion', 'echo', 'sol', 'cove', 'breeze'
])

router.post('/', optionalAuth, async (req, res) => {
  const { text, voice_id = 'gemini_female', speed = 1.0 } = req.body
  const clientApiKey = req.headers['x-gemini-api-key']

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' })
  }

  try {
    const voiceLower = voice_id.toLowerCase()
    const resolvedVoice = VALID_VOICES.has(voiceLower) ? voiceLower : 'gemini_female'

    const audioBuffer = await generateGeminiTTS(text.trim(), resolvedVoice, speed, clientApiKey)

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

