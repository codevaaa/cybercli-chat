// Normalize legacy Markdown attachments and OpenAI content parts without losing image data.
export function normalizeMultimodalContent(content) {
  if (Array.isArray(content)) return content
  if (typeof content !== 'string') return content ?? ''
  const pattern = /!\[[^\]]*\]\((data:image\/(?:png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=\r\n]+)\)/g
  const parts = []
  let cursor = 0
  for (const match of content.matchAll(pattern)) {
    if (match.index > cursor) parts.push({ type: 'text', text: content.slice(cursor, match.index) })
    parts.push({ type: 'image_url', image_url: { url: match[1] } })
    cursor = match.index + match[0].length
  }
  if (!parts.length) return content
  if (cursor < content.length) parts.push({ type: 'text', text: content.slice(cursor) })
  return parts
}

export function contentText(content) {
  const normalized = normalizeMultimodalContent(content)
  return Array.isArray(normalized) ? normalized.filter(part => part.type === 'text').map(part => part.text || '').join('\n') : normalized || ''
}

export function hasImageContent(content) {
  const normalized = normalizeMultimodalContent(content)
  return Array.isArray(normalized) && normalized.some(part => part.type === 'image_url')
}

export function toGeminiParts(content) {
  const normalized = normalizeMultimodalContent(content)
  if (!Array.isArray(normalized)) return [{ text: normalized || '' }]
  return normalized.map(part => {
    if (part.type === 'text') return { text: part.text || '' }
    if (part.type !== 'image_url') throw new Error('Unsupported multimodal content part')
    const match = /^data:(image\/(?:png|jpeg|jpg|gif|webp));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(part.image_url?.url || '')
    if (!match) throw new Error('Gemini image input requires an inline image data URL')
    return { inlineData: { mimeType: match[1].replace('image/jpg', 'image/jpeg'), data: match[2].replace(/[\r\n]/g, '') } }
  })
}
