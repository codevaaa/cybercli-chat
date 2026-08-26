import { Router } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { generateGeminiTTS } from '../services/tts/gemini-tts.js'

const router = Router()

const VALID_VOICES = new Set([
  'gemini_female', 'gemini_female_2', 'gemini_female_3', 'gemini_female_4', 'gemini_female_5',
  'gemini_male_1', 'gemini_male_2', 'gemini_male_3', 'gemini_male_4', 'gemini_male_5',
  'saraswati', 'lakshmi', 'madhav', 'ravan', 'arjun',
  'gemini_flash', 'gemini_pro', 'mistral_large',
  'ava', 'nova', 'luna', 'orion', 'echo', 'sol', 'cove', 'breeze'
])

router.post('/', optionalAuth, async (req, res) => {
  const { text, voice_id = 'gemini_female', speed = 1.0 } = req.body
  const clientApiKey = req.headers['x-gemini-api-key']

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' })
  }

  // Check if Gemini key is available at all (server or client)
  const hasKey = !!(clientApiKey || process.env.GEMINI_API_KEY)
  if (!hasKey) {
    // Return 503 with a clear code so frontend can fall back to browser TTS
    return res.status(503).json({
      error: 'TTS_KEY_UNAVAILABLE',
      message: 'Gemini TTS key not configured — use browser TTS fallback',
      fallback: 'browser'
    })
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
    // On Gemini API failure, also signal browser fallback
    if (error.message?.includes('key not configured') || error.message?.includes('API_KEY') || error.status === 403 || error.status === 401) {
      return res.status(503).json({
        error: 'TTS_KEY_UNAVAILABLE',
        message: error.message,
        fallback: 'browser'
      })
    }
    res.status(500).json({ error: error.message })
  }
})

router.post('/stt', requireAuth, async (req, res) => {
  try {
    const { audio_base64, mime_type = 'audio/webm' } = req.body
    if (!audio_base64) {
      return res.status(400).json({ error: 'audio_base64 is required' })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return res.status(503).json({ error: 'Gemini API key not configured for STT' })
    }

    const { GoogleGenAI } = await import('@google/genai')
    const genAI = new GoogleGenAI({ apiKey })

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        parts: [
          { inlineData: { mimeType: mime_type, data: audio_base64 } },
          { text: 'Transcribe this audio accurately. Return ONLY the transcribed text, nothing else. If the audio is in a non-English language, transcribe it in that language.' }
        ]
      }],
    })

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || ''
    res.json({ text: text.trim(), language: 'auto' })
  } catch (error) {
    console.error('STT error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

export default router

