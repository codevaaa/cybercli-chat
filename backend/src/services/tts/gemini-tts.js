import { GoogleGenAI } from '@google/genai'

// Gemini TTS returns raw 16-bit linear PCM at 24kHz mono.
// Wraps in a WAV RIFF container.
function createWavBuffer(pcmBuffer) {
  const numChannels = 1
  const sampleRate = 24000
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = pcmBuffer.length
  const wavSize = 44 + dataSize

  const wav = Buffer.alloc(wavSize)

  // RIFF chunk descriptor
  wav.write('RIFF', 0)
  wav.writeUInt32LE(36 + dataSize, 4)
  wav.write('WAVE', 8)

  // fmt sub-chunk
  wav.write('fmt ', 12)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(numChannels, 22)
  wav.writeUInt32LE(sampleRate, 24)
  wav.writeUInt32LE(byteRate, 28)
  wav.writeUInt16LE(blockAlign, 32)
  wav.writeUInt16LE(bitsPerSample, 34)

  // data sub-chunk
  wav.write('data', 36)
  wav.writeUInt32LE(dataSize, 40)
  pcmBuffer.copy(wav, 44)

  return wav
}

// Voice ID → Gemini built-in voice name mapping
const VOICE_MAP = {
  // Female voices (warm, natural)
  gemini_female:   'Aoede',    // Bright, warm (Female) — DEFAULT
  gemini_female_2: 'Kore',     // Firm, precise (Female)
  gemini_female_3: 'Leda',     // Youthful, fresh (Female)
  gemini_female_4: 'Sulafat',  // Warm, resonant (Female)
  gemini_female_5: 'Zephyr',   // Breezy, light (Female)

  // Male voices (deep, authoritative)
  gemini_male_1: 'Charon',   // Dark, atmospheric (Male)
  gemini_male_2: 'Puck',     // Upbeat, lively (Male)
  gemini_male_3: 'Fenrir',   // Bold, powerful (Male)
  gemini_male_4: 'Orus',     // Confident, direct (Male)
  gemini_male_5: 'Iapetus',  // Clear, informative (Male)

  // Mythological character voices
  saraswati: 'Aoede',   // Warm goddess voice
  madhav:    'Charon',  // Deep omniscient voice
  ravan:     'Fenrir',  // Bold authoritative voice
  arjun:     'Puck',    // Swift energetic voice

  // Backward compatibility
  gemini_flash:  'Aoede',
  gemini_pro:    'Charon',
  mistral_large: 'Puck',
  ava:     'Aoede',
  nova:    'Kore',
  luna:    'Leda',
  orion:   'Charon',
  echo:    'Fenrir',
  sol:     'Aoede',
  cove:    'Orus',
  breeze:  'Zephyr',
}

export async function generateGeminiTTS(text, voiceId = 'gemini_flash', speed = 1.0, clientApiKey = null) {
  const activeKey = clientApiKey || process.env.GEMINI_API_KEY
  if (!activeKey) {
    throw new Error('Gemini API key not configured')
  }

  const genAI = new GoogleGenAI({ apiKey: activeKey })
  const voiceName = VOICE_MAP[voiceId] || VOICE_MAP[voiceId.toLowerCase()] || 'Aoede'

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
          // Gemini 2.5 flash TTS supports speaking rate
          ...(speed !== 1.0 ? { speakingRate: Math.max(0.25, Math.min(4.0, speed)) } : {}),
        },
      },
    })

    const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData
    if (!inlineData?.data) {
      throw new Error('No audio data received from Gemini TTS')
    }

    const pcmBuffer = Buffer.from(inlineData.data, 'base64')
    return createWavBuffer(pcmBuffer)
  } catch (error) {
    console.error('Gemini TTS error:', error.message)
    throw error
  }
}
