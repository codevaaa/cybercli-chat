// Exact service IDs confirmed by APINEX GET /v1/models. Credentials stay in
// the backend key pool; this catalog contains no account or credential data.
export const APINEX_BASE_URL = 'https://api.apinex.bond/v1'
export const APINEX_MODELS = Object.freeze([
  'free/gpt-6-luna', 'free/glm-5.3-flash', 'free/deepseek-v4-pro-0813',
  'free/minimax-m3.1', 'free/qwen-3.8-max', 'free/claude-opus-4.6',
])
export const apinexId = model => `apinex/${model}`
// These service IDs returned explicit subscription-required HTTP 402 during
// the account acceptance run; being catalogued under free/ is not entitlement.
export const APINEX_SUBSCRIPTION_MODELS = new Set(APINEX_MODELS.slice(3))
export function apinexPreferred(tier) {
  return apinexId(tier === 'reasoning' || tier === 'premium' ? 'free/deepseek-v4-pro-0813' : tier === 'fast' ? 'free/glm-5.3-flash' : 'free/gpt-6-luna')
}
