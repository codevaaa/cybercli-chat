import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

for (const provider of ['OPENROUTER', 'MISTRAL', 'GROQ', 'GEMINI']) process.env[`${provider}_API_KEY`] = 'fixture-key-not-a-real-credential'
const calls = []
let failFirst = true
let missingPrimary = false
mock.module('./keyPool.js', { namedExports: { getKey: provider => provider === 'apinex' || missingPrimary && provider === 'openrouter' ? null : 'fixture-key-not-a-real-credential', hasKeys: provider => provider !== 'apinex' && !(missingPrimary && provider === 'openrouter'), reportSuccess() {}, reportFailure() {} } })
class FakeOpenAI {
  constructor(options) {
    this.chat = { completions: { create: async body => {
      calls.push({ url: options.baseURL, model: body.model, response_format: body.response_format })
      if (failFirst && options.baseURL.includes('openrouter')) { failFirst = false; throw Object.assign(new Error('fixture provider unavailable'), { status: 429 }) }
      return (async function* () { yield { choices: [{ delta: { content: '{"ok":true}' }, finish_reason: 'stop' }] } })()
    } } }
  }
}
mock.module('openai', { defaultExport: FakeOpenAI })
const { llmGateway, resolveModelForPlan } = await import('./gateway.js')
const { pickModelForPlan } = await import('../../config/plans.js')

test('dossier model requests use the existing gateway and down-provider failover records actual routes', async () => {
  const chunks = []
  for await (const chunk of llmGateway.complete({ model: 'dossier/builder', plan: 'pro', messages: [{ role: 'user', content: 'Build notes' }], auditRoutes: true, routePolicy: (provider, model) => ['openrouter', 'mistral'].includes(provider) && !model.endsWith(':free') })) chunks.push(chunk)
  assert.ok(calls.some(c => c.url.includes('mistral')))
  assert.ok(chunks.some(c => c.type === 'route' && c.phase === 'failure' && c.provider === 'openrouter'))
  assert.ok(chunks.some(c => c.type === 'route' && c.phase === 'success' && c.provider === 'mistral'))
  assert.equal(chunks.filter(c => c.type === 'token').map(c => c.content).join(''), '{"ok":true}')
  assert.ok(!JSON.stringify(chunks).includes('fixture-key'))
})
test('ordinary chat keeps its existing stream contract without dossier audit events', async () => {
  const chunks = []
  for await (const chunk of llmGateway.complete({ model: 'openrouter/gpt-4o-mini', plan: 'free', messages: [{ role: 'user', content: 'Hello' }] })) chunks.push(chunk)
  assert.ok(chunks.some(c => c.type === 'token'))
  assert.ok(!chunks.some(c => c.type === 'route'))
  assert.equal(calls.at(-1).response_format, undefined)
})

test('strict dossier JSON format survives a real gateway fallback without affecting chat options', async () => {
  failFirst = true
  const response_format = { type: 'json_schema', json_schema: { name: 'fixture', strict: true, schema: { type: 'object', properties: {}, required: [], additionalProperties: false } } }
  const before = calls.length
  for await (const chunk of llmGateway.complete({ model: 'dossier/builder', plan: 'pro', messages: [{ role: 'user', content: 'Notes' }], response_format, routePolicy: provider => ['openrouter', 'mistral'].includes(provider) })) {}
  assert.ok(calls.length >= before + 2)
  for (const call of calls.slice(before)) assert.deepEqual(call.response_format, response_format)
})

test('large dossier payloads retain their paid route policy rather than invoking an unaudited direct SDK', async () => {
  const chunks = [], before = calls.length
  for await (const chunk of llmGateway.complete({ model: 'dossier/builder', plan: 'pro', messages: [{ role: 'user', content: 'x'.repeat(40000) }], auditRoutes: true, routePolicy: provider => provider === 'openrouter' })) chunks.push(chunk)
  assert.equal(calls.length, before + 1)
  assert.equal(calls.at(-1).model, 'openai/gpt-4o-mini')
  assert.ok(chunks.some(c => c.type === 'route' && c.phase === 'success'))
})

test('a missing primary key still permits the approved existing fallback and emits its provider identity', async () => {
  missingPrimary = true
  const chunks = []
  for await (const chunk of llmGateway.complete({ model: 'dossier/builder', plan: 'pro', messages: [{ role: 'user', content: 'Build notes' }], auditRoutes: true, routePolicy: provider => ['openrouter', 'mistral'].includes(provider) })) chunks.push(chunk)
  assert.ok(chunks.some(c => c.type === 'route' && c.phase === 'failure' && c.reason === 'provider_key_unavailable'))
  assert.ok(chunks.some(c => c.type === 'route' && c.phase === 'success' && c.provider === 'mistral'))
  missingPrimary = false
})

test('private dossier aliases never become normal chat, CLI or plan-downgrade defaults', () => {
  assert.equal(resolveModelForPlan('auto', 'free', 'x'.repeat(450)), 'openrouter/gpt-4o-mini')
  assert.equal(resolveModelForPlan('dossier/builder', 'free', 'notes'), 'dossier/builder')
  for (const plan of ['free', 'pro', 'max']) for (const tier of ['fast', 'balanced', 'reasoning', 'premium']) assert.ok(!pickModelForPlan(plan, tier).startsWith('dossier/'))
  assert.ok(!resolveModelForPlan('dossier/frontier', 'free', 'notes').startsWith('dossier/'))
})
