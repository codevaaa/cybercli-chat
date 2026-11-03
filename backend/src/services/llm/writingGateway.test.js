import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { grammarInput, grammarMessages, rewriteMessages, parseGrammar } from '../writing/grammar.js'
const calls = []
let unavailable = false
mock.module('./keyPool.js', { namedExports: { getKey: provider => ['groq', 'openrouter'].includes(provider) ? 'fixture' : null,
  hasKeys: provider => ['groq', 'openrouter'].includes(provider), reportSuccess() {}, reportFailure() {} } })
mock.module('openai', { defaultExport: class {
  constructor(options) {
    this.chat = { completions: { create: async (body, request) => {
      calls.push({ body, request, host: options.baseURL })
      if (unavailable || options.baseURL.includes('groq')) throw Object.assign(new Error('fixture provider rejected'), { status: 401 })
      const proofreading = body.messages.some(message => message.content.includes('proofreader'))
      const content = proofreading ? '{"issues":[{"original":"teh","suggestion":"the","type":"spelling"}]}' : 'Hello team, thank you.'
      return (async function* () { yield { choices: [{ delta: { content }, finish_reason: 'stop' }] } })()
    } } }
  }
} })
const { llmGateway } = await import('./gateway.js')

test('real writing gateway retains its trusted instructions and uses failover for rejected credentials', async () => {
  const signal = AbortSignal.timeout(5000)
  const input = grammarInput({ text: 'Hello teh team', dictionary: ['Codevaa'], goals: { dialect: 'en-GB' } })
  const result = await llmGateway.completeNonStream({ messages: grammarMessages(input), model: 'groq/llama-3.1-8b', plan: 'free', task: 'writing', signal })
  assert.equal(parseGrammar(result.content, input.text).issues.length, 1)
  assert.ok(calls.some(call => call.host.includes('groq'))); assert.ok(calls.some(call => call.host.includes('openrouter')))
  for (const { body, request } of calls) {
    assert.ok(body.messages.some(message => message.content.includes('en-GB')))
    assert.ok(body.messages.some(message => message.content.includes('Codevaa')))
    assert.ok(body.messages.every(message => !Object.hasOwn(message, '_skip_inject')))
    assert.equal(request.signal, signal)
  }
  const rewritten = await llmGateway.completeNonStream({ messages: rewriteMessages({ text: 'hey team thanks', mode: 'formal' }), model: 'groq/llama-3.1-8b', task: 'writing' })
  assert.equal(rewritten.content, 'Hello team, thank you.')
  assert.ok(calls.at(-1).body.messages.some(message => message.content.includes('ONLY the rewritten draft')))
})

test('failed and aborted writing requests report errors instead of returning an empty successful draft', async () => {
  unavailable = true
  const result = await llmGateway.completeNonStream({ messages: grammarMessages({ text: 'teh team', goals: {} }), model: 'groq/llama-3.1-8b', task: 'writing' })
  assert.ok(result.error); assert.equal(result.content, undefined)
  const controller = new AbortController(); controller.abort()
  const aborted = await llmGateway.completeNonStream({ messages: [{ role: 'user', content: 'draft' }], model: 'groq/llama-3.1-8b', task: 'writing', signal: controller.signal })
  assert.match(aborted.error, /cancelled/)
})
