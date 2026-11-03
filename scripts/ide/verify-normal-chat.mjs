// Real existing chat route, API-key authentication, Mongo and provider response.
// Temporary account registry lives only in the isolated test database.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { randomUUID, randomBytes } from 'node:crypto'
const require = createRequire(new URL('../../backend/package.json', import.meta.url))
if (process.env.CODEVA_ACCEPTANCE_PROVIDER_CALLS !== '1') throw new Error('Explicit provider integration opt-in required')
const mongoose = require('mongoose'), express = require('express'), { MongoMemoryServer } = require('mongodb-memory-server')
const mongo = await MongoMemoryServer.create({ instance: { dbName: 'codeva_chat_acceptance' } })
process.env.MONGODB_URI = mongo.getUri()
// This API-key test does not certify Supabase JWT login or a paid subscription.
process.env.SUPABASE_URL = 'http://127.0.0.1:9'
process.env.SUPABASE_SERVICE_KEY = 'acceptance-auth-unavailable-no-real-secret'
await import('../../backend/src/config/env.js'); await mongoose.connect(process.env.MONGODB_URI)
const User = (await import('../../backend/src/models/User.js')).default
const ApiKey = (await import('../../backend/src/models/ApiKey.js')).default
const Message = (await import('../../backend/src/models/Message.js')).default
const router = (await import('../../backend/src/routes/chat.routes.js')).default
const ideRouter = (await import('../../backend/src/routes/ide.routes.js')).default
const userId = randomUUID(), key = `sk_cyber_${randomBytes(24).toString('hex')}`
await User.create({ supabase_id: userId, name: 'Isolated acceptance account' })
await ApiKey.create({ user_id: userId, name: 'Temporary acceptance', key_hash: ApiKey.hashKey(key), key_prefix: key.slice(0, 15), last4: key.slice(-4) })
const app = express(); app.use(express.json()); app.use('/api/v1/chat', router); app.use('/api/v1/ide', ideRouter)
const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)) })
const base = `http://127.0.0.1:${server.address().port}/api/v1/chat`
const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
const evidence = { executed_at: new Date().toISOString(), scope: 'Existing API-key auth and standard chat; isolated real Mongo; real configured provider. Supabase login not certified.' }
const requestedModel = process.env.CODEVA_ACCEPTANCE_MODEL || 'auto'
try {
  assert.equal((await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401)
  const created = await fetch(base, { method: 'POST', headers, body: JSON.stringify({ title: 'Owned acceptance', model_id: requestedModel, mode: 'standard' }) })
  assert.equal(created.status, 200)
  const thread = await created.json()
  const response = await fetch(`${base}/${thread._id}/messages`, { method: 'POST', headers, signal: AbortSignal.timeout(120000), body: JSON.stringify({ model: requestedModel, messages: [{ role: 'user', content: 'Reply with only: Hello from Codeva.' }] }) })
  assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /text\/event-stream/)
  const stream = await response.text(), chunks = stream.split('\n').filter(line => line.startsWith('data: {')).map(line => JSON.parse(line.slice(6)))
  assert.ok(!chunks.some(c => c.type === 'error'), 'Standard chat returned a provider error')
  const answer = chunks.filter(c => c.type === 'token').map(c => c.content).join('')
  assert.ok(answer.trim()); assert.ok(stream.includes('data: [DONE]'))
  const stored = await Message.find({ thread_id: thread._id, user_id: userId }).lean()
  assert.ok(stored.some(m => m.role === 'assistant' && m.content === answer))
  const saved = stored.find(m => m.role === 'assistant' && m.content === answer)
  assert.ok(saved.model && saved.provider, 'Persist the actual provider/model after failover')
  if (requestedModel.startsWith('apinex/') && saved.provider !== 'apinex') assert.notEqual(saved.model, requestedModel, 'Failover must not store the requested model as the responding model')
  Object.assign(evidence, { result: 'PASS', answer, persisted_messages: stored.length, requested_model: requestedModel, actual_model: saved.model, actual_provider: saved.provider })
  const ideBase = base.replace(/\/chat$/, '/ide')
  const hindi = await fetch(`${ideBase}/complete`, { method: 'POST', headers, signal: AbortSignal.timeout(120000), body: JSON.stringify({ model: requestedModel, agentId: 'backend-architect', responsePreferences: { style: 'concise', language: 'hi' }, messages: [{ role: 'user', content: 'Explain an API in one brief sentence.' }] }) })
  assert.equal(hindi.status, 200)
  const hindiResult = await hindi.json()
  assert.match(hindiResult.choices[0].message.content, /[\u0900-\u097f]/, 'Real IDE route must honor the selected Hindi response preference')
  evidence.ide_preferences = { result: 'PASS', model: hindiResult.model, answer: hindiResult.choices[0].message.content }
  const toolMessages = [{ role: 'user', content: 'Use lookup_label to retrieve the label with id 7. Do not guess its value.' }]
  const tools = [{ type: 'function', function: { name: 'lookup_label', description: 'Read the label for the given test id.', parameters: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'], additionalProperties: false } } }]
  const toolResponse = await fetch(`${ideBase}/complete`, { method: 'POST', headers, signal: AbortSignal.timeout(120000), body: JSON.stringify({ model: requestedModel, messages: toolMessages, tools, tool_choice: 'required' }) })
  assert.equal(toolResponse.status, 200)
  const toolResult = await toolResponse.json(), message = toolResult.choices[0].message, tool = message.tool_calls?.[0]
  assert.equal(tool?.function.name, 'lookup_label')
  assert.equal(JSON.parse(tool.function.arguments).id, 7)
  const marker = 'CODEVA_' + randomBytes(8).toString('hex')
  const followup = await fetch(`${ideBase}/complete`, { method: 'POST', headers, signal: AbortSignal.timeout(120000), body: JSON.stringify({ model: requestedModel, messages: [...toolMessages, message, { role: 'tool', tool_call_id: tool.id, content: JSON.stringify({ label: marker }) }] }) })
  assert.equal(followup.status, 200)
  const followupResult = await followup.json()
  assert.ok(followupResult.choices[0].message.content.includes(marker), 'The actual API/provider must consume the tool result')
  evidence.ide_tool_roundtrip = { result: 'PASS', model: toolResult.model, tool: tool.function.name, result_consumed: true, scope: 'Read-only synthetic lookup result, not local file/tool execution' }
} catch (error) { evidence.result = 'FAIL'; evidence.error = error.message; process.exitCode = 1 }
finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); await mongo.stop(); await fs.writeFile('artifacts/codeva-editor/normal-chat.json', JSON.stringify(evidence, null, 2)) }
console.log(JSON.stringify(evidence))
