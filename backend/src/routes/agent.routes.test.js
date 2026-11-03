import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'

const calls = []
let providerError = false
let streamMode = 'success', streamClosed = false
const auth = (req, res, next) => {
  if (req.headers.authorization !== 'Bearer test-account') return res.status(401).json({ error: 'Unauthorized' })
  req.user = { id: 'test-account', plan: 'pro' }; next()
}
mock.module('../middleware/auth.js', { namedExports: { requireAuth: auth, authenticateCLI: auth } })
mock.module('../services/llm/gateway.js', { namedExports: { llmGateway: {
  async *complete(options) {
    calls.push(options)
    try {
      if (streamMode === 'error') throw new Error('private upstream diagnostic')
      if (streamMode === 'wait') {
        await new Promise(resolve => options.signal.addEventListener('abort', resolve, { once: true }))
        return
      }
      yield { type: 'token', content: 'Hello' }
      yield { type: 'done' }
    } finally { streamClosed = true }
  },
  completeNonStream: async options => {
    calls.push(options)
    return providerError ? { error: 'Provider unavailable' } : { content: null, tool_calls: [{ id: 'call-one', type: 'function', function: { name: 'file_read', arguments: '{"path":"README.md"}' } }], finish_reason: 'tool_calls' }
  },
} } })
const { default: agentRouter } = await import('./agent.routes.js')
const { default: ideRouter } = await import('./ide.routes.js')
const app = express()
app.use(express.json())
app.use('/agent', agentRouter)
app.use('/ide', ideRouter)

test('IDE streaming completes once, sanitizes unexpected failures, and aborts the provider on disconnect', async () => {
  const body = { stream: true, messages: [{ role: 'user', content: 'Hello' }] }
  const response = await request(app).post('/ide/complete').set('Authorization', 'Bearer test-account').send(body).expect(200)
  assert.match(response.text, /Hello/)
  assert.equal(response.text.split('data: [DONE]').length - 1, 1)
  assert.equal(calls.at(-1).signal.aborted, true)
  streamMode = 'error'
  const failed = await request(app).post('/ide/complete').set('Authorization', 'Bearer test-account').send(body).expect(200)
  assert.ok(!failed.text.includes('private upstream diagnostic'))
  assert.match(failed.text, /Completion unavailable/)
  streamMode = 'wait'; streamClosed = false
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)) })
  try {
    const abort = new AbortController()
    const open = await fetch(`http://127.0.0.1:${server.address().port}/ide/complete`, { method: 'POST', headers: { Authorization: 'Bearer test-account', 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: abort.signal })
    assert.equal(open.status, 200)
    const providerSignal = calls.at(-1).signal
    abort.abort()
    for (let attempt = 0; attempt < 100 && !streamClosed; attempt++) await new Promise(resolve => setTimeout(resolve, 10))
    assert.equal(providerSignal.aborted, true)
    assert.equal(streamClosed, true)
  } finally { streamMode = 'success'; server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
})

test('retired hosted run endpoint returns 404 without invoking a provider', async () => {
  const before = calls.length
  await request(app).post('/agent/run').set('Authorization', 'Bearer test-account').send({ goal: 'Inspect workspace' }).expect(404)
  assert.equal(calls.length, before)
})

test('agent and IDE authentication failures return promptly instead of leaving requests open', async () => {
  for (const endpoint of ['/agent/complete', '/ide/complete']) {
    await request(app).post(endpoint).send({ messages: [{ role: 'user', content: 'test' }] }).timeout(1000).expect(401)
  }
})
test('agent and IDE preserve role instructions, account plan and tool-call round trips', async () => {
  for (const endpoint of ['/agent/complete', '/ide/complete']) {
    const response = await request(app).post(endpoint).set('Authorization', 'Bearer test-account').send({
      model: 'codeva/ravan', max_tokens: 1234,
      messages: [{ role: 'system', content: 'Inspect only. Never write files.' }, { role: 'user', content: 'Review README' }],
      tools: [{ type: 'function', function: { name: 'file_read', parameters: { type: 'object' } } }],
    }).expect(200)
    assert.equal(calls.at(-1).messages[0]._skip_inject, true)
    assert.equal(calls.at(-1).messages[0].content, 'Inspect only. Never write files.')
    assert.equal(calls.at(-1).plan, 'pro')
    assert.equal(calls.at(-1).model, 'codeva-ravan-v1')
    assert.equal(calls.at(-1).max_tokens, 1234)
    assert.equal(response.body.choices[0].message.tool_calls[0].id, 'call-one')
  }
})
test('IDE chat customization resolves only curated personas and closed response preferences', async () => {
  const response = await request(app).post('/ide/complete').set('Authorization', 'Bearer test-account').send({
    messages: [{ role: 'user', content: 'Design a service' }],
    agentId: 'backend-architect', responsePreferences: { style: 'detailed', language: 'hi' },
  }).expect(200)
  const system = calls.at(-1).messages.filter(message => message.role === 'system').map(message => message.content).join('\n')
  assert.match(system, /ACTIVE AGENT PERSONA: Backend Architect/)
  assert.match(system, /explain the trade-offs/i)
  assert.match(system, /thoroughly/)
  assert.match(system, /Reply in Hindi/)
  assert.equal(response.body.choices[0].message.tool_calls[0].id, 'call-one')
  const before = calls.length
  await request(app).post('/ide/complete').set('Authorization', 'Bearer test-account').send({
    messages: [{ role: 'user', content: 'Hello' }], agentId: 'not-a-curated-persona',
  }).expect(400)
  assert.equal(calls.length, before)
})
test('invalid messages fail before providers and provider errors never become successful completion text', async () => {
  const before = calls.length
  await request(app).post('/agent/complete').set('Authorization', 'Bearer test-account').send({ messages: [null] }).expect(400)
  assert.equal(calls.length, before)
  providerError = true
  const response = await request(app).post('/agent/complete').set('Authorization', 'Bearer test-account').send({ messages: [{ role: 'user', content: 'test' }] }).expect(502)
  assert.equal(response.body.error, 'Provider unavailable')
  providerError = false
})
