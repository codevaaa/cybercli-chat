/**
 * WsMultiplexer — Unit tests and Property-Based tests
 *
 * Tests cover:
 *   - Backoff sequence: [1000, 2000, 4000, 8000, 16000, 32000, 32000]
 *   - Offline queue flushes in order after reconnect
 *   - anon_chat.* frames never interfere with daemon frames
 *   - Property 31: WS Namespace Invariant
 *   - Property 32: Exponential Backoff Sequence
 *   - Property 33: Offline Queue Completeness
 *
 * Feature: anonymous-chat
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import {
  computeBackoffDelay,
  isValidChatFrameType,
  isChatFrameType,
  WsMultiplexer,
  registerDaemonWebSocket,
  getExistingDaemonWebSocket,
  _resetSeqCounter,
  nextSeq,
  type ChatFrame,
} from './WsMultiplexer.js'

// ---------------------------------------------------------------------------
// Minimal WebSocket mock
// ---------------------------------------------------------------------------

type WsListener = (event: Event | MessageEvent) => void

class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState: number = MockWebSocket.CONNECTING
  url: string
  private _listeners: Record<string, WsListener[]> = {}
  sentMessages: string[] = []

  constructor(url: string) {
    this.url = url
  }

  addEventListener(type: string, listener: WsListener): void {
    if (!this._listeners[type]) this._listeners[type] = []
    this._listeners[type].push(listener)
  }

  removeEventListener(type: string, listener: WsListener): void {
    if (!this._listeners[type]) return
    this._listeners[type] = this._listeners[type].filter((l) => l !== listener)
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket not open')
    }
    this.sentMessages.push(data)
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED
    this._emit('close', new Event('close'))
  }

  /** Test helper: simulate server emitting a message */
  simulateMessage(data: unknown): void {
    const event = { data: JSON.stringify(data) } as MessageEvent
    this._emit('message', event)
  }

  /** Test helper: simulate connection open */
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN
    this._emit('open', new Event('open'))
  }

  /** Test helper: simulate connection close */
  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED
    this._emit('close', new Event('close'))
  }

  /** Test helper: simulate connection error */
  simulateError(): void {
    this._emit('error', new Event('error'))
  }

  private _emit(type: string, event: Event | MessageEvent): void {
    ;(this._listeners[type] ?? []).forEach((l) => l(event))
  }
}

// ---------------------------------------------------------------------------
// Test setup — replace global WebSocket and fake timers
// ---------------------------------------------------------------------------

let mockWsInstance: MockWebSocket | null = null

beforeEach(() => {
  vi.useFakeTimers()
  _resetSeqCounter()
  mockWsInstance = null

  // Install mock WebSocket constructor
  vi.stubGlobal('WebSocket', class extends MockWebSocket {
    constructor(url: string) {
      super(url)
      mockWsInstance = this
    }
  })

  // Clear any registered daemon WS
  ;(globalThis as Record<string, unknown>)['__codeva_daemon_ws__'] = undefined
})

// ---------------------------------------------------------------------------
// Unit Tests — computeBackoffDelay
// ---------------------------------------------------------------------------

describe('computeBackoffDelay', () => {
  it('returns the expected backoff sequence for attempts 1-7', () => {
    const expected = [1000, 2000, 4000, 8000, 16000, 32000, 32000]
    expected.forEach((ms, i) => {
      expect(computeBackoffDelay(i + 1)).toBe(ms)
    })
  })

  it('caps at 32000ms for all attempts beyond 6', () => {
    for (let n = 6; n <= 20; n++) {
      expect(computeBackoffDelay(n)).toBe(32000)
    }
  })

  it('returns 1000ms for first attempt', () => {
    expect(computeBackoffDelay(1)).toBe(1000)
  })
})

// ---------------------------------------------------------------------------
// Unit Tests — isValidChatFrameType / isChatFrameType
// ---------------------------------------------------------------------------

describe('isValidChatFrameType', () => {
  it('accepts valid anon_chat.* types', () => {
    const valid = [
      'anon_chat.message',
      'anon_chat.key_bundle_pub',
      'anon_chat.room_join',
      'anon_chat.delivery_ack',
      'anon_chat.onion_packet',
    ]
    valid.forEach((t) => expect(isValidChatFrameType(t)).toBe(true))
  })

  it('rejects daemon-style types', () => {
    const invalid = [
      'daemon.event',
      'message',
      'anon_chat.',
      'anon_chat.MixedCase',
      'anon_chat.has-hyphen',
      'anon_chat.123',
      '',
    ]
    invalid.forEach((t) => expect(isValidChatFrameType(t)).toBe(false))
  })
})

