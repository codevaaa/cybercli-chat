import { GoogleGenAI } from '@google/genai'

const apiKey = process.env.GEMINI_API_KEY
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null

export async function* streamCompletion({ messages, model = 'gemini-2.5-flash-preview-05-20', temperature = 0.7 }) {
  if (!genAI) throw new Error('Gemini API key not configured')

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : m.role,
    parts: [{ text: m.content }],
  }))

  const response = await genAI.models.generateContentStream({
    model,
    contents,
    config: { temperature, maxOutputTokens: 4096 },
  })

  for await (const chunk of response) {
    const text = chunk.text
    if (text) yield { type: 'token', content: text }
  }

  yield { type: 'done' }
}

export default { streamCompletion }
