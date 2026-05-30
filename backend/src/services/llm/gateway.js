import OpenAI from 'openai'
import { getPlan, pickModelForPlan, planAllowsModel, tierOf } from '../../config/plans.js'

// ============================================================
// Codeva Identity System Prompt
// All models answer as Codeva, created by Chandan Pandey.
// ============================================================
const CYBERCLI_SYSTEM_PROMPT = `You are Codeva, an advanced AI assistant.

Important identity rules:
- You are Codeva — not ChatGPT, Claude, Gemini, Llama, or any other AI.
- If anyone asks who you are, what AI you are, or who made you, say: "I am Codeva, an advanced AI assistant created by Chandan Pandey, the founder of Codeva. I am built under Codeva's vision to democratize AI access for everyone."
- DO NOT introduce yourself, mention Chandan Pandey, or mention Codeva in simple greetings or generic prompts (e.g. "hi", "hello", "how are you"). Only reveal this biographical information if explicitly asked about your identity, creator, or who made you.
- Keep simple greetings short and natural (e.g. "Hello! How can I help you today?").
- Do not reveal the underlying model provider (OpenAI, Groq, Gemini, etc.) unless specifically asked about technical architecture.
- Chandan Pandey is a cybersecurity researcher and tool creator specializing in offensive and defensive security methodologies. Codeva was built under his guidance as part of the Codeva ecosystem.
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
  mistral: process.env.MISTRAL_API_KEY,
  opencode: process.env.OPENCODE_API_KEY,
  apifreellm: process.env.APIFREELLM_API_KEY,
}

const BASE_URLS = {
  openrouter: 'https://openrouter.ai/api/v1',
  groq: 'https://api.groq.com/openai/v1',
  mistral: 'https://api.mistral.ai/v1',
  opencode: 'https://opencode.ai/zen/v1',
  apifreellm: 'https://apifreellm.com/api/v1',
}

const MODEL_MAP = {
  'openrouter/gpt-4o-mini': { provider: 'openrouter', model: 'openai/gpt-4o-mini', purpose: 'general' },
  'groq/llama-3.1-8b': { provider: 'groq', model: 'llama-3.1-8b-instant', purpose: 'speed' },
  'groq/llama-3.1-70b': { provider: 'groq', model: 'llama-3.1-70b-versatile', purpose: 'reasoning' },
  'groq/llama-3.3-70b': { provider: 'groq', model: 'llama-3.3-70b-versatile', purpose: 'reasoning' },
  'gemini/gemini-2.5-flash': { provider: 'gemini', model: 'gemini-2.5-flash-preview-05-20', purpose: 'creative' },
  'gemini/gemini-2.5-pro': { provider: 'gemini', model: 'gemini-2.5-pro-preview-05-06', purpose: 'reasoning' },
  'cerebras/llama-3.1-8b': { provider: 'cerebras', model: 'llama3.1-8b', purpose: 'speed' },
  'cloudflare/@cf/meta/llama-3.1-8b-instruct': { provider: 'cloudflare', model: '@cf/meta/llama-3.1-8b-instruct', purpose: 'general' },
  'openrouter/moonshotai/moonshot-v1-8k': { provider: 'openrouter', model: 'moonshotai/moonshot-v1-8k', purpose: 'general' },
  'mistral/mistral-large-latest': { provider: 'mistral', model: 'mistral-large-latest', purpose: 'reasoning' },

  // OpenCode AI models
  'opencode/deepseek-v4-pro': { provider: 'opencode', model: 'deepseek-v4-pro', purpose: 'reasoning' },
  'opencode/deepseek-v4-flash': { provider: 'opencode', model: 'deepseek-v4-flash', purpose: 'speed' },
  'opencode/kimi-k2.5': { provider: 'opencode', model: 'kimi-k2.5', purpose: 'reasoning' },
  'opencode/qwen3.7-max': { provider: 'opencode', model: 'qwen3.7-max', purpose: 'reasoning' },
  'opencode/minimax-m2.5': { provider: 'opencode', model: 'minimax-m2.5', purpose: 'reasoning' },

  // ApiFree LLM models
  'apifreellm/gpt-4o': { provider: 'apifreellm', model: 'gpt-4o', purpose: 'general' },
  'apifreellm/claude-3.5-sonnet': { provider: 'apifreellm', model: 'claude-3.5-sonnet', purpose: 'reasoning' },
  'apifreellm/llama-3-70b': { provider: 'apifreellm', model: 'llama-3-70b', purpose: 'reasoning' },

  // Legacy/Backwards-compatible mappings for Puter.js models
  'puter/claude-opus-4-7': { provider: 'opencode', model: 'deepseek-v4-pro', purpose: 'reasoning' },
  'puter/gpt-5.5': { provider: 'apifreellm', model: 'gpt-4o', purpose: 'general' },
  'puter/deepseek/deepseek-r1-0528': { provider: 'huggingface', model: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B', purpose: 'reasoning' },
  'puter/claude-sonnet-4-6': { provider: 'groq', model: 'llama-3.1-8b-instant', purpose: 'speed' },
  'puter/gpt-4o': { provider: 'openrouter', model: 'openai/gpt-4o-mini', purpose: 'general' },
  'puter/google/gemini-2.5-pro': { provider: 'gemini', model: 'gemini-2.5-pro-preview-05-06', purpose: 'reasoning' },
  'puter/xai/grok-2': { provider: 'opencode', model: 'kimi-k2.5', purpose: 'reasoning' },
  'puter/mistral/mistral-large-latest': { provider: 'mistral', model: 'mistral-large-latest', purpose: 'reasoning' },
  'puter/meta-llama/llama-3.1-70b': { provider: 'groq', model: 'llama-3.1-70b-versatile', purpose: 'reasoning' },
  'puter/qwen/qwen2.5-72b-instruct': { provider: 'huggingface', model: 'Qwen/Qwen2.5-72B-Instruct', purpose: 'reasoning' },
  'puter/openai/gpt-5.3-codex': { provider: 'huggingface', model: 'Qwen/Qwen2.5-Coder-32B-Instruct', purpose: 'general' },
  'puter/perplexity/sonar-deep-research': { provider: 'opencode', model: 'deepseek-v4-flash', purpose: 'speed' },
  'puter/perplexity/sonar-reasoning-pro': { provider: 'opencode', model: 'deepseek-v4-flash', purpose: 'speed' },
  'puter/perplexity/sonar-pro': { provider: 'opencode', model: 'deepseek-v4-flash', purpose: 'speed' },
  
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
  'huggingface/thecnical/cybermindcli':                               { provider: 'huggingface', model: 'thecnical/cybermindcli', purpose: 'reasoning' },

  'nvidia/llama-3.1-nemotron-70b': { provider: 'nvidia', model: 'meta/llama-3.3-70b-instruct', purpose: 'reasoning' },
  'bytez/meta-llama/Llama-3.1-8B-Instruct': { provider: 'bytez', model: 'meta-llama/Llama-3.1-8B-Instruct', purpose: 'general' },

  // ── Powerful FREE OpenRouter models (:free tier) ──
  // These give free-plan users access to frontier-class open models at $0.
  // All routed through OpenRouter's unified endpoint.
  'openrouter/qwen3-coder-free': { provider: 'openrouter', model: 'qwen/qwen3-coder:free', purpose: 'general' },
  'openrouter/qwen3-next-80b-free': { provider: 'openrouter', model: 'qwen/qwen3-next-80b-a3b-instruct:free', purpose: 'reasoning' },
  'openrouter/deepseek-v4-flash-free': { provider: 'openrouter', model: 'deepseek/deepseek-v4-flash:free', purpose: 'speed' },
  'openrouter/kimi-k2-free': { provider: 'openrouter', model: 'moonshotai/kimi-k2.6:free', purpose: 'reasoning' },
  'openrouter/minimax-m2-free': { provider: 'openrouter', model: 'minimax/minimax-m2.5:free', purpose: 'reasoning' },
  'openrouter/gpt-oss-20b-free': { provider: 'openrouter', model: 'openai/gpt-oss-20b:free', purpose: 'general' },
  'openrouter/gemma-4-31b-free': { provider: 'openrouter', model: 'google/gemma-4-31b-it:free', purpose: 'general' },
  'openrouter/gemma-4-26b-free': { provider: 'openrouter', model: 'google/gemma-4-26b-a4b-it:free', purpose: 'general' },
  'openrouter/nemotron-nano-free': { provider: 'openrouter', model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', purpose: 'reasoning' },
  'openrouter/dolphin-venice-free': { provider: 'openrouter', model: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', purpose: 'general' },
  'openrouter/laguna-m-free': { provider: 'openrouter', model: 'poolside/laguna-m.1:free', purpose: 'reasoning' },
  'openrouter/laguna-xs-free': { provider: 'openrouter', model: 'poolside/laguna-xs.2:free', purpose: 'speed' },
  'openrouter/lfm-thinking-free': { provider: 'openrouter', model: 'liquid/lfm-2.5-1.2b-thinking:free', purpose: 'speed' },
  'openrouter/owl-alpha': { provider: 'openrouter', model: 'openrouter/owl-alpha', purpose: 'reasoning' },

  // ── More powerful models via direct providers (fast, free tiers) ──
  'groq/qwen-2.5-coder-32b': { provider: 'groq', model: 'qwen-2.5-coder-32b', purpose: 'general' },
  'groq/deepseek-r1-distill-70b': { provider: 'groq', model: 'deepseek-r1-distill-llama-70b', purpose: 'reasoning' },
  'cerebras/llama-3.3-70b': { provider: 'cerebras', model: 'llama-3.3-70b', purpose: 'reasoning' },
  'cerebras/qwen-3-32b': { provider: 'cerebras', model: 'qwen-3-32b', purpose: 'general' },
  'mistral/codestral-latest': { provider: 'mistral', model: 'codestral-latest', purpose: 'general' },
  'nvidia/qwen-2.5-coder-32b': { provider: 'nvidia', model: 'qwen/qwen2.5-coder-32b-instruct', purpose: 'general' },
  'nvidia/deepseek-r1': { provider: 'nvidia', model: 'deepseek-ai/deepseek-r1', purpose: 'reasoning' },
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
  'huggingface/thecnical/cybermindcli': 'deepseek/deepseek-r1-distill-llama-70b',
  'nvidia/llama-3.1-nemotron-70b': 'nvidia/llama-3.1-nemotron-70b-instruct',
  'gemini/gemini-2.5-flash': 'google/gemini-2.5-flash',
  'gemini/gemini-2.5-pro': 'google/gemini-2.5-pro'
}

const FALLBACK_CHAIN = [
  'openrouter/gpt-4o-mini',
  'groq/llama-3.1-8b',
  'gemini/gemini-2.5-flash',
]

/**
 * Heuristic task → tier classifier. Cheap models for simple tasks, stronger
 * ones for reasoning-heavy work. Lets `auto` route intelligently while staying
 * within the user's plan ceiling.
 */
export function classifyTier(text = '') {
  const t = String(text).toLowerCase()
  const len = t.length
  const reasoningSignals = /(architect|refactor|design|debug|why|analyz|optimi[sz]e|security|algorithm|complex|migrat|trade-?off|review)/
  const codeBlocks = (t.match(/```/g) || []).length / 2
  if (len > 1500 || codeBlocks >= 2 || reasoningSignals.test(t)) return 'reasoning'
  if (len > 400 || codeBlocks >= 1) return 'balanced'
  return 'fast'
}

