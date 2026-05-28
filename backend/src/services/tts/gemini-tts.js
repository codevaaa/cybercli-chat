import { GoogleGenAI } from '@google/genai'

const apiKey = process.env.GEMINI_API_KEY
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null

// Gemini TTS returns raw 16-bit linear PCM at 24kHz mono.
// Browsers can't play headerless PCM — wrap it in a WAV RIFF container.
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
  wav.writeUInt32LE(16, 16)        // PCM chunk size
  wav.writeUInt16LE(1, 20)         // AudioFormat = PCM
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
  gemini_flash:  'Aoede',   // Bright, warm, friendly (female)
  gemini_pro:    'Kore',    // Clear, analytical, expressive (female)
  mistral_large: 'Charon',  // Deep, confident, authoritative (male)
  // Legacy mappings
  ava:   'Aoede',
  nova:  'Kore',
  luna:  'Aoede',
  orion: 'Charon',
  echo:  'Charon',
  sol:   'Aoede',
  cove:  'Charon',
  breeze:'Kore',
}

export async function generateGeminiTTS(text, voiceId = 'gemini_flash', speed = 1.0) {
  if (!genAI) {
    throw new Error('Gemini API key not configured')
  }

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
        },
      },
    })

    const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData
    if (!inlineData?.data) {
      throw new Error('No audio data received from Gemini TTS')
    }

    const pcmBuffer = Buffer.from(inlineData.data, 'base64')
    // Wrap in WAV container so browsers can decode it
    return createWavBuffer(pcmBuffer)
  } catch (error) {
    console.error('Gemini TTS error:', error.message)
    throw error
  }
}

