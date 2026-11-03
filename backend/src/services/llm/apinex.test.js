import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import express from 'express'
let enabled = true, mode = 'ok', abortController
const requests = []
mock.module('./keyPool.js', { namedExports: { getKey: provider => provider !== 'apinex' || enabled ? 'fixture-not-a-secret' : null, hasKeys: provider => provider !== 'apinex' || enabled, reportFailure() {}, reportSuccess() {} } })
mock.module('openai', { defaultExport: class {
  constructor(options) { this.chat = { completions: { create: async (body, transport) => {
    requests.push({ url: options.baseURL, body, timeout: options.timeout, retries: options.maxRetries, signal: transport?.signal })
    if (mode === 'abort') { abortController.abort(); throw new Error('Cancelled') }
    if (options.baseURL.includes('apinex') && mode === 'down') throw Object.assign(new Error('Unavailable'), { status: 429 })
    return (async function* () {
      if (options.baseURL.includes('apinex') && (mode === 'empty' || mode === 'empty-first-two' && body.model !== 'free/deepseek-v4-pro-0813')) return
      if (mode === 'tools') {
        yield { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_fixture', function: { name: 'lookup', arguments: '{"id":' } }] } }] }
        yield { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '7}' } }] }, finish_reason: 'tool_calls' }] }
      } else {
        yield { choices: [{ delta: { content: 'Hello' }, finish_reason: 'stop' }] }
        if (options.baseURL.includes('apinex') && mode === 'partial') throw Object.assign(new Error('Stream interrupted'), { status: 502 })
      }
    })()
  } } } }
} })
const { llmGateway, resolveModelForPlan } = await import('./gateway.js')
const { APINEX_MODELS, apinexId } = await import('./apinex.js')
const { modelClass } = await import('../dossier/modelTier.js')
const router = (await import('../../routes/models.routes.js')).default
const consume = async input => { const output = []; for await (const chunk of llmGateway.complete({ messages: [{ role: 'user', content: 'Hello' }], plan: 'free', auditRoutes: true, ...input })) output.push(chunk); return output }
test('APINEX automatic priority, all exact free IDs and keyless legacy defaults', async () => {
  assert.equal(resolveModelForPlan('auto', 'free'), 'apinex/free/glm-5.3-flash')
  for (const model of APINEX_MODELS) assert.equal(resolveModelForPlan(apinexId(model), 'free'), apinexId(model))
  assert.equal(modelClass('apinex', 'free/claude-opus-4.6'), 'free')
  assert.equal(resolveModelForPlan('auto', 'free', '', { preferApinex: false }), 'groq/llama-3.1-8b')
  enabled = false
  assert.equal(resolveModelForPlan('auto', 'free', 'x'.repeat(450)), 'openrouter/gpt-4o-mini')
  enabled = true
  const result = await consume({ model: 'auto' })
  assert.ok(result.some(c => c.phase === 'success' && c.provider === 'apinex'))
  assert.equal(requests.at(-1).timeout, 60000); assert.equal(requests.at(-1).retries, 0)
})
test('client cancellation stops requests without provider failover; empty backup models cannot self-certify completion', async () => {
  abortController = new AbortController(); mode = 'abort'; const before = requests.length
  const result = await consume({ model: 'auto', signal: abortController.signal })
  assert.equal(requests.length, before+1); assert.equal(requests.at(-1).signal, abortController.signal)
  assert.ok(!result.some(c => c.type === 'done' || c.type === 'error'))
  assert.deepEqual(await consume({ signal: abortController.signal }), [])
  mode = 'empty-first-two'
  const backup = await consume({ model: 'apinex/free/glm-5.3-flash', routePolicy: provider => provider === 'apinex' })
  assert.ok(backup.some(c => c.phase === 'success' && c.model === 'free/deepseek-v4-pro-0813'))
  assert.ok(!backup.some(c => c.phase === 'success' && c.model === 'free/gpt-6-luna'))
  mode = 'ok'
})
test('APINEX unavailable or empty uses OpenRouter next; partial response never mixes providers', async () => {
  for (const failure of ['down', 'empty']) {
    mode = failure; const before = requests.length
    const result = await consume({ model: 'apinex/free/gpt-6-luna' })
    assert.deepEqual(requests.slice(before).map(r => new URL(r.url).hostname), ['api.apinex.bond', 'openrouter.ai'])
    assert.ok(result.some(c => c.phase === 'success' && c.provider === 'openrouter'))
  }
  mode = 'partial'; const before = requests.length
  const result = await consume({ model: 'apinex/free/gpt-6-luna' })
  assert.equal(requests.length, before + 1)
  assert.ok(result.some(c => c.type === 'error'))
  assert.ok(!result.some(c => c.type === 'done'))
  mode = 'ok'
})
test('streamed tool arguments assemble into valid non-stream tool calls; multimodal stays on APINEX', async () => {
  mode = 'tools'
  const result = await llmGateway.completeNonStream({ model: 'auto', messages: [{ role: 'user', content: 'Lookup id 7' }], tools: [{ type: 'function', function: { name: 'lookup', parameters: { type: 'object', properties: { id: { type: 'integer' } } } } }] })
  assert.equal(result.provider, 'apinex'); assert.equal(result.tool_calls[0].function.name, 'lookup')
  assert.deepEqual(JSON.parse(result.tool_calls[0].function.arguments), { id: 7 })
  mode = 'ok'
  await consume({ model: 'apinex/free/claude-opus-4.6', messages: [{ role: 'user', content: [{ type: 'text', text: 'Image?' }, { type: 'image_url', image_url: { url: 'data:image/png;base64,fixture' } }] }] })
  assert.equal(requests.at(-1).body.model, 'free/claude-opus-4.6')
})
test('public model catalog contains IDs only, with encoded detail routes and no credentials', async () => {
  const app = express(); app.use('/models', router)
  const response = await request(app).get('/models')
  assert.equal(response.body.models.filter(m => m.provider === 'APINEX').length, 6)
  assert.equal((await request(app).get(`/models/${encodeURIComponent(apinexId(APINEX_MODELS[0]))}`)).status, 200)
  assert.ok(!JSON.stringify(response.body).includes('fixture-not-a-secret'))
  enabled = false
  assert.equal((await request(app).get('/models')).body.models.filter(m => m.provider === 'APINEX').length, 0)
  enabled = true
})
