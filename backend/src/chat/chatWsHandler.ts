/**
 * chatWsHandler.ts
 * Dispatches incoming `anon_chat.*` WebSocket frames to the appropriate
 * sub-handlers without touching any existing daemon event handlers.
 *
 * Feature: anonymous-chat
 * Requirement refs: REQ-12.4
 */

import type { WebSocket } from 'ws'
import { planGuard, MAX_ONLY_EVENTS } from './planGuard.js'
import {
  joinRoom,
  leaveRoom,
  getRoomMemberCount,
} from './roomRegistry.js'
import {
  queueMessage,
  ackDelivery,
} from './messageQueue.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatFrame {
  type: `anon_chat.${string}`
  payload: unknown
  seq: number
  authToken?: string
}

export interface WsContext {
  ws: WebSocket
  /** Codeva auth token extracted from the WS upgrade or first authenticated frame */
  authToken?: string
  userId?: string
  plan?: string
}

type SubHandler = (ctx: WsContext, frame: ChatFrame) => Promise<void>

// ─── Sub-handler registry ─────────────────────────────────────────────────────

const subHandlers = new Map<string, SubHandler>()

function register(eventType: string, handler: SubHandler): void {
  subHandlers.set(eventType, handler)
}

// ─── Registered sub-handlers ──────────────────────────────────────────────────

register('anon_chat.room_join', async (ctx, frame) => {
  const { roomId, participantId } = frame.payload as { roomId: string; participantId: string }
  const result = await joinRoom(roomId, participantId)
  sendFrame(ctx.ws, {
    type: 'anon_chat.room_join_ack',
    payload: result,
    seq: frame.seq,
  })
  relayLog('room_join_attempted')
})

register('anon_chat.room_leave', async (ctx, frame) => {
  const { roomId, participantId } = frame.payload as { roomId: string; participantId: string }
  await leaveRoom(roomId, participantId)
  sendFrame(ctx.ws, {
    type: 'anon_chat.room_leave_ack',
    payload: { ok: true },
    seq: frame.seq,
  })
  relayLog('room_leave')
})

register('anon_chat.message', async (ctx, frame) => {
  const { recipientId, packetId, data } = frame.payload as {
    recipientId: string
    packetId: string
    data: unknown
  }
  await queueMessage(recipientId, packetId, data)
  relayLog('message_forwarded')
})

register('anon_chat.delivery_ack', async (ctx, frame) => {
  const { recipientId, packetId } = frame.payload as { recipientId: string; packetId: string }
  await ackDelivery(recipientId, packetId)
  relayLog('delivery_ack_processed')
})

register('anon_chat.key_bundle_pub', async (ctx, frame) => {
  // Key bundle storage is handled by keyBundleStore.ts (Task 8).
  // Here we simply acknowledge receipt so the frame is not silently dropped.
  relayLog('key_bundle_pub_received')
  sendFrame(ctx.ws, {
    type: 'anon_chat.key_bundle_pub_ack',
    payload: { ok: true },
    seq: frame.seq,
  })
})

register('anon_chat.key_bundle_req', async (ctx, frame) => {
  // Lookup delegation to keyBundleStore.ts; placeholder for now.
  relayLog('key_bundle_req_received')
})

// ─── Main dispatcher ──────────────────────────────────────────────────────────

/**
 * Call this from the WebSocket `message` event listener.
 * Returns `false` (and does nothing) for non-`anon_chat.*` frames so the
 * existing daemon handler can process them undisturbed.
 */
export async function handleChatFrame(
  ctx: WsContext,
  rawMessage: string | Buffer,
): Promise<boolean> {
  let frame: ChatFrame

  try {
    const parsed = JSON.parse(rawMessage.toString()) as Record<string, unknown>
    if (typeof parsed.type !== 'string' || !parsed.type.startsWith('anon_chat.')) {
      // Not an anonymous-chat frame — let the daemon handler take it.
      return false
    }
    frame = parsed as unknown as ChatFrame
  } catch {
    // Malformed JSON is ignored; the daemon handler won't want it either.
    return false
  }

  // Attach auth token from the frame if present (first-frame auth pattern)
  if (frame.authToken && !ctx.authToken) {
    ctx.authToken = frame.authToken
  }

  // Plan guard — block MAX-only ops for non-MAX tokens
  if (MAX_ONLY_EVENTS.has(frame.type)) {
    const guardResult = await planGuard(ctx)
    if (!guardResult.allowed) {
      sendFrame(ctx.ws, {
        type: 'anon_chat.error',
        payload: { code: 403, message: guardResult.reason ?? 'Forbidden: MAX plan required' },
        seq: frame.seq,
      })
      relayLog('plan_guard_rejected')
      return true
    }
  }

  const handler = subHandlers.get(frame.type)
  if (handler) {
    try {
      await handler(ctx, frame)
    } catch (err) {
      // Never leak error details in the log — only the event type label
      relayLog('handler_error')
      sendFrame(ctx.ws, {
        type: 'anon_chat.error',
        payload: { code: 500, message: 'Internal relay error' },
        seq: frame.seq,
      })
    }
  } else {
    relayLog('unknown_event_type')
    sendFrame(ctx.ws, {
      type: 'anon_chat.error',
      payload: { code: 400, message: 'Unknown anonymous chat event type' },
      seq: frame.seq,
    })
  }

  return true
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sendFrame(ws: WebSocket, frame: Record<string, unknown>): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(frame))
  }
}

/**
 * Relay log — emits ONLY anonymized event type labels.
 * No payload, sender ID, IP, or routing path is ever included (REQ-13.5).
 */
export function relayLog(eventTypeLabel: string): void {
  // Only the anonymized label is written — no other fields.
  console.log(JSON.stringify({ event: eventTypeLabel }))
}
