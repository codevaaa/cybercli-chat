import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSessionManager, tokenClaims } from './session.js'
const jwt = (sub, exp) => `header.${btoa(JSON.stringify({ sub, exp }))}.signature`
function fixture(extra = {}) {
  const state = { authToken: jwt('one', 1), authRefreshToken: 'refresh-fixture', ...extra }
  const storage = { get: async () => ({ ...state }), set: async value => Object.assign(state, value), remove: async keys => keys.forEach(key => delete state[key]) }
  return { state, storage }
}
test('token claims tolerate invalid input, and healthy sessions do not refresh', async () => {
  assert.deepEqual(tokenClaims('invalid'), {})
  const f = fixture({ authToken: jwt('one', 9999999999) })
  const manager = createSessionManager({ storage: f.storage, request: () => assert.fail('must not refresh'), base: 'https://api.example.test' })
  assert.equal(await manager.get(), f.state.authToken)
  assert.equal(await manager.get({ expectedToken: 'another-login' }), null)
})
test('parallel consumers serialize refresh rotation and persist both new credentials', async () => {
  const f = fixture(), next = jwt('one', 9999999999); let calls = 0
  const manager = createSessionManager({ storage: f.storage, base: 'https://api.example.test', request: async (_url, options) => {
    calls++; assert.equal(JSON.parse(options.body).refresh_token, 'refresh-fixture')
    await new Promise(resolve => setTimeout(resolve, 10))
    return Response.json({ access_token: next, refresh_token: 'rotated-fixture', expires_at: 9999999999 })
  } })
  assert.deepEqual(await Promise.all([manager.get(), manager.get(), manager.get()]), [next, next, next])
  assert.equal(calls, 1); assert.equal(f.state.authRefreshToken, 'rotated-fixture')
})
test('a refresh cannot restore a signed-out session or overwrite another account', async () => {
  for (const replacement of [null, jwt('two', 9999999999)]) {
    const f = fixture()
    const manager = createSessionManager({ storage: f.storage, base: 'https://api.example.test', request: async () => {
      if (replacement) f.state.authToken = replacement
      else await f.storage.remove(['authToken', 'authRefreshToken'])
      return Response.json({ access_token: jwt('one', 9999999999), refresh_token: 'rotated' })
    } })
    assert.equal(await manager.get(), replacement)
    assert.equal(f.state.authToken || null, replacement)
  }
})
test('temporary provider failure keeps credentials; revoked sessions are cleared', async () => {
  const f = fixture()
  let status = 503
  const manager = createSessionManager({ storage: f.storage, base: 'https://api.example.test', request: async () => Response.json({}, { status }) })
  await assert.rejects(manager.get(), /session has been kept/)
  assert.equal(f.state.authRefreshToken, 'refresh-fixture')
  status = 401; assert.equal(await manager.get(), null); assert.equal(f.state.authToken, undefined)
  const legacy = fixture({ authRefreshToken: null })
  assert.equal(await createSessionManager({ storage: legacy.storage, base: '' }).get(), null)
})
