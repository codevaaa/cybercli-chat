// Fixed, server-side OpenAI-compatible provider routes. Keys and model IDs are
// selected through environment variables; no provider URL is accepted from a
// client or tenant setting.
const validModel = value => typeof value === 'string' && /^[\w./:@+-]{1,200}$/.test(value)
const MODEL_TIERS = new Set(['free', 'fast', 'balanced', 'reasoning', 'premium'])

function configuredTier(provider, model) {
  const requested = process.env[provider.tierEnv]?.trim().toLowerCase()
  if (requested) return MODEL_TIERS.has(requested) ? requested : 'premium'
  if (provider.defaultTier === 'free' && model !== provider.defaultModel) return 'premium'
  return provider.defaultTier || 'premium'
}

function automaticRequested(provider, model, tier) {
  const configured = process.env[provider.automaticEnv]?.trim().toLowerCase()
  if (configured === 'true') return true
  if (configured === 'false') return false
  // Only the known free Seek100 default receives an opt-in default. A custom
  // model must be explicitly classified and opted in by the operator.
  return provider.defaultAutomatic === true && model === provider.defaultModel && tier === 'free'
}

const PROVIDERS = Object.freeze([
  { id: 'seek100/default', provider: 'seek100', name: '100milionseek', envPrefix: 'SEEK100', modelEnv: 'SEEK100_MODEL', tierEnv: 'SEEK100_TIER', automaticEnv: 'SEEK100_AUTOMATIC', defaultTier: 'free', defaultAutomatic: true, baseURL: 'https://100milionseek.top/v1', defaultModel: 'deepseek-v4.1-flash-free' },
  { id: 'freemodel/default', provider: 'freemodel', name: 'FreeModel', envPrefix: 'FREEMODEL', modelEnv: 'FREEMODEL_MODEL', tierEnv: 'FREEMODEL_TIER', automaticEnv: 'FREEMODEL_AUTOMATIC', defaultTier: 'premium', toolsEnv: 'FREEMODEL_SUPPORTS_TOOLS', baseURL: 'https://freemodel.in/v1' },
  { id: 'unorouter/default', provider: 'unorouter', name: 'UnoRouter', envPrefix: 'UNOROUTER', modelEnv: 'UNOROUTER_MODEL', tierEnv: 'UNOROUTER_TIER', automaticEnv: 'UNOROUTER_AUTOMATIC', defaultTier: 'premium', toolsEnv: 'UNOROUTER_SUPPORTS_TOOLS', baseURL: 'https://api.unorouter.com/v1' },
  { id: 'apinex/default', provider: 'apinex', name: 'APINex', envPrefix: 'APINEX', modelEnv: 'APINEX_MODEL', tierEnv: 'APINEX_TIER', automaticEnv: 'APINEX_AUTOMATIC', defaultTier: 'premium', baseURL: 'https://api.apinex.bond/v1' },
  { id: 'radox/default', provider: 'radox', name: 'Radox AI', envPrefix: 'RADOX', modelEnv: 'RADOX_MODEL', tierEnv: 'RADOX_TIER', automaticEnv: 'RADOX_AUTOMATIC', defaultTier: 'premium', baseURL: 'https://radoxai.com/v1', defaultModel: 'deepseek-v4-flash-0731' },
  { id: 'aihubmix/default', provider: 'aihubmix', name: 'AIHubMix', envPrefix: 'AIHUBMIX', modelEnv: 'AIHUBMIX_MODEL', tierEnv: 'AIHUBMIX_TIER', automaticEnv: 'AIHUBMIX_AUTOMATIC', defaultTier: 'premium', toolsEnv: 'AIHUBMIX_SUPPORTS_TOOLS', baseURL: 'https://aihubmix.com/v1' },
  { id: 'llm7/default', provider: 'llm7', name: 'LLM7', envPrefix: 'LLM7', modelEnv: 'LLM7_MODEL', tierEnv: 'LLM7_TIER', automaticEnv: 'LLM7_AUTOMATIC', defaultTier: 'premium', baseURL: 'https://api.llm7.io/v1' },
  // OpenCode Zen's free models may reject requests outside OpenCode. Configure
  // a model that the Zen account permits through its Chat Completions API.
  { id: 'opencode/default', provider: 'opencode', name: 'OpenCode Zen', envPrefix: 'OPENCODE', modelEnv: 'OPENCODE_MODEL', tierEnv: 'OPENCODE_TIER', automaticEnv: 'OPENCODE_AUTOMATIC', defaultTier: 'premium', baseURL: 'https://opencode.ai/zen/v1' },
  { id: 'gemini/default', provider: 'gemini', name: 'Google Gemini', envPrefix: 'GEMINI', modelEnv: 'GEMINI_MODEL', tierEnv: 'GEMINI_TIER', automaticEnv: 'GEMINI_AUTOMATIC', defaultTier: 'premium', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  { id: 'openrouter/default', provider: 'openrouter', name: 'OpenRouter', envPrefix: 'OPENROUTER', modelEnv: 'OPENROUTER_MODEL', tierEnv: 'OPENROUTER_TIER', automaticEnv: 'OPENROUTER_AUTOMATIC', defaultTier: 'premium', baseURL: 'https://openrouter.ai/api/v1' },
  { id: 'groq/default', provider: 'groq', name: 'Groq', envPrefix: 'GROQ', modelEnv: 'GROQ_MODEL', tierEnv: 'GROQ_TIER', automaticEnv: 'GROQ_AUTOMATIC', defaultTier: 'premium', baseURL: 'https://api.groq.com/openai/v1' },
])

const hasProviderKey = prefix => Object.keys(process.env).some(key =>
  new RegExp(`^${prefix}_API_KEY\\d*$`).test(key) && Boolean(process.env[key]?.trim()))

export function browserProviders() {
  return PROVIDERS.map(provider => {
    const model = process.env[provider.modelEnv]?.trim() || provider.defaultModel || ''
    const valid = validModel(model)
    const tier = configuredTier(provider, model)
    const configured = hasProviderKey(provider.envPrefix) && valid
    return {
      ...provider,
      model,
      tier,
      supportsTools: provider.supportsTools === true || process.env[provider.toolsEnv]?.trim().toLowerCase() === 'true',
      configured,
      // Automatic routing is an explicit operator opt-in and is allowed only
      // after the exact configured model has been marked free.
      automatic: configured && tier === 'free' && automaticRequested(provider, model, tier),
    }
  })
}

export const providerDefinitions = () => PROVIDERS.map(({ id, provider, name, baseURL }) => ({ id, provider, name, baseURL }))

export const browserProviderMap = () => Object.fromEntries(browserProviders()
  .filter(item => item.configured)
  .map(item => [item.id, { provider: item.provider, model: item.model, purpose: 'general', tier: item.tier }]))
export const browserProvider = id => browserProviders().find(item => item.id === id)
export const automaticBrowserModels = () => browserProviders()
  .filter(item => item.configured && item.automatic)
  .map(item => item.id)
export const publicBrowserModels = () => browserProviders()
  .filter(item => item.configured)
  .map(({ id, name, model, tier, automatic, supportsTools }) => ({
    id,
    name: `${name} · ${model}`,
    provider: name,
    tier,
    automatic,
    supportsTools,
    description: `Configured server-side model: ${model}`,
  }))

export const providerModelTier = model => {
  const matches = browserProviders().filter(item => item.configured && item.model === model)
  if (!matches.length) return 'premium'
  // If two providers expose an identical model ID with different entitlements,
  // apply the more restrictive tier because the gateway only passes the ID.
  const rank = { free: 0, fast: 1, balanced: 2, reasoning: 3, premium: 4 }
  const tier = matches.reduce((current, item) => rank[item.tier] > rank[current] ? item.tier : current, 'free')
  return tier === 'free' ? 'balanced' : tier
}
