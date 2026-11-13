import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

process.env.CLOUDFLARE_ACCOUNT_ID = 'fixture-account'
const calls = []
let configuredProviders = new Set(['cloudflare'])

mock.module('./keyPool.js', { namedExports: {
  getKey: provider => configuredProviders.has(provider) ? `fixture-${provider}-key` : null,
  hasKeys: () => false,
  reportSuccess() {},
  reportFailure() {},
} })
mock.module('openai', { defaultExport: class {
  constructor(options) {
    this.chat = { completions: { create: async body => {
      calls.push({ host: options.baseURL, model: body.model })
      if (options.baseURL.includes('cloudflare') && body.model.includes('llama')) throw Object.assign(new Error('Provider unavailable'), { status: 503 })
      return (async function* () {
        yield { choices: [{ delta: { content: 'Recovered through the secondary route.' }, finish_reason: 'stop' }] }
      })()
    } } }
  }
} })

const { llmGateway } = await import('./gateway.js')

test('Codic text requests recover through a second configured Cloudflare model after the primary fails', async () => {
  calls.length = 0
  const events = []
  for await (const event of llmGateway.complete({
    model: 'codeva/abhimanyu',
    plan: 'pro',
    messages: [{ role: 'user', content: 'Explain this small coding change.' }],
  })) events.push(event)

  assert.deepEqual(calls.map(call => call.model), [
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    '@cf/qwen/qwq-32b-preview',
  ])
  assert.ok(events.some(event => event.type === 'token' && event.content === 'Recovered through the secondary route.'))
  assert.ok(events.some(event => event.type === 'done'))
  assert.ok(!events.some(event => event.type === 'error'))
})

test('a missing primary model credential still enters the configured provider fallback chain', async () => {
  configuredProviders = new Set(['groq'])
  calls.length = 0
  const events = []
  for await (const event of llmGateway.complete({
    model: 'codeva/abhimanyu',
    plan: 'pro',
    messages: [{ role: 'user', content: 'Explain this small coding change.' }],
  })) events.push(event)

  assert.ok(calls.some(call => call.host === 'https://api.groq.com/openai/v1'))
  assert.ok(events.some(event => event.type === 'token' && event.content === 'Recovered through the secondary route.'))
  assert.ok(events.some(event => event.type === 'done'))
  assert.ok(!events.some(event => event.type === 'error'))
})
