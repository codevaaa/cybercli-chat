import axios from 'axios'
import { supabase } from './supabase.js'
import { useAuthStore } from '../stores/authStore.js'

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname.includes('vercel.app') || hostname.includes('cybercli.app')) {
      return 'https://cybercli-api.onrender.com/api/v1'
    }
  }
  return 'http://localhost:3000/api/v1'
}

export const API_BASE = getApiBase()

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function getFreshToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      localStorage.setItem('sb-access-token', session.access_token)
      return session.access_token
    }
  } catch (err) {
    console.error('[API] Error getting fresh token:', err)
  }
  return localStorage.getItem('sb-access-token')
}

api.interceptors.request.use(async (config) => {
  const token = await getFreshToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sb-access-token')
      try {
        useAuthStore.setState({ user: null, session: null })
      } catch (err) {
        console.error('[API] Failed to clear authStore state:', err)
      }
      if (!window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth/login'
      }
    }
    return Promise.reject(error)
  }
)

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getAuthHeaders() {
  const token = await getFreshToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function isLoggedIn() {
  return !!localStorage.getItem('sb-access-token')
}

// ── Shared SSE reader ──────────────────────────────────────────────────────────
async function readSSEStream(response, callbacks = {}) {
  const { onToken, onInfo, onError, onDone } = callbacks
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HTTP ${response.status}: ${text}`)
  }

  const reader = response.body.getReader()
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
      const data = line.slice(6).trim()
      if (data === '[DONE]') { onDone?.(); return }
      try {
        const parsed = JSON.parse(data)
        if (parsed.type === 'token' && parsed.content) onToken?.(parsed.content)
        else if (parsed.type === 'info') onInfo?.(parsed.content)
        else if (parsed.type === 'error') onError?.(parsed.content)
        else if (parsed.type === 'done') { onDone?.(); return }
      } catch {
        // skip malformed lines
      }
    }
  }
  onDone?.()
}

// ── Guest / Incognito stream (no auth, no thread, uses /completions) ──────────
export const streamChat = async (messages, model = 'auto', onChunk, onInfo) => {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE}/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages, model, stream: true }),
  })
  await readSSEStream(response, {
    onToken: onChunk,
    onInfo: (msg) => onInfo?.(msg),
    onError: (msg) => { throw new Error(msg) },
  })
}

// ── Authenticated stream (thread-based, saves history) ────────────────────────
export const streamThreadChat = async (threadId, payload, callbacks = {}) => {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE}/chat/${threadId}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  await readSSEStream(response, callbacks)
}

// ── Smart stream: picks the right endpoint based on auth state ────────────────
export const smartStream = async ({
  messages,
  model = 'auto',
  threadId = null,
  options = {},
  onToken,
  onInfo,
  onError,
  onDone,
}) => {
  const callbacks = { onToken, onInfo, onError, onDone }

  if (isLoggedIn() && threadId) {
    // Authenticated: use thread-based streaming
    await streamThreadChat(threadId, { messages, model, ...options }, callbacks)
  } else {
    // Guest / incognito: use completions endpoint
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages, model, stream: true }),
    })
    await readSSEStream(response, callbacks)
  }
}

// ── Thread management ─────────────────────────────────────────────────────────
export const createThread = async (title, modelId) => {
  const { data } = await api.post('/chat', { title, model_id: modelId })
  return data
}

export const getThreads = async () => {
  const { data } = await api.get('/chat')
  return data.threads || []
}

export const getMessages = async (threadId) => {
  const { data } = await api.get(`/chat/${threadId}/messages`)
  return data.messages || []
}

export const updateThread = async (threadId, updates) => {
  const { data } = await api.patch(`/chat/${threadId}`, updates)
  return data
}

export const deleteThread = async (threadId) => {
  const { data } = await api.delete(`/chat/${threadId}`)
  return data
}

export const forkThread = async (threadId, messageId) => {
  const { data } = await api.post(`/chat/${threadId}/fork`, { message_id: messageId })
  return data
}

export { isLoggedIn }
export default api
