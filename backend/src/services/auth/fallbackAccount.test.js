import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { unlink } from 'node:fs/promises'
import mongoose from 'mongoose'
import { findOneAndUpdateDoc, findOneDoc, findDocs } from '../../utils/fallbackDb.js'
import { syncAccountRegistry } from './accountRegistry.js'

test('JSON fallback provisions one complete account under concurrent login and preserves bans', async () => {
  const name = `auth-fixture-${randomUUID()}`
  const file = new URL(`../../../data/${name}.json`, import.meta.url)
  const schema = new mongoose.Schema({ supabase_id: { type: String, unique: true }, status: { type: String, default: 'active' }, plan: { type: String, default: 'free' }, platforms: [String] })
  const store = { findOneAndUpdate: (query, update, options) => findOneAndUpdateDoc(name, query, update, options, schema), findOne: query => findOneDoc(name, query) }
  try {
    const identity = { id: 'fixture-account', email: 'fixture@example.test', auth_profile: { name: 'First', provider: 'google' } }
    await Promise.all(Array.from({ length: 6 }, () => syncAccountRegistry({ store, identity, platform: 'extension' })))
    const docs = await findDocs(name)
    assert.equal(docs.length, 1); assert.equal(docs[0].supabase_id, identity.id)
    assert.equal(docs[0].email, identity.email); assert.equal(docs[0].login_count, 6)
    assert.equal(docs[0].status, 'active'); assert.equal(docs[0].plan, 'free')
    assert.deepEqual(docs[0].platforms, ['extension'])
    identity.auth_profile.name = 'Changed'
    await syncAccountRegistry({ store, identity, platform: 'web' })
    const updated = await store.findOne({ supabase_id: identity.id })
    assert.equal(updated.name, 'First'); assert.deepEqual(updated.platforms, ['extension', 'web'])
    await store.findOneAndUpdate({ supabase_id: identity.id }, { $set: { status: 'banned', ban_reason: 'Suspended fixture' } }, {})
    await assert.rejects(syncAccountRegistry({ store, identity }), error => error.status === 403)
    assert.equal((await findDocs(name)).length, 1)
  } finally { await unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error }) }
})
