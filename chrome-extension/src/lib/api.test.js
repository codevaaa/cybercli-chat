import { test } from 'node:test'
import assert from 'node:assert/strict'
import { completionTextFromBody, normalizeAuthSync, requestBackend, isTrustedAuthSender } from './background-api.js'
import { complete, streamCompletion, processOfflineQueue } from './config.js'

test('auth capture accepts only the exact HTTPS site origins', () => {
  assert.equal(isTrustedAuthSender({ url: 'https://cybermindcli.info/auth/callback' }), true)
  assert.equal(isTrustedAuthSender({ url: 'https://www.cybermindcli.info/chat' }), true)
  for (const url of ['http://cybermindcli.info', 'https://cybermindcli.info.attacker.example', 'https://evilcybermindcli.info', 'invalid']) {
    assert.equal(isTrustedAuthSender({ url }), false)
  }
})

test('auth sync keeps only a bounded token and known profile fields', () => {
  assert.deepEqual(normalizeAuthSync({
    token: '  session-token  ',
    user: { id: 'u-1', email: ' person@example.test ', name: ' Person ', role: 'admin' },
  }), {
    token: 'session-token',
    user: { id: 'u-1', email: 'person@example.test', name: 'Person' },
  })
  assert.deepEqual(normalizeAuthSync({ token: null }), { token: null, user: null })
  assert.equal(normalizeAuthSync({ token: '' }), null)
  assert.equal(normalizeAuthSync({ token: 'x'.repeat(16_385) }), null)
})

test('completion response parser accepts supported backend response shapes', () => {
  assert.equal(completionTextFromBody('{"content":"hello"}'), 'hello')
  assert.equal(completionTextFromBody('{"choices":[{"message":{"content":"hello"}}]}'), 'hello')
  assert.equal(completionTextFromBody('{"error":"nope"}'), '')
  assert.equal(completionTextFromBody('not json'), '')
})

test('background API broker rejects arbitrary targets and enforces non-streaming content calls', async (t) => {
  await assert.rejects(requestBackend({ endpoint: '/admin' }, 'token'), /Unsupported/)
  assert.equal((await requestBackend({ endpoint: '/completions', body: {} }, null)).status, 401)
  t.mock.method(globalThis, 'fetch', async (url, opts) => {
    assert.ok(url.endsWith('/completions'))
    assert.equal(opts.headers.Authorization, 'Bearer test-token')
    assert.equal(JSON.parse(opts.body).stream, false)
    return new Response('{"content":"hello"}', { headers: { 'content-type': 'application/json' } })
  })
  assert.equal((await requestBackend({ endpoint: '/completions', body: { stream: true } }, 'test-token')).status, 200)
})

test('completion errors propagate and failed offline requests stay queued', async (t) => {
  const state = { authToken: 'test-token', offlineQueue: [{ messages: [], queuedAt: Date.now() }] }
  t.mock.method(globalThis, 'fetch', async () => new Response('bad gateway', { status: 502 }))
  const oldChrome = globalThis.chrome
  globalThis.chrome = { storage: { local: { get: async () => state, set: async changes => Object.assign(state, changes) } } }
  t.after(() => { globalThis.chrome = oldChrome })
  await assert.rejects(complete({ messages: [] }), /502/)
  await processOfflineQueue()
  assert.equal(state.offlineQueue.length, 1)
})

test('stream handles UTF-8 packet splits, final unterminated data, and releases its reader', async (t) => {
  const oldChrome = globalThis.chrome
  globalThis.chrome = { storage: { local: { get: async () => ({ authToken: 'test-token' }) } } }
  t.after(() => { globalThis.chrome = oldChrome })
  const bytes = new TextEncoder().encode('data:{"type":"token","content":"नमस्ते"}\n\ndata: {"type":"token","content":"!"}\n\ndata:[DONE]')
  const stream = new ReadableStream({ start(controller) { for (const b of bytes) controller.enqueue(new Uint8Array([b])); controller.close() } })
  t.mock.method(globalThis, 'fetch', async () => new Response(stream))
  let output = '', done = 0
  await streamCompletion({ messages: [], onToken: t => { output += t }, onDone: () => done++ })
  assert.equal(output, 'नमस्ते!')
  assert.equal(done, 1)
  assert.equal(stream.locked, false)
})

test('truncated streams report failure instead of claiming a complete answer', async (t) => {
  const oldChrome = globalThis.chrome
  globalThis.chrome = { storage: { local: { get: async () => ({ authToken: 'test-token' }) } } }
  t.after(() => { globalThis.chrome = oldChrome })
  t.mock.method(globalThis, 'fetch', async () => new Response('data: {"type":"token","content":"partial"}\n\n'))
  let error, done = false
  await streamCompletion({ messages: [], onError: value => { error = value }, onDone: () => { done = true } })
  assert.match(error.message, /before the response finished/); assert.equal(done, false)
})
test('an expired response cannot clear a newer login token', async (t) => {
  const oldChrome = globalThis.chrome
  let reads = 0, removed = false
  globalThis.chrome = { storage: { local: { get: async () => ({ authToken: reads++ ? 'new-token' : 'old-token' }), remove: async () => { removed = true } } } }
  t.after(() => { globalThis.chrome = oldChrome })
  t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 401 }))
  await streamCompletion({ messages: [] })
  assert.equal(removed, false)
})
test('provider error events and aborts retain a clear terminal status', async (t) => {
  const oldChrome = globalThis.chrome
  globalThis.chrome = { storage: { local: { get: async () => ({ authToken: 'test-token' }) } } }
  t.after(() => { globalThis.chrome = oldChrome })
  t.mock.method(globalThis, 'fetch', async () => new Response('data: {"type":"error","content":"Provider unavailable"}\n\ndata: [DONE]\n\n'))
  let error, done = 0
  await streamCompletion({ messages: [], onError: value => { error = value }, onDone: () => done++ })
  assert.equal(error.message, 'Provider unavailable'); assert.equal(done, 0)
  globalThis.fetch = async () => { throw new DOMException('Stopped', 'AbortError') }
  await streamCompletion({ messages: [], onError: value => { error = value } })
  assert.equal(error.stopped, true)
})
