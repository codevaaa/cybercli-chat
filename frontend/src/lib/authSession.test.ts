import { beforeEach, afterEach, test, expect, vi } from 'vitest'

beforeEach(() => { vi.resetModules(); vi.stubEnv('VITE_API_URL', 'https://api.example.test/api/v1/') })
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

test('concurrent account setup uses one authenticated request and caches successful setup', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ banned: false, plan: 'free' })))
  const { syncAccountSession, authApiBase } = await import('./authSession.js')
  expect(authApiBase()).toBe('https://api.example.test/api/v1')
  const session = { access_token: 'fixture' }
  const result = await Promise.all([syncAccountSession(session, 'extension'), syncAccountSession(session, 'extension')])
  expect(result[0].plan).toBe('free'); await syncAccountSession(session)
  expect(fetch).toHaveBeenCalledOnce()
  expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer fixture' })
  expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body)).platform).toBe('extension')
})

test('unavailable setup is retryable and forbidden accounts cannot become ready', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ error: 'Try shortly' }, { status: 503 }))
    .mockResolvedValueOnce(Response.json({ banned: true, reason: 'Account suspended' }, { status: 403 }))
    .mockResolvedValueOnce(Response.json({ banned: false })))
  const { syncAccountSession } = await import('./authSession.js')
  const session = { access_token: 'fixture' }
  await expect(syncAccountSession(session)).rejects.toMatchObject({ status: 503 })
  await expect(syncAccountSession(session)).rejects.toMatchObject({ status: 403, message: 'Account suspended' })
  await expect(syncAccountSession(session)).resolves.toMatchObject({ banned: false })
  await expect(syncAccountSession(null)).rejects.toThrow(/sign in again/)
})

test('API defaults use the local backend port and production host', async () => {
  vi.stubEnv('VITE_API_URL', '')
  const { authApiBase } = await import('./authSession.js')
  vi.stubGlobal('window', { location: { hostname: 'localhost' } }); expect(authApiBase()).toBe('http://localhost:3000/api/v1')
  vi.stubGlobal('window', { location: { hostname: 'www.cybermindcli.info' } }); expect(authApiBase()).toBe('https://cybercli-api.onrender.com/api/v1')
})
