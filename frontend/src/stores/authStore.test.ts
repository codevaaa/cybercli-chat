import { beforeEach, afterEach, expect, test, vi } from 'vitest'
const sdk = vi.hoisted(() => ({ auth: {
  getSession: vi.fn(), onAuthStateChange: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(),
  signInWithOAuth: vi.fn(), signInWithOtp: vi.fn(), signOut: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn(), setSession: vi.fn(), getUser: vi.fn(),
} }))
vi.mock('../lib/supabase.js', () => ({ supabase: sdk }))
const session = { access_token: 'access-fixture', refresh_token: 'refresh-fixture', user: { id: 'account-one', email: 'person@example.test', user_metadata: { name: 'Person' } } }
let listener: Function
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); localStorage.clear(); window.history.replaceState(null, '', '/auth/login?from=extension')
  sdk.auth.getSession.mockResolvedValue({ data: { session } })
  sdk.auth.onAuthStateChange.mockImplementation(callback => { listener = callback; return { data: { subscription: { unsubscribe: vi.fn() } } } })
  sdk.auth.signInWithPassword.mockResolvedValue({ data: { session, user: session.user } })
  sdk.auth.signUp.mockResolvedValue({ data: { session, user: session.user } })
  sdk.auth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://accounts.google.com/fixture' } })
  sdk.auth.signInWithOtp.mockResolvedValue({})
  sdk.auth.signOut.mockResolvedValue({})
  vi.stubGlobal('fetch', vi.fn(async url => Response.json(String(url).endsWith('/health') ? { ready: true } : { banned: false, plan: 'free', status: 'active' })))
})
afterEach(() => vi.unstubAllGlobals())

test('email login provisions the verified account and returns the session to native clients', async () => {
  const { useAuthStore } = await import('./authStore.js')
  const result = await useAuthStore.getState().signInWithEmail(' person@example.test ', 'password-fixture')
  expect(result.success).toBe(true); expect(result.session).toBe(session)
  expect(useAuthStore.getState().accountReady).toBe(true)
  expect(sdk.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'person@example.test', password: 'password-fixture' })
  const calls = vi.mocked(fetch).mock.calls
  expect(calls.some(([url, opts]) => String(url).endsWith('/auth/sync') && JSON.parse(String(opts?.body)).platform === 'extension')).toBe(true)
  expect(localStorage.getItem('codeva-account-ready')).toBe('true')
})
test('initializer is idempotent and SDK refresh events synchronize outside the SDK callback', async () => {
  const { useAuthStore } = await import('./authStore.js')
  await Promise.all([useAuthStore.getState().initialize(), useAuthStore.getState().initialize()])
  await useAuthStore.getState().initialize()
  expect(sdk.auth.onAuthStateChange).toHaveBeenCalledOnce()
  expect(useAuthStore.getState().loading).toBe(false)
  listener('TOKEN_REFRESHED', { ...session, access_token: 'rotated-fixture' })
  await vi.waitFor(() => expect(useAuthStore.getState().session?.access_token).toBe('rotated-fixture'))
  await vi.waitFor(() => expect(useAuthStore.getState().accountReady).toBe(true))
})
test('Google outage stays on the sign-in page with an actionable error', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ready: false, message: 'Authentication project needs to be restored' }, { status: 503 })))
  const { useAuthStore } = await import('./authStore.js')
  const result = await useAuthStore.getState().signInWithOAuth('google', 'from=extension')
  expect(result.success).toBe(false); expect(result.error).toMatch(/restored/)
  expect(sdk.auth.signInWithOAuth).not.toHaveBeenCalled(); expect(useAuthStore.getState().loading).toBe(false)
})
test('Google, signup, and magic links preserve extension context and initiate one navigation', async () => {
  const { useAuthStore } = await import('./authStore.js')
  await useAuthStore.getState().signInWithOAuth('google', 'from=extension')
  expect(sdk.auth.signInWithOAuth.mock.calls[0][0].options).toMatchObject({ skipBrowserRedirect: true })
  expect(sdk.auth.signInWithOAuth.mock.calls[0][0].options.redirectTo).toContain('from=extension')
  await useAuthStore.getState().signUpWithEmail('person@example.test', 'password-fixture', 'Person', 'from=extension')
  expect(sdk.auth.signUp.mock.calls[0][0].options.emailRedirectTo).toContain('from=extension')
  await useAuthStore.getState().signInWithMagicLink('person@example.test', 'from=extension')
  expect(sdk.auth.signInWithOtp.mock.calls[0][0].options.emailRedirectTo).toContain('/auth/callback?from=extension')
})
test('a backend outage preserves the session for retry and keeps protected account access unready', async () => {
  vi.stubGlobal('fetch', vi.fn(async url => String(url).endsWith('/health') ? Response.json({ ready: true }) : Response.json({ error: 'Registry temporarily unavailable' }, { status: 503 })))
  const { useAuthStore } = await import('./authStore.js')
  const result = await useAuthStore.getState().signInWithEmail('person@example.test', 'password-fixture')
  expect(result.success).toBe(false); expect(useAuthStore.getState().session).toBe(session)
  expect(useAuthStore.getState().accountReady).toBe(false); expect(sdk.auth.signOut).not.toHaveBeenCalled()
})
test('sign-out during account sync cannot restore the old signed-in state', async () => {
  let finish: Function
  vi.stubGlobal('fetch', vi.fn(async url => String(url).endsWith('/health') ? Response.json({ ready: true }) : new Promise(resolve => { finish = resolve })))
  const { useAuthStore } = await import('./authStore.js')
  const pending = useAuthStore.getState().signInWithEmail('person@example.test', 'password-fixture')
  await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
  await useAuthStore.getState().signOut()
  finish!(Response.json({ banned: false })); await pending
  expect(useAuthStore.getState().session).toBeNull(); expect(useAuthStore.getState().accountReady).toBe(false)
  expect(localStorage.getItem('sb-access-token')).toBeNull()
})

