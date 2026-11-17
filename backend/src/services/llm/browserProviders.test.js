import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { browserProviders, automaticBrowserModels, publicBrowserModels, providerModelTier } from './browserProviders.js'

for (const [key, value] of Object.entries({
  SEEK100_API_KEY: 'fixture-seek100',
  SEEK100_MODEL: 'deepseek-v4.1-flash-free',
  SEEK100_TIER: 'free',
  SEEK100_AUTOMATIC: 'true',
  FREEMODEL_API_KEY: 'fixture-freemodel',
  FREEMODEL_MODEL: 'deepseek-v4.1-flash:free',
  FREEMODEL_TIER: 'free',
  FREEMODEL_AUTOMATIC: 'true',
  UNOROUTER_API_KEY: 'fixture-unorouter',
  UNOROUTER_MODEL: 'ling-3.0-flash-vl:free',
  UNOROUTER_TIER: 'free',
  UNOROUTER_AUTOMATIC: 'true',
  RADOX_API_KEY: 'fixture-radox',
  GROQ_API_KEY: 'fixture-groq',
  GROQ_MODEL: 'llama-3.1-8b-instant',
  GROQ_TIER: 'premium',
  GROQ_AUTOMATIC: 'true',
  LLM_AUTOMATIC_FAILOVER: 'true',
})) process.env[key] = value

const providerKeys = new Map([
  ['seek100', 'fixture-seek100'], ['freemodel', 'fixture-freemodel'],
  ['unorouter', 'fixture-unorouter'], ['radox', 'fixture-radox'], ['groq', 'fixture-groq'],
])
let failure = '', partial = false
const calls = []
mock.module('./keyPool.js', { namedExports: {
  getKey: provider => providerKeys.get(provider) || null,
  hasKeys: () => false,
  reportSuccess() {},
  reportFailure() {},
} })
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

test('requested providers use fixed server routes, key pools, and configured model IDs', async () => {
  const signal = AbortSignal.timeout(5000)
  const result = await llmGateway.completeNonStream({ model: 'auto', messages: [{ role: 'user', content: 'Hello' }], signal })
  assert.equal(result.provider, 'seek100')
  assert.equal(calls.at(-1).host, 'https://100milionseek.top/v1')
  assert.equal(calls.at(-1).body.model, 'deepseek-v4.1-flash-free')
  assert.equal(calls.at(-1).signal, signal)
  assert.equal(resolveModelForPlan('auto', 'free', 'Hello'), 'seek100/default')

  const list = await request(app).get('/models')
  assert.ok(list.body.models.some(item => item.id === 'seek100/default'))
  assert.ok(list.body.models.some(item => item.id === 'freemodel/default'))
  assert.ok(!JSON.stringify(list.body).includes('fixture-seek100'))
  assert.deepEqual(automaticBrowserModels().slice(0, 3), ['seek100/default', 'freemodel/default', 'unorouter/default'])
  const radox = publicBrowserModels().find(item => item.id === 'radox/default')
  assert.ok(radox.description.includes('deepseek-v4-flash-0731'))
  assert.equal(radox.tier, 'premium')
  assert.equal(radox.automatic, false)
  assert.equal(browserProviders().find(item => item.provider === 'groq').automatic, false)
  assert.equal(providerModelTier('deepseek-v4.1-flash:free'), 'balanced')
  assert.equal(providerModelTier('deepseek-v4-flash-0731'), 'premium')

  const groq = await llmGateway.completeNonStream({ model: 'groq/default', plan: 'max', messages: [{ role: 'user', content: 'Use Groq' }] })
  assert.equal(groq.provider, 'groq')
  assert.equal(calls.at(-1).host, 'https://api.groq.com/openai/v1')
})

