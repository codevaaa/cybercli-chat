export function authApiBase() {
  if (import.meta.env?.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/$/, '')
  return ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://localhost:3000/api/v1' : 'https://cybercli-api.onrender.com/api/v1'
}

const syncs = new Map()
export async function syncAccountSession(session, platform = 'web') {
  if (!session?.access_token) throw new Error('No account session was returned. Please sign in again.')
  const token = session.access_token
  if (!syncs.has(token)) {
    if (syncs.size > 8) syncs.delete(syncs.keys().next().value)
    const work = (async () => {
      const response = await fetch(`${authApiBase()}/auth/sync`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ platform }), signal: AbortSignal.timeout(20000),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || body.banned !== false) {
        const error = new Error(body.reason || body.error || 'Could not connect your account. Please try again.')
        error.status = response.ok ? 503 : response.status
        throw error
      }
      return body
    })()
    syncs.set(token, work)
    work.catch(() => { syncs.delete(token) })
  }
  return syncs.get(token)
}
