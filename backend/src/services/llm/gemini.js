import { GoogleGenAI } from '@google/genai'

const apiKey = process.env.GEMINI_API_KEY
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null

export async function* streamCompletion({ messages, model = 'gemini-2.5-flash', temperature = 0.7 }) {
  if (!genAI) throw new Error('Gemini API key not configured')

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
    .map(m => {
      const role = m.role === 'assistant' ? 'model' : 'user'
      const content = m.content || ''
      
      // Check for base64 images embedded as markdown: ![alt](data:image/png;base64,...)
      const imageRegex = /!\[([^\]]*)\]\((data:image\/(png|jpeg|jpg|gif|webp);base64,([^)]+))\)/g
      const parts = []
      let lastIndex = 0
      let match

      while ((match = imageRegex.exec(content)) !== null) {
        // Add text before the image
        const textBefore = content.slice(lastIndex, match.index).trim()
        if (textBefore) parts.push({ text: textBefore })
        
        // Add the image as inlineData
        const mimeType = `image/${match[3] === 'jpg' ? 'jpeg' : match[3]}`
        const base64Data = match[4]
        parts.push({ inlineData: { mimeType, data: base64Data } })
        
        lastIndex = match.index + match[0].length
      }

      // Add remaining text after last image
      const remaining = content.slice(lastIndex).trim()
      if (remaining) parts.push({ text: remaining })
      
      // If no images found, just use plain text
      if (parts.length === 0) parts.push({ text: content })

      return { role, parts }
    })

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
