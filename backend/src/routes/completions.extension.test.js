import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { grammarInput, parseGrammar } from '../services/writing/grammar.js'

const calls = []
let output = JSON.stringify({ tone: 'friendly', language: 'English', issues: [{ original: 'teh', suggestion: 'the', type: 'spelling', start: 4, reason: 'Spelling' }] })
let mode = 'success', streamClosed = false
const auth = (req, res, next) => {
  if (!req.headers.authorization) return res.status(401).json({ error: 'Unauthorized' })
  req.user = { id: req.headers.authorization, plan: req.headers.authorization === 'free' ? 'free' : 'pro' }; next()
}
mock.module('../middleware/auth.js', { namedExports: { requireAuth: auth, optionalAuth: auth } })
mock.module('../services/agents/registry.js', { namedExports: { getPersonaById: () => null } })
mock.module('../models/UserSettings.js', { defaultExport: { findOne: async () => null } })
mock.module('../services/llm/gateway.js', { namedExports: { llmGateway: {
  completeNonStream: async options => { calls.push(options); return { content: output } },
  async *complete(options) {
    calls.push(options)
    try {
      if (mode === 'error') throw new Error('private provider failure')
      if (mode === 'wait') { await new Promise(resolve => options.signal.addEventListener('abort', resolve, { once: true })); return }
      yield { type: 'token', content: 'Hello' }; yield { type: 'done' }; yield { type: 'token', content: 'must not reach client' }
    } finally { streamClosed = true }
  },
} } })
const { default: router } = await import('./completions.routes.js')
const app = express(); app.use(express.json()); app.use('/completions', router)

