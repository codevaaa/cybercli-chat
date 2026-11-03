import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newDossier, reviewLine, addFix } from './domain.js'
import { DossierEngine } from './engine.js'

import { MemoryStore, FakeSandbox, fakeModels } from './testFixtures.js'

async function setup(options) {
  const id = '507f1f77bcf86cd799439011', userId = 'owner'
  const store = new MemoryStore(), sandbox = new FakeSandbox(), models = fakeModels(options)
  await store.create(newDossier(id, '  Build notes\r\n🌏  '), userId)
  const engine = new DossierEngine({ store, sandbox, models })
  await engine.step(await store.get(id, userId)); await engine.step(await store.get(id, userId))
  await store.mutate(id, userId, d => { for (const line of Object.values(d.spec).flat()) reviewLine(d, line.id, 'accepted') })
  await engine.start(id, userId)
  return { id, userId, store, engine, sandbox, models }
}
async function untilStopped(f) {
  for (let n = 0; n < 20; n++) { const doc = await f.store.get(f.id, f.userId); if (['live', 'done', 'blocked', 'wait_for_user'].includes(doc.data.state)) return doc; await f.engine.step(doc) }
  throw new Error('Machine did not stop')
}
test('real transition loop persists every step, keeps builder text out of judges, and recovers a recreated engine', async () => {
  const f = await setup()
  await f.engine.step(await f.store.get(f.id, f.userId))
  assert.equal((await f.store.get(f.id, f.userId)).data.state, 'build')
  f.engine = new DossierEngine({ store: f.store, sandbox: f.sandbox, models: f.models })
  const doc = await untilStopped(f)
  assert.equal(doc.data.state, 'live')
  assert.ok(doc.data.last_green.snapshot)
  assert.equal(doc.data.tasks[0].status, 'tested')
  assert.ok(!JSON.stringify(f.models.inputs.filter(i => i.role.startsWith('Judge'))).includes('BUILDER PRIVATE SELF REPORT'))
  assert.ok(doc.data.events.some(e => e.provider === 'fixture'))
})
test('failed test blocks the next task, listener leaves work running, and a new fix must be accepted', async () => {
  const f = await setup({ multipleTasks: true })
  await f.engine.step(await f.store.get(f.id, f.userId))
  const answer = await f.engine.listener(f.id, f.userId, 'What is running?')
  assert.equal((await f.store.get(f.id, f.userId)).data.state, 'build')
  assert.equal(answer.source.state, 'build')
  f.sandbox.fail = true
  const doc = await untilStopped(f)
  assert.equal(doc.data.state, 'blocked'); assert.equal(doc.data.tasks[0].status, 'failed')
  assert.equal(doc.data.tasks.length, 2); assert.equal(doc.data.tasks[1].status, 'queued')
  assert.equal(f.models.inputs.filter(i => i.role === 'Builder').length, 1)
  assert.equal(f.models.inputs.filter(i => i.role.startsWith('Judge')).length, 0)
  await f.engine.fix(f.id, f.userId, 'Add a retry button')
  assert.equal((await f.store.get(f.id, f.userId)).data.spec.acceptance.at(-1).status, 'pending')
})
test('missing judge line and cheaper-judge disagreement block live/done', async () => {
  for (const options of [{ disagree: true }, { omit: true }]) {
    const f = await setup(options), doc = await untilStopped(f)
    assert.equal(doc.data.state, 'blocked')
    assert.equal(doc.data.last_green, null)
    assert.equal(doc.data.blocked.resume_state, 'build')
    await f.engine.start(f.id, f.userId)
    await f.engine.step(await f.store.get(f.id, f.userId))
    assert.ok(f.models.inputs.filter(i => i.role === 'Builder').at(-1).payload.previous_judge_lines.some(j => j.lines.some(l => l.verdict === 'fail')))
  }
})
test('fix becomes a reviewed/judged line and replays the identical stored click; snapshot covers code/database', async () => {
  const f = await setup(); let doc = await untilStopped(f)
  const click = { path: '/', selector: 'button' }
  await f.store.mutate(f.id, f.userId, d => d.live.push({ id: 'click-1', type: 'click', generation: d.generation, click }))
  const original = structuredClone(doc.data.last_green.snapshot)
  await f.engine.fix(f.id, f.userId, 'Button opens notes')
  await f.store.mutate(f.id, f.userId, d => reviewLine(d, d.spec.acceptance.at(-1).id, 'accepted'))
  await f.engine.start(f.id, f.userId); doc = await untilStopped(f)
  const fixId = doc.data.spec.acceptance.at(-1).id
  assert.ok(doc.data.judge.every(j => j.lines.some(l => l.id === fixId && l.verdict === 'pass')))
  assert.deepEqual(f.sandbox.clicks, [click])
  f.sandbox.database.rows = 999; f.sandbox.files = []
  await f.sandbox.restore(f.id, original)
  assert.equal(f.sandbox.database.rows, 4); assert.ok(f.sandbox.files.length)
})

