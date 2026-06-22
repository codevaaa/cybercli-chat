/**
 * DisappearingMessageScheduler — TTL enforcement for disappearing messages.
 *
 * Schedules client-side deletion of messages based on their `disappearsAt`
 * timestamp. Handles:
 *   - Persistent timers that re-anchor on page visibility changes (REQ-6.2, REQ-6.3)
 *   - Retry logic with exponential backoff (1s / 2s / 4s) on deletion failure (REQ-6.2, REQ-6.3)
 *   - Post-launch cleanup for messages whose TTL elapsed while the app was closed (REQ-6.5)
 *   - TTL change semantics: new TTL applies to session config only; existing
 *     message `disappearsAt` values are never modified (REQ-6.6)
 *
 * REQ-6.2, REQ-6.3, REQ-6.5, REQ-6.6
 */

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

/**
 * The subset of a stored message that the scheduler requires.
 * Mirrors the `LocalMessage` interface from the design document.
 */
export interface LocalMessage {
  messageId: string
  sessionId: string
  direction: 'sent' | 'received'
  plaintextContent?: string
  attachmentPath?: string
  encryptionStatus: 'e2ee' | 'tls_only' | 'decryption_failed'
  deliveryStatus: 'sent' | 'delivered' | 'read'
  /** Unix ms timestamp — undefined means the message never expires. */
  disappearsAt?: number
  createdAt: number
}

/**
 * A chat session configuration record — minimal shape needed by `changeTtl`.
 */
export interface SessionConfig {
  sessionId: string
  /** TTL in milliseconds applied to newly sent messages. undefined = no TTL. */
  ttlMs?: number
  [key: string]: unknown
}

/**
 * Function called when a message should be deleted from local storage.
 * Must resolve when deletion is complete or throw on failure.
 */
export type DeleteFn = (messageId: string) => Promise<void>

/**
 * Function called when all deletion retries have been exhausted for a message.
 */
export type OnDeleteFailedFn = (messageId: string, error: unknown) => void

// ---------------------------------------------------------------------------
// Retry backoff delays
// ---------------------------------------------------------------------------

/** Delays (ms) for each retry attempt: 1s, 2s, 4s */
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000] as const

// ---------------------------------------------------------------------------
// Internal scheduled entry
// ---------------------------------------------------------------------------

interface ScheduledEntry {
  message: LocalMessage
  onDelete: DeleteFn
  onFailed?: OnDeleteFailedFn
  /** The active setTimeout handle (may be reset on visibility change). */
  timerId: ReturnType<typeof setTimeout> | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sleep for `ms` milliseconds, returning a promise.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Attempt to delete a message, retrying up to 3 times with exponential backoff.
 * Logs on each failure; calls `onFailed` if all retries are exhausted.
 */
async function deleteWithRetry(
  messageId: string,
  onDelete: DeleteFn,
  onFailed?: OnDeleteFailedFn,
): Promise<void> {
  let lastError: unknown

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length + 1; attempt++) {
    try {
      await onDelete(messageId)
      return // success
    } catch (err) {
      lastError = err
      console.error(
        `[DisappearingMessageScheduler] Deletion failed for message ${messageId} (attempt ${attempt + 1})`,
        err,
      )

      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt])
      }
    }
  }

  // All retries exhausted — notify caller
  console.error(
    `[DisappearingMessageScheduler] All retries failed for message ${messageId}. Notifying user.`,
    lastError,
  )
  onFailed?.(messageId, lastError)
}

// ---------------------------------------------------------------------------
// DisappearingMessageScheduler class
// ---------------------------------------------------------------------------

/**
 * Manages the lifecycle of disappearing-message timers.
 *
 * Usage:
 *   const scheduler = new DisappearingMessageScheduler()
 *   scheduler.schedule(message, deleteFromStorage)
 *   // On app init after full initialization:
 *   await scheduler.runPostLaunchCleanup(allMessages, deleteFromStorage)
 */
export class DisappearingMessageScheduler {
  /** Map of messageId → scheduled entry */
  private _entries = new Map<string, ScheduledEntry>()

  /** Bound reference to the visibility-change handler so it can be removed. */
  private _visibilityHandler: (() => void) | null = null

