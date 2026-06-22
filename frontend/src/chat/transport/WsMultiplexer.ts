/**
 * WsMultiplexer — WebSocket Namespace and Reconnect Transport Layer.
 *
 * Multiplexes anonymous chat frames over the existing Codeva daemon WebSocket
 * connection using the `anon_chat.*` type prefix namespace. All chat frames
 * are tagged with this prefix; incoming frames are demuxed by prefix without
 * touching daemon frames.
 *
 * REQ-12.1, REQ-12.2, REQ-12.3, REQ-12.4, REQ-12.5
 */

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

/**
 * Chat frame envelope sent over the existing WS connection.
 * The `type` field is always prefixed with `anon_chat.` to namespace
 * chat traffic away from existing daemon events (REQ-12.1).
 */
export interface ChatFrame {
  /** Discriminated union type — always matches `anon_chat.${string}` */
  type: `anon_chat.${string}`
  /** Opaque message payload — encrypted content, key bundles, etc. */
  payload: unknown
  /** Monotonic sequence number for ordering */
  seq: number
}

/**
 * A handler registered to receive incoming chat frames matching a given type.
 */
export type ChatFrameHandler = (frame: ChatFrame) => void

/**
 * Notification callback invoked when the connection is unavailable for
 * 10 or more consecutive reconnect attempts (REQ-12.2).
 */
export type ConnectionUnavailableCallback = (consecutiveFailures: number) => void

/**
 * Internal state of the multiplexer connection.
 */
export type MultiplexerState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

// ---------------------------------------------------------------------------
// Backoff constants
// ---------------------------------------------------------------------------

/** Base delay in milliseconds for the first backoff step (1 second) */
const BACKOFF_BASE_MS = 1000
/** Maximum backoff delay in milliseconds (32 seconds) */
const BACKOFF_MAX_MS = 32_000
/** Number of consecutive failures before notifying user (REQ-12.2) */
const FAILURE_NOTIFY_THRESHOLD = 10
/** Prefix used to namespace all anonymous chat frames (REQ-12.1) */
const ANON_CHAT_PREFIX = 'anon_chat.'

// ---------------------------------------------------------------------------
// Pure exported utilities (for testability)
// ---------------------------------------------------------------------------

/**
 * Compute the exponential backoff delay for reconnect attempt number `n`.
 *
 * Formula: `min(2^(n-1) * 1000, 32000)` milliseconds
 *
 * Sequence: [1000, 2000, 4000, 8000, 16000, 32000, 32000, …]
 *
 * REQ-12.2 / Property 32
 *
 * @param n - 1-based attempt number (n=1 is first attempt)
 * @returns delay in milliseconds
 */
export function computeBackoffDelay(n: number): number {
  return Math.min(Math.pow(2, n - 1) * BACKOFF_BASE_MS, BACKOFF_MAX_MS)
}

/**
 * Returns true if `type` is a valid anon_chat namespace type.
 * Valid pattern: `anon_chat.[a-z_]+`
 * Used to check that no chat frame leaks a daemon-conflicting type.
 *
 * REQ-12.1 / Property 31
 */
export function isValidChatFrameType(type: string): type is `anon_chat.${string}` {
  return /^anon_chat\.[a-z_]+$/.test(type)
}

/**
 * Returns true if `type` belongs to the anon_chat namespace.
 * Used for demuxing — only handle frames prefixed with `anon_chat.`.
 */
export function isChatFrameType(type: string): type is `anon_chat.${string}` {
  return type.startsWith(ANON_CHAT_PREFIX)
}

// ---------------------------------------------------------------------------
// Sequence counter
// ---------------------------------------------------------------------------

/** Module-level monotonic sequence counter for outgoing frames. */
let _seqCounter = 0

/**
 * Get the next sequence number.
 * Exported for testing purposes.
 */
export function nextSeq(): number {
  return ++_seqCounter
}

/**
 * Reset the sequence counter (for testing only).
 */
export function _resetSeqCounter(): void {
  _seqCounter = 0
}

// ---------------------------------------------------------------------------
// Global daemon WS accessor
// ---------------------------------------------------------------------------

/**
 * Symbol used to attach the daemon WebSocket to the global/window object
 * so the multiplexer can find and reuse it on page load.
 *
 * REQ-12.5: On page load, check for an existing daemon WS and attach to it.
 */
const DAEMON_WS_KEY = '__codeva_daemon_ws__'

/**
 * Register the daemon WebSocket on the global object so `WsMultiplexer`
 * can discover and reuse it. Call this once when the daemon establishes its
 * connection.
 */
export function registerDaemonWebSocket(ws: WebSocket): void {
  ;(globalThis as Record<string, unknown>)[DAEMON_WS_KEY] = ws
}