test('missing provider configuration cannot count as two real mid attempts or prematurely unlock frontier', async () => {
  const f = await setup(), original = f.models.call
  f.models.call = async input => {
    if (input.role === 'Builder') throw Object.assign(new Error('Provider key unavailable'), { status: 503 })
    return original(input)
  }
  for (let i = 0; i < 3; i++) {
    const doc = await untilStopped(f)
    assert.equal(doc.data.state, 'blocked')
    assert.equal(doc.data.tasks[0].attempts, 0)
    await f.engine.start(f.id, f.userId)
  }
})

test('concurrent fixes pause at a safe point and blocked review resumes without starting unaccepted code', async () => {
  const f = await setup()
  await f.engine.step(await f.store.get(f.id, f.userId))
  await f.engine.fix(f.id, f.userId, 'Add a safe open button')
  await f.engine.step(await f.store.get(f.id, f.userId))
  let doc = await f.store.get(f.id, f.userId)
  assert.equal(doc.data.state, 'wait_for_user')
  assert.equal(f.models.inputs.filter(i => i.role === 'Builder').length, 0)
  await f.store.mutate(f.id, f.userId, d => { d.state = 'blocked'; d.blocked = { resume_state: 'wait_for_user', reason: 'Review required' } })
  await f.engine.start(f.id, f.userId)
  doc = await f.store.get(f.id, f.userId)
  assert.equal(doc.data.state, 'wait_for_user')
  assert.equal(doc.data.spec.acceptance.at(-1).status, 'pending')
  assert.equal(f.models.inputs.filter(i => i.role === 'Builder').length, 0)
})

test('a secret in tester output fails the task without persisting or forwarding the raw secret', async () => {
  const f = await setup({ multipleTasks: true })
  const syntheticSecret = 'gsk_' + 'x'.repeat(28)
  f.sandbox.test = async () => ({ exit_code: 0, output: syntheticSecret, tests: [] })
  const doc = await untilStopped(f)
  assert.equal(doc.data.state, 'blocked')
  assert.equal(doc.data.tasks[0].status, 'failed')
  assert.equal(doc.data.tasks[1].status, 'queued')
  assert.equal(doc.data.tasks[0].output.redacted, true)
  assert.equal(doc.data.tasks[0].output.exit_code, 0)
  assert.ok(!JSON.stringify(doc).includes(syntheticSecret))
  assert.equal(f.models.inputs.filter(i => i.role.startsWith('Judge')).length, 0)
})

test('next UI task persists its screenshot diff and blocks an unexpected large visual change', async () => {
  const f = await setup({ multipleTasks: true })
  f.sandbox.compare = async (before, after) => ({ ratio: 0.8, previous_screenshot: before, current_screenshot: after, screenshot: '00000000-0000-0000-0000-000000000001.png', path: 'dossier-artifacts/diff.png' })
  const doc = await untilStopped(f)
  assert.equal(doc.data.state, 'blocked')
  assert.equal(doc.data.tasks[0].status, 'tested')
  assert.equal(doc.data.tasks[1].status, 'failed')
  assert.equal(doc.data.tasks[1].screen.visual_diff.ratio, 0.8)
  assert.equal(doc.data.tasks[1].screen.visual_diff.allowed, false)
  assert.ok(doc.data.tasks[1].screenshot)
  assert.ok(doc.data.events.some(e => e.tool === 'visual_compare' && e.kind === 'tool_result'))
})
