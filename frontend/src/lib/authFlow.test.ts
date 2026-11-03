import { test, expect, vi } from 'vitest'
import { authCallbackUrl, authDestination, authPagePath, authFlowQuery, safeAuthNext, resolveAuthSession, checkAuthAvailability, authErrorMessage } from './authFlow.js'

test('login, signup and email links preserve the extension handoff through one callback', () => {
  const params = new URLSearchParams('from=extension')
  for (const action of ['login', 'signup']) {
    const callback = new URL(authCallbackUrl('https://www.cybermindcli.info', params, action))
    expect(callback.pathname).toBe('/auth/callback'); expect(callback.searchParams.get('from')).toBe('extension')
    expect(callback.searchParams.get('action')).toBe(action)
  }
  expect(authDestination(params)).toBe('/auth/extension')
  expect(authPagePath('signup', params)).toBe('/auth/signup?from=extension')
})
test('callback destinations reject external paths and invalid native ports; editor state survives', () => {
  for (const value of ['https://evil.test', '//evil.test', '/\\evil', '/auth/login', '/\nchat', null]) expect(safeAuthNext(value)).toBe('/chat')
  expect(safeAuthNext('/projects?open=one')).toBe('/projects?open=one')
  expect(() => authFlowQuery('redirect=cli&port=1')).toThrow(/port/)
  expect(authFlowQuery('redirect=cli&port=32123').get('port')).toBe('32123')
  expect(authFlowQuery('redirect=desktop').get('redirect')).toBe('desktop')
  expect(authFlowQuery(`redirect=ide&port=32123&state=${'a'.repeat(43)}`).get('state')).toBe('a'.repeat(43))
})
test('SDK-consumed OAuth codes are not exchanged twice', async () => {
  const session = { access_token: 'fixture' }, exchange = vi.fn()
  const client = { auth: { getSession: async () => ({ data: { session } }), exchangeCodeForSession: exchange } }
  expect(await resolveAuthSession(client, 'https://www.cybermindcli.info/auth/callback?code=already-consumed')).toBe(session)
  expect(exchange).not.toHaveBeenCalled()
})
test('concurrent callback renders share the one-time code exchange and propagate real errors', async () => {
  const session = { access_token: 'fixture' }, exchange = vi.fn(async () => ({ data: { session } }))
  const client = { auth: { getSession: async () => ({ data: { session: null } }), exchangeCodeForSession: exchange } }
  const href = 'https://www.cybermindcli.info/auth/callback?code=one-time-fixture'
  const result = await Promise.all([resolveAuthSession(client, href), resolveAuthSession(client, href)])
  expect(result[0]).toBe(session); expect(exchange).toHaveBeenCalledOnce()
  await expect(resolveAuthSession(client, 'https://www.cybermindcli.info/auth/callback#error_description=Access+denied')).rejects.toThrow(/Access denied/)
  await expect(resolveAuthSession(client, 'https://www.cybermindcli.info/auth/callback')).rejects.toThrow(/start sign-in/)
  expect(authErrorMessage('network failed')).toMatch(/restored/)
  expect(authErrorMessage('provider is not enabled')).toMatch(/not enabled/)
  expect(authErrorMessage('code verifier missing')).toMatch(/expired/)
})
test('auth outage preflight blocks dead-domain navigation and tolerates the older API revision', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ready: false, message: 'Restore authentication project' }), { status: 503 })))
  await expect(checkAuthAvailability('https://api.example.test')).rejects.toThrow(/Restore/)
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
  await expect(checkAuthAvailability('https://api.example.test')).resolves.toBeUndefined()
  vi.unstubAllGlobals()
})
