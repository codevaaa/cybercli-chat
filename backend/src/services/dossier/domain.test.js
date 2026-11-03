import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newDossier, installSpec, transition, reviewLine, ready, queueTasks, addFix, judgeInput, validateVerdicts, lintSpec, assertNoSecrets } from './domain.js'
import { previewPath, validateFiles, DockerSandbox, TEST_COMMAND } from './sandbox.js'

const id = '507f1f77bcf86cd799439011'
function accepted() {
  const d = newDossier(id, 'Build a notes app.\r\n  Preserve this spacing 🌏', 'general')
  transition(d, 'spec'); installSpec(d, { will_build: ['Show owner notes'], must_never: ['Expose secrets'], acceptance: ['Notes are visible after login'] }); transition(d, 'wait_for_user')
  for (const line of Object.values(d.spec).flat()) reviewLine(d, line.id, 'accepted')
  return d
}
test('original UTF-8 bytes and hash survive serialization without trimming or normalization', () => {
  const d = accepted(), reloaded = JSON.parse(JSON.stringify(d))
  assert.deepEqual(Buffer.from(reloaded.prompt_original), Buffer.from('Build a notes app.\r\n  Preserve this spacing 🌏'))
  assert.equal(reloaded.prompt_sha256, d.prompt_sha256)
  assert.throws(() => transition(d, 'done'), /Illegal transition/)
  assert.deepEqual(d.events.map(e => e.seq), d.events.map((_, i) => i + 1))
})
test('contradictions and must-never violations block accepted specs; no unreviewed build', () => {
  const d = accepted()
  d.spec.will_build[0].final_text = 'Everyone can see X'
  d.spec.acceptance[0].final_text = 'Only I can see X'
  assert.throws(() => ready(d), /Contradictory/)
  assert.ok(lintSpec({ will_build: [{ id: 'a', text: 'delete user data' }], must_never: [{ id: 'b', text: 'Never delete user data' }], acceptance: [] }).length)
  d.spec.acceptance[0].status = 'rejected'
  assert.throws(() => ready(d), /acceptance line/)
  const other = accepted(); other.spec.will_build[0].status = 'pending'
  assert.throws(() => queueTasks(other), /acceptance/)
  assert.equal(other.tasks.length, 0)
  other.spec.will_build[0].status = 'rejected'
  assert.throws(() => ready(other), /build goal/)
})
test('rejected lines are dropped and edited lines bind real tasks; fixes require review', () => {
  const d = accepted(), rejected = d.spec.must_never[0].id
  reviewLine(d, rejected, 'rejected')
  reviewLine(d, d.spec.will_build[0].id, 'edited', 'Show a list of owner notes')
  reviewLine(d, d.spec.will_build[0].id, 'rejected')
  assert.equal(d.spec.will_build[0].final_text, 'Show a list of owner notes')
  reviewLine(d, d.spec.will_build[0].id, 'accepted')
  queueTasks(d)
  assert.ok(!d.tasks[0].spec_line_ids.includes(rejected))
  assert.equal(d.spec.will_build[0].final_text, 'Show a list of owner notes')
  d.state = 'live'
  const fixId = addFix(d, 'The button must open the notes panel')
  assert.equal(d.state, 'wait_for_user')
  assert.equal(d.prompts_added.at(-1).type, 'fix')
  assert.ok(d.spec.acceptance.some(l => l.id === fixId && l.status === 'pending'))
  assert.throws(() => ready(d), /acceptance/)
})
test('judges receive original/spec/user additions/app evidence, never builder transcript', () => {
  const d = accepted(); queueTasks(d)
  d.tasks[0].diff = [{ after: 'BUILDER SELF REPORT: everything passed' }]
  const input = judgeInput(d, { text: 'Live screen', test: 'test-1' })
  assert.ok(!JSON.stringify(input).includes('BUILDER SELF REPORT'))
  const responses = ['gpt-mini', 'gemini-flash'].map(model => ({ provider: 'router', model, lines: Object.values(d.spec).flat().map(l => ({ id: l.id, verdict: 'pass' })) }))
  assert.equal(validateVerdicts(d, responses), true)
  responses[1].lines.pop(); assert.equal(validateVerdicts(d, responses), false)
  responses[1].lines = responses[0].lines.map(l => ({ ...l, verdict: 'fail' })); assert.equal(validateVerdicts(d, responses), false)
  responses[1].lines = responses[0].lines; responses[1].model = responses[0].model; assert.equal(validateVerdicts(d, responses), false)
})
test('secret detection fails submissions and generated code; external targets/path traversal never accepted', () => {
  const key = 'sk-' + 'x'.repeat(40)
  assert.throws(() => newDossier(id, `Use this ${key}`), /Secret detected/)
  assert.throws(() => assertNoSecrets(key), /Secret detected/)
  for (const value of ['MISTRAL_API_KEY=' + 'a'.repeat(32), 'access_token: ' + 'b'.repeat(48), 'gsk_' + 'c'.repeat(48), 'hf_' + 'd'.repeat(32)]) assert.throws(() => newDossier(id, 'Use ' + value), /Secret detected/)
  for (const value of ['https://external.invalid', '//external.invalid', '/\\outside', '/\nnext']) assert.throws(() => previewPath(value))
  for (const p of ['../escape.py', '/root.py', 'a/../x.py', 'x.sh', '.git/config']) assert.throws(() => validateFiles([{ path: p, content: 'test' }]))
  assert.throws(() => validateFiles([{ path: 'features.py', content: key }]))
  assert.equal(previewPath('/notes?page=2'), '/notes?page=2')
})
test('Docker absence and tester command restrictions fail closed, never execute host code', async () => {
  const commands = []
  const sandbox = new DockerSandbox({ execute: (binary, args, options, done) => {
    commands.push({ binary, args, options })
    queueMicrotask(() => done(Object.assign(new Error('not installed'), { code: 'ENOENT' })))
    return { stdin: { on() {}, end() {} } }
  } })
  await assert.rejects(() => sandbox.ensure(id), /DOCKER_UNAVAILABLE/)
  await assert.rejects(() => sandbox.test(id, 'echo passed'), /allowlisted/)
  assert.equal(commands.length, 1); assert.equal(commands[0].binary, 'docker'); assert.equal(commands[0].options.windowsHide, true)
  assert.equal(TEST_COMMAND, 'python /runtime/runtime.py test')
})
