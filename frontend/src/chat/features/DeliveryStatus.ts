/**
 * DeliveryStatus.ts
 *
 * Delivery status finite-state machine for Basic Plan messages.
 *
 * Valid states:   sent → delivered → read
 * Invalid states: any transition not listed in VALID_TRANSITIONS
 *
 * REQ-3.4
 */

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

/**
 * The three delivery states a message may occupy.
 *
 * Progression is strictly one-way: sent → delivered → read.
 *
 * REQ-3.4
 */
export type DeliveryStatus = 'sent' | 'delivered' | 'read'

// ---------------------------------------------------------------------------
// VALID_TRANSITIONS
// ---------------------------------------------------------------------------

/**
 * Adjacency map of permitted delivery status transitions.
 *
 * - `sent`      may transition to `delivered`
 * - `delivered` may transition to `read`
 * - `read`      is a terminal state (no further transitions)
 *
 * REQ-3.4
 */
export const VALID_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  sent: ['delivered'],
  delivered: ['read'],
  read: [],
}

// ---------------------------------------------------------------------------
// transitionDeliveryStatus
// ---------------------------------------------------------------------------

/**
 * Attempts to advance the delivery status from `current` to `next`.
 *
 * Returns `next` when the transition is valid according to `VALID_TRANSITIONS`.
 * Returns `{ error: string }` when the transition is not permitted.
 *
 * @param current - The current delivery status
 * @param next    - The desired delivery status
 *
 * REQ-3.4
 */
export function transitionDeliveryStatus(
  current: DeliveryStatus,
  next: DeliveryStatus,
): DeliveryStatus | { error: string } {
  if (VALID_TRANSITIONS[current].includes(next)) {
    return next
  }
  return {
    error: `Invalid delivery status transition: '${current}' → '${next}'. Allowed transitions from '${current}': [${VALID_TRANSITIONS[current].map((s) => `'${s}'`).join(', ') || 'none'}].`,
  }
}

// ---------------------------------------------------------------------------
// isValidDeliveryStatus
// ---------------------------------------------------------------------------

/**
 * Type-guard that returns true when `status` is one of the known
 * `DeliveryStatus` string literals.
 *
 * @param status - Arbitrary string to test
 */
export function isValidDeliveryStatus(status: string): status is DeliveryStatus {
  return status === 'sent' || status === 'delivered' || status === 'read'
}
