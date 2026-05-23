import { GoogleGenAI } from '@google/genai'

const apiKey = process.env.GEMINI_API_KEY
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null

export async function generateGeminiTTS(text, voiceId = 'ava', speed = 1.0) {
  if (!genAI) {
    throw new Error('Gemini API key not configured')
  }

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: text,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceId === 'orion' ? 'Charon' : 'Aoede',
            },
          },
        },
      },
    })

    if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
      const base64 = response.candidates[0].content.parts[0].inlineData.data
      return Buffer.from(base64, 'base64')
    }

    throw new Error('No audio data received from Gemini TTS')
  } catch (error) {
    console.error('Gemini TTS error:', error.message)
    throw error
  }
}
