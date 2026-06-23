/**
 * DisappearingMessage.test.ts
 *
 * Unit tests and Property-Based tests for:
 *   - DisappearingMessageScheduler (TTL enforcement, retry, post-launch cleanup, changeTtl)
 *   - TtlSelector (renders exactly 5 options)
 *   - CountdownTimer formatting helper
 *
 * PBT tests:
 *   - Property 14: messages with elapsed `disappearsAt` are not retrievable from local storage
 *   - Property 15: changing TTL leaves all pre-existing `disappearsAt` values unchanged
 *
 * Feature: anonymous-chat
 * REQ-6.1, REQ-6.2, REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import {
  DisappearingMessageScheduler,
  type LocalMessage,
  type SessionConfig,
} from './DisappearingMessageScheduler'
import { TTL_OPTIONS } from '../components/TtlSelector'
import { formatRemaining } from '../components/CountdownTimer'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Build a minimal LocalMessage with optional overrides. */
function makeMessage(overrides: Partial<LocalMessage> = {}): LocalMessage {
  return {
    messageId: overrides.messageId ?? `msg-${Math.random().toString(36).slice(2)}`,
    sessionId: overrides.sessionId ?? 'session-1',
    direction: overrides.direction ?? 'sent',
    encryptionStatus: overrides.encryptionStatus ?? 'e2ee',
    deliveryStatus: overrides.deliveryStatus ?? 'sent',
    createdAt: overrides.createdAt ?? Date.now(),
    disappearsAt: overrides.disappearsAt,
    plaintextContent: overrides.plaintextContent,
    attachmentPath: overrides.attachmentPath,
  }
}

