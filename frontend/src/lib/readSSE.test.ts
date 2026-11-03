import { describe, it, expect } from 'vitest'
import { readSSE } from './readSSE.js'

describe('JSON SSE reader', () => {
  it('preserves split UTF-8, CRLF and an unterminated final event', async () => {
    const bytes = new TextEncoder().encode('data:{"content":"नमस्ते"}\r\n\r\ndata: {"content":"final"}')
    const body = new ReadableStream({ start(c) { for (const byte of bytes) c.enqueue(new Uint8Array([byte])); c.close() } })
    const values = []
    for await (const value of readSSE(body)) values.push(value.content)
    expect(values).toEqual(['नमस्ते', 'final'])
    expect(body.locked).toBe(false)
  })
  it('stops at DONE and releases a still-open stream', async () => {
    let cancelled = false
    const body = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('data: [DONE]\n\n')) }, cancel() { cancelled = true } })
    for await (const value of readSSE(body)) throw new Error(`Unexpected ${value}`)
    expect(cancelled).toBe(true)
    expect(body.locked).toBe(false)
  })
  it('rejects cancellation and releases the reader', async () => {
    const controller = new AbortController(); controller.abort()
    const body = new ReadableStream()
    await expect(async () => { for await (const _ of readSSE(body, controller.signal)) {} }).rejects.toThrow()
    expect(body.locked).toBe(false)
  })
  it('cancels a pending read without waiting for another network packet', async () => {
    const controller = new AbortController()
    const body = new ReadableStream()
    const reading = (async () => { for await (const _ of readSSE(body, controller.signal)) {} })()
    controller.abort()
    await expect(reading).rejects.toThrow()
    expect(body.locked).toBe(false)
  })
})
