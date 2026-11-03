import { test } from 'node:test'
import assert from 'node:assert/strict'
import { workerTick, runWorker } from './worker.js'

test('worker owns an atomic lease, refreshes current plan, persists exactly one step and releases on failure', async () => {
  let query, update, release, count = 0, missingProject = false, missingJob = false, banned = false
  const doc = { _id: 'record', project_id: 'project', user_id: 'owner', data: { project_id: 'project', state: 'build', events: [] } }
  const DossierModel = {
    findOneAndUpdate(q, u) { query = q; update = u; return { lean: async () => missingJob ? null : structuredClone(doc) } },
    async updateOne(q, u) { release = { q, u } },
  }
  const dependencies = { owner: 'worker-1', DossierModel, ProjectModel: { async findOne() { return !missingProject } }, resolvePlan: async () => 'max', resolveBan: async () => banned,
    engine: { async step(value) { count++; assert.equal(value.plan, 'max') } },
    store: { async mutate(id, user, callback, owner) { assert.equal(owner, 'worker-1'); callback(doc.data) } } }
  assert.equal(await workerTick(dependencies), true)
  assert.ok(query.lease_until.$lt instanceof Date)
  assert.ok(query['data.state'].$in.includes('build'))
  assert.equal(update.$set.lease_owner, 'worker-1')
  assert.equal(release.u.$set.lease_owner, null)
  dependencies.engine.step = async () => { throw new Error('process boundary failure') }
  await assert.rejects(() => workerTick(dependencies), /boundary failure/)
  assert.equal(release.u.$set.lease_until.getTime(), 0)
  banned = true
  await workerTick(dependencies)
  assert.equal(doc.data.blocked.reason, 'Account suspended')
  banned = false; doc.data.state = 'build'
  missingProject = true
  await workerTick(dependencies)
  assert.equal(doc.data.state, 'blocked'); assert.equal(count, 1)
  missingJob = true; assert.equal(await workerTick(dependencies), false)
})

test('worker reconnects the existing store before job processing, retries transient errors, and stops at a safe point', async () => {
  const controller = new AbortController(), order = []
  let attempts = 0
  await runWorker({ signal: controller.signal, connect: async () => order.push('connect'), durable: () => order.push('durable'),
    tick: async () => { order.push('tick'); attempts++; if (attempts === 1) throw new Error('database temporarily unavailable'); if (attempts === 3) controller.abort(); return attempts === 3 },
    idle: async () => order.push('idle') })
  assert.deepEqual(order, ['connect', 'durable', 'tick', 'idle', 'tick', 'idle', 'tick'])
})
