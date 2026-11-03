import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

const requests = []
let behavior = 'ok'
process.env.BRAHMA_API_KEY = 'local-test-key'
process.env.BRAHMA_BASE_URL = 'http://127.0.0.1:8765/v1'

mock.module('./keyPool.js', { namedExports: { getKey: () => null, hasKeys: () => false, reportFailure() {}, reportSuccess() {} } })
mock.module('openai', { defaultExport: class {
  constructor(options) {
    this.chat = { completions: { create: async (body, transport) => {
      requests.push({ url: options.baseURL, body, signal: transport?.signal })
      if (behavior === 'fail') throw Object.assign(new Error('Local API down'), { status: 503 })
      return (async function* () {
        if (behavior === 'tool') {
          yield { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_local', type: 'function', function: { name: 'read_file', arguments: '{"path":' } }] } }] }
          yield { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '"src/App.tsx"}' } }] }, finish_reason: 'tool_calls' }] }
        } else {
          yield { choices: [{ delta: { content: 'Brahma local response' }, finish_reason: 'stop' }] }
        }
      })()
    } } }
  }
} })

const { llmGateway, resolveModelForPlan } = await import('./gateway.js')

async function collect(model = 'brahma-v1', extra = {}) {
  const events = []
  for await (const event of llmGateway.complete({ model, messages: [{ role: 'user', content: 'Describe this screenshot' }], auditRoutes: true, ...extra })) events.push(event)
  return events
}

test('explicit Brahma aliases map to one local route and never enter automatic routing', async () => {
  assert.equal(resolveModelForPlan('brahma/v1', 'free'), 'brahma-v1')
  assert.equal(resolveModelForPlan('brahma-v1', 'free'), 'brahma-v1')
  assert.notEqual(resolveModelForPlan('auto', 'free', 'write a long secure express app'), 'brahma-v1')
  const before = requests.length
  const events = await collect('brahma/v1', { messages: [{ role: 'user', content: [{ type: 'text', text: 'Read this image' }, { type: 'image_url', image_url: { url: 'data:image/png;base64,ZmFrZQ==' } }] }] })
  assert.equal(requests.length, before + 1)
  assert.equal(requests.at(-1).url, 'http://127.0.0.1:8765/v1')
  assert.equal(requests.at(-1).body.model, 'brahma-v1')
  assert.ok(requests.at(-1).body.messages.some(message => message.role === 'system' && message.content.includes('CodeVaa team')))
  assert.ok(events.some(event => event.phase === 'success' && event.provider === 'brahma'))
  assert.ok(events.some(event => event.type === 'done'))
})

test('local tool calls survive completeNonStream and local API failure has no cloud fallback', async () => {
  behavior = 'tool'
  const result = await llmGateway.completeNonStream({
    model: 'brahma-v1', messages: [{ role: 'user', content: 'Read src/App.tsx' }],
    tools: [{ type: 'function', function: { name: 'read_file', parameters: { type: 'object', properties: { path: { type: 'string' } } } } }],
  })
  assert.equal(result.provider, 'brahma')
  assert.equal(result.tool_calls[0].function.name, 'read_file')
  assert.deepEqual(JSON.parse(result.tool_calls[0].function.arguments), { path: 'src/App.tsx' })

  behavior = 'fail'
  const before = requests.length
  const failed = await collect()
  assert.equal(requests.length, before + 1)
  assert.equal(new URL(requests.at(-1).url).hostname, '127.0.0.1')
  assert.ok(failed.some(event => event.type === 'error' && event.content.includes('No cloud provider fallback')))
  behavior = 'ok'
})
