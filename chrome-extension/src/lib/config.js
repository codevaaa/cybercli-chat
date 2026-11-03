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
  if (chrome.runtime?.sendMessage) {
    const session = await chrome.runtime.sendMessage({ type: 'GET_SESSION' })
    if (session?.error) throw new Error(session.error)
    return session?.token || null
  }
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
export async function clearExpiredToken(expectedToken) {
  const { authToken } = await chrome.storage.local.get('authToken')
  if (authToken === expectedToken) await chrome.storage.local.remove(['authToken', 'authRefreshToken', 'authExpiresAt', 'userInfo'])
}

async function authenticatedFetch(path, options, initialToken) {
  let token = initialToken === undefined ? await getToken() : initialToken
  const run = value => fetch(`${API_BASE}${path}`, { ...options, headers: { ...options.headers, ...(value ? { Authorization: `Bearer ${value}` } : {}) } })
  let response = await run(token)
  if (response.status === 401 && token) {
    if (chrome.runtime?.sendMessage) {
      const refreshed = await chrome.runtime.sendMessage({ type: 'GET_SESSION', force: true, expectedToken: token })
      if (refreshed?.error) throw new Error(refreshed.error)
      if (refreshed?.token && refreshed.token !== token) { token = refreshed.token; response = await run(token) }
    }
    if (response.status === 401) await clearExpiredToken(token)
  }
  return response
}

export async function apiJSON(path, { method = 'GET', body, signal } = {}) {
  const res = await authenticatedFetch(path, {
    method, headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(120000)]) : AbortSignal.timeout(20000),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    const error = new Error(typeof data.error === 'string' ? data.error : `Request failed (HTTP ${res.status}). Please try again.`)
    error.auth = res.status === 401
    error.status = res.status
    throw error
  }
  return data
}

export async function streamCompletion({ messages, model = 'auto', onToken, onInfo, onDone, onError, signal }) {
  let reader
  try {
    const token = await getToken()
    if (!token) { onError?.({ auth: true, message: 'Please sign in to Codeva' }); return }
    const res = await authenticatedFetch('/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model, stream: true }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(180000)]) : AbortSignal.timeout(180000),
    }, token)
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}))
      onError?.({ auth: res.status === 401, message: res.status === 401 ? 'Session expired. Sign in again.' :
        typeof detail.error === 'string' ? detail.error : res.status === 429 ? 'Rate limit reached. Please wait a moment.' : `Request failed (HTTP ${res.status}). Please try again.` })
      return
    }
    if ((res.headers.get('content-type') || '').includes('application/json')) {
      const data = await res.json()
      if (data.error) { onError?.({ message: String(data.error) }); return }
      const content = data.content || data.choices?.[0]?.message?.content
      if (typeof content !== 'string' || !content) throw new Error('The server returned an empty response. Please try again.')
      onToken?.(content); onDone?.(); return
    }
    reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      if (done && buffer) { lines.push(buffer); buffer = '' }
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const raw = line.slice(5).trim()
        if (raw === '[DONE]') { onDone?.(); return }
        let event
        try { event = JSON.parse(raw) } catch { continue }
        if (event.type === 'token' && typeof event.content === 'string') onToken?.(event.content)
        else if (event.type === 'info') onInfo?.(event.content)
        else if (event.type === 'error') { onError?.({ message: String(event.content || 'Response failed') }); return }
      }
      if (done) break
    }
    throw new Error('The connection ended before the response finished. You can retry.')
  } catch (error) {
    onError?.({ stopped: error.name === 'AbortError', message: error.name === 'AbortError' ? 'Response stopped' : error.message })
  } finally {
    if (reader) { await reader.cancel().catch(() => {}); reader.releaseLock() }
  }
}

/** Non-streaming completion — returns full text */
export async function complete({ messages, model = 'auto' }) {
  let text = ''
  let failure
  await streamCompletion({
    messages, model,
    onToken: (t) => { text += t },
    onError: (err) => { failure = err },
  })
  if (failure) throw new Error(failure.message)
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


/** Verify token + fetch user info */
export async function fetchMe() {
  try {
    if (!await getToken()) return null
    return await apiJSON('/auth/me')
  } catch (error) {
    if (error.auth) return null
    // Network error / timeout — keep token, don't sign out
    return { _networkError: true }
  }
}
