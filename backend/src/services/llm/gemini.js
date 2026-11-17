import { GoogleGenAI } from '@google/genai'
import { toGeminiParts } from './multimodal.js'
import { getKey } from './keyPool.js'

export async function* streamCompletion({ messages, model = 'gemini-2.5-flash', temperature = 0.7, apiKey: suppliedApiKey }) {
  const apiKey = suppliedApiKey || getKey('gemini')
  if (!apiKey) throw new Error('Gemini API key not configured')
  const genAI = new GoogleGenAI({ apiKey })

  // Gemini SDK does not accept 'system' role in contents[].
  // Extract all system messages and merge into systemInstruction config.
  const systemParts = messages
    .filter(m => m.role === 'system')
    .map(m => m.content)
    .filter(Boolean)

  const systemInstruction = systemParts.length > 0
    ? { parts: [{ text: systemParts.join('\n\n') }] }
    : undefined

  // Only pass user/assistant (model) messages to contents
  // Handle multimodal: if content contains base64 images, split into text + image parts
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: toGeminiParts(m.content) }))

  const config = {
    temperature,
    maxOutputTokens: 4096,
    ...(systemInstruction ? { systemInstruction } : {}),
  }

  const response = await genAI.models.generateContentStream({
    model,
    contents,
    config,
  })

  for await (const chunk of response) {
    const text = chunk.text
    if (text) yield { type: 'token', content: text }
  }

  yield { type: 'done' }
}

export default { streamCompletion }
