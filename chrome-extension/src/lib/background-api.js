import { API_BASE } from './config.js'

const MAX_AUTH_TOKEN_LENGTH = 16_384
const MAX_PROFILE_VALUE_LENGTH = 512

export function isTrustedAuthSender(sender) {
  try {
    return ['https://cybermindcli.info', 'https://www.cybermindcli.info'].includes(new URL(sender.url).origin)
  } catch { return false }
}

/**
 * Normalise the small auth payload accepted from the Codeva web application.
 * The page is the source of truth for its own Supabase session, but the
 * extension must never persist arbitrary objects or an unbounded token passed
 * through a runtime message.
 */
export function normalizeAuthSync({ token, user, refreshToken, expiresAt } = {}) {
  if (token === null) return { token: null, user: null }
  if (typeof token !== 'string') return null

  const normalizedToken = token.trim()
  if (!normalizedToken || normalizedToken.length > MAX_AUTH_TOKEN_LENGTH) return null

  const normalizedUser = {}
  if (user && typeof user === 'object' && !Array.isArray(user)) {
    for (const key of ['id', 'email', 'name']) {
      if (typeof user[key] === 'string') {
        normalizedUser[key] = user[key].trim().slice(0, MAX_PROFILE_VALUE_LENGTH)
      }
    }
  }

  return { token: normalizedToken, user: Object.keys(normalizedUser).length ? normalizedUser : null,
    ...(typeof refreshToken === 'string' && refreshToken.length <= MAX_AUTH_TOKEN_LENGTH && refreshToken.trim() ? { refreshToken: refreshToken.trim() } : {}),
    ...(Number.isFinite(expiresAt) && expiresAt > 0 ? { expiresAt } : {}) }
}

/** Read the supported non-streaming completion response shapes. */
export function completionTextFromBody(body) {
  try {
    const parsed = JSON.parse(body)
    return typeof parsed?.content === 'string'
      ? parsed.content
      : typeof parsed?.choices?.[0]?.message?.content === 'string'
        ? parsed.choices[0].message.content
        : ''
  } catch {
    return ''
  }
}

export async function requestBackend({ endpoint, body }, token) {
  const paths = new Set(['/completions', '/completions/grammar', '/agents'])
  if (!paths.has(endpoint)) throw new Error('Unsupported API endpoint')
  if (endpoint !== '/agents' && !token) return { status: 401, body: JSON.stringify({ error: 'Please sign in' }), contentType: 'application/json' }
  const payload = endpoint === '/completions' ? { ...body, stream: false } : body
  if (JSON.stringify(payload || {}).length > 8_000_000) throw new Error('Request is too large')
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: endpoint === '/agents' ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(endpoint === '/agents' ? {} : { body: JSON.stringify(payload) }),
    signal: AbortSignal.timeout(120000),
  })
  return { status: res.status, body: await res.text(), contentType: res.headers.get('content-type') || 'application/json' }
}
