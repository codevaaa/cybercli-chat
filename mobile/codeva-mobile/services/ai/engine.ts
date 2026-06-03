/**
 * Multi-provider AI streaming engine for mobile.
 * Active free providers: Groq (fast Llama) and Gemini (vision + reasoning).
 * Codeva cloud is an optional managed fallback. The OpenAI/Anthropic code
 * paths remain for users who bring their own key but are not exposed in the UI.
 * Streaming via SSE — token-by-token. Vision via image attachments.
 */

export interface MsgAttachment {
  type: 'image'
  base64?: string
  mimeType?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments?: MsgAttachment[]
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onDone: (fullText: string) => void
  onError: (error: string) => void
  onRouting?: (tier: string, model: string) => void
  onFollowups?: (suggestions: string[]) => void
  onResearchProgress?: (event: any) => void
}

export interface ProviderConfig {
  provider: string
  model: string
  apiKey: string
}

export function resolveProvider(
  modelId: string,
  keys: Record<string, string | undefined>
): ProviderConfig | null {
  // PRIORITY 1: If user is logged in, ALWAYS use the Codeva backend.
  // The backend has 15+ Groq/Gemini keys with rotation — users don't need
  // to provide their own keys at all. The backend handles model selection,
  // fallback chains, and rate limiting per plan.
  if (keys.__useBackend) {
    return { provider: 'codeva', model: modelId || 'auto', apiKey: keys.__token || '' }
  }

  // PRIORITY 2: If user explicitly added their own BYOK keys, use them directly.
  if (modelId && modelId.includes('/')) {
    const [provider, ...rest] = modelId.split('/')
    const model = rest.join('/')
    const key = keys[provider]
    if (key) {
      return { provider, model, apiKey: key }
    }
  }
  // Auto with BYOK: prefer Groq (fast), then Gemini (vision)
  if (keys.groq) return { provider: 'groq', model: 'llama-3.3-70b-versatile', apiKey: keys.groq }
  if (keys.gemini) return { provider: 'gemini', model: 'gemini-2.0-flash', apiKey: keys.gemini }

  // PRIORITY 3: Codeva backend as final fallback (even without explicit login token,
  // the completions endpoint accepts anonymous requests at a lower rate).
  return { provider: 'codeva', model: modelId || 'auto', apiKey: '' }
}

/** Does this provider/model support vision (images)? */
export function supportsVision(config: ProviderConfig): boolean {
  return config.provider === 'gemini'
}

export async function streamChat(
  messages: ChatMessage[],
  config: ProviderConfig,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  system?: string
): Promise<void> {
  try {
    switch (config.provider) {
      case 'groq':
        await streamOpenAICompat('https://api.groq.com/openai/v1', config.apiKey, config.model, messages, callbacks, signal, system)
        break
      case 'openai':
        await streamOpenAICompat('https://api.openai.com/v1', config.apiKey, config.model, messages, callbacks, signal, system)
        break
      case 'gemini':
        await streamGemini(config.apiKey, config.model, messages, callbacks, signal, system)
        break
      case 'anthropic':
        await streamAnthropic(config.apiKey, config.model, messages, callbacks, signal, system)
        break
      case 'codeva':
        await streamCodeva(config.apiKey, messages, callbacks, signal, system)
        break
      default:
        callbacks.onError(`Unknown provider: ${config.provider}`)
    }
  } catch (err: any) {
    if (signal?.aborted) return
    callbacks.onError(err.message || 'Stream failed')
  }
}

/** Non-streaming single completion (for Council Mode). */
export async function completeOnce(
  messages: ChatMessage[],
  config: ProviderConfig,
  system?: string
): Promise<string> {
  let full = ''
  await streamChat(messages, config, {
    onToken: (t) => { full += t },
    onDone: () => {},
    onError: (e) => { throw new Error(e) },
  }, undefined, system)
  return full
}

// ── OpenAI-compatible (Groq, OpenAI) — supports vision for gpt-4o ──
async function streamOpenAICompat(
  baseUrl: string, apiKey: string, model: string,
  messages: ChatMessage[], cb: StreamCallbacks, signal?: AbortSignal, system?: string
) {
  const apiMessages: any[] = []
  if (system) apiMessages.push({ role: 'system', content: system })

  for (const m of messages) {
    if (m.attachments && m.attachments.length && m.role === 'user') {
      // Vision format (OpenAI)
      const content: any[] = [{ type: 'text', text: m.content }]
      for (const att of m.attachments) {
        if (att.type === 'image' && att.base64) {
          content.push({ type: 'image_url', image_url: { url: `data:${att.mimeType || 'image/jpeg'};base64,${att.base64}` } })
        }
      }
      apiMessages.push({ role: m.role, content })
    } else {
      apiMessages.push({ role: m.role, content: m.content })
    }
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: apiMessages, temperature: 0.7, stream: true }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`${model}: ${res.status} ${txt.slice(0, 150)}`)
  }
  if (!res.body) throw new Error('No response body')

  let full = ''
  await readSSE(res.body, (data) => {
    if (data === '[DONE]') { cb.onDone(full); return }
    try {
      const j = JSON.parse(data)
      const t = j.choices?.[0]?.delta?.content
      if (t) { full += t; cb.onToken(t) }
    } catch {}
  })
  if (full) cb.onDone(full)
}

