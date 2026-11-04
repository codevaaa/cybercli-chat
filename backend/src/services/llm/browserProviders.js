// Server-only provider configuration. Model aliases stay stable while owners
// choose upstream IDs from each provider's current catalog.
const validModel = value => typeof value === 'string' && /^[\w./:@+-]{1,200}$/.test(value)
function gatewayURL(value) {
  try {
    const url = new URL(value)
    if (['antseedstats.com', 'www.antseedstats.com'].includes(url.hostname) || url.username || url.password || url.search || url.hash ||
      url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) return null
    return url.href.replace(/\/$/, '')
  } catch { return null }
}
const keyed = prefix => Object.keys(process.env).some(key => new RegExp(`^${prefix}_API_KEY\\d*$`).test(key) && process.env[key]?.trim())
export function browserProviders() {
  const radox = process.env.RADOX_MODEL || 'deepseek-v4-flash-0731', antseed = process.env.ANTSEED_MODEL || ''
  return [
    { id: 'radox/default', provider: 'radox', name: 'Radox', baseURL: 'https://radoxai.com/v1', model: radox,
      configured: keyed('RADOX') && validModel(radox), automatic: true },
    { id: 'antseed/default', provider: 'antseed', name: 'AntSeed gateway', baseURL: gatewayURL(process.env.ANTSEED_BASE_URL), model: antseed,
      configured: keyed('ANTSEED') && validModel(antseed) && !!gatewayURL(process.env.ANTSEED_BASE_URL), automatic: true },
    { id: 'logfare/auto', provider: 'logfare', name: 'Logfare (optional · research logging)', baseURL: 'https://logfare.ai/v1', model: 'logfare/auto',
      configured: keyed('LOGFARE'), automatic: false },
  ]
}
export const browserProviderMap = () => Object.fromEntries(browserProviders().map(item => [item.id, { provider: item.provider, model: item.model, purpose: 'general' }]))
export const browserProvider = id => browserProviders().find(item => item.id === id)
export const automaticBrowserModels = () => browserProviders().filter(item => item.configured && item.automatic).map(item => item.id)
export const publicBrowserModels = () => browserProviders().filter(item => item.configured).map(({ id, name, model, automatic }) => ({
  id, name, provider: name, automatic, description: automatic ? `Configured upstream: ${model}` : 'Manual selection only. This provider logs API traffic for research.',
}))