  constructor() {
    this._visibilityHandler = this._onVisibilityChange.bind(this)
    // Re-anchor timers when the page becomes visible again (e.g., after minimize)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this._visibilityHandler)
    }
  }

  /**
   * Detach the visibility-change listener. Call when the scheduler is no longer
   * needed to avoid memory leaks.
   */
  destroy(): void {
    if (this._visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this._visibilityHandler)
    }
    // Cancel all pending timers
    for (const entry of this._entries.values()) {
      if (entry.timerId !== null) {
        clearTimeout(entry.timerId)
      }
    }
    this._entries.clear()
  }

  /**
   * Schedule deletion of `message` when its `disappearsAt` timestamp is reached.
   *
   * - If `disappearsAt` is undefined the message is permanent — no timer is set.
   * - If `disappearsAt` is in the past the message is deleted immediately.
   * - A visibilitychange event will re-anchor the timer (handles minimize/background).
   *
   * REQ-6.2, REQ-6.3, REQ-6.5
   *
   * @param message   The local message to schedule deletion for.
   * @param onDelete  Async function that deletes the message from local storage.
   * @param onFailed  Optional callback invoked when all retries are exhausted.
   */
  schedule(
    message: LocalMessage,
    onDelete: DeleteFn,
    onFailed?: OnDeleteFailedFn,
  ): void {
    if (message.disappearsAt === undefined) {
      // Permanent message — nothing to schedule
      return
    }

    // Cancel any existing timer for this message before re-scheduling
    const existing = this._entries.get(message.messageId)
    if (existing?.timerId !== null && existing?.timerId !== undefined) {
      clearTimeout(existing.timerId)
    }

    const entry: ScheduledEntry = {
      message,
      onDelete,
      onFailed,
      timerId: null,
    }
    this._entries.set(message.messageId, entry)

    this._arm(entry)
  }

  /**
   * Scan all messages and immediately delete those whose `disappearsAt` has
   * elapsed. Should be called once after the client has fully initialized.
   *
   * Returns the number of messages deleted. (REQ-6.5)
   *
   * @param messages  All local messages currently in storage.
   * @param onDelete  Async function that removes a message from storage.
   * @param onFailed  Optional callback invoked when all retries are exhausted.
   */
  async runPostLaunchCleanup(
    messages: LocalMessage[],
    onDelete: DeleteFn,
    onFailed?: OnDeleteFailedFn,
  ): Promise<number> {
    const now = Date.now()
    const expired = messages.filter(
      (m) => m.disappearsAt !== undefined && m.disappearsAt < now,
    )

    await Promise.all(
      expired.map((m) => deleteWithRetry(m.messageId, onDelete, onFailed)),
    )

    return expired.length
  }

  /**
   * Apply a new TTL to a session's configuration without modifying any
   * existing message's `disappearsAt` value. (REQ-6.6)
   *
   * @param session         The current session config.
   * @param newTtlMs        New TTL in milliseconds (undefined = disable TTL).
   * @param existingMessages All messages currently associated with this session.
   * @returns A new session config object with the updated TTL.
   *          `existingMessages` are returned as-is with no mutation.
   */
  changeTtl(
    session: SessionConfig,
    newTtlMs: number | undefined,
    existingMessages: LocalMessage[],
  ): { session: SessionConfig; messages: LocalMessage[] } {
    // Only the session config changes; messages are returned unchanged
    const updatedSession: SessionConfig = { ...session, ttlMs: newTtlMs }
    // existingMessages are not mutated — returned reference as proof
    return { session: updatedSession, messages: existingMessages }
  }

  /**
   * Re-arm the deletion timer for `entry` based on the current time.
   * If `disappearsAt` is in the past, triggers deletion immediately.
   */
  private _arm(entry: ScheduledEntry): void {
    if (entry.timerId !== null) {
      clearTimeout(entry.timerId)
      entry.timerId = null
    }

    const { message, onDelete, onFailed } = entry
    const remaining = (message.disappearsAt ?? 0) - Date.now()
    const delay = Math.max(0, remaining)

    entry.timerId = setTimeout(() => {
      this._entries.delete(message.messageId)
      deleteWithRetry(message.messageId, onDelete, onFailed)
    }, delay)
  }

  /**
   * Invoked when `document.visibilitychange` fires. Re-anchors all active
   * timers so that messages that expired during a minimize/background period
   * are cleaned up promptly when the tab becomes visible again. (REQ-6.5)
   */
  private _onVisibilityChange(): void {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      for (const entry of this._entries.values()) {
        this._arm(entry)
      }
    }
  }
}