test('grammar requires auth, bounds text and validates writing goals', async () => {
  await request(app).post('/completions/grammar').send({ text: 'teh' }).expect(401)
  for (const text of [null, [], ' ', 'a'.repeat(6001)]) await request(app).post('/completions/grammar').set('Authorization', 'validation').send({ text }).expect(400)
  assert.deepEqual(grammarInput({ text: 'Hello', goals: { audience: 'expert', formality: '<script>', intent: 'inform', extra: 'ignore' } }), { text: 'Hello', goals: { audience: 'expert', intent: 'inform' } })
})
test('grammar preserves exact Unicode offsets, rejects malformed output and overlapping or invented edits', () => {
  const text = 'हाय teh teh'
  const result = parseGrammar(JSON.stringify({ tone: '<bad>', language: 'English', issues: [
    { original: 'teh', suggestion: 'the', type: 'spelling' }, { original: 'teh', suggestion: 'the', type: 'spelling' },
    { original: 'teh teh', suggestion: 'the', type: 'grammar' }, { original: 'absent', suggestion: 'x', type: 'clarity' },
    { original: 'हाय', suggestion: 'Hello', type: 'unknown' }, null,
  ] }), text)
  assert.deepEqual(result.issues.map(i => [i.start, i.end]), [[4, 7], [8, 11]])
  assert.equal(result.tone, 'neutral')
  for (const content of ['', '{invalid}', '{}', 'null', '{"issues":["invalid"]}']) assert.throws(() => parseGrammar(content, text))
  assert.equal(parseGrammar('```json\n{"issues":[]}\n```', text).issues.length, 0)
})
test('grammar uses account plans, exact source positions and caches per account and goals', async () => {
  const body = { text: 'Hi, teh team.', goals: { audience: 'expert' } }, before = calls.length
  const first = await request(app).post('/completions/grammar').set('Authorization', 'cache-one').send(body).expect(200)
  assert.equal(first.body.issues[0].start, 4); assert.equal(first.body.checkedLength, body.text.length)
  assert.equal(calls.at(-1).plan, 'pro'); assert.match(calls.at(-1).messages[0].content, /expert/)
  assert.equal(calls.at(-1).model, 'auto'); assert.equal(calls.at(-1).task, 'writing')
  assert.ok(calls.at(-1).messages.filter(m => m.role === 'system').every(m => m._skip_inject === true))
  const second = await request(app).post('/completions/grammar').set('Authorization', 'cache-one').send(body).expect(200)
  assert.equal(second.body.cached, true); assert.equal(calls.length, before + 1)
  await request(app).post('/completions/grammar').set('Authorization', 'cache-two').send(body).expect(200)
  assert.equal(calls.length, before + 2)
  output = 'not valid JSON'
  const failed = await request(app).post('/completions/grammar').set('Authorization', 'malformed').send({ text: 'New text' }).expect(502)
  assert.equal(failed.body.issues, undefined)
})
test('grammar checks are rate limited per authenticated account', async () => {
  output = '{"issues":[]}'
  for (let i = 0; i < 30; i++) await request(app).post('/completions/grammar').set('Authorization', 'limited').send({ text: 'Okay' }).expect(200)
  await request(app).post('/completions/grammar').set('Authorization', 'limited').send({ text: 'Okay' }).expect(429)
})
test('chat streaming emits one terminator and honors the authenticated plan', async () => {
  const response = await request(app).post('/completions').set('Authorization', 'chat').send({ messages: [{ role: 'user', content: 'Hello' }] }).expect(200)
  assert.equal(response.text.split('data: [DONE]').length - 1, 1)
  assert.ok(!response.text.includes('must not reach client')); assert.equal(calls.at(-1).plan, 'pro')
  assert.equal(calls.at(-1).signal.aborted, true)
  mode = 'error'
  const failed = await request(app).post('/completions').set('Authorization', 'chat').send({ messages: [{ role: 'user', content: 'Hello' }] }).expect(200)
  assert.ok(!failed.text.includes('private provider failure')); assert.match(failed.text, /Completion unavailable/)
  mode = 'success'
  await request(app).post('/completions').set('Authorization', 'chat').send({ messages: [null] }).expect(400)
})
test('closing a chat stream cancels the underlying provider', async () => {
  mode = 'wait'; streamClosed = false
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)) })
  try {
    const controller = new AbortController()
    const response = await fetch(`http://127.0.0.1:${server.address().port}/completions`, { method: 'POST', headers: { Authorization: 'cancel', 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'Wait' }] }), signal: controller.signal })
    assert.equal(response.status, 200)
    while (!calls.at(-1)?.signal) await new Promise(resolve => setTimeout(resolve, 10))
    controller.abort()
    for (let i = 0; i < 100 && !streamClosed; i++) await new Promise(resolve => setTimeout(resolve, 10))
    assert.equal(streamClosed, true); assert.equal(calls.at(-1).signal.aborted, true)
  } finally { mode = 'success'; server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
})
test('public Madhav model resolves consistently and Council respects account access', async () => {
  await request(app).post('/completions').set('Authorization', 'chat').send({ model: 'madhav', messages: [{ role: 'user', content: 'Hello' }] }).expect(200)
  assert.equal(calls.at(-1).model, 'llm7/deepseek-v3.1:671b-terminus')
  await request(app).post('/completions').set('Authorization', 'free').send({ model: 'council', messages: [{ role: 'user', content: 'Hello' }] }).expect(403)
  await request(app).post('/completions').set('Authorization', 'chat').send({ model: {}, messages: [{ role: 'user', content: 'Hello' }] }).expect(400)
})
test('writing dictionary and goals are validated, and rewrites return a reviewable draft', async () => {
  output = JSON.stringify({ tone: 'neutral', language: 'English', issues: [{ original: 'Codevaa', suggestion: 'Codeva', type: 'spelling' }] })
  const response = await request(app).post('/completions/grammar').set('Authorization', 'dictionary').send({ text: 'Hello Codevaa', dictionary: ['Codevaa', '<script>'], goals: { dialect: 'en-GB' } }).expect(200)
  assert.equal(response.body.issues.length, 0)
  assert.ok(calls.at(-1).messages.some(m => m.content.includes('en-GB')))
  assert.ok(calls.at(-1).messages.some(m => m.content.includes('Codevaa')))
  output = 'Hello team, thank you for your help.'
  const rewritten = await request(app).post('/completions/rewrite').set('Authorization', 'rewrite').send({ text: 'hey team thanks', mode: 'formal' }).expect(200)
  assert.equal(rewritten.body.original, 'hey team thanks'); assert.equal(rewritten.body.rewritten, output)
  assert.equal(calls.at(-1).plan, 'pro'); assert.equal(calls.at(-1).model, 'auto')
  await request(app).post('/completions/rewrite').send({ text: 'Hello', mode: 'formal' }).expect(401)
  await request(app).post('/completions/rewrite').set('Authorization', 'rewrite').send({ text: 'Hello', mode: 'inject' }).expect(400)
  output = ''
  await request(app).post('/completions/rewrite').set('Authorization', 'rewrite').send({ text: 'Hello', mode: 'formal' }).expect(502)
})
