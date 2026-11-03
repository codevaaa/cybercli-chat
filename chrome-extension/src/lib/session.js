export const CREDENTIAL_KEYS = ['authToken', 'authRefreshToken', 'authExpiresAt', 'userInfo']
export function tokenClaims(token) {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) } catch { return {} }
}

export function createSessionManager({ storage, request = fetch, base, now = Date.now }) {
  let refreshing = null
  async function clear(expected) {
    const current = await storage.get(CREDENTIAL_KEYS)
    if (current.authToken === expected) await storage.remove(CREDENTIAL_KEYS)
  }
  async function get({ force = false, expectedToken } = {}) {
    const current = await storage.get(CREDENTIAL_KEYS), token = current.authToken
    if (!token || expectedToken && token !== expectedToken) return null
    const expiry = current.authExpiresAt || tokenClaims(token).exp
    if (!force && (!expiry || Number(expiry) * 1000 > now() + 60000)) return token
    if (!current.authRefreshToken) {
      if (force || expiry && Number(expiry) * 1000 <= now()) { await clear(token); return null }
      return token
    }
    if (refreshing?.token === token) return refreshing.promise
    const promise = (async () => {
      const response = await request(`${base}/auth/session/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: current.authRefreshToken }), signal: AbortSignal.timeout(15000),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || !body.access_token || !body.refresh_token) {
        if ([400, 401, 403].includes(response.status)) { await clear(token); return null }
        throw new Error('Account sign-in is temporarily unavailable. Your saved session has been kept. Please retry shortly.')
      }
      const latest = await storage.get(CREDENTIAL_KEYS)
      if (latest.authToken !== token || latest.authRefreshToken !== current.authRefreshToken) return latest.authToken || null
      const previousUser = tokenClaims(token).sub, nextUser = tokenClaims(body.access_token).sub
      if (previousUser && nextUser && previousUser !== nextUser) { await clear(token); return null }
      await storage.set({ authToken: body.access_token, authRefreshToken: body.refresh_token, authExpiresAt: Number(body.expires_at) || tokenClaims(body.access_token).exp || 0 })
      return body.access_token
    })()
    refreshing = { token, promise }
    try { return await promise } finally { if (refreshing?.promise === promise) refreshing = null }
  }
  return { get, clear }
}