/**
 * Retrieve a registered daemon WebSocket if one exists and is open.
 * Returns null if none is registered or if it is in a non-OPEN state.
 * Uses duck-typing rather than instanceof to work correctly in test environments
 * where the global WebSocket constructor may be replaced.
 * REQ-12.5
 */
export function getExistingDaemonWebSocket(): WebSocket | null {
  const ws = (globalThis as Record<string, unknown>)[DAEMON_WS_KEY]
  if (
    ws != null &&
    typeof (ws as WebSocket).send === 'function' &&
    typeof (ws as WebSocket).addEventListener === 'function' &&
    (ws as WebSocket).readyState === 1 /* WebSocket.OPEN */
  ) {
    return ws as WebSocket
  }
  return null
}

// ---------------------------------------------------------------------------
// WsMultiplexer class
// ---------------------------------------------------------------------------

/**
 * Multiplexes anonymous chat traffic over the existing Codeva daemon
 * WebSocket connection.
 *
 * Responsibilities:
 * - Namespace outgoing frames with `anon_chat.*` prefix (REQ-12.1)
 * - Demux incoming frames: deliver `anon_chat.*` to registered handlers
 *   without touching daemon frames (REQ-12.1, REQ-12.4)
 * - Reconnect with exponential backoff on disconnection (REQ-12.2)
 * - Queue outgoing messages while offline, flush in order on reconnect (REQ-12.3)
 * - Reuse existing daemon WS on page load (REQ-12.5)
 */
export class WsMultiplexer {
  private _ws: WebSocket | null = null
  private _url: string
  private _state: MultiplexerState = 'disconnected'
  private _handlers: Map<string, Set<ChatFrameHandler>> = new Map()
  private _offlineQueue: ChatFrame[] = []
  private _consecutiveFailures = 0
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private _onConnectionUnavailable: ConnectionUnavailableCallback | null = null
  private _boundOnOpen: () => void
  private _boundOnMessage: (event: MessageEvent) => void
  private _boundOnClose: () => void
  private _boundOnError: (event: Event) => void

  constructor(url: string, onConnectionUnavailable?: ConnectionUnavailableCallback) {
    this._url = url
    this._onConnectionUnavailable = onConnectionUnavailable ?? null

    // Bind event handlers once so they can be removed cleanly
    this._boundOnOpen = this._handleOpen.bind(this)
    this._boundOnMessage = this._handleMessage.bind(this)
    this._boundOnClose = this._handleClose.bind(this)
    this._boundOnError = this._handleError.bind(this)
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Connect the multiplexer. If an existing daemon WebSocket is available
   * (REQ-12.5), attach to it instead of opening a new connection.
   */
  connect(): void {
    if (this._state === 'connected' || this._state === 'connecting') return

    // REQ-12.5: Reuse existing daemon WS if available
    const existing = getExistingDaemonWebSocket()
    if (existing) {
      this._attachToWebSocket(existing)
      return
    }

    this._openNewSocket()
  }

  /**
   * Cleanly disconnect the multiplexer and cancel any pending reconnect.
   */
  disconnect(): void {
    this._cancelReconnect()
    this._consecutiveFailures = 0
    // Set state to 'disconnected' BEFORE closing the socket so that the 'close'
    // event handler (_handleClose) is a no-op and does not schedule a reconnect.
    this._state = 'disconnected'

    if (this._ws) {
      this._detachListeners(this._ws)
      if (
        this._ws.readyState === WebSocket.OPEN ||
        this._ws.readyState === WebSocket.CONNECTING
      ) {
        this._ws.close()
      }
      this._ws = null
    }
  }

  /**
   * Send a chat frame over the WebSocket.
   *
   * If the connection is unavailable, the frame is added to the offline queue
   * and will be transmitted in order on reconnect (REQ-12.3).
   *
   * The `type` field is enforced to match `anon_chat.*` (REQ-12.1).
   */
  send(type: `anon_chat.${string}`, payload: unknown): ChatFrame {
    const frame: ChatFrame = {
      type,
      payload,
      seq: nextSeq(),
    }

    if (this._state === 'connected' && this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(frame))
    } else {
      // Queue for later (REQ-12.3)
      this._offlineQueue.push(frame)
    }

    return frame
  }

  /**
   * Register a handler for a specific chat frame type.
   * Multiple handlers may be registered for the same type.
   * Daemon frames (non `anon_chat.*` prefix) are never delivered here.
   */
  on(type: `anon_chat.${string}`, handler: ChatFrameHandler): void {
    if (!this._handlers.has(type)) {
      this._handlers.set(type, new Set())
    }
    this._handlers.get(type)!.add(handler)
  }

  /**
   * Remove a previously registered handler.
   */
  off(type: `anon_chat.${string}`, handler: ChatFrameHandler): void {
    this._handlers.get(type)?.delete(handler)
  }

  /**
   * Returns the current number of queued offline messages.
   */
  get offlineQueueSize(): number {
    return this._offlineQueue.length
  }

