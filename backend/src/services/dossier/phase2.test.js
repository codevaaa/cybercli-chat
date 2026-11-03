import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PNG } from 'pngjs'
import { extractMaterial, materialAnswer, MATERIAL_ABSENT } from './materials.js'
import { newDossier, installSpec, reviewLine, event } from './domain.js'
import { projectMeter } from '../usage/projectMeter.js'
import { recordedTool, replayEvents } from './tools.js'
import { visualDiff, visualApproval } from './visual.js'
import { localTab } from './tab.js'
import { MemoryStore } from './testFixtures.js'

import { pdfFixture } from './testPdfFixture.js'

test('actual PDF pages and notes are indexed and commerce quotes cite exact source locations; missing material refuses', async () => {
  const pdf = await extractMaterial({ kind: 'pdf', name: 'Commerce.pdf', data_base64: pdfFixture() })
  assert.equal(pdf.chunks.length, 2)
  const notes = await extractMaterial({ kind: 'notes', name: 'Accounts', text: 'Ledger entries record a debit and a credit.' })
  const d = { materials: [pdf, notes] }
  const answer = materialAnswer(d, 'stock inventory')
  assert.equal(answer.citations[0].page, 2)
  assert.equal(answer.answer, answer.citations[0].quote)
  assert.equal(materialAnswer(d, 'ledger entries').citations[0].note_id, notes.chunks[0].note_id)
  assert.deepEqual(materialAnswer(d, 'quantum zebras'), { supported: false, citations: [], answer: MATERIAL_ABSENT })
  await assert.rejects(extractMaterial({ kind: 'pdf', name: 'Bad.pdf', data_base64: Buffer.from('not pdf').toString('base64') }))
  await assert.rejects(extractMaterial({ kind: 'notes', name: 'Secrets', text: 'gsk_' + 'x'.repeat(28) }), /Secret detected/)
  await assert.rejects(extractMaterial({ kind: 'notes', name: '', text: 'abc' }))
})
test('local tab inference has a 100ms budget and only the loopback model endpoint can be called', async () => {
  const calls = []
  const result = await localTab({ prefix: 'const x = ' }, { fetcher: async (url, options) => { calls.push([url, JSON.parse(options.body)]); return { ok: true, json: async () => ({ response: '1;' }) } } })
  assert.equal(result.completion, '1;'); assert.equal(result.budget_ms, 100)
  assert.equal(calls[0][0], 'http://127.0.0.1:11434/api/generate')
  assert.equal(calls[0][1].model, 'qwen2.5-coder:0.5b')
  for (const origin of ['https://free-chat.example/api/generate', 'http://127.0.0.1:3000/api/v1/completions', 'http://localhost:11434/api/generate']) await assert.rejects(localTab({ prefix: '' }, { origin }))
  const slow = await localTab({ prefix: 'x' }, { budget: 10, fetcher: (_url, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')))) })
  assert.equal(slow.timed_out, true); assert.equal(slow.completion, '')
  await assert.rejects(localTab({ prefix: 1 }))
})
test('project attempt counts survive JSON reload and agree with the same persisted event log', () => {
  const d = newDossier('507f1f77bcf86cd799439011', 'Build notes')
  for (const tier of ['mid', 'mid', 'frontier', 'free']) event(d, 'Builder', { kind: 'provider_attempt', tier })
  event(d, 'Builder', { kind: 'provider_failure', tier: 'mid' })
  assert.deepEqual(projectMeter(JSON.parse(JSON.stringify(d)).events), { free: 1, mid: 2, frontier: 1, unit: 'provider_attempts', through_seq: 6 })
})
test('read/search/test overlap, errors and actual outputs are persisted; missing outputs make replay fail', async () => {
  const store = new MemoryStore(), id = '507f1f77bcf86cd799439011'
  await store.create(newDossier(id, 'Build notes'), 'owner')
  const doc = await store.get(id, 'owner'), engine = { mutate: (_doc, change) => store.mutate(id, 'owner', change) }
  let started = 0, release
  const allStarted = new Promise(resolve => { release = resolve })
  const run = async name => { started++; if (started === 3) release(); await allStarted; if (name === 'search') throw new Error('untrusted exception'); return { name, actual: true } }
  await Promise.all(['read', 'search', 'test'].map(name => recordedTool(engine, doc, name, {}, () => run(name))))
  const events = (await store.get(id, 'owner')).data.events
  const replay = replayEvents(events)
  assert.equal(replay.status, 'complete'); assert.equal(replay.steps.length, 3)
  assert.equal(replay.steps[1].status, 'error')
  assert.equal(replayEvents(events.filter(e => e.kind !== 'tool_result')).status, 'failed')
  assert.equal(replayEvents([]).status, 'failed')
})
test('pixel diff is real PNG evidence and a large change needs a bound accepted visual specification', () => {
  const first = new PNG({ width: 4, height: 4 }), second = new PNG({ width: 4, height: 4 })
  first.data.fill(255); second.data.fill(0)
  const diff = visualDiff(PNG.sync.write(first), PNG.sync.write(second))
  assert.equal(diff.ratio, 1); assert.equal(PNG.sync.read(diff.png).width, 4)
  const d = newDossier('507f1f77bcf86cd799439011', 'Build notes')
  installSpec(d, { will_build: ['Show notes'], must_never: [], acceptance: ['Notes exist'] })
  d.state = 'wait_for_user'
  for (const line of Object.values(d.spec).flat()) reviewLine(d, line.id, 'accepted')
  const task = { spec_line_ids: Object.values(d.spec).flat().map(l => l.id) }
  assert.equal(visualApproval(d, task, 1).allowed, false)
  reviewLine(d, d.spec.will_build[0].id, 'edited', 'Redesign the notes layout')
  assert.equal(visualApproval(d, task, 1).allowed, true)
  reviewLine(d, d.spec.will_build[0].id, 'edited', 'Do not redesign the notes layout')
  assert.equal(visualApproval(d, task, 1).allowed, false)
  assert.equal(visualApproval(d, task, 0.01).allowed, true)
})