/**
 * Resolve the model id to actually use, given the requested id and the user's
 * plan. If the user passes 'auto', we classify the task and pick the best model
 * their plan allows. If they request a specific model their plan can't access,
 * we transparently downgrade to the strongest allowed tier.
 */
export function resolveModelForPlan(requestedId, planName, lastUserText = '') {
  const plan = getPlan(planName)
  if (!requestedId || requestedId === 'auto') {
    const tier = classifyTier(lastUserText)
    return pickModelForPlan(plan.id, tier, Object.keys(MODEL_MAP))
  }
  if (MODEL_MAP[requestedId] && planAllowsModel(plan.id, requestedId)) {
    return requestedId
  }
  // Requested model not allowed for this plan → downgrade gracefully.
  const desiredTier = MODEL_MAP[requestedId] ? tierOf(requestedId) : 'balanced'
  return pickModelForPlan(plan.id, desiredTier, Object.keys(MODEL_MAP))
}

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
      baseURL: 'https://router.huggingface.co/v1',
    })
  }

  if (provider === 'openrouter' || provider === 'groq' || provider === 'mistral' || provider === 'opencode' || provider === 'apifreellm') {
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
 * Prepend the Codeva system prompt to every conversation.
 * Preserves any system messages marked with _skip_inject:true (voice brains,
 * web-search context, custom instructions, etc.) by appending them AFTER
 * the identity message. Removes all other conflicting system messages.
 */
function injectIdentity(messages) {
  const identityMsg = { role: 'system', content: CYBERCLI_SYSTEM_PROMPT }

  // Collect skip-inject system messages (strip the flag so providers don't choke)
  const skipInjectMessages = messages
    .filter(m => m.role === 'system' && m._skip_inject)
    .map(m => ({ role: 'system', content: m.content || '' }))

  // Sanitize remaining messages: only role/content/name allowed
  const sanitized = messages
    .filter(m => !(m.role === 'system' && m._skip_inject)) // handled above
    .map(m => {
      const cleanMsg = { role: m.role, content: m.content || '' }
      if (m.name) cleanMsg.name = m.name
      return cleanMsg
    })

  // Remove any other system messages that would conflict with our identity
  const chatMessages = sanitized.filter(m => m.role !== 'system')

  // Build: [identity] + [skip-inject context] + [chat history]
  return [identityMsg, ...skipInjectMessages, ...chatMessages]
}

/**
 * Prune context window to avoid token limit errors on long chats.
 * Keeps all leading system messages (identity + context) and most recent chat messages.
 */
function pruneContextWindow(messages, maxChars = 20000) {
  // Collect ALL consecutive leading system messages (identity + voice brain + web search etc.)
  let sysEnd = 0
  while (sysEnd < messages.length && messages[sysEnd].role === 'system') sysEnd++
  const systemMessages = messages.slice(0, sysEnd)
  const chatMessages = messages.slice(sysEnd)

  let currentChars = systemMessages.reduce((sum, m) => sum + (m.content || '').length, 0)
  const pruned = []

  // Iterate backwards to keep the most recent messages
  for (let i = chatMessages.length - 1; i >= 0; i--) {
    const msg = chatMessages[i]
    const chars = (msg.content || '').length
    if (currentChars + chars > maxChars) {
      break
    }
    pruned.unshift(msg)
    currentChars += chars
  }

  // Always keep at least the very last user message if possible
  if (pruned.length === 0 && chatMessages.length > 0) {
    pruned.push(chatMessages[chatMessages.length - 1])
  }

  return [...systemMessages, ...pruned]
}

export const llmGateway = {
  async *complete({ messages, model: modelId = 'auto', temperature = 0.7, plan = 'free' }) {
    let activeModelId = modelId
    let workingMessages = messages

    // Plan-gate + task-route the model selection. 'auto' classifies the task
    // and picks the best model the user's plan allows; explicit models that
    // exceed the plan are downgraded transparently.
    const lastUserText = [...workingMessages].reverse().find((m) => m.role === 'user')?.content || ''
    activeModelId = resolveModelForPlan(activeModelId === 'council' ? 'auto' : activeModelId, plan, lastUserText)

    // Council Mode is handled by councilEngine.js — if it reaches here, fallback
    if (modelId === 'council') {
      yield { type: 'info', content: 'Council Mode should use councilEngine. Falling back...' }
    }

    const totalChars = workingMessages.reduce((sum, m) => sum + (m.content || '').length, 0)
    
    // Auto-route extremely large contexts to Gemini if desired, though pruning handles most
    if (totalChars > 35000 && !activeModelId.startsWith('gemini/')) {
      activeModelId = 'gemini/gemini-2.5-flash'
    }

    let enriched = injectIdentity(workingMessages)
    // Prune context to prevent provider token crashes (Groq fails hard > 8K tokens)
    enriched = pruneContextWindow(enriched, 24000)

    const targetModel = MODEL_MAP[activeModelId] || MODEL_MAP[FALLBACK_CHAIN[0]]

    // Try direct Gemini Google SDK call first if provider is Gemini and API key is present
    let directGeminiFailed = false
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
        directGeminiFailed = true
      }
    }

    let client = getClient(targetModel.provider)
    let activeModelName = targetModel.model
    let activeProvider = targetModel.provider

    if (activeProvider === 'gemini' && (directGeminiFailed || !PROVIDER_KEYS.gemini)) {
      client = getClient('openrouter')
      activeModelName = OPENROUTER_FALLBACK_MAP[activeModelId] || 'google/gemini-2.5-flash'
      activeProvider = 'openrouter'
    } else if (!client && (targetModel.provider === 'huggingface' || targetModel.provider === 'nvidia')) {
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

  async completeNonStream({ messages, model: modelId = 'auto', temperature = 0.7, plan = 'free' }) {
    let activeModelId = modelId
    const lastUserText = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
    activeModelId = resolveModelForPlan(activeModelId === 'council' ? 'auto' : activeModelId, plan, lastUserText)
    const totalChars = messages.reduce((sum, m) => sum + (m.content || '').length, 0)
    
    if (totalChars > 35000 && !activeModelId.startsWith('gemini/')) {
      activeModelId = 'gemini/gemini-2.5-flash'
    }

    let enriched = injectIdentity(messages)
    // Prune context to prevent provider token crashes
    enriched = pruneContextWindow(enriched, 24000)

    const targetModel = MODEL_MAP[activeModelId] || MODEL_MAP[FALLBACK_CHAIN[0]]

    // Try direct Gemini Google SDK call first if provider is Gemini and API key is present
    let directGeminiFailed = false
    if (targetModel.provider === 'gemini' && PROVIDER_KEYS.gemini) {
      try {
        const { GoogleGenAI } = await import('@google/genai')
        const genAI = new GoogleGenAI({ apiKey: PROVIDER_KEYS.gemini })

        // Extract system messages for systemInstruction
        const systemParts = enriched
          .filter(m => m.role === 'system')
          .map(m => m.content)
          .filter(Boolean)
        const systemInstruction = systemParts.length > 0
          ? { parts: [{ text: systemParts.join('\n\n') }] }
          : undefined

        const contents = enriched
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || '' }],
          }))

        const response = await genAI.models.generateContent({
          model: targetModel.model,
          contents,
          config: {
            temperature,
            maxOutputTokens: 4096,
            ...(systemInstruction ? { systemInstruction } : {}),
          },
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
        directGeminiFailed = true
      }
    }

    let client = getClient(targetModel.provider)
    let activeModelName = targetModel.model
    let activeProvider = targetModel.provider

    if (activeProvider === 'gemini' && (directGeminiFailed || !PROVIDER_KEYS.gemini)) {
      client = getClient('openrouter')
      activeModelName = OPENROUTER_FALLBACK_MAP[activeModelId] || 'google/gemini-2.5-flash'
      activeProvider = 'openrouter'
    } else if (!client && (targetModel.provider === 'huggingface' || targetModel.provider === 'nvidia')) {
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
