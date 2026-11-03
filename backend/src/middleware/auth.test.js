import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

let identity, apiKeyUser, databasePlan = 'free', banned = false
mock.module('../config/supabase.js', {
  defaultExport: { from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { plan: databasePlan } }) }) }) }) },
  namedExports: { verifyJWT: async () => ({ user: identity }) },
})
mock.module('../models/ApiKey.js', { defaultExport: {
  hashKey: value => value,
  findOne: async () => apiKeyUser ? { user_id: apiKeyUser } : null,
  updateOne: async () => {},
} })
mock.module('../models/CLISession.js', { defaultExport: { findOne: async () => ({ user_id: apiKeyUser, save: async () => {} }) } })
mock.module('../models/User.js', { defaultExport: { findOne: () => ({ select: () => ({ lean: async () => ({ status: banned ? 'banned' : 'active' }) }) }) } })
const { optionalAuth, authenticateCLI, requireAuth } = await import('./auth.js')

function response() {
  return { code: 200, status(code) { this.code = code; return this }, json(body) { this.body = body; return this } }
}

test('optional JWT authentication uses the database plan, ignoring editable user metadata', async () => {
  identity = { id: 'jwt-plan-user', email: 'test@example.test', user_metadata: { plan_tier: 'max' } }
  banned = false
  const req = { headers: { authorization: 'Bearer test-jwt' } }
  let next = false
  await optionalAuth(req, response(), () => { next = true })
  assert.equal(req.user.plan, 'free')
  assert.equal(next, true)
})

test('CLI sessions inherit the account plan instead of receiving pro automatically', async () => {
  apiKeyUser = 'cli-plan-user'
  banned = false
  const req = { headers: { authorization: 'Bearer sk_cyber_test', 'x-cli-session': 'session' } }
  await authenticateCLI(req, response(), () => {})
  assert.equal(req.user.plan, 'free')
})

test('suspended accounts cannot bypass gates through optional API auth or CLI auth', async () => {
  banned = true
  for (const [auth, id] of [[optionalAuth, 'banned-api-user'], [authenticateCLI, 'banned-cli-user']]) {
    apiKeyUser = id
    const res = response()
    let advanced = false
    await auth({ headers: { authorization: 'Bearer sk_cyber_test', 'x-cli-session': 'session' } }, res, () => { advanced = true })
    assert.equal(res.code, 403)
    assert.equal(advanced, false)
  }
})

test('suspended JWT users are rejected on optional routes', async () => {
  identity = { id: 'banned-jwt-user', user_metadata: { plan_tier: 'max' } }
  banned = true
  const res = response()
  await optionalAuth({ headers: { authorization: 'Bearer test-jwt' } }, res, () => assert.fail('must not continue'))
  assert.equal(res.code, 403)
})

test('missing credentials terminate both authentication paths', async () => {
  for (const auth of [requireAuth, authenticateCLI]) {
    const res = response()
    await auth({ headers: {} }, res, () => assert.fail('must not continue'))
    assert.equal(res.code, 401)
  }
})