/** Build a session config. */
function makeSession(overrides: Partial<SessionConfig> = {}): SessionConfig {
  return {
    sessionId: overrides.sessionId ?? 'session-1',
    ttlMs: overrides.ttlMs,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// TTL_OPTIONS — unit tests
// ---------------------------------------------------------------------------

describe('TTL_OPTIONS', () => {
  it('has exactly 5 options', () => {
    expect(TTL_OPTIONS).toHaveLength(5)
  })

  it('contains the exact required values in ascending order', () => {
    const values = TTL_OPTIONS.map((o) => o.value)
    expect(values).toEqual([30_000, 300_000, 3_600_000, 86_400_000, 604_800_000])
  })

  it('all options have non-empty labels', () => {
    for (const option of TTL_OPTIONS) {
      expect(option.label.trim().length).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// formatRemaining — unit tests
// ---------------------------------------------------------------------------

describe('formatRemaining', () => {
  it('formats 0 ms as "0d 0h 0m 0s"', () => {
    expect(formatRemaining(0)).toBe('0d 0h 0m 0s')
  })

  it('formats negative ms as "0d 0h 0m 0s"', () => {
    expect(formatRemaining(-5_000)).toBe('0d 0h 0m 0s')
  })

  it('formats 90_000 ms as "0d 0h 1m 30s"', () => {
    expect(formatRemaining(90_000)).toBe('0d 0h 1m 30s')
  })

  it('formats 3_661_000 ms as "0d 1h 1m 1s"', () => {
    expect(formatRemaining(3_661_000)).toBe('0d 1h 1m 1s')
  })

  it('formats exactly 1 day as "1d 0h 0m 0s"', () => {
    expect(formatRemaining(86_400_000)).toBe('1d 0h 0m 0s')
  })

  it('formats 7 days as "7d 0h 0m 0s"', () => {
    expect(formatRemaining(604_800_000)).toBe('7d 0h 0m 0s')
  })
})

// ---------------------------------------------------------------------------
// DisappearingMessageScheduler — unit tests
// ---------------------------------------------------------------------------

describe('DisappearingMessageScheduler', () => {
  let scheduler: DisappearingMessageScheduler

  beforeEach(() => {
    vi.useFakeTimers()
    scheduler = new DisappearingMessageScheduler()
  })

  afterEach(() => {
    scheduler.destroy()
    vi.useRealTimers()
  })

  // -------------------------------------------------------------------------
  // schedule()
  // -------------------------------------------------------------------------

  describe('schedule()', () => {
    it('does not schedule anything for a permanent message (no disappearsAt)', () => {
      const msg = makeMessage({ disappearsAt: undefined })
      const deleteFn = vi.fn().mockResolvedValue(undefined)
      scheduler.schedule(msg, deleteFn)

      vi.runAllTimers()
      expect(deleteFn).not.toHaveBeenCalled()
    })

    it('calls delete when the TTL fires', async () => {
      const ttl = 5_000
      const msg = makeMessage({ disappearsAt: Date.now() + ttl })
      const deleteFn = vi.fn().mockResolvedValue(undefined)
      scheduler.schedule(msg, deleteFn)

      await vi.advanceTimersByTimeAsync(ttl + 100)
      expect(deleteFn).toHaveBeenCalledWith(msg.messageId)
    })

    it('calls delete immediately for a message whose TTL has already elapsed', async () => {
      const msg = makeMessage({ disappearsAt: Date.now() - 1_000 }) // 1s in the past
      const deleteFn = vi.fn().mockResolvedValue(undefined)
      scheduler.schedule(msg, deleteFn)

      await vi.advanceTimersByTimeAsync(50)
      expect(deleteFn).toHaveBeenCalledWith(msg.messageId)
    })
  })

  // -------------------------------------------------------------------------
  // Retry logic
  // -------------------------------------------------------------------------

  describe('deletion retry on failure', () => {
    it('retries up to 3 times and succeeds on the 3rd attempt', async () => {
      const msg = makeMessage({ disappearsAt: Date.now() + 100 })

      let callCount = 0
      const deleteFn = vi.fn().mockImplementation(async () => {
        callCount++
        if (callCount < 3) throw new Error('Storage error')
      })
      const onFailed = vi.fn()

      scheduler.schedule(msg, deleteFn, onFailed)

      // Advance past TTL trigger
      await vi.advanceTimersByTimeAsync(200)
      // Advance past retry delays (1s + 2s)
      await vi.advanceTimersByTimeAsync(1_000)
      await vi.advanceTimersByTimeAsync(2_000)
      await vi.runAllTimersAsync()

      expect(deleteFn).toHaveBeenCalledTimes(3)
      expect(onFailed).not.toHaveBeenCalled()
    })

    it('calls onFailed after all 4 attempts fail (initial + 3 retries)', async () => {
      const msg = makeMessage({ disappearsAt: Date.now() + 100 })
      const deleteFn = vi.fn().mockRejectedValue(new Error('Persistent error'))
      const onFailed = vi.fn()

      scheduler.schedule(msg, deleteFn, onFailed)

      await vi.advanceTimersByTimeAsync(200)
      await vi.advanceTimersByTimeAsync(1_000)
      await vi.advanceTimersByTimeAsync(2_000)
      await vi.advanceTimersByTimeAsync(4_000)
      await vi.runAllTimersAsync()

      expect(deleteFn).toHaveBeenCalledTimes(4) // initial + 3 retries
      expect(onFailed).toHaveBeenCalledOnce()
      expect(onFailed).toHaveBeenCalledWith(msg.messageId, expect.any(Error))
    })
  })

  // -------------------------------------------------------------------------
  // runPostLaunchCleanup()
  // -------------------------------------------------------------------------

  describe('runPostLaunchCleanup()', () => {
    it('deletes only messages whose disappearsAt has elapsed', async () => {
      const now = Date.now()
      const expired1 = makeMessage({ messageId: 'exp-1', disappearsAt: now - 10_000 })
      const expired2 = makeMessage({ messageId: 'exp-2', disappearsAt: now - 1 })
      const live = makeMessage({ messageId: 'live-1', disappearsAt: now + 60_000 })
      const permanent = makeMessage({ messageId: 'perm-1', disappearsAt: undefined })

      const deleted: string[] = []
      const deleteFn = vi.fn().mockImplementation(async (id: string) => {
        deleted.push(id)
      })

      const count = await scheduler.runPostLaunchCleanup(
        [expired1, expired2, live, permanent],
        deleteFn,
      )

      expect(count).toBe(2)
      expect(deleted).toContain('exp-1')
      expect(deleted).toContain('exp-2')
      expect(deleted).not.toContain('live-1')
      expect(deleted).not.toContain('perm-1')
    })

    it('returns 0 when no messages are expired', async () => {
      const now = Date.now()
      const live = makeMessage({ disappearsAt: now + 60_000 })
      const permanent = makeMessage({ disappearsAt: undefined })
      const deleteFn = vi.fn().mockResolvedValue(undefined)

      const count = await scheduler.runPostLaunchCleanup([live, permanent], deleteFn)
      expect(count).toBe(0)
      expect(deleteFn).not.toHaveBeenCalled()
    })

    it('returns 0 for an empty message list', async () => {
      const deleteFn = vi.fn().mockResolvedValue(undefined)
      const count = await scheduler.runPostLaunchCleanup([], deleteFn)
      expect(count).toBe(0)
    })
  })

  // -------------------------------------------------------------------------
  // changeTtl() — TTL change semantics
  // -------------------------------------------------------------------------

  describe('changeTtl()', () => {
    it('returns an updated session config with the new TTL', () => {
      const session = makeSession({ ttlMs: 300_000 })
      const msgs = [makeMessage({ disappearsAt: Date.now() + 300_000 })]

      const { session: updated } = scheduler.changeTtl(session, 3_600_000, msgs)
      expect(updated.ttlMs).toBe(3_600_000)
    })

    it('does NOT alter any existing message disappearsAt', () => {
      const originalTs = Date.now() + 300_000
      const session = makeSession({ ttlMs: 300_000 })
      const msgs = [
        makeMessage({ messageId: 'm1', disappearsAt: originalTs }),
        makeMessage({ messageId: 'm2', disappearsAt: originalTs - 5_000 }),
        makeMessage({ messageId: 'm3', disappearsAt: undefined }),
      ]

      const { messages } = scheduler.changeTtl(session, 3_600_000, msgs)

      // Reference equality confirms no mutation
      expect(messages).toBe(msgs)
      // Timestamps unchanged
      expect(messages[0].disappearsAt).toBe(originalTs)
      expect(messages[1].disappearsAt).toBe(originalTs - 5_000)
      expect(messages[2].disappearsAt).toBeUndefined()
    })

    it('allows setting TTL to undefined (disable disappearing messages)', () => {
      const session = makeSession({ ttlMs: 86_400_000 })
      const { session: updated } = scheduler.changeTtl(session, undefined, [])
      expect(updated.ttlMs).toBeUndefined()
    })
  })
})

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

// Feature: anonymous-chat, Property 14: Disappearing Message TTL Deletion
describe('PBT — Property 14: Disappearing Message TTL Deletion', () => {
  it(
    'messages with elapsed disappearsAt are not retrievable from local storage after cleanup',
    // Validates: Requirements 6.2, 6.3, 6.5
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate 1–20 messages; each with a random disappearsAt
          fc.array(
            fc.record({
              messageId: fc.uuid(),
              sessionId: fc.constant('session-test'),
              direction: fc.constantFrom('sent' as const, 'received' as const),
              encryptionStatus: fc.constant('e2ee' as const),
              deliveryStatus: fc.constant('sent' as const),
              createdAt: fc.integer({ min: 1_000_000, max: 2_000_000 }),
              // disappearsAt is always in the past (elapsed)
              disappearsAt: fc.integer({ min: 1, max: 999_999 }),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          async (messages: LocalMessage[]) => {
            // Simulate local storage as an in-memory set
            const storage = new Map<string, LocalMessage>(
              messages.map((m) => [m.messageId, m]),
            )

            const deleteFn = async (id: string): Promise<void> => {
              storage.delete(id)
            }

            const sched = new DisappearingMessageScheduler()
            try {
              await sched.runPostLaunchCleanup(messages, deleteFn)
            } finally {
              sched.destroy()
            }

            // All messages had elapsed disappearsAt — none should remain
            return storage.size === 0
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})

// Feature: anonymous-chat, Property 15: TTL Change Does Not Affect Existing Messages
describe('PBT — Property 15: TTL Change Does Not Affect Existing Messages', () => {
  it(
    'changing TTL leaves all pre-existing disappearsAt values unchanged',
    // Validates: Requirements 6.6
    () => {
      fc.assert(
        fc.property(
          // Generate existing messages with arbitrary (or absent) disappearsAt
          fc.array(
            fc.record({
              messageId: fc.uuid(),
              sessionId: fc.constant('session-test'),
              direction: fc.constantFrom('sent' as const, 'received' as const),
              encryptionStatus: fc.constant('e2ee' as const),
              deliveryStatus: fc.constant('sent' as const),
              createdAt: fc.integer({ min: 1_000_000, max: 9_000_000_000 }),
              disappearsAt: fc.option(
                fc.integer({ min: 1, max: 9_000_000_000 }),
                { nil: undefined },
              ),
            }),
            { minLength: 0, maxLength: 30 },
          ),
          // New TTL to apply
          fc.option(
            fc.oneof(
              fc.constant(30_000),
              fc.constant(300_000),
              fc.constant(3_600_000),
              fc.constant(86_400_000),
              fc.constant(604_800_000),
            ),
            { nil: undefined },
          ),
          // Session config
          fc.record({
            sessionId: fc.constant('session-test'),
            ttlMs: fc.option(fc.integer({ min: 1, max: 604_800_000 }), { nil: undefined }),
          }),
          (messages: LocalMessage[], newTtl: number | undefined, session: SessionConfig) => {
            // Snapshot the original disappearsAt values before calling changeTtl
            const originalTs = messages.map((m) => m.disappearsAt)

            const sched = new DisappearingMessageScheduler()
            const { messages: returned } = sched.changeTtl(session, newTtl, messages)
            sched.destroy()

            // Returned array must be the exact same reference (no copy + mutation)
            if (returned !== messages) return false

            // Every message must retain its original disappearsAt
            for (let i = 0; i < messages.length; i++) {
              if (messages[i].disappearsAt !== originalTs[i]) return false
            }

            return true
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})