describe('isChatFrameType', () => {
  it('returns true for any anon_chat.* prefixed string', () => {
    expect(isChatFrameType('anon_chat.foo')).toBe(true)
    expect(isChatFrameType('anon_chat.bar_baz')).toBe(true)
  })

  it('returns false for daemon or other types', () => {
    expect(isChatFrameType('daemon.heartbeat')).toBe(false)
    expect(isChatFrameType('ping')).toBe(false)
    expect(isChatFrameType('')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Unit Tests — Daemon frame isolation
// ---------------------------------------------------------------------------

describe('WsMultiplexer — daemon frame isolation', () => {
  it('does not deliver daemon frames to anon_chat handlers', () => {
    const mux = new WsMultiplexer('ws://localhost')
    mux.connect()
    const ws = mockWsInstance!
    ws.simulateOpen()

    const received: ChatFrame[] = []
    mux.on('anon_chat.message', (f) => received.push(f))

    // Simulate daemon frames arriving
    ws.simulateMessage({ type: 'daemon.heartbeat', payload: { ping: true }, seq: 1 })
    ws.simulateMessage({ type: 'system.update', payload: {}, seq: 2 })

    expect(received).toHaveLength(0)
    mux.disconnect()
  })

  it('delivers anon_chat.* frames to the correct handler without interfering with other types', () => {
    const mux = new WsMultiplexer('ws://localhost')
    mux.connect()
    const ws = mockWsInstance!
    ws.simulateOpen()

    const chatFrames: ChatFrame[] = []
    mux.on('anon_chat.message', (f) => chatFrames.push(f))

    ws.simulateMessage({ type: 'daemon.event', payload: 'should_be_ignored', seq: 1 })
    ws.simulateMessage({ type: 'anon_chat.message', payload: { text: 'hello' }, seq: 2 })
    ws.simulateMessage({ type: 'daemon.event2', payload: 'also_ignored', seq: 3 })

    expect(chatFrames).toHaveLength(1)
    expect(chatFrames[0].payload).toEqual({ text: 'hello' })
    mux.disconnect()
  })

  it('outgoing frames always have anon_chat.* type prefix', () => {
    const mux = new WsMultiplexer('ws://localhost')
    mux.connect()
    const ws = mockWsInstance!
    ws.simulateOpen()

    mux.send('anon_chat.message', { text: 'hi' })
    mux.send('anon_chat.room_join', { roomId: 'abc' })

    expect(ws.sentMessages).toHaveLength(2)
    ws.sentMessages.forEach((raw) => {
      const frame = JSON.parse(raw) as ChatFrame
      expect(frame.type.startsWith('anon_chat.')).toBe(true)
    })
    mux.disconnect()
  })
})

// ---------------------------------------------------------------------------
// Unit Tests — Offline queue flushes in order after reconnect
// ---------------------------------------------------------------------------

describe('WsMultiplexer — offline queue', () => {
  it('buffers messages while disconnected and flushes them in order on connect', () => {
    const mux = new WsMultiplexer('ws://localhost')
    // Don't call connect() yet — stay offline by not opening socket
    mux.connect()
    const ws = mockWsInstance!
    // Socket created but not yet open

    // Send 3 messages while offline
    mux.send('anon_chat.message', { n: 1 })
    mux.send('anon_chat.message', { n: 2 })
    mux.send('anon_chat.message', { n: 3 })

    expect(mux.offlineQueueSize).toBe(3)
    expect(ws.sentMessages).toHaveLength(0)

    // Connection opens — queue should flush
    ws.simulateOpen()

    expect(mux.offlineQueueSize).toBe(0)
    expect(ws.sentMessages).toHaveLength(3)

    const payloads = ws.sentMessages.map((raw) => (JSON.parse(raw) as ChatFrame).payload) as Array<{ n: number }>
    expect(payloads.map((p) => p.n)).toEqual([1, 2, 3])
    mux.disconnect()
  })

  it('queues messages while reconnecting and flushes after reconnect', () => {
    const mux = new WsMultiplexer('ws://localhost')
    mux.connect()
    let ws = mockWsInstance!
    ws.simulateOpen()

    // Disconnect triggers reconnect
    ws.simulateClose()
    expect(mux.state).toBe('reconnecting')

    // Send messages while offline
    mux.send('anon_chat.message', { n: 'a' })
    mux.send('anon_chat.message', { n: 'b' })
    expect(mux.offlineQueueSize).toBe(2)

    // Advance timer past first backoff delay (1000ms)
    vi.advanceTimersByTime(1001)
    ws = mockWsInstance!
    ws.simulateOpen()

    expect(mux.offlineQueueSize).toBe(0)
    const sent = ws.sentMessages.map((r) => (JSON.parse(r) as ChatFrame).payload) as Array<{ n: string }>
    expect(sent.map((p) => p.n)).toEqual(['a', 'b'])
    mux.disconnect()
  })
})

// ---------------------------------------------------------------------------
// Unit Tests — Reconnect backoff and user notification
// ---------------------------------------------------------------------------

describe('WsMultiplexer — reconnect backoff', () => {
  it('reconnects with the correct delay sequence', () => {
    const mux = new WsMultiplexer('ws://localhost')
    mux.connect()

    const delays = [1000, 2000, 4000, 8000, 16000, 32000, 32000]
    for (const delay of delays) {
      const ws = mockWsInstance!
      ws.simulateClose()
      expect(mux.state).toBe('reconnecting')
      const prevInstance = mockWsInstance
      vi.advanceTimersByTime(delay - 1)
      expect(mockWsInstance).toBe(prevInstance) // not yet reconnected
      vi.advanceTimersByTime(1)
      // A new WebSocket should have been created
      expect(mockWsInstance).not.toBe(prevInstance)
    }
    mux.disconnect()
  })

  it('notifies the user after 10 consecutive failures', () => {
    let notifiedCount = 0
    const mux = new WsMultiplexer('ws://localhost', (failures) => {
      notifiedCount = failures
    })
    mux.connect()

    // Simulate 10 close events
    for (let i = 0; i < 10; i++) {
      const ws = mockWsInstance!
      ws.simulateClose()
      vi.advanceTimersByTime(32001)
    }
    expect(notifiedCount).toBe(10)
    mux.disconnect()
  })

  it('resets consecutive failure count after successful reconnect', () => {
    const mux = new WsMultiplexer('ws://localhost')
    mux.connect()

    // Fail 3 times
    for (let i = 0; i < 3; i++) {
      const ws = mockWsInstance!
      ws.simulateClose()
      vi.advanceTimersByTime(32001)
    }
    expect(mux.consecutiveFailures).toBe(3)

    // Successful reconnect
    const ws = mockWsInstance!
    ws.simulateOpen()
    expect(mux.consecutiveFailures).toBe(0)
    mux.disconnect()
  })
})

// ---------------------------------------------------------------------------
// Unit Tests — daemon WS reuse on page load
// ---------------------------------------------------------------------------

describe('WsMultiplexer — daemon WS reuse', () => {
  it('attaches to the existing daemon WebSocket if available (REQ-12.5)', () => {
    const daemonWs = new MockWebSocket('ws://daemon')
    daemonWs.readyState = MockWebSocket.OPEN
    registerDaemonWebSocket(daemonWs as unknown as WebSocket)

    expect(getExistingDaemonWebSocket()).toBe(daemonWs)

    const mux = new WsMultiplexer('ws://new-socket')
    mux.connect()

    // Should NOT have created a new WebSocket (mockWsInstance unchanged)
    expect(mockWsInstance).toBeNull()
    expect(mux.state).toBe('connected')
    mux.disconnect()
  })

  it('returns null for a closed daemon WebSocket', () => {
    const daemonWs = new MockWebSocket('ws://daemon')
    daemonWs.readyState = MockWebSocket.CLOSED
    registerDaemonWebSocket(daemonWs as unknown as WebSocket)

    expect(getExistingDaemonWebSocket()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// PBT — Property 31: WS Namespace Invariant
// Feature: anonymous-chat, Property 31: Every emitted chat frame type matches /^anon_chat\.[a-z_]+$/
// ---------------------------------------------------------------------------

describe('Property 31 — WS Namespace Invariant', () => {
  it('every emitted chat frame type matches /^anon_chat.[a-z_]+$/', () => {
    // Feature: anonymous-chat, Property 31: WS Namespace Invariant
    fc.assert(
      fc.property(
        // Generate valid lowercase subtypes (letters and underscores only)
        fc.stringMatching(/^[a-z_]+$/),
        (subtype) => {
          const type = `anon_chat.${subtype}` as `anon_chat.${string}`
          return isValidChatFrameType(type)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('no daemon-style type passes the namespace check', () => {
    // Feature: anonymous-chat, Property 31: WS Namespace Invariant (negative)
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.startsWith('anon_chat.')),
        (type) => !isValidChatFrameType(type),
      ),
      { numRuns: 100 },
    )
  })

  it('WsMultiplexer only delivers anon_chat.* frames to registered handlers', () => {
    // Feature: anonymous-chat, Property 31: WS Namespace Invariant (mux dispatch)
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            type: fc.oneof(
              fc.stringMatching(/^[a-z_]+$/).map((s) => `anon_chat.${s}`),
              fc.stringMatching(/^daemon\.[a-z]+$/),
              fc.stringMatching(/^system\.[a-z]+$/),
            ),
            payload: fc.anything(),
            seq: fc.integer({ min: 1, max: 10000 }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (messages) => {
          const mux = new WsMultiplexer('ws://localhost')
          mux.connect()
          const ws = mockWsInstance!
          ws.simulateOpen()

          const delivered: string[] = []
          // Register a catch-all handler for any anon_chat.* type seen in messages
          const chatTypes = [...new Set(messages.filter((m) => m.type.startsWith('anon_chat.')).map((m) => m.type))]
          chatTypes.forEach((t) => mux.on(t as `anon_chat.${string}`, (f) => delivered.push(f.type)))

          messages.forEach((m) => ws.simulateMessage(m))

          const expectedCount = messages.filter((m) => m.type.startsWith('anon_chat.')).length
          mux.disconnect()
          _resetSeqCounter()
          return delivered.length === expectedCount && delivered.every((t) => t.startsWith('anon_chat.'))
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ---------------------------------------------------------------------------
// PBT — Property 32: Exponential Backoff Sequence
// Feature: anonymous-chat, Property 32: computeBackoffDelay(n) === min(2^(n-1)*1000, 32000) for all n 1-20
// ---------------------------------------------------------------------------

describe('Property 32 — Exponential Backoff Sequence', () => {
  it('computeBackoffDelay(n) === min(2^(n-1)*1000, 32000) for all n 1-20', () => {
    // Feature: anonymous-chat, Property 32: Exponential Backoff Sequence
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (n) => {
          const expected = Math.min(Math.pow(2, n - 1) * 1000, 32000)
          return computeBackoffDelay(n) === expected
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ---------------------------------------------------------------------------
// PBT — Property 33: Offline Queue Completeness
// Feature: anonymous-chat, Property 33: Messages sent offline flush in original order after reconnect with none dropped
// ---------------------------------------------------------------------------

describe('Property 33 — Offline Queue Completeness', () => {
  it('messages sent offline flush in original order after reconnect with none dropped', () => {
    // Feature: anonymous-chat, Property 33: Offline Queue Completeness
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            type: fc.stringMatching(/^[a-z_]+$/).map((s) => `anon_chat.${s}` as `anon_chat.${string}`),
            payload: fc.anything(),
          }),
          { minLength: 1, maxLength: 50 },
        ),
        (messages) => {
          _resetSeqCounter()
          const mux = new WsMultiplexer('ws://localhost')
          mux.connect()
          const ws = mockWsInstance!
          // Don't open the socket yet — simulate offline

          // Send all messages while offline
          messages.forEach((m) => mux.send(m.type, m.payload))

          if (mux.offlineQueueSize !== messages.length) {
            mux.disconnect()
            _resetSeqCounter()
            return false
          }

          // Reconnect — flush queue
          ws.simulateOpen()

          if (ws.sentMessages.length !== messages.length) {
            mux.disconnect()
            _resetSeqCounter()
            return false
          }

          // Verify order is preserved
          const sentPayloads = ws.sentMessages.map((raw) => (JSON.parse(raw) as ChatFrame).payload)
          const allInOrder = messages.every((m, i) =>
            JSON.stringify(sentPayloads[i]) === JSON.stringify(m.payload),
          )

          mux.disconnect()
          _resetSeqCounter()
          return allInOrder && mux.offlineQueueSize === 0
        },
      ),
      { numRuns: 100 },
    )
  })
})