test('email confirmation without a session stays signed out and does not provision an account', async () => {
  sdk.auth.signUp.mockResolvedValueOnce({ data: { session: null, user: session.user } })
  const { useAuthStore } = await import('./authStore.js')
  const result = await useAuthStore.getState().signUpWithEmail('person@example.test', 'password-fixture', 'Person', 'from=extension')
  expect(result).toMatchObject({ success: true, needsVerification: true })
  expect(useAuthStore.getState().accountReady).toBe(false)
  expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith('/auth/sync'))).toBe(false)
})

test('a banned account is signed out and never becomes extension-ready', async () => {
  vi.stubGlobal('fetch', vi.fn(async url => String(url).endsWith('/health') ? Response.json({ ready: true }) : Response.json({ banned: true, reason: 'Account suspended' }, { status: 403 })))
  const { useAuthStore } = await import('./authStore.js')
  const result = await useAuthStore.getState().signInWithEmail('person@example.test', 'password-fixture')
  expect(result.success).toBe(false); expect(sdk.auth.signOut).toHaveBeenCalledOnce()
  expect(useAuthStore.getState().session).toBeNull(); expect(localStorage.getItem('sb-access-token')).toBeNull()
})

test('account setup can recover from a temporary outage using the saved session', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ error: 'Retry' }, { status: 503 })).mockResolvedValue(Response.json({ banned: false })))
  const { useAuthStore } = await import('./authStore.js')
  await useAuthStore.getState().initialize(); expect(useAuthStore.getState().accountReady).toBe(false)
  await useAuthStore.getState().initialize(); expect(useAuthStore.getState().accountReady).toBe(true)
  expect(sdk.auth.onAuthStateChange).toHaveBeenCalledOnce()
})

test('password recovery and profile changes expose service errors and update only confirmed profile data', async () => {
  const { useAuthStore } = await import('./authStore.js')
  sdk.auth.resetPasswordForEmail.mockResolvedValue({})
  expect((await useAuthStore.getState().resetPassword(' person@example.test ')).success).toBe(true)
  expect(sdk.auth.resetPasswordForEmail).toHaveBeenCalledWith('person@example.test', { redirectTo: `${window.location.origin}/auth/reset-password` })
  sdk.auth.resetPasswordForEmail.mockResolvedValue({ error: new Error('network failed') })
  expect((await useAuthStore.getState().resetPassword('person@example.test')).error).toMatch(/restored/)
  sdk.auth.updateUser.mockResolvedValue({ data: { user: { ...session.user, user_metadata: { name: 'Updated' } } } })
  expect((await useAuthStore.getState().updatePassword('new-fixture')).success).toBe(true)
  expect((await useAuthStore.getState().updateEmail('updated@example.test')).success).toBe(true)
  expect((await useAuthStore.getState().updateName('Updated')).success).toBe(true)
  expect(localStorage.getItem('user_name')).toBe('Updated')
  sdk.auth.updateUser.mockResolvedValue({ error: new Error('Reauthenticate') })
  for (const action of ['updatePassword', 'updateEmail', 'updateName']) expect((await useAuthStore.getState()[action]('fixture')).success).toBe(false)
})

test('desktop session delivery is bound once and verifies the delivered account', async () => {
  let deliver: Function
  const bridge = { onAuthToken: vi.fn(callback => { deliver = callback }), setSessionState: vi.fn() }
  Object.assign(window, { electronAPI: bridge })
  try {
    sdk.auth.setSession.mockResolvedValue({ data: { session } })
    sdk.auth.getUser.mockResolvedValue({ data: { user: session.user } })
    const { useAuthStore } = await import('./authStore.js')
    await useAuthStore.getState().initialize(); await useAuthStore.getState().initialize()
    await deliver!({ token: session.access_token, refresh: session.refresh_token })
    expect(sdk.auth.setSession).toHaveBeenCalledWith({ access_token: session.access_token, refresh_token: session.refresh_token })
    expect(bridge.onAuthToken).toHaveBeenCalledOnce()
    await deliver!(session.access_token); expect(sdk.auth.getUser).toHaveBeenCalledWith(session.access_token)
    sdk.auth.setSession.mockResolvedValue({ error: new Error('Session expired') })
    await deliver!({ token: 'invalid', refresh: 'invalid' }); expect(useAuthStore.getState().accountReady).toBe(false)
  } finally { delete (window as any).electronAPI }
})
