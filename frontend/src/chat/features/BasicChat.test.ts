/**
 * BasicChat.test.ts
 *
 * Unit tests and Property-Based tests for:
 *   - MessageComposer (validateMessageLength, buildBasicChatFrame, createGroupRoom)
 *   - DeliveryStatus (transitionDeliveryStatus, isValidDeliveryStatus, VALID_TRANSITIONS)
 *
 * PBT tests:
 *   - Property 8:  strings ≤4096 chars accepted, strings >4096 rejected
 *   - Property 9:  delivery status after any valid lifecycle transition is always one of sent|delivered|read
 *   - Property 10: Basic Plan messages never have encryptionStatus 'e2ee'
 *
 * Feature: anonymous-chat
 * REQ-3.1, REQ-3.4, REQ-3.6, REQ-4.1, REQ-4.4
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  validateMessageLength,
  buildBasicChatFrame,
  createGroupRoom,
  type BasicChatPayload,
} from './MessageComposer'
import {
  transitionDeliveryStatus,
  isValidDeliveryStatus,
  VALID_TRANSITIONS,
  type DeliveryStatus,
} from './DeliveryStatus'

// ---------------------------------------------------------------------------
// validateMessageLength — unit tests
// ---------------------------------------------------------------------------

describe('validateMessageLength', () => {
  it('accepts an empty string', () => {
    const result = validateMessageLength('')
    expect(result.valid).toBe(true)
  })

  it('accepts a string of exactly 4096 characters', () => {
    const result = validateMessageLength('a'.repeat(4096))
    expect(result.valid).toBe(true)
  })

  it('rejects a string of 4097 characters', () => {
    const result = validateMessageLength('a'.repeat(4097))
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toBeTruthy()
      expect(typeof result.error).toBe('string')
    }
  })

  it('accepts a string of 1 character', () => {
    const result = validateMessageLength('x')
    expect(result.valid).toBe(true)
  })

  it('rejects a very long string', () => {
    const result = validateMessageLength('z'.repeat(10_000))
    expect(result.valid).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// delivery status FSM — unit tests
// ---------------------------------------------------------------------------

describe('transitionDeliveryStatus', () => {
  it('sent → delivered is valid', () => {
    const result = transitionDeliveryStatus('sent', 'delivered')
    expect(result).toBe('delivered')
  })

  it('delivered → read is valid', () => {
    const result = transitionDeliveryStatus('delivered', 'read')
    expect(result).toBe('read')
  })

  it('sent → read is invalid', () => {
    const result = transitionDeliveryStatus('sent', 'read')
    expect(result).toEqual(expect.objectContaining({ error: expect.any(String) }))
  })

  it('read → sent is invalid (terminal state)', () => {
    const result = transitionDeliveryStatus('read', 'sent')
    expect(result).toEqual(expect.objectContaining({ error: expect.any(String) }))
  })

  it('delivered → sent is invalid (backwards transition)', () => {
    const result = transitionDeliveryStatus('delivered', 'sent')
    expect(result).toEqual(expect.objectContaining({ error: expect.any(String) }))
  })

  it('read → delivered is invalid (terminal state)', () => {
    const result = transitionDeliveryStatus('read', 'delivered')
    expect(result).toEqual(expect.objectContaining({ error: expect.any(String) }))
  })

  it('full valid lifecycle: sent → delivered → read', () => {
    const step1 = transitionDeliveryStatus('sent', 'delivered')
    expect(step1).toBe('delivered')
    const step2 = transitionDeliveryStatus(step1 as DeliveryStatus, 'read')
    expect(step2).toBe('read')
  })
})

describe('isValidDeliveryStatus', () => {
  it('returns true for "sent"', () => {
    expect(isValidDeliveryStatus('sent')).toBe(true)
  })

  it('returns true for "delivered"', () => {
    expect(isValidDeliveryStatus('delivered')).toBe(true)
  })

  it('returns true for "read"', () => {
    expect(isValidDeliveryStatus('read')).toBe(true)
  })

  it('returns false for an arbitrary string', () => {
    expect(isValidDeliveryStatus('pending')).toBe(false)
    expect(isValidDeliveryStatus('')).toBe(false)
    expect(isValidDeliveryStatus('e2ee')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// createGroupRoom — unit tests
// ---------------------------------------------------------------------------

describe('createGroupRoom', () => {
  it('returns an object with a roomId string', () => {
    const { roomId } = createGroupRoom()
    expect(typeof roomId).toBe('string')
  })

  it('roomId matches the UUID pattern /^[0-9a-f-]{36}$/', () => {
    const { roomId } = createGroupRoom()
    expect(roomId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('generates distinct room IDs on successive calls', () => {
    const a = createGroupRoom().roomId
    const b = createGroupRoom().roomId
    expect(a).not.toBe(b)
  })
})

// ---------------------------------------------------------------------------
// buildBasicChatFrame — unit tests
// ---------------------------------------------------------------------------

describe('buildBasicChatFrame', () => {
  it('sets type to "anon_chat.message"', () => {
    const frame = buildBasicChatFrame('hello')
    expect(frame.type).toBe('anon_chat.message')
  })

  it('payload has encryptionStatus "tls_only"', () => {
    const frame = buildBasicChatFrame('hello')
    const payload = frame.payload as BasicChatPayload
    expect(payload.encryptionStatus).toBe('tls_only')
  })

  it('payload never has encryptionStatus "e2ee"', () => {
    const frame = buildBasicChatFrame('test message', 'room-123')
    const payload = frame.payload as BasicChatPayload
    expect((payload as Record<string, unknown>).encryptionStatus).not.toBe('e2ee')
  })

  it('payload contains the provided text', () => {
    const text = 'Hello, anonymous world!'
    const frame = buildBasicChatFrame(text)
    const payload = frame.payload as BasicChatPayload
    expect(payload.text).toBe(text)
  })

  it('payload contains the provided roomId', () => {
    const roomId = 'room-abc-123'
    const frame = buildBasicChatFrame('msg', roomId)
    const payload = frame.payload as BasicChatPayload
    expect(payload.roomId).toBe(roomId)
  })

  it('payload roomId is undefined when not provided', () => {
    const frame = buildBasicChatFrame('msg')
    const payload = frame.payload as BasicChatPayload
    expect(payload.roomId).toBeUndefined()
  })

  it('has a numeric seq field', () => {
    const frame = buildBasicChatFrame('msg')
    expect(typeof frame.seq).toBe('number')
  })

  it('seq is incremented on successive calls', () => {
    const f1 = buildBasicChatFrame('a')
    const f2 = buildBasicChatFrame('b')
    expect(f2.seq).toBeGreaterThan(f1.seq)
  })
})

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

// Feature: anonymous-chat, Property 8: Message Length Validation
describe('PBT — Property 8: Message Length Validation', () => {
  it(
    'validateMessageLength accepts iff text.length <= 4096',
    // Validates: Requirements 3.1
    () => {
      fc.assert(
        fc.property(
          fc.string(),
          (text: string) => {
            const result = validateMessageLength(text)
            if (text.length <= 4096) {
              return result.valid === true
            } else {
              return result.valid === false && typeof (result as { error: string }).error === 'string'
            }
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})

// Feature: anonymous-chat, Property 9: Delivery Status Always Valid
describe('PBT — Property 9: Delivery Status Always Valid', () => {
  it(
    'any sequence of valid delivery status transitions always ends in one of sent|delivered|read',
    // Validates: Requirements 3.4
    () => {
      // Generate a sequence of valid transitions by walking the FSM
      fc.assert(
        fc.property(
          // Generate a number of steps to attempt (0–10)
          fc.integer({ min: 0, max: 10 }),
          (steps: number) => {
            const validStatuses: DeliveryStatus[] = ['sent', 'delivered', 'read']
            let current: DeliveryStatus = 'sent'

            for (let i = 0; i < steps; i++) {
              const allowedNext = VALID_TRANSITIONS[current]
              if (allowedNext.length === 0) break // terminal state
              // Always take the first (and only) valid transition
              const next = allowedNext[0]
              const result = transitionDeliveryStatus(current, next)
              // Result must be a valid status (not an error)
              if (typeof result === 'object') break // should not happen for valid transitions
              current = result
            }

            // Final status must be one of the three valid statuses
            return validStatuses.includes(current)
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})

// Feature: anonymous-chat, Property 10: Basic Plan Messages Not E2EE
describe('PBT — Property 10: Basic Plan Messages Not E2EE', () => {
  it(
    'buildBasicChatFrame payload never has encryptionStatus "e2ee"',
    // Validates: Requirements 3.6
    () => {
      fc.assert(
        fc.property(
          // Arbitrary message text
          fc.string(),
          // Optional roomId
          fc.option(fc.uuid(), { nil: undefined }),
          (text: string, roomId: string | undefined) => {
            const frame = buildBasicChatFrame(text, roomId)
            const payload = frame.payload as BasicChatPayload
            return payload.encryptionStatus !== 'e2ee'
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})
