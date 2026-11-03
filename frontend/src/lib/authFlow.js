import { editorAuthQuery } from './editorAuth.js'

export function safeAuthNext(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') &&
    !/[\\\r\n]/.test(value) && !value.startsWith('/auth/') ? value : '/chat'
}

export function authFlowQuery(input) {
  const params = input instanceof URLSearchParams ? input : new URLSearchParams(input)
  const result = new URLSearchParams()
  const target = params.get('redirect')
  if (target === 'ide') {
    for (const [key, value] of new URLSearchParams(editorAuthQuery(params))) result.set(key, value)
  } else if (target === 'desktop') result.set('redirect', 'desktop')
  else if (target === 'cli') {
    const port = params.get('port') || ''
    if (!/^\d{4,5}$/.test(port) || Number(port) < 1024 || Number(port) > 65535) throw new Error('Start sign-in again from the CLI. Its callback port is invalid.')
    result.set('redirect', 'cli'); result.set('port', port)
  } else {
    const next = safeAuthNext(params.get('next') || target)
    if (next !== '/chat') result.set('next', next)
  }
  if (params.get('from') === 'extension') result.set('from', 'extension')
  return result
}

export function authCallbackUrl(origin, params, action = 'login') {
  const query = authFlowQuery(params)
  query.set('action', action === 'signup' ? 'signup' : 'login')
  return `${origin}/auth/callback?${query}`
}

export function authPagePath(page, params) {
  const query = authFlowQuery(params).toString()
  return `/auth/${page}${query ? `?${query}` : ''}`
}

export function authDestination(params) {
  return params.get('from') === 'extension' ? '/auth/extension' : safeAuthNext(params.get('next') || params.get('redirect'))
}

export function authErrorMessage(error) {
  const message = String(error?.message || error || '')
  if (/failed to fetch|network|ENOTFOUND|name.not.resolved|fetch failed/i.test(message)) return 'The sign-in service could not be reached. Please try again after the authentication project is restored.'
  if (/provider.*not.*enabled|unsupported provider/i.test(message)) return 'Google sign-in is not enabled for this project. Please use email sign-in or contact Codeva support.'
  if (/code.verifier|flow_state|invalid.grant|expired|already.used/i.test(message)) return 'This sign-in link has expired or was already used. Start sign-in again in this browser.'
  return message || 'Could not sign in. Please try again.'
}

export async function checkAuthAvailability(apiBase) {
  let response
  try { response = await fetch(`${apiBase}/auth/health`, { signal: AbortSignal.timeout(10000), cache: 'no-store' }) }
  catch { throw new Error('The sign-in service could not be reached. Please try again shortly.') }
  // Compatibility with an API revision that predates this endpoint.
  if (response.status === 404) return
  const body = await response.json().catch(() => ({}))
  if (!response.ok || body.ready !== true) throw new Error(body.message || 'Account sign-in is temporarily unavailable. Please try again shortly.')
}

const exchanges = new Map()
export async function resolveAuthSession(client, href) {
  const url = new URL(href), hash = new URLSearchParams(url.hash.slice(1))
  const error = url.searchParams.get('error_description') || hash.get('error_description') || url.searchParams.get('error') || hash.get('error')
  if (error) throw new Error(authErrorMessage(error))
  // getSession waits for the SDK's detectSessionInUrl initialization. Do not
  // exchange the same single-use OAuth code again after the SDK consumed it.
  const current = await client.auth.getSession()
  if (current.data?.session) return current.data.session
  const code = url.searchParams.get('code')
  if (!code) throw new Error(authErrorMessage(current.error || 'No sign-in session was found. Please start sign-in again.'))
  const key = `${url.origin}:${code}`
  if (!exchanges.has(key)) {
    if (exchanges.size >= 16) exchanges.delete(exchanges.keys().next().value)
    exchanges.set(key, client.auth.exchangeCodeForSession(code))
  }
  const result = await exchanges.get(key)
  if (result.error) throw new Error(authErrorMessage(result.error))
  if (!result.data?.session) throw new Error('No sign-in session was returned. Please start sign-in again.')
  return result.data.session
}
