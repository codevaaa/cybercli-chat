import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { browserProviders, automaticBrowserModels, publicBrowserModels } from './browserProviders.js'
process.env.RADOX_API_KEY = 'fixture-radox'
process.env.LOGFARE_API_KEY = 'fixture-logfare'
process.env.ANTSEED_API_KEY = 'fixture-antseed'
process.env.ANTSEED_BASE_URL = 'https://gateway.example.test/v1'
process.env.ANTSEED_MODEL = 'seller@fixture-model'
let failure = '', partial = false
const calls = []
mock.module('./keyPool.js', { namedExports: { getKey: provider => ['radox', 'logfare', 'antseed'].includes(provider) ? `fixture-${provider}` : null, hasKeys: () => false, reportSuccess() {}, reportFailure() {} } })
mock.module('openai', { defaultExport: class {
  constructor(options) { this.chat = { completions: { create: async (body, transport) => {
    calls.push({ host: options.baseURL, body, signal: transport?.signal })
    if (options.baseURL.includes(failure) && failure && !partial) throw Object.assign(new Error('Unavailable'), { status: 429 })
    return (async function* () {
      yield { choices: [{ delta: { content: 'A verified response.' }, finish_reason: 'stop' }] }
      if (partial) throw Object.assign(new Error('Interrupted'), { status: 502 })
    })()
  } } } }
} })
const { llmGateway, resolveModelForPlan } = await import('./gateway.js')
const { default: router } = await import('../../routes/models.routes.js')
const app = express(); app.use('/models', router)

test('new providers use configured server routes, preserve cancellation and advertise no secrets', async () => {
  const signal = AbortSignal.timeout(5000)
  const result = await llmGateway.completeNonStream({ model: 'auto', messages: [{ role: 'user', content: 'Hello' }], signal })
  assert.equal(result.provider, 'radox'); assert.equal(calls.at(-1).host, 'https://radoxai.com/v1')
  assert.equal(calls.at(-1).body.model, 'deepseek-v4-flash-0731'); assert.equal(calls.at(-1).signal, signal)
  const list = await request(app).get('/models')
  assert.ok(list.body.models.some(item => item.id === 'antseed/default'))
  assert.ok(!JSON.stringify(list.body).includes('fixture-radox'))
  await request(app).get('/models/logfare%2Fauto').expect(200)
  assert.ok(!automaticBrowserModels().includes('logfare/auto'))
  assert.ok(publicBrowserModels().find(item => item.id === 'logfare/auto').description.includes('research'))
})

test('automatic failover can reach AntSeed but never enters optional Logfare', async () => {
  failure = 'radoxai.com'; const before = calls.length
  const result = await llmGateway.completeNonStream({ model: 'auto', messages: [{ role: 'user', content: 'Review writing' }], task: 'writing' })
  assert.equal(result.provider, 'antseed'); assert.equal(calls.at(-1).body.model, 'seller@fixture-model')
  assert.ok(calls.slice(before).every(call => !call.host.includes('logfare')))
  failure = ''; const manual = await llmGateway.completeNonStream({ model: 'logfare/auto', messages: [{ role: 'user', content: 'Explicit selection' }] })
  assert.equal(manual.provider, 'logfare'); assert.equal(calls.at(-1).body.model, 'logfare/auto')
  partial = true; const count = calls.length
  const interrupted = await llmGateway.completeNonStream({ model: 'radox/default', messages: [{ role: 'user', content: 'Draft' }] })
  assert.ok(interrupted.error); assert.equal(calls.length, count + 1); partial = false
})

test('missing credentials and invalid gateway configuration cannot appear ready or enter automatic routing', async () => {
  for (const value of ['https://antseedstats.com/v1', 'https://user:pass@gateway.test/v1', 'http://public.test/v1', 'https://gateway.test/v1?key=secret', 'not a URL']) {
    process.env.ANTSEED_BASE_URL = value
    assert.equal(browserProviders().find(item => item.provider === 'antseed').configured, false)
  }
  process.env.ANTSEED_BASE_URL = 'http://127.0.0.1:8379/v1'
  assert.equal(browserProviders().find(item => item.provider === 'antseed').configured, true)
  delete process.env.RADOX_API_KEY; delete process.env.LOGFARE_API_KEY; delete process.env.ANTSEED_API_KEY
  assert.deepEqual(automaticBrowserModels(), [])
  assert.notEqual(resolveModelForPlan('auto', 'free', 'Hello'), 'logfare/auto')
  const response = await llmGateway.completeNonStream({ model: 'logfare/auto', messages: [{ role: 'user', content: 'Hello' }] })
  assert.match(response.error, /not configured/)
})
