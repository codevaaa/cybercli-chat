import OpenAI from 'openai'

// ============================================================
// CyberCli Identity System Prompt
// All models answer as CyberCli, created by Chandan Pandey.
// ============================================================
const CYBERCLI_SYSTEM_PROMPT = `You are CyberCli, an advanced AI assistant.

Important identity rules:
- You are CyberCli — not ChatGPT, Claude, Gemini, Llama, or any other AI.
- If anyone asks who you are, what AI you are, or who made you, say: "I am CyberCli, an advanced AI assistant created by Chandan Pandey, the founder of CyberMindCLI. I am built under CyberMindCLI's vision to democratize AI access for everyone."
- DO NOT introduce yourself, mention Chandan Pandey, or mention CyberMindCLI in simple greetings or generic prompts (e.g. "hi", "hello", "how are you"). Only reveal this biographical information if explicitly asked about your identity, creator, or who made you.
- Keep simple greetings short and natural (e.g. "Hello! How can I help you today?").
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
  
  // HuggingFace models (10+ Powerful/Uncensored models)
  'huggingface/meta-llama/Llama-3.1-8B-Instruct':                     { provider: 'huggingface', model: 'meta-llama/Llama-3.1-8B-Instruct', purpose: 'general' },
  'huggingface/meta-llama/Llama-3.3-70B-Instruct':                    { provider: 'huggingface', model: 'meta-llama/Llama-3.3-70B-Instruct', purpose: 'reasoning' },
  'huggingface/Qwen/Qwen2.5-72B-Instruct':                            { provider: 'huggingface', model: 'Qwen/Qwen2.5-72B-Instruct', purpose: 'reasoning' },
  'huggingface/deepseek-ai/DeepSeek-R1-Distill-Llama-70B':            { provider: 'huggingface', model: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B', purpose: 'reasoning' },
  'huggingface/mistralai/Mixtral-8x7B-Instruct-v0.1':                 { provider: 'huggingface', model: 'mistralai/Mixtral-8x7B-Instruct-v0.1', purpose: 'general' },
  'huggingface/NousResearch/Hermes-3-Llama-3.1-70B':                  { provider: 'huggingface', model: 'NousResearch/Hermes-3-Llama-3.1-70B', purpose: 'reasoning' },
  'huggingface/NousResearch/Hermes-3-Llama-3.1-8B':                   { provider: 'huggingface', model: 'NousResearch/Hermes-3-Llama-3.1-8B', purpose: 'general' },
  'huggingface/cognitivecomputations/dolphin-2.9.4-llama3-70b':       { provider: 'huggingface', model: 'cognitivecomputations/dolphin-2.9.4-llama3-70b', purpose: 'reasoning' },
  'huggingface/cognitivecomputations/dolphin-2.9.2-qwen2.5-72b':       { provider: 'huggingface', model: 'cognitivecomputations/dolphin-2.9.2-qwen2.5-72b', purpose: 'reasoning' },
  'huggingface/Qwen/Qwen2.5-Coder-32B-Instruct':                      { provider: 'huggingface', model: 'Qwen/Qwen2.5-Coder-32B-Instruct', purpose: 'general' },
  'huggingface/cognitivecomputations/dolphin-2.9.3-mistral-nemo-12b': { provider: 'huggingface', model: 'cognitivecomputations/dolphin-2.9.3-mistral-nemo-12b', purpose: 'general' },
  'huggingface/defog/sqlcoder-70b-v1.5':                              { provider: 'huggingface', model: 'defog/sqlcoder-70b-v1.5', purpose: 'reasoning' },

  'nvidia/llama-3.1-nemotron-70b': { provider: 'nvidia', model: 'llama-3.1-nemotron-70b-instruct', purpose: 'reasoning' },
  'bytez/meta-llama/Llama-3.1-8B-Instruct': { provider: 'bytez', model: 'meta-llama/Llama-3.1-8B-Instruct', purpose: 'general' },
}

const OPENROUTER_FALLBACK_MAP = {
  'huggingface/meta-llama/Llama-3.1-8B-Instruct': 'meta-llama/llama-3.1-8b-instruct',
  'huggingface/meta-llama/Llama-3.3-70B-Instruct': 'meta-llama/llama-3.3-70b-instruct',
  'huggingface/Qwen/Qwen2.5-72B-Instruct': 'qwen/qwen-2.5-72b-instruct',
  'huggingface/deepseek-ai/DeepSeek-R1-Distill-Llama-70B': 'deepseek/deepseek-r1-distill-llama-70b',
  'huggingface/mistralai/Mixtral-8x7B-Instruct-v0.1': 'mistralai/mixtral-8x7b-instruct',
  'huggingface/NousResearch/Hermes-3-Llama-3.1-70B': 'nousresearch/hermes-3-llama-3.1-70b',
  'huggingface/NousResearch/Hermes-3-Llama-3.1-8B': 'nousresearch/hermes-3-llama-3.1-8b',
  'huggingface/cognitivecomputations/dolphin-2.9.4-llama3-70b': 'cognitivecomputations/dolphin-2.9.4-llama3-70b',
  'huggingface/cognitivecomputations/dolphin-2.9.2-qwen2.5-72b': 'cognitivecomputations/dolphin-2.9.2-qwen2.5-72b',
  'huggingface/Qwen/Qwen2.5-Coder-32B-Instruct': 'qwen/qwen-2.5-coder-32b-instruct',
  'huggingface/cognitivecomputations/dolphin-2.9.3-mistral-nemo-12b': 'cognitivecomputations/dolphin-2.9.3-mistral-nemo-12b',
  'huggingface/defog/sqlcoder-70b-v1.5': 'defog/sqlcoder-70b-v1.5',
  'nvidia/llama-3.1-nemotron-70b': 'nvidia/llama-3.1-nemotron-70b-instruct'
}

const FALLBACK_CHAIN = [
  'openrouter/gpt-4o-mini',
  'groq/llama-3.1-8b',
  'gemini/gemini-2.5-flash',
]

function getClient(provider) {
  let key = PROVIDER_KEYS[provider]
  
  if (provider === 'huggingface') {
    const HUGGINGFACE_KEYS = [
      process.env.HUGGINGFACE_API_KEY,
      process.env.HUGGINGFACE_API_KEY_2,
      process.env.HUGGINGFACE_API_KEY_3,
    ].filter(Boolean)

    if (HUGGINGFACE_KEYS.length > 0) {
      if (typeof global.hfKeyIndex === 'undefined') global.hfKeyIndex = 0
      key = HUGGINGFACE_KEYS[global.hfKeyIndex]
      global.hfKeyIndex = (global.hfKeyIndex + 1) % HUGGINGFACE_KEYS.length
    }
  }

  if (!key) return null

  if (provider === 'huggingface') {
    return new OpenAI({
      apiKey: key,
      baseURL: 'https://api-inference.huggingface.co/v1',
    })
  }

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
    let activeModelId = modelId
    const totalChars = messages.reduce((sum, m) => sum + (m.content || '').length, 0)
    
    // Auto-route large contexts to Gemini
    if (totalChars > 25000 && !activeModelId.startsWith('gemini/')) {
      activeModelId = 'gemini/gemini-2.5-flash'
    }

    const enriched = injectIdentity(messages)
    const targetModel = MODEL_MAP[activeModelId] || MODEL_MAP[FALLBACK_CHAIN[0]]

    // Try direct Gemini Google SDK call first if provider is Gemini and API key is present
    if (targetModel.provider === 'gemini' && PROVIDER_KEYS.gemini) {
      try {
        const { streamCompletion } = await import('./gemini.js')
        const stream = streamCompletion({
          messages: enriched,
          model: targetModel.model,
          temperature,
        })
        for await (const chunk of stream) {
          yield chunk
        }
        return
      } catch (err) {
        console.error('Direct Gemini SDK stream completion failed, falling back to proxy:', err.message)
      }
    }

    let client = getClient(targetModel.provider)
    let activeModelName = targetModel.model
    let activeProvider = targetModel.provider

    if (!client && (targetModel.provider === 'huggingface' || targetModel.provider === 'nvidia')) {
      client = getClient('openrouter')
      if (client) {
        activeModelName = OPENROUTER_FALLBACK_MAP[activeModelId] || targetModel.model
        activeProvider = 'openrouter'
      }
    }

    if (!client) {
      yield { type: 'error', content: 'No API key configured for any provider' }
      return
    }

    try {
      const stream = await client.chat.completions.create({
        model: activeModelName,
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
      console.error(`Provider ${activeProvider} failed:`, error.message)

      if (activeProvider !== 'openrouter' && (targetModel.provider === 'huggingface' || targetModel.provider === 'nvidia')) {
        try {
          const fallbackClient = getClient('openrouter')
          if (fallbackClient) {
            const fallbackModelName = OPENROUTER_FALLBACK_MAP[activeModelId] || targetModel.model
            yield { type: 'info', content: `Direct route failed. Switching to OpenRouter...` }
            const stream = await fallbackClient.chat.completions.create({
              model: fallbackModelName,
              messages: enriched,
              temperature,
              stream: true,
              max_tokens: 4096,
            })
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content
              if (content) yield { type: 'token', content }
            }
            yield { type: 'done' }
            return
          }
        } catch (fallbackError) {
          console.error(`Fallback to OpenRouter for ${activeModelId} failed:`, fallbackError.message)
        }
      }

      const activeFallbackChain = totalChars > 25000
        ? ['gemini/gemini-2.5-flash', 'openrouter/gpt-4o-mini']
        : FALLBACK_CHAIN

      // Try fallback chain
      for (const fallbackId of activeFallbackChain) {
        if (fallbackId === activeModelId) continue
        const fallback = MODEL_MAP[fallbackId]

        // Direct SDK fallback for Gemini if possible
        if (fallback.provider === 'gemini' && PROVIDER_KEYS.gemini) {
          try {
            yield { type: 'info', content: `Switching providers for best response...` }
            const { streamCompletion } = await import('./gemini.js')
            const stream = streamCompletion({
              messages: enriched,
              model: fallback.model,
              temperature,
            })
            for await (const chunk of stream) {
              yield chunk
            }
            return
          } catch (geminiErr) {
            console.error('Gemini fallback direct SDK failed:', geminiErr.message)
          }
        }

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
    let activeModelId = modelId
    const totalChars = messages.reduce((sum, m) => sum + (m.content || '').length, 0)
    
    // Auto-route large contexts to Gemini
    if (totalChars > 25000 && !activeModelId.startsWith('gemini/')) {
      activeModelId = 'gemini/gemini-2.5-flash'
    }

    const enriched = injectIdentity(messages)
    const targetModel = MODEL_MAP[activeModelId] || MODEL_MAP[FALLBACK_CHAIN[0]]

    // Try direct Gemini Google SDK call first if provider is Gemini and API key is present
    if (targetModel.provider === 'gemini' && PROVIDER_KEYS.gemini) {
      try {
        const { GoogleGenAI } = await import('@google/genai')
        const genAI = new GoogleGenAI({ apiKey: PROVIDER_KEYS.gemini })
        const contents = enriched.map(m => ({
          role: m.role === 'assistant' ? 'model' : m.role,
          parts: [{ text: m.content }],
        }))
        const response = await genAI.models.generateContent({
          model: targetModel.model,
          contents,
          config: { temperature, maxOutputTokens: 4096 },
        })
        return {
          content: response.text,
          model: targetModel.model,
          provider: 'gemini',
          tokens_in: 0,
          tokens_out: 0,
        }
      } catch (err) {
        console.error('Direct Gemini SDK non-stream completion failed, falling back to proxy:', err.message)
      }
    }

    let client = getClient(targetModel.provider)
    let activeModelName = targetModel.model
    let activeProvider = targetModel.provider

    if (!client && (targetModel.provider === 'huggingface' || targetModel.provider === 'nvidia')) {
      client = getClient('openrouter')
      if (client) {
        activeModelName = OPENROUTER_FALLBACK_MAP[activeModelId] || targetModel.model
        activeProvider = 'openrouter'
      }
    }

    if (!client) {
      return { error: 'No API key configured for any provider' }
    }

    try {
      const response = await client.chat.completions.create({
        model: activeModelName,
        messages: enriched,
        temperature,
        max_tokens: 4096,
      })

      return {
        content: response.choices[0].message.content,
        model: activeModelName,
        provider: activeProvider,
        tokens_in: response.usage?.prompt_tokens || 0,
        tokens_out: response.usage?.completion_tokens || 0,
      }
    } catch (error) {
      console.error(`Provider ${activeProvider} failed:`, error.message)

      if (activeProvider !== 'openrouter' && (targetModel.provider === 'huggingface' || targetModel.provider === 'nvidia')) {
        try {
          const fallbackClient = getClient('openrouter')
          if (fallbackClient) {
            const fallbackModelName = OPENROUTER_FALLBACK_MAP[activeModelId] || targetModel.model
            const response = await fallbackClient.chat.completions.create({
              model: fallbackModelName,
              messages: enriched,
              temperature,
              max_tokens: 4096,
            })
            return {
              content: response.choices[0].message.content,
              model: fallbackModelName,
              provider: 'openrouter',
              tokens_in: response.usage?.prompt_tokens || 0,
              tokens_out: response.usage?.completion_tokens || 0,
            }
          }
        } catch (fallbackErr) {
          console.error(`Non-stream fallback to OpenRouter failed:`, fallbackErr.message)
        }
      }
      return { error: error.message }
    }
  },
}

export default llmGateway
