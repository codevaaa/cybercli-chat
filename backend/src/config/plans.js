/**
 * Codeva plan definitions — the SINGLE SOURCE OF TRUTH for what each
 * subscription tier may access. Both the website gateway and the CyberCoder
 * CLI backend read from here, so a user's plan consistently governs:
 *   - which models they can call
 *   - their hourly request budget
 *   - which premium features (council, parallel agents, etc.) are unlocked
 *
 * Free providers are all $0 cost, so the gating is about capability tiers and
 * throughput, not money — exactly how a free-provider stack can still feel
 * premium when paired with caching + routing.
 */

/**
 * Model capability tiers. Every model id in the gateway MODEL_MAP is tagged
 * with one of these so plans can allow/deny by tier instead of listing models.
 */
export const MODEL_TIERS = {
  fast: 'fast', // small, low-latency models (8B class) — always available
  balanced: 'balanced', // 70B class general models
  reasoning: 'reasoning', // strongest free reasoning models
  premium: 'premium', // BYOK-only (Anthropic/OpenAI direct) — paid keys
}

/**
 * Tier assignments for the gateway's model ids. Anything not listed defaults
 * to 'balanced'. Keep in sync with gateway.js MODEL_MAP.
 */
export const MODEL_TIER_MAP = {
  // fast
  'groq/llama-3.1-8b': 'fast',
  'cerebras/llama-3.1-8b': 'fast',
  'gemini/gemini-2.5-flash': 'fast',
  'cloudflare/@cf/meta/llama-3.1-8b-instruct': 'fast',
  'huggingface/meta-llama/Llama-3.1-8B-Instruct': 'fast',
  'huggingface/NousResearch/Hermes-3-Llama-3.1-8B': 'fast',
  'bytez/meta-llama/Llama-3.1-8B-Instruct': 'fast',
  'opencode/deepseek-v4-flash': 'fast',

  // balanced
  'openrouter/gpt-4o-mini': 'balanced',
  'groq/llama-3.1-70b': 'balanced',
  'groq/llama-3.3-70b': 'balanced',
  'huggingface/meta-llama/Llama-3.3-70B-Instruct': 'balanced',
  'huggingface/Qwen/Qwen2.5-Coder-32B-Instruct': 'balanced',
  'huggingface/Mixtral-8x7B-Instruct-v0.1': 'balanced',
  'apifreellm/gpt-4o': 'balanced',

  // reasoning
  'gemini/gemini-2.5-pro': 'reasoning',
  'mistral/mistral-large-latest': 'reasoning',
  'nvidia/llama-3.1-nemotron-70b': 'reasoning',
  'huggingface/Qwen/Qwen2.5-72B-Instruct': 'reasoning',
  'huggingface/deepseek-ai/DeepSeek-R1-Distill-Llama-70B': 'reasoning',
  'huggingface/NousResearch/Hermes-3-Llama-3.1-70B': 'reasoning',
  'opencode/deepseek-v4-pro': 'reasoning',
  'opencode/kimi-k2.5': 'reasoning',
  'opencode/qwen3.7-max': 'reasoning',
  'opencode/minimax-m2.5': 'reasoning',
  'apifreellm/claude-3.5-sonnet': 'reasoning',

  // Codeva Mythological Personas (The Swarm)
  'codeva-madhav-v1': 'reasoning',
  'codeva-kali-v1': 'reasoning',
  'codeva-arjun-v1': 'fast',
  'codeva-abhimanyu-v1': 'reasoning',

  // ── New free OpenRouter models ──
  // Strong coding models kept on 'balanced' so FREE users get real power.
  'openrouter/qwen3-coder-free': 'balanced',
  'openrouter/gpt-oss-20b-free': 'balanced',
  'openrouter/gemma-4-31b-free': 'balanced',
  'openrouter/gemma-4-26b-free': 'balanced',
  'openrouter/dolphin-venice-free': 'balanced',
  'groq/qwen-2.5-coder-32b': 'balanced',
  'cerebras/qwen-3-32b': 'balanced',
  'mistral/codestral-latest': 'balanced',
  'nvidia/qwen-2.5-coder-32b': 'balanced',
  // fast free models
  'openrouter/deepseek-v4-flash-free': 'fast',
  'openrouter/laguna-xs-free': 'fast',
  'openrouter/lfm-thinking-free': 'fast',
  // reasoning-class (pro+)
  'openrouter/qwen3-next-80b-free': 'reasoning',
  'openrouter/kimi-k2-free': 'reasoning',
  'openrouter/minimax-m2-free': 'reasoning',
  'openrouter/nemotron-nano-free': 'reasoning',
  'openrouter/laguna-m-free': 'reasoning',
  'openrouter/owl-alpha': 'reasoning',
  'groq/deepseek-r1-distill-70b': 'reasoning',
  'cerebras/llama-3.3-70b': 'reasoning',
  'nvidia/deepseek-r1': 'reasoning',
}

