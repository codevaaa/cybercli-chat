const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'a', 'blockquote']

export function sanitizeHtml(raw) {
  if (!raw) return ''

  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export function stripHtml(raw) {
  if (!raw) return ''
  return raw.replace(/<[^>]*>/g, '')
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input

  const sanitized = input
    .replace(/[<>]/g, '')
    .trim()

  return sanitized.slice(0, 10000)
}
