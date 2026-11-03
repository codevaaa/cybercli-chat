import { lookup } from 'node:dns/promises'

export function createAuthAvailability({ url, key, resolve = lookup, request = fetch, now = Date.now } = {}) {
  let cached = null, pending = null
  const inspect = async () => {
    if (!url) return { ready: false, code: 'AUTH_NOT_CONFIGURED', message: 'Account sign-in is not configured. Please contact Codeva support.' }
    try {
      const origin = new URL(url)
      if (origin.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(origin.hostname)) throw new Error('Invalid auth origin')
      await resolve(origin.hostname)
      const response = await request(`${origin.origin}/auth/v1/health`, { headers: key ? { apikey: key } : {}, signal: AbortSignal.timeout(5000) })
      if (!response.ok) throw new Error('Authentication service unavailable')
      return { ready: true }
    } catch {
      return { ready: false, code: 'AUTH_PROJECT_UNAVAILABLE', message: 'Account sign-in is temporarily unavailable. The configured authentication project needs to be restored. Please try again shortly.' }
    }
  }
  return async () => {
    if (cached && now() - cached.at < (cached.value.ready ? 30000 : 5000)) return cached.value
    if (!pending) pending = inspect().then(value => { cached = { value, at: now() }; return value }).finally(() => { pending = null })
    return pending
  }
}
