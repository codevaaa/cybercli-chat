import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

const calls = [], usage = []
let mode = 'normal'
mock.module('../llm/gateway.js', { namedExports: { llmGateway: {
  async *complete(options) {
    calls.push(options)
    const provider = mode === 'functional' ? 'apinex' : mode === 'free' ? 'groq' : 'openrouter'
    const model = mode === 'functional' ? options.model.slice(7) : mode === 'free' ? 'llama-3.1-8b-instant' : options.model === 'dossier/frontier' ? 'anthropic/claude-sonnet-4' : 'openai/gpt-4o-mini'
    if (!options.routePolicy(provider, model)) { yield { type: 'error' }; return }
    yield { type: 'route', phase: 'attempt', provider, model, reason: 'primary' }
    yield { type: 'token', content: mode === 'invalid' ? 'not JSON' : mode === 'secret' ? JSON.stringify({ content: 'sk-' + 'x'.repeat(40) }) : '{"content":"source-based result"}' }
    yield { type: 'route', phase: 'success', provider, model, reason: 'primary' }
  },
} } })
mock.module('../../models/UsageLog.js', { defaultExport: { async create(value) { usage.push(value) } } })
const { DossierModels, finalText, modelClass } = await import('./models.js')
const { responseSchema } = await import('./responseSchema.js')

test('all strict response schemas have an object root, and role contracts remain authoritative', async () => {
  for (const role of ['Conductor', 'Designer', 'Frontend', 'Backend', 'Data', 'Builder', 'Judge', 'Judge-cheap', 'Review-1', 'Review-2']) {
    const format = responseSchema(role)
    assert.equal(format.json_schema.schema.type, 'object')
    assert.equal(format.json_schema.schema.additionalProperties, false)
  }
  assert.deepEqual(responseSchema('Frontend', true).json_schema.schema.required, ['replacement'])
  mode = 'normal'
  await new DossierModels().call({ role: 'Frontend', payload: { contract: 'Only frontend/features.py and frontend/contract.json' }, plan: 'pro', userId: 'owner' })
  assert.match(calls.at(-1).messages[0].content, /Only frontend\/features.py/)
  assert.match(calls.at(-1).messages[0].content, /must_never describes PROHIBITED/)
})

test('free unsourced output is never released, and final responses exclude even sourced free-only output', async () => {
  mode = 'free'
  await assert.rejects(() => new DossierModels().call({ role: 'Builder', payload: { prompt: 'notes' }, userId: 'owner', plan: 'pro' }), /approved provider/)
  assert.equal(finalText({ tier: 'free', content: 'unsupported statement' }), null)
  assert.equal(finalText({ tier: 'free', sources: ['a'], content: 'free-only statement' }), null)
  assert.equal(finalText({ tier: 'mid', content: 'verified' }), 'verified')
  assert.equal(modelClass('groq', 'llama-3.1-8b-instant'), 'free')
})
test('frontier is requested only after two same-task failures, respects plans, and records actual route and usage', async () => {
  mode = 'normal'
  const client = new DossierModels(), events = []
  for (const failures of [0, 1, 2]) await client.call({ role: 'Builder', payload: { prompt: 'notes' }, userId: 'owner', plan: 'max', failures, onRoute: event => events.push(event) })
  assert.deepEqual(calls.slice(-3).map(c => c.model), ['dossier/builder', 'dossier/builder', 'dossier/frontier'])
  assert.ok(events.at(-1).reason.startsWith('two_mid_failures'))
  assert.equal(usage.at(-1).metadata.provider, 'openrouter')
  assert.equal(usage.at(-1).metadata.token_estimate, true)
  await assert.rejects(() => client.call({ role: 'Builder', plan: 'pro', failures: 2, payload: {} }), /plan/)
  const judge = await client.call({ role: 'Judge-cheap', plan: 'pro', failures: 20, payload: {}, userId: 'owner' })
  assert.equal(calls.at(-1).model, 'dossier/judge-cheap')
  assert.equal(calls.at(-1).tools, undefined)
  assert.ok(judge.value)
  await assert.rejects(() => client.call({ role: 'Judge', plan: 'pro', payload: {}, exclude: ['openrouter/openai/gpt-4o-mini'], userId: 'owner' }))
})
test('malformed JSON and secret-containing responses fail closed and record a sanitized failure', async () => {
  for (const next of ['invalid', 'secret']) {
    mode = next
    await assert.rejects(() => new DossierModels().call({ role: 'Builder', payload: {}, userId: 'owner', plan: 'pro' }))
    assert.equal(usage.at(-1).status, 'error')
    assert.ok(!JSON.stringify(usage).includes('sk-' + 'x'.repeat(40)))
  }
})

test('judges receive the current bounded PNG, no tools, and only vision-capable approved mid routes', async () => {
  mode = 'normal'
  const image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  await new DossierModels().call({ role: 'Judge', payload: { current_app: 'notes' }, plan: 'pro', userId: 'owner', image })
  const options = calls.at(-1)
  assert.equal(options.messages[1].content[1].image_url.url, `data:image/png;base64,${image.toString('base64')}`)
  assert.equal(options.routePolicy('mistral', 'codestral-latest'), false)
  assert.equal(options.routePolicy('openrouter', 'google/gemini-2.5-flash'), true)
  assert.equal(options.tools, undefined)
  await assert.rejects(() => new DossierModels().call({ role: 'Builder', payload: {}, plan: 'pro', image }), /PNG evidence/)
  await assert.rejects(() => new DossierModels().call({ role: 'Judge', payload: {}, plan: 'pro', image: Buffer.alloc(2000001) }), /bounded/)
})
test('free functional tests require an isolated test process and never alter production paid/frontier rules', async () => {
  const previous = process.env.NODE_ENV
  try {
    process.env.NODE_ENV = 'production'
    assert.throws(() => new DossierModels({ functionalTesting: true }), /isolated test/)
    assert.equal(new DossierModels().functionalTesting, false)
    process.env.NODE_ENV = 'test'; mode = 'functional'
    const client = new DossierModels({ functionalTesting: true }), events = []
    for (const role of ['Frontend', 'Backend', 'Data', 'Judge-cheap', 'Review-2']) {
      const result = await client.call({ role, payload: {}, plan: 'free', userId: 'fixture-owner', failures: 2, onRoute: event => events.push(event) })
      assert.equal(result.tier, 'free'); assert.equal(result.provider, 'apinex')
      assert.equal(calls.at(-1).routePolicy('openrouter', 'openai/gpt-4o-mini'), false)
      assert.equal(calls.at(-1).routePolicy('apinex', 'free/claude-opus-4.6'), false)
      assert.equal(usage.at(-1).metadata.reason, 'isolated_free_functional_test')
    }
    assert.ok(events.every(event => event.reason.startsWith('isolated_free_functional_test:')))
    await assert.rejects(client.call({ role: 'Judge-cheap', payload: {}, plan: 'free', userId: 'fixture-owner', excludeModels: ['free/glm-5.3-flash'] }), /approved provider/)
    mode = 'free'
    await assert.rejects(new DossierModels().call({ role: 'Builder', payload: {}, plan: 'max', userId: 'fixture-owner' }), /approved provider/)
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; mode = 'normal' }
})
