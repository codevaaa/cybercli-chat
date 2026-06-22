/**
 * MessageComposer.ts
 *
 * Basic Plan message composition utilities.
 *
 * - validateMessageLength: enforces the 4,096-character limit (REQ-3.1)
 * - buildBasicChatFrame: constructs a TLS-only (no E2EE) ChatFrame (REQ-3.6)
 * - createGroupRoom: generates a UUID Room_ID for Group_Chat creation (REQ-4.1)
 *
 * REQ-3.1, REQ-3.6, REQ-4.1
 */

import { type ChatFrame, nextSeq } from '../transport/WsMultiplexer.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum message text length for Basic Plan (REQ-3.1) */
const MAX_MESSAGE_LENGTH = 4096

// ---------------------------------------------------------------------------
// validateMessageLength
// ---------------------------------------------------------------------------

/**
 * Validates that a message text does not exceed the 4,096-character limit.
 *
 * Returns `{ valid: true }` when `text.length <= 4096`.
 * Returns `{ valid: false; error: string }` when `text.length > 4096`.
 *
 * REQ-3.1
 */
export function validateMessageLength(
  text: string,
): { valid: true } | { valid: false; error: string } {
  if (text.length <= MAX_MESSAGE_LENGTH) {
    return { valid: true }
  }
  return {
    valid: false,
    error: `Message exceeds the maximum length of ${MAX_MESSAGE_LENGTH} characters (got ${text.length}).`,
  }
}

// ---------------------------------------------------------------------------
// BasicChatPayload — the shape of a Basic Plan message payload
// ---------------------------------------------------------------------------

/**
 * Payload carried inside a Basic Plan chat frame.
 * `encryptionStatus` is always `'tls_only'` — never `'e2ee'` — for Basic Plan (REQ-3.6).
 */
export interface BasicChatPayload {
  text: string
  encryptionStatus: 'tls_only'
  roomId: string | undefined
}

// ---------------------------------------------------------------------------
// buildBasicChatFrame
// ---------------------------------------------------------------------------

/**
 * Builds a `ChatFrame` for a Basic Plan text message.
 *
 * - type is always `'anon_chat.message'`
 * - payload carries `{ text, encryptionStatus: 'tls_only', roomId }`
 * - NO E2EE header is added (REQ-3.6)
 *
 * @param text   - Message text (should be validated before calling this)
 * @param roomId - Optional Room_ID for group messages
 *
 * REQ-3.6, REQ-4.4
 */
export function buildBasicChatFrame(text: string, roomId?: string): ChatFrame {
  const payload: BasicChatPayload = {
    text,
    encryptionStatus: 'tls_only',
    roomId,
  }

  return {
    type: 'anon_chat.message',
    payload,
    seq: nextSeq(),
  }
}

// ---------------------------------------------------------------------------
// createGroupRoom
// ---------------------------------------------------------------------------

/**
 * Generates a new Group_Chat Room_ID using `crypto.randomUUID()`.
 *
 * Returns an object `{ roomId }` containing the generated UUID string.
 *
 * REQ-4.1
 */
export function createGroupRoom(): { roomId: string } {
  return { roomId: crypto.randomUUID() }
}
