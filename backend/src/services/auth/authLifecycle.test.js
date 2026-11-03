import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createAuthAvailability } from './availability.js'
import { syncAccountRegistry } from './accountRegistry.js'

test('unreachable auth projects fail clearly, requests coalesce, and restoration is detected', async () => {
  let time = 0, resolves = 0, healthy = false
  const check = createAuthAvailability({ url: 'https://auth.example.test', now: () => time,
    resolve: async () => { resolves++; if (!healthy) throw new Error('ENOTFOUND') },
    request: async () => new Response('{}'),
  })
  const [first, second] = await Promise.all([check(), check()])
  assert.equal(first.ready, false); assert.equal(second.code, 'AUTH_PROJECT_UNAVAILABLE'); assert.equal(resolves, 1)
  assert.ok(!JSON.stringify(first).includes('auth.example.test'))
  healthy = true; time = 6000
  assert.equal((await check()).ready, true)
  await check(); assert.equal(resolves, 2)
})
test('auth availability handles missing configuration, invalid origins and HTTP outages', async () => {
  assert.equal((await createAuthAvailability()()).code, 'AUTH_NOT_CONFIGURED')
  for (const url of ['not a url', 'http://external.test']) assert.equal((await createAuthAvailability({ url })()).ready, false)
  const check = createAuthAvailability({ url: 'https://auth.example.test', key: 'private-fixture', resolve: async () => {}, request: async (_url, options) => {
    assert.equal(options.headers.apikey, 'private-fixture'); return new Response('', { status: 503 })
  } })
  assert.equal((await check()).ready, false)
})
test('account provisioning uses a guarded atomic upsert and never accepts role or plan metadata', async () => {
  let call
  const store = { findOneAndUpdate: async (...args) => { call = args; return { status: 'active', plan: 'free' } } }
  const user = await syncAccountRegistry({ store, identity: { id: 'account', email: 'person@example.test', plan: 'max', auth_profile: { name: 'Person', provider: 'google' } }, platform: 'extension' })
  assert.equal(user.plan, 'free'); assert.equal(call[0].supabase_id, 'account')
  assert.deepEqual(call[0].status.$nin, ['banned', 'suspended'])
  assert.equal(call[1].$setOnInsert.plan, undefined)
  assert.equal(call[1].$setOnInsert.provider, 'google'); assert.equal(call[1].$addToSet.platforms, 'extension')
  assert.equal(call[2].upsert, true)
})
test('a concurrent account creation retries without upsert, while banned accounts stay banned', async () => {
  let calls = 0
  const store = { findOneAndUpdate: async (_query, _update, options) => {
    if (++calls === 1) throw Object.assign(new Error('duplicate'), { code: 11000 })
    assert.equal(options.upsert, undefined); return { status: 'active' }
  }, findOne: async () => ({ status: 'active' }) }
  assert.equal((await syncAccountRegistry({ store, identity: { id: 'account' } })).status, 'active')
  for (const status of ['banned', 'suspended']) {
    store.findOneAndUpdate = async () => { throw Object.assign(new Error('duplicate'), { code: 11000 }) }
    store.findOne = async () => ({ status })
    await assert.rejects(syncAccountRegistry({ store, identity: { id: 'account' } }), error => error.status === 403)
  }
  store.findOne = async () => null
  store.findOneAndUpdate = async (_query, _update, options) => { if (options.upsert) throw Object.assign(new Error('duplicate'), { code: 11000 }); return null }
  await assert.rejects(syncAccountRegistry({ store, identity: { id: 'account' } }), error => error.status === 503)
  await assert.rejects(syncAccountRegistry({ store, identity: {} }), error => error.status === 401)
  store.findOneAndUpdate = async () => { throw new Error('Database unavailable') }
  await assert.rejects(syncAccountRegistry({ store, identity: { id: 'account' } }), /Database unavailable/)
})
