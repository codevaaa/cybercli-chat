/**
 * InviteLink.ts — Client-side invite link flow.
 *
 * Provides:
 *   - `parseInviteToken(token)`: decodes the base64url payload without verifying
 *     HMAC (signature verification happens server-side via validateFn). Throws
 *     if the token is malformed.
 *   - `openInviteLink(token, validateFn, onValid, onInvalid)`: validates the
 *     token first via the provided async function; calls onValid with the roomId
 *     if the link is good, or calls onInvalid with the error otherwise. The
 *     Room is never resolved on failure.
 *
 * Feature: anonymous-chat
 * Requirement refs: REQ-10.1, REQ-10.2, REQ-10.3, REQ-10.4, REQ-10.5
 */

// ─── Token payload type ───────────────────────────────────────────────────────

/** The decoded payload portion of an invite token. */
export interface InviteTokenPayload {
  roomId: string
  createdAt: number          // unix ms
  expiresAt: number | null   // unix ms, null = never-expire
}

// ─── Error type (mirrors backend InviteInvalidError) ─────────────────────────

export interface InviteInvalidError {
  type: 'INVITE_INVALID'
  reason: 'expired' | 'revoked' | 'not_found' | 'bad_signature'
}

// ─── ValidateFn signature ─────────────────────────────────────────────────────

/**
 * A function that validates an invite token against the server.
 * Typically wraps a WS/HTTP call to `validateInviteLink` on the Relay Server.
 */
export type ValidateFn = (
  token: string,
) => Promise<{ valid: true; roomId: string } | { valid: false; error: InviteInvalidError }>

// ─── parseInviteToken ─────────────────────────────────────────────────────────

/**
 * Decode the base64url payload of an invite token without verifying the
 * HMAC signature.
 *
 * Token format: `<base64url_payload>.<hmac_hex>`
 *
 * @param token - The full two-part token string
 * @returns Decoded `{ roomId, createdAt, expiresAt }` payload
 * @throws {Error} If the token is malformed or the payload cannot be parsed
 *
 * Validates: REQ-10.1, Property 26 (Invite Token Round-Trip)
 */
export function parseInviteToken(token: string): InviteTokenPayload {
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('parseInviteToken: token must be a non-empty string')
  }

  const dotIndex = token.lastIndexOf('.')
  if (dotIndex === -1) {
    throw new Error('parseInviteToken: token has no separator — expected <payload>.<sig>')
  }

  const encodedPayload = token.slice(0, dotIndex)
  if (encodedPayload.length === 0) {
    throw new Error('parseInviteToken: empty payload section')
  }

  let jsonStr: string
  try {
    jsonStr = atob(
      encodedPayload
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(encodedPayload.length + ((4 - (encodedPayload.length % 4)) % 4), '='),
    )
  } catch {
    throw new Error('parseInviteToken: payload is not valid base64url')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new Error('parseInviteToken: payload JSON is invalid')
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('parseInviteToken: payload must be a JSON object')
  }

  const obj = parsed as Record<string, unknown>

  if (typeof obj.roomId !== 'string' || obj.roomId.length === 0) {
    throw new Error('parseInviteToken: missing or invalid roomId')
  }

  if (typeof obj.createdAt !== 'number') {
    throw new Error('parseInviteToken: missing or invalid createdAt')
  }

  if (obj.expiresAt !== null && typeof obj.expiresAt !== 'number') {
    throw new Error('parseInviteToken: expiresAt must be a number or null')
  }

  return {
    roomId: obj.roomId,
    createdAt: obj.createdAt,
    expiresAt: (obj.expiresAt ?? null) as number | null,
  }
}

// ─── openInviteLink ───────────────────────────────────────────────────────────

/**
 * Client-side invite link flow:
 *
 *   1. Call `validateFn(token)` to verify the link with the server.
 *   2. If valid: call `onValid(roomId)` — caller shows the join UI.
 *   3. If invalid/expired/revoked: call `onInvalid(error)` — caller shows
 *      an error modal. The Room is never resolved on failure.
 *
 * @param token       - The full two-part token string
 * @param validateFn  - Async function that validates the token against the server
 * @param onValid     - Called with the resolved roomId when the link is valid
 * @param onInvalid   - Called with the error when the link is invalid
 *
 * Validates: REQ-10.3, REQ-10.4, REQ-10.5
 */
export async function openInviteLink(
  token: string,
  validateFn: ValidateFn,
  onValid: (roomId: string) => void,
  onInvalid: (error: InviteInvalidError) => void,
): Promise<void> {
  let result: { valid: true; roomId: string } | { valid: false; error: InviteInvalidError }

  try {
    result = await validateFn(token)
  } catch {
    // Network or unexpected error — treat as not_found
    onInvalid({ type: 'INVITE_INVALID', reason: 'not_found' })
    return
  }

  if (result.valid) {
    onValid(result.roomId)
  } else {
    // Do NOT resolve the Room — call onInvalid only
    onInvalid(result.error)
  }
}
