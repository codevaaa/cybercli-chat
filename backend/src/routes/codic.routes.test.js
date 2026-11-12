import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'

const providerCalls = []
const usageCalls = []
const deviceRows = new Map()
let plan = 'pro'
let quota = { monthly_token_limit: 500_000, tokens_used_this_month: 0, resets_at: null }
let providerMode = 'success'
let providerClosed = false

const auth = (req, res, next) => {
  const users = { 'Bearer codic-test': 'user-codic-test', 'Bearer other-user': 'user-other' }
  const id = users[req.headers.authorization]
  if (!id) return res.status(401).json({ error: 'Unauthorized' })
  req.user = { id, plan }
  return next()
}

mock.module('../middleware/auth.js', { namedExports: { requireAuth: auth } })
mock.module('../models/UsageAnalytics.js', {
  defaultExport: {
    getOrCreate: async () => ({
      quota,
      trackUsage: async (...args) => { usageCalls.push(args) },
    }),
  },
})
mock.module('../models/CodicDevice.js', {
  defaultExport: {
    findOneAndUpdate: (filter, update) => ({
      select: () => ({
        lean: async () => {
          const key = `${filter.user_id}:${filter.device_id}`
          const row = {
            device_id: filter.device_id,
            platform: update.$set.platform,
            app_version: update.$set.app_version,
            display_name: update.$set.display_name,
            created_at: new Date('2026-01-01T00:00:00Z'),
            last_seen_at: update.$set.last_seen_at,
            revoked_at: null,
          }
          deviceRows.set(key, row)
          return row
        },
      }),
    }),
    updateOne: async filter => {
      const key = `${filter.user_id}:${filter.device_id}`
      const row = deviceRows.get(key)
      if (!row || row.revoked_at) return { matchedCount: 0 }
      row.revoked_at = new Date()
      return { matchedCount: 1 }
    },
  },
})
mock.module('../services/llm/gateway.js', {
  namedExports: {
    llmGateway: {
      async *complete(options) {
        providerCalls.push(options)
        providerClosed = false
        try {
          if (providerMode === 'error') {
            yield { type: 'error', content: 'upstream secret must not be forwarded' }
            return
          }
          if (providerMode === 'wait') {
            await new Promise(resolve => options.signal.addEventListener('abort', resolve, { once: true }))
            return
          }
          if (providerMode === 'unrequested-tool') {
            yield { type: 'tool_calls_delta', tool_calls: [{ index: 0, id: 'call-2', type: 'function', function: { name: 'shell_exec', arguments: '{}' } }] }
            yield { type: 'finish', finish_reason: 'tool_calls' }
            yield { type: 'done' }
            return
          }
          yield { type: 'info', content: 'Connected.', provider: 'openrouter', model: 'model-x' }
          yield { type: 'token', content: 'Hello' }
          yield { type: 'tool_calls_delta', tool_calls: [{ index: 0, id: 'call-1', type: 'function', function: { name: 'read_', arguments: '{"path":' } }] }
          yield { type: 'tool_calls_delta', tool_calls: [{ index: 0, type: 'function', function: { name: 'file', arguments: '"README.md"}' } }] }
          yield { type: 'finish', finish_reason: 'tool_calls' }
          if (providerMode === 'exact-usage') {
            yield { type: 'usage', usage: { prompt_tokens: 7, completion_tokens: 3 }, provider: 'openrouter', model: 'model-x' }
          }
          yield { type: 'done' }
        } finally {
          providerClosed = true
        }
      },
    },
  },
})

const { default: codicRouter } = await import('./codic.routes.js')
const app = express()
app.use(express.json())
app.use('/codic', codicRouter)

const authorized = request => request.set('Authorization', 'Bearer codic-test')
const authorizedAsOtherUser = request => request.set('Authorization', 'Bearer other-user')
const validTurn = {
  model: 'auto',
  messages: [{ role: 'user', content: 'Inspect this project.' }],
  tools: [{ type: 'function', function: { name: 'read_file', parameters: { type: 'object', properties: {} } } }],
}

test('Codic model catalog is authenticated and marks plan-locked models', async () => {
  await request(app).get('/codic/models').expect(401)
  plan = 'free'
  const free = await authorized(request(app).get('/codic/models')).expect(200)
  assert.equal(free.body.plan, 'free')
  assert.equal(free.body.models.find(model => model.id === 'auto').locked, false)
  assert.equal(free.body.models.find(model => model.id === 'codeva/madhav').locked, true)
  assert.equal(free.body.limits.monthlyTokens.limit, 500_000)
  assert.equal(free.body.limits.monthlyTokens.remaining, 500_000)
  const before = providerCalls.length
  await authorized(request(app).post('/codic/turns').send({ ...validTurn, model: 'codeva/madhav' })).expect(403)
  assert.equal(providerCalls.length, before)
  plan = 'pro'
  const pro = await authorized(request(app).get('/codic/models')).expect(200)
  assert.equal(pro.body.models.find(model => model.id === 'codeva/madhav').locked, false)
})

