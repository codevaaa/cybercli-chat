import { test } from 'node:test'
import assert from 'node:assert/strict'
import { callLocal, gatewayUrl } from './localGateway.js'

test('on-prem gateway is private and never falls back to a public provider', async () => {
  assert.throws(() => gatewayUrl('https://api.openai.com/v1/chat/completions'), /private/)
  assert.throws(() => gatewayUrl('http://local-gateway:11434/other'), /private/)
  const calls = [], events = []
  const result = await callLocal({ role: 'Frontend', payload: { spec: [] }, onRoute: e => events.push(e) }, { origin: 'http://local-gateway:11434/v1/chat/completions', fetcher: async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify({ choices: [{ message: { content: '{"files":[]}' } }] })) } })
  assert.equal(result.provider, 'local'); assert.equal(result.tier, 'local'); assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'http://local-gateway:11434/v1/chat/completions'); assert.equal(calls[0].init.redirect, 'error'); assert.equal(events.length, 2)
  await assert.rejects(callLocal({ role: 'Review-2', payload: {}, excludeModels: ['llama3.2:3b'] }, { origin: calls[0].url }), /different local model/)
  await assert.rejects(callLocal({ role: 'Frontend', payload: {} }, { origin: calls[0].url, fetcher: async () => new Response('', { status: 503 }) }), /no public fallback/)
  await assert.rejects(callLocal({ role: 'Judge', payload: {}, image: Buffer.from('bad') }, { origin: calls[0].url }), /local vision model/)
})