// ── Google Gemini — supports vision ──
async function streamGemini(
  apiKey: string, model: string,
  messages: ChatMessage[], cb: StreamCallbacks, signal?: AbortSignal, system?: string
) {
  const contents = messages.filter((m) => m.role !== 'system').map((m) => {
    const parts: any[] = [{ text: m.content }]
    if (m.attachments) {
      for (const att of m.attachments) {
        if (att.type === 'image' && att.base64) {
          parts.push({ inline_data: { mime_type: att.mimeType || 'image/jpeg', data: att.base64 } })
        }
      }
    }
    return { role: m.role === 'assistant' ? 'model' : 'user', parts }
  })

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}), generationConfig: { temperature: 0.7 } }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Gemini: ${res.status} ${txt.slice(0, 150)}`)
  }
  if (!res.body) throw new Error('No response body')

  let full = ''
  await readSSE(res.body, (data) => {
    try {
      const j = JSON.parse(data)
      const t = j.candidates?.[0]?.content?.parts?.[0]?.text
      if (t) { full += t; cb.onToken(t) }
    } catch {}
  })
  cb.onDone(full)
}

// ── Anthropic — supports vision ──
async function streamAnthropic(
  apiKey: string, model: string,
  messages: ChatMessage[], cb: StreamCallbacks, signal?: AbortSignal, system?: string
) {
  const msgs = messages.filter((m) => m.role !== 'system').map((m) => {
    if (m.attachments && m.attachments.length && m.role === 'user') {
      const content: any[] = []
      for (const att of m.attachments) {
        if (att.type === 'image' && att.base64) {
          content.push({ type: 'image', source: { type: 'base64', media_type: att.mimeType || 'image/jpeg', data: att.base64 } })
        }
      }
      content.push({ type: 'text', text: m.content })
      return { role: m.role, content }
    }
    return { role: m.role, content: m.content }
  })

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 4096, temperature: 0.7, stream: true, ...(system ? { system } : {}), messages: msgs }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Anthropic: ${res.status} ${txt.slice(0, 150)}`)
  }
  if (!res.body) throw new Error('No response body')

  let full = ''
  await readSSE(res.body, (data) => {
    try {
      const j = JSON.parse(data)
      if (j.type === 'content_block_delta' && j.delta?.text) { full += j.delta.text; cb.onToken(j.delta.text) }
    } catch {}
  })
  cb.onDone(full)
}

// ── Codeva Cloud ──
async function streamCodeva(
  apiKey: string, messages: ChatMessage[], cb: StreamCallbacks, signal?: AbortSignal, system?: string
) {
  const API_BASE = 'https://cybercli-api.onrender.com/api/v1'
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  const body = {
    messages: system ? [{ role: 'system', content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))] : messages.map((m) => ({ role: m.role, content: m.content })),
    model: 'auto', stream: true, generateFollowups: true,
  }
  const res = await fetch(`${API_BASE}/completions`, { method: 'POST', signal, headers, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`Codeva: ${res.status}`)
  if (!res.body) throw new Error('No response body')

  let full = ''
  await readSSE(res.body, (data) => {
    if (data === '[DONE]') { cb.onDone(full); return }
    try {
      const j = JSON.parse(data)
      if (j.type === 'token' && j.content) { full += j.content; cb.onToken(j.content) }
      else if (j.type === 'chunk' && j.content) { full += j.content; cb.onToken(j.content) }
      else if (j.type === 'routing') { cb.onRouting?.(j.tier, j.model) }
      else if (j.type === 'followups') { cb.onFollowups?.(j.suggestions || []) }
      else if (j.type === 'research_start' || j.type === 'agent_done' || j.type === 'synthesizing' || j.type === 'research_done') {
        cb.onResearchProgress?.(j)
      }
    } catch {}
  })
  if (full) cb.onDone(full)
}

// ── SSE Reader (React Native compatible) ──
async function readSSE(body: ReadableStream<Uint8Array>, onData: (data: string) => void): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('data:')) onData(trimmed.slice(5).trim())
    }
  }
}

/**
 * Deep Research — calls the multi-agent endpoint.
 * Streams progress events (agent completions) + final synthesized response.
 */
export async function streamResearch(
  messages: ChatMessage[],
  token: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const API_BASE = 'https://cybercli-api.onrender.com/api/v1'
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}/completions/research`, {
    method: 'POST', signal, headers,
    body: JSON.stringify({ messages: messages.map(m => ({ role: m.role, content: m.content })) }),
  })
  if (!res.ok) throw new Error(`Research: ${res.status}`)
  if (!res.body) throw new Error('No response body')

  let full = ''
  await readSSE(res.body, (data) => {
    if (data === '[DONE]') { callbacks.onDone(full); return }
    try {
      const j = JSON.parse(data)
      if (j.type === 'token' && j.content) { full += j.content; callbacks.onToken(j.content) }
      else if (j.type === 'research_start' || j.type === 'agent_done' || j.type === 'synthesizing' || j.type === 'research_done') {
        callbacks.onResearchProgress?.(j)
      }
    } catch {}
  })
  if (full && !signal?.aborted) callbacks.onDone(full)
}
