import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { streamLifetime } from './streamLifetime.js'
const wait = () => new Promise(resolve => setTimeout(resolve, 20))
test('keepalives stop after a token, disposal, errors or the client disconnects; providers receive cancellation', async () => {
  for (const outcome of ['token', 'dispose', 'close', 'ended', 'destroyed']) {
    const res = new EventEmitter(), events = []
    res.write = event => events.push(event)
    const life = streamLifetime(res, 3)
    await wait(); assert.ok(events.some(event => event.includes('heartbeat')))
    if (outcome === 'token') life.token()
    else if (outcome === 'dispose') life.dispose()
    else if (outcome === 'close') res.emit('close')
    else if (outcome === 'ended') res.writableEnded = true
    else res.destroyed = true
    const before = events.length
    await wait(); assert.equal(events.length, before)
    if (['dispose', 'close'].includes(outcome)) assert.equal(life.signal.aborted, true)
    life.dispose(); assert.equal(life.signal.aborted, true); assert.equal(res.listenerCount('close'), 0)
  }
})
