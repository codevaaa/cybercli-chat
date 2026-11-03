import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newDossier, reviewLine, digest } from './domain.js'
import { authorizeTool, initializePhase3, selectDesign, scribeReport, assertEditable, riskPassed } from './roles.js'
import { DockerSandbox } from './sandbox.js'
import { DossierEngine } from './engine.js'
import { decideReview, proposeInline } from './editorReview.js'
import { MemoryStore, FakeSandbox, fakeModels } from './testFixtures.js'
import { cryptoCheck, performanceBudget } from './gates.js'
import { studentDossier, validateClassroom } from './classroom.js'
import { snapshotZip } from './export.js'

test('a failed role waits for its parallel siblings before the worker can release or retry', async () => {
  const f = await setup(), original = f.models.call
  let releaseData, dataStarted, stepFinished = false
  const waiting = new Promise(resolve => { releaseData = resolve }), started = new Promise(resolve => { dataStarted = resolve })
  f.models.call = async input => {
    if (input.role === 'Frontend') throw Object.assign(new Error('Unsupported frontend'), { status: 422 })
    if (input.role === 'Data') { dataStarted(); await waiting }
    return original(input)
  }
  await f.engine.step(await f.get())
  const step = f.engine.step(await f.get()).then(value => { stepFinished = true; return value })
  await started
  await Promise.resolve(); assert.equal(stepFinished, false)
  releaseData(); const doc = await step
  assert.equal(doc.data.state, 'blocked'); assert.equal(f.sandbox.files.length, 0)
  assert.match(doc.data.tasks[0].output.output, /Unsupported frontend/)
})