test('automatic failover tries configured requested providers without mixing a partial answer', async () => {
  failure = '100milionseek.top'
  const before = calls.length
  const result = await llmGateway.completeNonStream({ model: 'seek100/default', plan: 'max', messages: [{ role: 'user', content: 'Review writing' }], task: 'writing' })
  assert.equal(result.provider, 'freemodel')
  assert.equal(calls.at(-1).host, 'https://freemodel.in/v1')
  assert.ok(calls.slice(before).some(call => call.host === 'https://100milionseek.top/v1'))
  failure = ''

  partial = true
  const count = calls.length
  const interrupted = await llmGateway.completeNonStream({ model: 'seek100/default', messages: [{ role: 'user', content: 'Draft' }], task: 'writing' })
  assert.ok(interrupted.error)
  assert.equal(calls.length, count + 1)
  partial = false
})

test('missing keys or invalid model IDs are never advertised or selected automatically', async () => {
  const originalModel = process.env.AIHUBMIX_MODEL
  const originalKey = process.env.AIHUBMIX_API_KEY
  const originalTier = process.env.AIHUBMIX_TIER
  const originalAuto = process.env.AIHUBMIX_AUTOMATIC
  const originalSeekModel = process.env.SEEK100_MODEL
  const originalSeekTier = process.env.SEEK100_TIER
  const originalSeekAutomatic = process.env.SEEK100_AUTOMATIC
  process.env.AIHUBMIX_API_KEY = 'fixture-aihubmix'
  process.env.AIHUBMIX_MODEL = 'not a valid model id'
  assert.equal(browserProviders().find(item => item.provider === 'aihubmix').configured, false)

  process.env.AIHUBMIX_MODEL = 'provider-model:free'
  process.env.AIHUBMIX_TIER = 'free'
  process.env.AIHUBMIX_AUTOMATIC = 'false'
  const manualFree = browserProviders().find(item => item.provider === 'aihubmix')
  assert.equal(manualFree.configured, true)
  assert.equal(manualFree.tier, 'free')
  assert.equal(manualFree.automatic, false)

  process.env.AIHUBMIX_AUTOMATIC = 'true'
  assert.equal(browserProviders().find(item => item.provider === 'aihubmix').automatic, true)
  process.env.AIHUBMIX_TIER = 'premium'
  assert.equal(browserProviders().find(item => item.provider === 'aihubmix').automatic, false)
  process.env.AIHUBMIX_TIER = 'unknown-tier'
  assert.equal(browserProviders().find(item => item.provider === 'aihubmix').tier, 'premium')
  assert.equal(browserProviders().find(item => item.provider === 'aihubmix').automatic, false)

  delete process.env.RADOX_API_KEY
  assert.equal(publicBrowserModels().some(item => item.id === 'radox/default'), false)
  assert.notEqual(resolveModelForPlan('auto', 'free', 'Hello'), 'aihubmix/default')

  delete process.env.SEEK100_AUTOMATIC
  process.env.SEEK100_MODEL = 'deepseek-v4.1-flash-free'
  process.env.SEEK100_TIER = 'free'
  assert.equal(browserProviders().find(item => item.provider === 'seek100').automatic, true)
  process.env.SEEK100_MODEL = 'custom-unverified-model'
  assert.equal(browserProviders().find(item => item.provider === 'seek100').automatic, false)
  delete process.env.SEEK100_TIER
  assert.equal(browserProviders().find(item => item.provider === 'seek100').tier, 'premium')

  if (originalModel === undefined) delete process.env.AIHUBMIX_MODEL
  else process.env.AIHUBMIX_MODEL = originalModel
  if (originalKey === undefined) delete process.env.AIHUBMIX_API_KEY
  else process.env.AIHUBMIX_API_KEY = originalKey
  if (originalTier === undefined) delete process.env.AIHUBMIX_TIER
  else process.env.AIHUBMIX_TIER = originalTier
  if (originalAuto === undefined) delete process.env.AIHUBMIX_AUTOMATIC
  else process.env.AIHUBMIX_AUTOMATIC = originalAuto
  if (originalSeekModel === undefined) delete process.env.SEEK100_MODEL
  else process.env.SEEK100_MODEL = originalSeekModel
  if (originalSeekTier === undefined) delete process.env.SEEK100_TIER
  else process.env.SEEK100_TIER = originalSeekTier
  if (originalSeekAutomatic === undefined) delete process.env.SEEK100_AUTOMATIC
  else process.env.SEEK100_AUTOMATIC = originalSeekAutomatic
})
