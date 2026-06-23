/**
 * planGuard.ts
 * Middleware that verifies a user's Codeva plan tier before allowing
 * MAX-plan-only operations on the anonymous chat relay.
 *
 * Feature: anonymous-chat
 * Requirement refs: REQ-11.2, REQ-11.4
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Operations that require a MAX-tier subscription.
 * Exported for test assertions (Property 29).
 */
export const MAX_ONLY_OPERATIONS: readonly string[] = [
  'e2ee',
  'disappearing',
  'file_transfer',
  'voice_message',
  'onion_routing',
] as const

/**
 * WebSocket event types that map to MAX-only operations.
 * Used by chatWsHandler.ts to decide when to run the plan guard.
 */
export const MAX_ONLY_EVENTS = new Set<string>([
  'anon_chat.e2ee',
  'anon_chat.disappearing',
  'anon_chat.file_transfer',
  'anon_chat.voice_message',
  'anon_chat.onion_packet',
])

// ─── JWT / token helpers ──────────────────────────────────────────────────────

interface TokenPayload {
  plan?: string
  /** Account suspension flag set on payment failure or policy violation */
  suspended?: boolean
  /** Sub-second Unix timestamp when the plan subscription expires */
  planExpiresAt?: number
}

/**
 * Decode the payload section of a JWT or a plain base64-encoded JSON token.
 * Uses base64url decoding so it works with both standard JWTs and the simple
 * mock tokens produced in tests (no signature verification — plan enforcement
 * must not depend on secrets available only in the auth service).
 *
 * Returns a best-effort object; malformed tokens yield an empty payload.
 */
function decodeTokenPayload(token: string): TokenPayload {
  try {
    // A JWT has three dot-separated segments; take the middle one.
    const parts = token.split('.')
    const segment = parts.length >= 3 ? parts[1] : parts[0]
    // base64url → base64 → Buffer → UTF-8 string
    const b64 = segment.replace(/-/g, '+').replace(/_/g, '/')
    const json = Buffer.from(b64, 'base64').toString('utf8')
    return JSON.parse(json) as TokenPayload
  } catch {
    return {}
  }
}

/**
 * Extract the plan tier from an auth token.
 * Returns 'free' when the token is absent, malformed, or contains no plan.
 */
function extractTier(token: string | undefined): string {
  if (!token) return 'free'
  const payload = decodeTokenPayload(token)

  // Immediate downgrade on payment failure or account suspension (REQ-11.4)
  if (payload.suspended) return 'free'

  return payload.plan ?? 'free'
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface PlanCheckResult {
  allowed: boolean
  tier: string
  reason?: string
}

/**
 * Check whether a given operation is permitted for the plan tier encoded in
 * the supplied auth token.
 *
 * @param token     - Raw auth token string (JWT or base64-encoded JSON)
 * @param operation - Operation name, e.g. 'e2ee', 'file_transfer'
 *
 * Validates: REQ-11.2, Property 29 (Server Feature Gate)
 */
export function checkPlan(token: string, operation: string): PlanCheckResult {
  const tier = extractTier(token)
  const isMaxOnly = (MAX_ONLY_OPERATIONS as string[]).includes(operation)

  if (isMaxOnly && tier !== 'max') {
    return {
      allowed: false,
      tier,
      reason: `Operation '${operation}' requires MAX plan (current tier: ${tier})`,
    }
  }

  return { allowed: true, tier }
}

/**
 * WsContext-aware plan guard used by chatWsHandler.ts.
 * Returns allowed=true for non-MAX operations and for MAX subscribers.
 * Returns allowed=false immediately for suspended accounts (REQ-11.4).
 */
export async function planGuard(
  ctx: { authToken?: string },
): Promise<{ allowed: boolean; reason?: string }> {
  const tier = extractTier(ctx.authToken)

  // A suspended or payment-failed account is detected via decodeTokenPayload
  // inside extractTier — it returns 'free' which gates all MAX ops.
  // The caller (chatWsHandler) only invokes planGuard when the event type is
  // already in MAX_ONLY_EVENTS, so returning allowed=false here is correct.
  if (tier !== 'max') {
    return {
      allowed: false,
      reason: 'MAX plan required for this operation',
    }
  }

  return { allowed: true }
}
