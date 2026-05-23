import OpenAI from 'openai'

// ============================================================
// CyberCli Identity System Prompt
// All models answer as CyberCli, created by Chandan Pandey.
// ============================================================
const CYBERCLI_SYSTEM_PROMPT = `You are CyberCli, an advanced AI assistant developed by Chandan Pandey, founder of CyberMindCLI (cybermindcli.com). 

Important identity rules:
- You are CyberCli — not ChatGPT, Claude, Gemini, Llama, or any other AI.
- If anyone asks who you are, what AI you are, or who made you, say: "I am CyberCli, an advanced AI assistant created by Chandan Pandey, the founder of CyberMindCLI. I am built under CyberMindCLI's vision to democratize AI access for everyone."
- Do not reveal the underlying model provider (OpenAI, Groq, Gemini, etc.) unless specifically asked about technical architecture.
- Chandan Pandey is a cybersecurity researcher and tool creator specializing in offensive and defensive security methodologies. CyberCli was built under his guidance as part of the CyberMindCLI ecosystem.
- You are helpful, direct, technically capable, and professional.`

const PROVIDER_KEYS = {
  openrouter: process.env.OPENROUTER_API_KEY,
  groq: process.env.GROQ_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  cerebras: process.env.CEREBRAS_API_KEY,
  cloudflare: process.env.CLOUDFLARE_API_KEY,
  huggingface: process.env.HUGGINGFACE_API_KEY,
  bytez: process.env.BYTEZ_API_KEY,
  nvidia: process.env.NVIDIA_API_KEY,
}

const BASE_URLS = {
  openrouter: 'https://openrouter.ai/api/v1',
  groq: 'https://api.groq.com/openai/v1',
}

const MODEL_MAP = {
  'openrouter/gpt-4o-mini': { provider: 'openrouter', model: 'openai/gpt-4o-mini', purpose: 'general' },
  'groq/llama-3.1-8b': { provider: 'groq', model: 'llama-3.1-8b-instant', purpose: 'speed' },
  'groq/llama-3.1-70b': { provider: 'groq', model: 'llama-3.1-70b-versatile', purpose: 'reasoning' },
  'gemini/gemini-2.5-flash': { provider: 'gemini', model: 'gemini-2.5-flash-preview-05-20', purpose: 'creative' },
  'gemini/gemini-2.5-pro': { provider: 'gemini', model: 'gemini-2.5-pro-preview-05-06', purpose: 'reasoning' },
  'cerebras/llama-3.1-8b': { provider: 'cerebras', model: 'llama3.1-8b', purpose: 'speed' },
  'cloudflare/@cf/meta/llama-3.1-8b-instruct': { provider: 'cloudflare', model: '@cf/meta/llama-3.1-8b-instruct', purpose: 'general' },
  'huggingface/meta-llama/Llama-3.1-8B-Instruct': { provider: 'huggingface', model: 'meta-llama/Llama-3.1-8B-Instruct', purpose: 'general' },
  'nvidia/llama-3.1-nemotron-70b': { provider: 'nvidia', model: 'llama-3.1-nemotron-70b-instruct', purpose: 'reasoning' },
  'bytez/meta-llama/Llama-3.1-8B-Instruct': { provider: 'bytez', model: 'meta-llama/Llama-3.1-8B-Instruct', purpose: 'general' },
}

const FALLBACK_CHAIN = [
  'openrouter/gpt-4o-mini',
  'groq/llama-3.1-8b',
  'gemini/gemini-2.5-flash',
]

function getClient(provider) {
  const key = PROVIDER_KEYS[provider]
  if (!key) return null

  if (provider === 'openrouter' || provider === 'groq') {
    return new OpenAI({
      apiKey: key,
      baseURL: BASE_URLS[provider],
    })
  }

  if (provider === 'nvidia') {
    return new OpenAI({
      apiKey: key,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    })
  }

  // For other providers, use OpenRouter as unified proxy
  return new OpenAI({
    apiKey: PROVIDER_KEYS.openrouter,
    baseURL: BASE_URLS.openrouter,
  })
}

/**
 * Prepend the CyberCli system prompt to every conversation.
 * If the user has already sent a system prompt, we prepend ours before it.
 */
function injectIdentity(messages) {
  const identityMsg = { role: 'system', content: CYBERCLI_SYSTEM_PROMPT }
  // Remove any existing system messages that conflict, then prepend ours
  const filtered = messages.filter(m => m.role !== 'system' || m._skip_inject)
  return [identityMsg, ...filtered]
}

export const llmGateway = {
  async *complete({ messages, model: modelId = 'auto', temperature = 0.7 }) {
    const enriched = injectIdentity(messages)
    const targetModel = MODEL_MAP[modelId] || MODEL_MAP[FALLBACK_CHAIN[0]]
    const client = getClient(targetModel.provider)

    if (!client) {
      yield { type: 'error', content: 'No API key configured for any provider' }
      return
    }

    try {
      const stream = await client.chat.completions.create({
        model: targetModel.model,
        messages: enriched,
        temperature,
        stream: true,
        max_tokens: 4096,
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          yield { type: 'token', content }
        }
      }

      yield { type: 'done' }
    } catch (error) {
      console.error(`Provider ${targetModel.provider} failed:`, error.message)

      // Try fallback chain
      for (const fallbackId of FALLBACK_CHAIN) {
        if (fallbackId === modelId) continue
        const fallback = MODEL_MAP[fallbackId]
        const fallbackClient = getClient(fallback.provider)
        if (!fallbackClient) continue

        try {
          yield { type: 'info', content: `Switching providers for best response...` }

          const stream = await fallbackClient.chat.completions.create({
            model: fallback.model,
            messages: enriched,
            temperature,
            stream: true,
            max_tokens: 4096,
          })

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              yield { type: 'token', content }
            }
          }

          yield { type: 'done' }
          return
        } catch (fallbackError) {
          console.error(`Fallback ${fallback.provider} failed:`, fallbackError.message)
        }
      }

      yield { type: 'error', content: 'All providers failed. Please try again later.' }
    }
  },

  async completeNonStream({ messages, model: modelId = 'auto', temperature = 0.7 }) {
    const enriched = injectIdentity(messages)
    const targetModel = MODEL_MAP[modelId] || MODEL_MAP[FALLBACK_CHAIN[0]]
    const client = getClient(targetModel.provider)

    if (!client) {
      return { error: 'No API key configured for any provider' }
    }

    try {
      const response = await client.chat.completions.create({
        model: targetModel.model,
        messages: enriched,
        temperature,
        max_tokens: 4096,
      })

      return {
        content: response.choices[0].message.content,
        model: targetModel.model,
        provider: targetModel.provider,
        tokens_in: response.usage?.prompt_tokens || 0,
        tokens_out: response.usage?.completion_tokens || 0,
      }
    } catch (error) {
      console.error(`Provider ${targetModel.provider} failed:`, error.message)
      return { error: error.message }
    }
  },
}

export default llmGateway
