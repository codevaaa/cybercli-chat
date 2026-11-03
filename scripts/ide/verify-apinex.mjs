// Real APINEX acceptance calls, bounded to the six approved service IDs.
// Only synthetic prompts and a locally generated image leave this machine.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import '../../backend/src/config/env.js'
import { llmGateway } from '../../backend/src/services/llm/gateway.js'
import { APINEX_BASE_URL, APINEX_MODELS, apinexId } from '../../backend/src/services/llm/apinex.js'
if (process.env.CODEVA_ACCEPTANCE_PROVIDER_CALLS !== '1') throw new Error('Provider acceptance opt-in required')
if (!process.env.APINEX_API_KEY) throw new Error('Private backend APINEX key required')
const require = createRequire(new URL('../../backend/package.json', import.meta.url))
const { PNG } = require('pngjs'), image = new PNG({ width: 64, height: 64 })
for (let i = 0; i < image.data.length; i += 4) { image.data[i] = 0; image.data[i+1] = 180; image.data[i+2] = 0; image.data[i+3] = 255 }
const picture = `data:image/png;base64,${PNG.sync.write(image).toString('base64')}`
const evidence = { executed_at: new Date().toISOString(), endpoint: APINEX_BASE_URL, scope: 'Real free service routes. Does not certify underlying vendor model identity, paid or frontier dossier acceptance.', models: [] }
const catalog = await fetch(`${APINEX_BASE_URL}/models`, { headers: { Authorization: `Bearer ${process.env.APINEX_API_KEY}` }, signal: AbortSignal.timeout(30000) })
assert.equal(catalog.status, 200)
const available = (await catalog.json()).data.map(m => m.id)
const run = async (entry, name, fn) => {
  const started = Date.now()
  try { const value = await fn(); entry.checks.push({ name, result: 'PASS', latency_ms: Date.now()-started, ...value }) }
  catch (error) { entry.checks.push({ name, result: 'FAIL', latency_ms: Date.now()-started, error: error.message.slice(0, 500) }) }
  await fs.writeFile('artifacts/codeva-editor/apinex-tests.json', JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify({ model: entry.model, check: name, result: entry.checks.at(-1).result }))
}
const stream = async (model, messages, extra = {}) => {
  let text = '', route
  for await (const chunk of llmGateway.complete({ model: apinexId(model), plan: 'free', messages, temperature: 0.1, max_tokens: 800, auditRoutes: true, routePolicy: (provider, id) => provider === 'apinex' && id === model, ...extra })) {
    if (chunk.type === 'error') throw new Error(chunk.content)
    if (chunk.type === 'token') text += chunk.content
    if (chunk.type === 'route' && chunk.phase === 'success') route = chunk
  }
  assert.equal(route?.provider, 'apinex'); assert.equal(route?.model, model); assert.ok(text.trim())
  assert.ok(!text.includes(process.env.APINEX_API_KEY))
  return text
}
const selected = process.env.CODEVA_ACCEPTANCE_MODELS?.split(',') || APINEX_MODELS
assert.ok(selected.every(model => APINEX_MODELS.includes(model)), 'Only approved APINEX service IDs may be tested')
for (const model of selected) {
  const entry = { model, catalog_present: available.includes(model), checks: [] }; evidence.models.push(entry)
  assert.ok(entry.catalog_present, `Service ID missing: ${model}`)
  await run(entry, 'bilingual_stream_and_reasoning', async () => {
    const answer = await stream(model, [{ role: 'user', content: 'Compute 17*19. Reply with 323 and one short greeting in Hindi Devanagari. No Markdown fence.' }])
    assert.match(answer, /323/); assert.match(answer, /[\u0900-\u097f]/)
    return { answer }
  })
  await run(entry, 'strict_structured_output', async () => {
    const schema = { type: 'object', properties: { result: { type: 'integer' }, labels: { type: 'array', items: { type: 'string' } } }, required: ['result', 'labels'], additionalProperties: false }
    const answer = await stream(model, [{ role: 'user', content: 'Return JSON only: result is 17*19; labels is exactly ["English","हिन्दी"].' }], { response_format: { type: 'json_schema', json_schema: { name: 'codeva_acceptance', strict: true, schema } } })
    const parsed = JSON.parse(answer); assert.deepEqual(parsed, { result: 323, labels: ['English', 'हिन्दी'] })
    return { parsed }
  })
  await run(entry, 'tool_call_and_tool_result', async () => {
    const messages = [{ role: 'user', content: 'Use lookup_note with id 7. Do not guess the note.' }]
    const tools = [{ type: 'function', function: { name: 'lookup_note', description: 'Read one synthetic acceptance note', parameters: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'], additionalProperties: false } } }]
    const response = await llmGateway.completeNonStream({ model: apinexId(model), plan: 'free', messages, tools, tool_choice: { type: 'function', function: { name: 'lookup_note' } }, max_tokens: 600 })
    assert.equal(response.provider, 'apinex'); assert.equal(response.model, model)
    const call = response.tool_calls?.[0]; assert.equal(call?.function.name, 'lookup_note'); assert.deepEqual(JSON.parse(call.function.arguments), { id: 7 })
    // No model-produced code or arguments execute. A fixed fixture response is
    // supplied to the OpenAI tool-message protocol for this one accepted call.
    const answer = await stream(model, [...messages, { role: 'assistant', content: null, tool_calls: response.tool_calls }, { role: 'tool', tool_call_id: call.id, content: '{"title":"Codeva fixture seven"}' }])
    assert.match(answer, /Codeva fixture seven/i)
    return { function: call.function.name, answer }
  })
  if (['free/gpt-6-luna', 'free/claude-opus-4.6'].includes(model)) await run(entry, 'current_png_vision', async () => {
    const answer = await stream(model, [{ role: 'user', content: [{ type: 'text', text: 'Name the dominant color in this image. Reply with one English word.' }, { type: 'image_url', image_url: { url: picture } }] }])
    assert.match(answer, /green/i); return { answer }
  })
}
evidence.result = evidence.models.every(m => m.checks.every(c => c.result === 'PASS')) ? 'PASS' : 'FAIL'
await fs.writeFile('artifacts/codeva-editor/apinex-tests.json', JSON.stringify(evidence, null, 2))
if (evidence.result !== 'PASS') process.exitCode = 1
console.log(JSON.stringify({ result: evidence.result, checks: evidence.models.reduce((n, m) => n + m.checks.length, 0) }))