  /**
   * Returns the current connection state.
   */
  get state(): MultiplexerState {
    return this._state
  }

  /**
   * Returns the number of consecutive reconnect failures.
   */
  get consecutiveFailures(): number {
    return this._consecutiveFailures
  }

  // -------------------------------------------------------------------------
  // Private — WebSocket lifecycle
  // -------------------------------------------------------------------------

  private _openNewSocket(): void {
    this._state = 'connecting'
    try {
      const ws = new WebSocket(this._url)
      this._attachToWebSocket(ws)
    } catch (err) {
      // Synchronous construction error — treat as immediate failure
      this._handleFailure()
    }
  }

  private _attachToWebSocket(ws: WebSocket): void {
    this._ws = ws
    this._state = ws.readyState === WebSocket.OPEN ? 'connected' : 'connecting'
    ws.addEventListener('open', this._boundOnOpen)
    ws.addEventListener('message', this._boundOnMessage)
    ws.addEventListener('close', this._boundOnClose)
    ws.addEventListener('error', this._boundOnError)

    // If already open (daemon WS reuse), flush queue immediately
    if (ws.readyState === WebSocket.OPEN) {
      this._handleOpen()
    }
  }

  private _detachListeners(ws: WebSocket): void {
    ws.removeEventListener('open', this._boundOnOpen)
    ws.removeEventListener('message', this._boundOnMessage)
    ws.removeEventListener('close', this._boundOnClose)
    ws.removeEventListener('error', this._boundOnError)
  }

  // -------------------------------------------------------------------------
  // Private — WebSocket event handlers
  // -------------------------------------------------------------------------

  private _handleOpen(): void {
    this._state = 'connected'
    this._consecutiveFailures = 0
    this._cancelReconnect()
    this._flushOfflineQueue()
  }

  private _handleMessage(event: MessageEvent): void {
    let parsed: unknown
    try {
      parsed = JSON.parse(event.data as string)
    } catch {
      // Not a JSON frame — ignore (could be a daemon binary frame)
      return
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).type !== 'string'
    ) {
      return
    }

    const frame = parsed as { type: string; payload: unknown; seq: unknown }

    // REQ-12.1, REQ-12.4: Only dispatch anon_chat.* frames; leave daemon frames untouched
    if (!isChatFrameType(frame.type)) {
      return
    }

    const chatFrame: ChatFrame = {
      type: frame.type as `anon_chat.${string}`,
      payload: frame.payload,
      seq: typeof frame.seq === 'number' ? frame.seq : 0,
    }

    // Dispatch to all handlers registered for this type
    const handlers = this._handlers.get(chatFrame.type)
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(chatFrame)
        } catch {
          // Individual handler errors must not crash the multiplexer
        }
      })
    }
  }

  private _handleClose(): void {
    if (this._state === 'disconnected') return
    this._handleFailure()
  }

  private _handleError(_event: Event): void {
    // Error is always followed by close — let _handleClose drive reconnect
  }

  // -------------------------------------------------------------------------
  // Private — Reconnect logic
  // -------------------------------------------------------------------------

  private _handleFailure(): void {
    if (this._ws) {
      this._detachListeners(this._ws)
      this._ws = null
    }
    this._consecutiveFailures++
    this._state = 'reconnecting'

    // REQ-12.2: Notify user after 10 consecutive failures
    if (
      this._consecutiveFailures >= FAILURE_NOTIFY_THRESHOLD &&
      this._onConnectionUnavailable
    ) {
      try {
        this._onConnectionUnavailable(this._consecutiveFailures)
      } catch {
        // Notification callback errors must not crash the multiplexer
      }
    }

    const delay = computeBackoffDelay(this._consecutiveFailures)
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null
      if (this._state !== 'disconnected') {
        this._openNewSocket()
      }
    }, delay)
  }

  private _cancelReconnect(): void {
    if (this._reconnectTimer !== null) {
      clearTimeout(this._reconnectTimer)
      this._reconnectTimer = null
    }
  }

  // -------------------------------------------------------------------------
  // Private — Offline queue flush
  // -------------------------------------------------------------------------

  /**
   * Flush all queued offline messages in original order (REQ-12.3 / Property 33).
   * Messages are sent in FIFO order; none are dropped.
   */
  private _flushOfflineQueue(): void {
    if (this._offlineQueue.length === 0) return
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return

    // Snapshot queue and clear it before sending to prevent re-queue on error
    const toFlush = [...this._offlineQueue]
    this._offlineQueue = []

    for (const frame of toFlush) {
      try {
        this._ws.send(JSON.stringify(frame))
      } catch {
        // On send failure, re-queue remaining frames (preserving order)
        const failedIdx = toFlush.indexOf(frame)
        this._offlineQueue = [...toFlush.slice(failedIdx), ...this._offlineQueue]
        break
      }
    }
  }
}