/**
 * Plan definitions. `allowedTiers` controls model access; `requestsPerHour`
 * is the throughput budget; `features` is a capability set used across the app.
 */
export const PLANS = {
  free: {
    id: 'free',
    label: 'Free',
    allowedTiers: ['fast', 'balanced'],
    requestsPerHour: 50,
    maxParallelAgents: 1,
    contextWindowCap: 16_000,
    features: { council: false, parallelAgents: false, webSearch: true, byok: true, priority: false },
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    allowedTiers: ['fast', 'balanced', 'reasoning'],
    requestsPerHour: 500,
    maxParallelAgents: 3,
    contextWindowCap: 128_000,
    features: { council: true, parallelAgents: true, webSearch: true, byok: true, priority: true },
  },
  max: {
    id: 'max',
    label: 'Max',
    allowedTiers: ['fast', 'balanced', 'reasoning', 'premium'],
    requestsPerHour: 2000,
    maxParallelAgents: 6,
    contextWindowCap: 200_000,
    features: { council: true, parallelAgents: true, webSearch: true, byok: true, priority: true },
  },
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise',
    allowedTiers: ['fast', 'balanced', 'reasoning', 'premium'],
    requestsPerHour: 100000,
    maxParallelAgents: 12,
    contextWindowCap: 1_000_000,
    features: { council: true, parallelAgents: true, webSearch: true, byok: true, priority: true },
  },
}

/** Normalise any plan string (case/alias) to a known plan object. */
export function getPlan(planName) {
  const key = String(planName || 'free').toLowerCase()
  return PLANS[key] || PLANS.free
}

/** The tier of a gateway model id (defaults to 'balanced'). */
export function tierOf(modelId) {
  return MODEL_TIER_MAP[modelId] || MODEL_TIERS.balanced
}

/** Whether a plan may use a given model id. */
export function planAllowsModel(planName, modelId) {
  const plan = getPlan(planName)
  return plan.allowedTiers.includes(tierOf(modelId))
}

/**
 * Pick the best model a plan is allowed to use for a given task tier. If the
 * requested tier is above the plan's ceiling, gracefully downgrade to the
 * highest tier the plan allows. Returns a gateway model id.
 */
export function pickModelForPlan(planName, desiredTier = 'balanced', candidates = null) {
  const plan = getPlan(planName)
  const order = ['premium', 'reasoning', 'balanced', 'fast']
  // Effective tier = min(desired, plan ceiling).
  const planCeilingIdx = Math.min(...plan.allowedTiers.map((t) => order.indexOf(t)).filter((i) => i >= 0))
  const desiredIdx = order.indexOf(desiredTier)
  const effectiveIdx = Math.max(desiredIdx, planCeilingIdx) // higher index = weaker tier
  const effectiveTier = order[effectiveIdx] || 'balanced'

  const pool = candidates || Object.keys(MODEL_TIER_MAP)
  // First choice: a model exactly at the effective tier the plan allows.
  const exact = pool.find((id) => tierOf(id) === effectiveTier && plan.allowedTiers.includes(tierOf(id)))
  if (exact) return exact
  // Otherwise: any allowed model, strongest first.
  for (const t of order) {
    if (!plan.allowedTiers.includes(t)) continue
    const m = pool.find((id) => tierOf(id) === t)
    if (m) return m
  }
  return 'groq/llama-3.1-8b' // last-resort always-on fast model
}
