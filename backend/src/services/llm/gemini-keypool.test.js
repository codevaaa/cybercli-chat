import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

process.env.GEMINI_API_KEY1 = 'fixture-gemini-one'
process.env.GEMINI_API_KEY2 = 'fixture-gemini-two'
process.env.GEMINI_MODEL = 'gemini-2.5-flash'
delete process.env.LLM_AUTOMATIC_FAILOVER

const keys = ['fixture-gemini-one', 'fixture-gemini-two']
let nextKey = 0
let responseMode = 'text'
const sdkKeys = []
const reported = []

mock.module('./keyPool.js', { namedExports: {
  getKey(provider) {
    if (provider !== 'gemini') return null
    const key = keys[nextKey % keys.length]
    nextKey++
    return key
  },
  hasKeys: provider => provider === 'gemini',
  reportSuccess(provider, key) { reported.push(['success', provider, key]) },
  reportFailure(provider, key, status) { reported.push(['failure', provider, key, status]) },
} })

mock.module('openai', { defaultExport: class { } })
mock.module('@google/genai', { namedExports: {
  GoogleGenAI: class {
    constructor({ apiKey }) {
      sdkKeys.push(apiKey)
      this.models = {
        async generateContent({}) {
          return { text: responseMode === 'text' ? 'Gemini response' : '' }
        },
        async generateContentStream() {
          return (async function* () {
            if (responseMode === 'text') yield { text: 'Gemini stream response' }
          })()
        },
      }
    }
  },
} })

const { llmGateway } = await import('./gateway.js')

const input = { model: 'gemini/gemini-2.5-flash', plan: 'max', messages: [{ role: 'user', content: 'Say hello' }] }

test('streaming Gemini reports success against the key used for the SDK request', async () => {
  responseMode = 'text'
  const chunks = []
  for await (const chunk of llmGateway.complete(input)) chunks.push(chunk)
  assert.equal(sdkKeys.at(-1), 'fixture-gemini-one')
  assert.ok(chunks.some(chunk => chunk.type === 'token' && chunk.content === 'Gemini stream response'))
  assert.deepEqual(reported.at(-1), ['success', 'gemini', sdkKeys.at(-1)])
})

test('empty Gemini stream fails and reports failure against the request key', async () => {
  responseMode = 'empty'
  const chunks = []
  for await (const chunk of llmGateway.complete(input)) chunks.push(chunk)
  assert.equal(sdkKeys.at(-1), 'fixture-gemini-two')
  assert.ok(chunks.some(chunk => chunk.type === 'error'))
  assert.deepEqual(reported.at(-1), ['failure', 'gemini', sdkKeys.at(-1), 502])
})

test('non-stream Gemini reports success against the key used and rejects empty responses', async () => {
  responseMode = 'text'
  const result = await llmGateway.completeNonStream(input)
  assert.equal(sdkKeys.at(-1), 'fixture-gemini-one')
  assert.equal(result.content, 'Gemini response')
  assert.deepEqual(reported.at(-1), ['success', 'gemini', sdkKeys.at(-1)])

  responseMode = 'empty'
  const empty = await llmGateway.completeNonStream(input)
  assert.equal(sdkKeys.at(-1), 'fixture-gemini-two')
  assert.ok(empty.error)
  assert.deepEqual(reported.at(-1), ['failure', 'gemini', sdkKeys.at(-1), 502])
})
