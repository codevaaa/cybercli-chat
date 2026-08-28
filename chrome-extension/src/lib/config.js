/**
 * Codeva Extension — Shared config + API client
 * Used by popup, sidepanel, and content scripts.
 */

export const API_BASE = 'https://cybercli-api.onrender.com/api/v1'
export const SITE_URL = 'https://cybermindcli.info'
export const AUTH_URL = `${SITE_URL}/auth/login?from=extension`

// Model routing per task type
export const TASK_MODELS = {
  grammar: 'groq/llama-3.1-8b',      // fast, cheap for grammar
  rewrite: 'gemini/gemini-2.5-flash', // quality rewriting
  explain: 'gemini/gemini-2.5-flash',
  summarize: 'groq/llama-3.3-70b',
  translate: 'gemini/gemini-2.5-flash',
  code: 'codeva-ravan-v1',            // best coder
  research: 'opencode/deepseek-v4-flash',
  chat: 'codeva-ravan-v1',
  security: 'codeva-ravan-v1',
}

/** Get stored auth token */
export async function getToken() {
  const { authToken } = await chrome.storage.local.get('authToken')
  return authToken || null
}

/** Get stored user info */
export async function getUser() {
  const { userInfo } = await chrome.storage.local.get('userInfo')
  return userInfo || null
}

/**
 * Stream a completion from the Codeva API.
 * @param {Object} opts
 * @param {Array} opts.messages
 * @param {string} opts.model
 * @param {Function} opts.onToken - called with each token
 * @param {Function} opts.onDone
 * @param {Function} opts.onError
 */
export async function streamCompletion({ messages, model = 'codeva-ravan-v1', onToken, onInfo, onDone, onError }) {
  const token = await getToken()
  if (!token) {
    onError?.({ auth: true, message: 'Please sign in to Codeva' })
    return
  }

  try {
    const res = await fetch(`${API_BASE}/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages, model, stream: true }),
    })

    if (!res.ok) {
      if (res.status === 401) {
        await chrome.storage.local.remove(['authToken', 'userInfo'])
        onError?.({ auth: true, message: 'Session expired. Please sign in again.' })
        return
      }
      if (res.status === 429) {
        onError?.({ message: 'Rate limit reached. Please wait a moment.' })
        return
      }
      throw new Error(`HTTP ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') { onDone?.(); return }
        try {
          const parsed = JSON.parse(raw)
          if (parsed.type === 'token') onToken?.(parsed.content)
          else if (parsed.type === 'info') onInfo?.(parsed.content)
          else if (parsed.type === 'error') { onError?.({ message: parsed.content }); return }
        } catch {}
      }
    }
    onDone?.()
  } catch (err) {
    onError?.({ message: err.message })
  }
}

/** Non-streaming completion — returns full text */
export async function complete({ messages, model = 'groq/llama-3.1-8b' }) {
  let text = ''
  await streamCompletion({
    messages, model,
    onToken: (t) => { text += t },
  })
  return text
}

/**
 * Offline action queue — if a request fails due to no network, queue it
 * and retry when back online.
 */
export async function queueOfflineAction(action) {
  const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue')
  offlineQueue.push({ ...action, queuedAt: Date.now() })
  await chrome.storage.local.set({ offlineQueue: offlineQueue.slice(-20) }) // keep last 20
}

export async function processOfflineQueue(onResult) {
  const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue')
  if (offlineQueue.length === 0) return
  const remaining = []
  for (const action of offlineQueue) {
    // Only retry actions younger than 1 hour
    if (Date.now() - action.queuedAt > 3600000) continue
    try {
      const result = await complete({ messages: action.messages, model: action.model })
      onResult?.(action, result)
    } catch {
      remaining.push(action) // still failing, keep for next time
    }
  }
  await chrome.storage.local.set({ offlineQueue: remaining })
}

// Auto-process queue when back online
if (typeof window !== 'undefined') {
  window.addEventListener?.('online', () => processOfflineQueue())
}

/** Verify token + fetch user info */
export async function fetchMe() {
  const token = await getToken()
  if (!token) return null
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    })
    if (res.status === 401) {
      // Token genuinely invalid — clear it
      await chrome.storage.local.remove(['authToken', 'userInfo'])
      return null
    }
    if (!res.ok) return { _networkError: true } // keep token, backend may be cold-starting
    return res.json()
  } catch {
    // Network error / timeout — keep token, don't sign out
    return { _networkError: true }
  }
}
