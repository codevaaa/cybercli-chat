/**
 * LLM Client — Routes all agent LLM calls through the CodeVaa backend.
 *
 * The backend at /api/v1/agent/complete already has:
 * - All model routing (Ravan, Chanakya, Arjun, etc.)
 * - Key rotation + fallback chains
 * - Identity injection
 * - Plan-gating
 *
 * So agents just call this client with a model name and messages,
 * and the backend handles everything else.
 */
import { BACKEND_API_BASE, AGENT_TIMEOUT_MS } from '../config.js'
import { logger } from '../utils/logger.js'

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'x-cli-session': process.env.CODEVA_CLI_SESSION || 'agent-platform-internal',
}

/**
 * Non-streaming LLM call. Returns { content, tool_calls, finish_reason }.
 */
export async function callLLM({
  model       = 'auto',
  messages,
  temperature = 0.3,
  max_tokens  = 8192,
  tools       = [],
  tool_choice,
  json_mode   = false,
  system,
}) {
  const body = {
    model,
    messages,
    temperature,
    max_tokens,
    stream: false,
  }

  if (tools?.length)   body.tools       = tools
  if (tool_choice)     body.tool_choice = tool_choice
  if (system)          body.system      = system
  if (json_mode)       body.response_format = { type: 'json_object' }

  let lastError
  const maxRetries = 3

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout    = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS)

      const res = await fetch(`${BACKEND_API_BASE}/agent/complete`, {
        method:  'POST',
        headers: DEFAULT_HEADERS,
        body:    JSON.stringify(body),
        signal:  controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`)
        throw new Error(`Backend ${res.status}: ${errText.slice(0, 200)}`)
      }

      const data = await res.json()

      // OpenAI-compatible response format
      const choice    = data.choices?.[0]
      const message   = choice?.message || {}
      const content   = message.content   || ''
      const toolCalls = message.tool_calls || []

      return {
        content,
        tool_calls:    toolCalls,
        finish_reason: choice?.finish_reason || 'stop',
        model:         data.model || model,
        usage:         data.usage || {},
      }

    } catch (err) {
      lastError = err
      if (attempt < maxRetries) {
        logger.warn(`[LLM Client] Attempt ${attempt} failed (${err.message}), retrying in ${attempt * 1000}ms...`)
        await sleep(attempt * 1000)
      }
    }
  }

  logger.error(`[LLM Client] All ${maxRetries} attempts failed: ${lastError.message}`)
  throw lastError
}

/**
 * Streaming LLM call. Yields text tokens.
 */
export async function* callLLMStream({
  model       = 'auto',
  messages,
  temperature = 0.3,
  max_tokens  = 8192,
  system,
}) {
  const body = {
    model,
    messages,
    temperature,
    max_tokens,
    stream: true,
  }
  if (system) body.system = system

  const res = await fetch(`${BACKEND_API_BASE}/agent/complete`, {
    method:  'POST',
    headers: DEFAULT_HEADERS,
    body:    JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Backend streaming ${res.status}`)
  }

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer    = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') return

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) yield content
        } catch {
          // skip malformed SSE
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}
