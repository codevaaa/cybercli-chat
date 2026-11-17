import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

process.env.SEEK100_API_KEY = 'fixture-seek100'
process.env.SEEK100_MODEL = 'deepseek-v4.1-flash-free'
process.env.SEEK100_TIER = 'free'
process.env.SEEK100_AUTOMATIC = 'true'
process.env.OPENROUTER_API_KEY = 'fixture-openrouter'
process.env.OPENROUTER_MODEL = ''
process.env.OPENROUTER_TIER = 'premium'
process.env.OPENROUTER_AUTOMATIC = 'false'
delete process.env.LLM_AUTOMATIC_FAILOVER
delete process.env.LLM_PAID_FALLBACKS

const calls = []
mock.module('./keyPool.js', { namedExports: {
  getKey: provider => ['seek100', 'openrouter'].includes(provider) ? `fixture-${provider}` : null,
  hasKeys: provider => ['seek100', 'openrouter'].includes(provider),
  reportSuccess() {},
  reportFailure() {},
} })

mock.module('openai', { defaultExport: class {
  constructor(options) {
    this.chat = { completions: { create: async () => {
      calls.push(options.baseURL)
      if (options.baseURL.includes('100milionseek')) throw Object.assign(new Error('temporary outage'), { status: 503 })
      return (async function* () { yield { choices: [{ delta: { content: 'Paid fallback should not run.' } }] } })()
    } } }
  }
} })

const { llmGateway, resolveModelForPlan } = await import('./gateway.js')

test('default auto routing stays on the explicitly verified free route', async () => {
  assert.equal(resolveModelForPlan('auto', 'free', 'Hello'), 'seek100/default')
})

test('a free-route failure does not silently spend through OpenRouter', async () => {
  calls.length = 0
  const result = await llmGateway.completeNonStream({
    model: 'seek100/default',
    plan: 'free',
    task: 'writing',
    messages: [{ role: 'user', content: 'Write a short greeting.' }],
  })
  assert.ok(result.error)
  assert.deepEqual(calls, ['https://100milionseek.top/v1'])
})
