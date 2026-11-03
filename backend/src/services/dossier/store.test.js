import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { newDossier, transition } from './domain.js'
let fallback = false, stored, missCAS = false
mock.module('../../utils/fallbackDb.js', { namedExports: { useFallbackMode: () => fallback } })
mock.module('../../models/Dossier.js', { defaultExport: {
  async create(doc) { stored = { _id: 'record', revision: 0, ...doc }; return structuredClone(stored) },
  findOne(query) { return { lean: async () => stored && stored.project_id === query.project_id && stored.user_id === query.user_id ? structuredClone(stored) : null } },
  findOneAndUpdate(query, update) { return { lean: async () => {
    if (missCAS || stored.revision !== query.revision) return null
    stored.data = structuredClone(update.$set.data); stored.revision++; return structuredClone(stored)
  } } },
} })
const { DossierStore, assertDurableStore } = await import('./store.js')
test('existing Mongo store gets append-only events and CAS revisions; original prompt/history cannot be overwritten', async () => {
  const store = new DossierStore()
  await store.create(newDossier('project', ' exact\r\n🌏 '), 'owner', 'pro')
  await store.mutate('project', 'owner', d => transition(d, 'spec'))
  assert.equal(stored.revision, 1); assert.equal(stored.data.state, 'spec')
  await assert.rejects(() => store.get('project', 'other'), /not found/)
  await assert.rejects(() => store.mutate('project', 'owner', d => { d.prompt_original = 'summary' }), /immutable/)
  await assert.rejects(() => store.mutate('project', 'owner', d => { d.events[0].state = 'done' }), /immutable/)
  missCAS = true; await assert.rejects(() => store.mutate('project', 'owner', () => {}), /Concurrent/); missCAS = false
})
test('leases reject stale workers and JSON fallback cannot pretend to support durable concurrent workers', async () => {
  const store = new DossierStore()
  stored.lease_owner = 'valid'; stored.lease_until = new Date(Date.now() + 10000)
  await assert.rejects(() => store.mutate('project', 'owner', () => {}, 'stale'), /lease/)
  await store.mutate('project', 'owner', () => {}, 'valid')
  stored.lease_until = new Date(0)
  await assert.rejects(() => store.mutate('project', 'owner', () => {}, 'valid'), /lease/)
  fallback = true
  assert.throws(() => assertDurableStore(), /existing MongoDB/)
  await assert.rejects(() => store.get('project', 'owner'))
  fallback = false
})

test('a result arriving after a classroom deadline cannot change tasks, judges or last green', async () => {
  const store = new DossierStore()
  await store.create(newDossier('project', 'Locked deadline'), 'owner', 'pro')
  stored.data.classroom = { deadline: new Date(Date.now() - 1).toISOString() }
  const revision = stored.revision
  for (const key of ['tasks', 'judge', 'last_green', 'design', 'generation']) {
    await assert.rejects(store.mutate('project', 'owner', d => { d[key] = key === 'generation' ? 1 : { late: true } }), /deadline/)
    assert.equal(stored.revision, revision)
  }
  await store.mutate('project', 'owner', d => { d.deadline_snapshot = { frozen: true } })
  assert.deepEqual(stored.data.deadline_snapshot, { frozen: true })
})