async function setup() {
  const id = '507f1f77bcf86cd799439011', user = 'owner', store = new MemoryStore(), sandbox = new FakeSandbox(), models = fakeModels()
  await store.create(initializePhase3(newDossier(id, '  Notes\r\n🌏  ')), user)
  const engine = new DossierEngine({ store, sandbox, models })
  const get = () => store.get(id, user)
  await engine.step(await get()); await engine.step(await get())
  await store.mutate(id, user, d => { for (const l of Object.values(d.spec).flat()) reviewLine(d, l.id, 'accepted') })
  await assert.rejects(engine.start(id, user), /Choose one/)
  await store.mutate(id, user, d => selectDesign(d, '1')); await engine.start(id, user)
  return { id, user, store, sandbox, engine, models, get }
}
test('parallel roles are separate, Contract precedes any write, API review and independent test gates precede green', async () => {
  const f = await setup()
  await f.engine.step(await f.get()); await f.engine.step(await f.get())
  let doc = await f.get()
  assert.equal(doc.data.state, 'blocked'); assert.equal(f.sandbox.files.length, 0)
  assert.equal(doc.data.editor_reviews[0].status, 'pending')
  await decideReview(f.engine, doc, f.sandbox, doc.data.editor_reviews[0].id, 'accept')
  await f.engine.step(await f.get()); await f.engine.step(await f.get()); await f.engine.step(await f.get())
  doc = await f.get(); assert.equal(doc.data.state, 'live')
  const report = scribeReport(doc.data)
  assert.ok(report.entries.some(e => e.agent_id === 'Frontend' && e.file === 'frontend/features.py'))
  assert.ok(report.entries.some(e => e.agent_id === 'Backend' && e.file === 'backend/contract.json'))
  assert.ok(doc.data.sources.some(s => s.agent_id === 'App-security' && s.test_id && s.verdict === 'pass'))
  assert.ok(doc.data.design.selected.spec_line_ids.length)
  const green = JSON.stringify(doc.data.last_green)
  await proposeInline(f.engine, doc, f.sandbox, { path: 'frontend/features.py', before_sha256: digest(f.sandbox.files[0].content), selection: { start: 0, end: 3 }, instruction: 'Add a heading' })
  doc = await f.get(); await decideReview(f.engine, doc, f.sandbox, doc.data.editor_reviews.at(-1).id, 'reject')
  assert.equal(JSON.stringify((await f.get()).data.last_green), green)
})
test('UI/API mismatch and wrong role directories cannot merge', async () => {
  const f = await setup(), original = f.models.call
  f.models.call = async args => { const r = await original(args); if (args.role === 'Backend') { const c = JSON.parse(r.value.files[0].content); c.path = '/wrong'; r.value.files[0].content = JSON.stringify(c) } return r }
  await f.engine.step(await f.get()); await f.engine.step(await f.get())
  const doc = await f.get(); assert.equal(doc.data.state, 'blocked'); assert.match(doc.data.blocked.reason, /disagree/); assert.equal(f.sandbox.files.length, 0)
  assert.throws(() => authorizeTool('Frontend', 'test'), /not allowed/)
  assert.throws(() => authorizeTool('Judge', 'write'), /not allowed/)
})
test('preview-down fails after green unit tests, and one model cannot pass a sensitive diff', async () => {
  const f = await setup(); await f.engine.step(await f.get()); await f.engine.step(await f.get())
  const doc = await f.get(), r = doc.data.editor_reviews[0]
  const original = f.models.call
  f.models.call = async args => { const v = await original(args); if (args.role === 'Review-2') v.model = 'Review-1'; return v }
  await decideReview(f.engine, doc, f.sandbox, r.id, 'accept')
  assert.equal(f.sandbox.files.length, 0); assert.match((await f.get()).data.blocked.reason, /different model/)
  f.models.call = original
  const calls = f.models.inputs.length
  await assert.rejects(decideReview(f.engine, await f.get(), f.sandbox, r.id, 'accept'), /failed independent review/)
  assert.equal(f.models.inputs.length, calls); assert.equal(f.sandbox.files.length, 0)
  const preview = await setup()
  await preview.engine.step(await preview.get()); await preview.engine.step(await preview.get())
  const pending = await preview.get()
  await decideReview(preview.engine, pending, preview.sandbox, pending.data.editor_reviews[0].id, 'accept')
  preview.sandbox.health = async () => ({ exit_code: 1, status: 503 })
  await preview.engine.step(await preview.get())
  assert.equal((await preview.get()).data.tasks[0].status, 'failed')
  assert.equal((await preview.get()).data.last_green, null)
})
test('outside target is rejected before executing or opening a socket; crypto refuses plaintext and committed secrets', async () => {
  let executes = 0
  const sandbox = new DockerSandbox({ execute() { executes++; throw new Error('Socket must not open') } })
  await assert.rejects(sandbox.security('507f1f77bcf86cd799439011', { target: 'https://outside.invalid' }), /only this dossier preview/)
  assert.equal(executes, 0)
  assert.equal(cryptoCheck([{ path: 'backend/auth.py', content: 'password="short"' }]).exit_code, 1)
  assert.equal(cryptoCheck([{ path: 'backend/key.js', content: `const key = "sk-${'x'.repeat(40)}"` }]).exit_code, 1)
  assert.equal(cryptoCheck([{ path: 'frontend/ui.py', content: 'password = user_input' }]).exit_code, 0)
})
test('consented student dossiers retain one locked spec, distinct project ids, deadline and training-off policy', async () => {
  const f = await setup(), d = (await f.get()).data
  const c = { _id: 'class', teacher_id: 'teacher', student_ids: ['student-a', 'student-b'], prompt_original: d.prompt_original, locked_spec: d.spec, design: d.design, pack: 'cs', deadline: new Date(Date.now() + 10000), consent: { teacher: false, school: false } }
  assert.throws(() => studentDossier('a', c, { supabase_id: 'student-a', under18: true }), /consent/)
  c.consent.teacher = true
  const a = studentDossier('a', c, { supabase_id: 'student-a', under18: true }), b = studentDossier('b', c, { supabase_id: 'student-b' })
  assert.equal(a.prompt_original, b.prompt_original); assert.notEqual(a.project_id, b.project_id); assert.equal(a.training_opt_in, false)
  assert.throws(() => reviewLine(a, a.spec.acceptance[0].id, 'edited', 'Different spec'), /locked/)
  a.classroom.deadline = new Date(Date.now() - 1).toISOString(); assert.throws(() => assertEditable(a), /deadline/)
  assert.doesNotThrow(() => assertEditable({}))
  const zip = await snapshotZip(d, { files: [{ path: 'frontend/features.py', content: 'def render(user, rows): return "Hello"' }] })
  assert.equal(zip.subarray(0, 2).toString(), 'PK')
  // ZIP includes actual git objects and tracked README, not an empty placeholder.
  for (const name of ['README.md', 'run.py', 'judge-lines.json', '.git/HEAD', 'prompt_original.txt']) assert.ok(zip.includes(Buffer.from(name)))
})
test('classroom validation binds the accepted teacher spec and Perf reads only a measured endpoint budget', async () => {
  const f = await setup(), doc = await f.get()
  const c = validateClassroom(doc, { student_ids: ['a', 'b'], deadline: new Date(Date.now() + 10000).toISOString(), consent: { school: true } })
  assert.deepEqual(c.locked_spec, doc.data.spec); assert.equal(c.consent.school, true)
  assert.throws(() => validateClassroom(doc, { student_ids: ['a', 'a'], deadline: c.deadline }), /distinct/)
  assert.throws(() => validateClassroom(doc, { student_ids: ['a'], deadline: 'bad' }), /future deadline/)
  assert.equal(performanceBudget(doc.data), null)
  doc.data.spec.acceptance[0].final_text = 'List endpoint response within 0.001 ms'
  assert.equal(performanceBudget(doc.data).ms, 0.001)
  assert.equal(performanceBudget(doc.data).spec_line_ids[0], doc.data.spec.acceptance[0].id)
})