test('Codic devices register idempotently and can only be revoked by their owner', async () => {
  const deviceId = '8ecfdac0-7589-4dc1-9d14-2df3a0f82d7a'
  const registered = await authorized(request(app).post('/codic/devices').send({
    deviceId, platform: 'windows', appVersion: '0.1.0', displayName: 'Development PC',
  })).expect(200)
  assert.equal(registered.body.device.device_id, deviceId)
  assert.equal(registered.body.device.platform, 'windows')
  assert.equal(registered.body.device.token, undefined)
  await authorizedAsOtherUser(request(app).delete(`/codic/devices/${deviceId}`)).expect(404)
  await authorized(request(app).post('/codic/devices').send({ deviceId, platform: 'bad-os', appVersion: '0.1.0' })).expect(400)
  await authorized(request(app).post('/codic/devices').send({ deviceId, platform: 'windows', appVersion: '0.1' })).expect(400)
  await authorized(request(app).delete(`/codic/devices/${deviceId}`)).expect(200, { revoked: true, deviceId })
  await authorized(request(app).delete(`/codic/devices/${deviceId}`)).expect(404)
  await authorized(request(app).delete('/codic/devices/not-a-uuid')).expect(400)
})

test('Codic turn validates input before gateway calls and rejects unknown models', async () => {
  const before = providerCalls.length
  await request(app).post('/codic/turns').send(validTurn).expect(401)
  await authorized(request(app).post('/codic/turns').send({ messages: [] })).expect(400)
  await authorized(request(app).post('/codic/turns').send({ ...validTurn, model: 'dossier/frontier' })).expect(400)
  await authorized(request(app).post('/codic/turns').send({
    ...validTurn,
    tool_choice: { type: 'function', function: { name: 'missing' } },
  })).expect(400)
  assert.equal(providerCalls.length, before)
})

test('Codic SSE normalizes text and assembled tool calls and labels estimated usage', async () => {
  quota = { monthly_token_limit: 500_000, tokens_used_this_month: 0, resets_at: null }
  providerMode = 'success'
  const response = await authorized(request(app).post('/codic/turns').send({ ...validTurn, system: 'Be concise.' })).expect(200)
  const events = response.text.split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)))
  assert.ok(events.some(event => event.type === 'text' && event.text === 'Hello'))
  assert.ok(events.some(event => event.type === 'tool_call' && event.toolCall.id === 'call-1' && event.toolCall.name === 'read_file' && event.toolCall.input.path === 'README.md'))
  assert.ok(events.some(event => event.type === 'usage' && event.estimated === true && event.source === 'character_count'))
  assert.ok(events.some(event => event.type === 'done' && event.reason === 'tool_calls'))
  assert.equal(providerCalls.at(-1).plan, 'pro')
  assert.equal(providerCalls.at(-1).messages[0]._skip_inject, true)
  assert.equal(providerCalls.at(-1).tools[0].function.name, 'read_file')
  assert.equal(usageCalls.at(-1)[1], 'openrouter')
})

test('Codic forwards provider usage when the gateway supplies exact counts', async () => {
  providerMode = 'exact-usage'
  const response = await authorized(request(app).post('/codic/turns').send(validTurn)).expect(200)
  const events = response.text.split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)))
  assert.ok(events.some(event => event.type === 'usage' && event.inputTokens === 7 && event.outputTokens === 3 && event.estimated === false))
  assert.equal(usageCalls.at(-1)[2], 7)
  assert.equal(usageCalls.at(-1)[3], 3)
  providerMode = 'success'
})

test('Codic rejects tool calls that were not declared by the client', async () => {
  providerMode = 'unrequested-tool'
  const response = await authorized(request(app).post('/codic/turns').send(validTurn)).expect(200)
  const events = response.text.split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)))
  assert.equal(events.some(event => event.type === 'tool_call'), false)
  assert.ok(events.some(event => event.type === 'error' && event.error.code === 'INVALID_TOOL_CALL'))
  assert.ok(events.some(event => event.type === 'done' && event.reason === 'error'))
  providerMode = 'success'
})

test('Codic quota exhaustion prevents provider calls', async () => {
  quota = { monthly_token_limit: 10, tokens_used_this_month: 10, resets_at: null }
  const before = providerCalls.length
  const response = await authorized(request(app).post('/codic/turns').send(validTurn)).expect(429)
  assert.equal(response.body.quota.remaining, 0)
  assert.equal(providerCalls.length, before)
  quota = { monthly_token_limit: 500_000, tokens_used_this_month: 0, resets_at: null }
})

test('Codic provider failures are sanitized and disconnect cancels the gateway stream', async () => {
  providerMode = 'error'
  const failed = await authorized(request(app).post('/codic/turns').send(validTurn)).expect(200)
  assert.ok(failed.text.includes('PROVIDER_UNAVAILABLE'))
  assert.ok(!failed.text.includes('upstream secret'))

  providerMode = 'wait'
  providerClosed = false
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
  })
  try {
    const controller = new AbortController()
    const pending = fetch(`http://127.0.0.1:${server.address().port}/codic/turns`, {
      method: 'POST',
      headers: { Authorization: 'Bearer codic-test', 'Content-Type': 'application/json' },
      body: JSON.stringify(validTurn),
      signal: controller.signal,
    })
    const response = await pending
    assert.equal(response.status, 200)
    controller.abort()
    for (let index = 0; index < 100 && !providerClosed; index += 1) await new Promise(resolve => setTimeout(resolve, 10))
    assert.equal(providerClosed, true)
  } finally {
    providerMode = 'success'
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
})
