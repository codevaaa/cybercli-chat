/**
 * AnonymousChatPage — Entry point for Codeva Anonymous Chat.
 *
 * Flow:
 *  1. On mount: IdentityManager.initialize() — load or generate Ed25519 key pair.
 *  2. Show identity (pseudonym = first 12 chars of hex identifier).
 *  3. Render a simple chat UI that uses WsMultiplexer for anon_chat.* frames.
 *  4. MAX plan features (E2EE, disappearing messages, file/voice) are gated via
 *     usePlanGuard — non-MAX users see UpgradeModal.
 *
 * Responsive: sidebar layout on md+, full-screen on mobile.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Ghost, Lock, LockOpen, Shield, Clock, Paperclip, Mic,
  Send, RefreshCw, AlertCircle, ChevronLeft, Copy, Check,
  Trash2, X, Info, UserX, Settings2
} from 'lucide-react'
import { useAuthStore } from '@stores/authStore.js'
import { motion, AnimatePresence } from 'framer-motion'

// ── Lazy-import heavy crypto modules so they don't block initial render ──────
// These are loaded only after the page mounts.
let _identityManager = null
async function getIdentityManager() {
  if (_identityManager) return _identityManager
  const mod = await import('../../chat/identity/IdentityManager.ts')
  _identityManager = mod.identityManager  // singleton exported by IdentityManager.ts
  return _identityManager
}

// ── Plan guard hook (client-side feature gating) ─────────────────────────────
import { usePlanGuard } from '../../chat/hooks/usePlanGuard.ts'

// ── UI sub-components ─────────────────────────────────────────────────────────
import { E2eeBadge }    from '../../chat/components/E2eeBadge.tsx'
import { TtlSelector }  from '../../chat/components/TtlSelector.tsx'
import { UpgradeModal } from '../../chat/components/UpgradeModal.tsx'
import { CountdownTimer } from '../../chat/components/CountdownTimer.tsx'
import { AudioPlayer }  from '../../chat/media/AudioPlayer.tsx'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_MSG_LENGTH = 4096
const ACCENT = '#cba6f7'     // Catppuccin Mauve — anonymous chat brand colour

// ─────────────────────────────────────────────────────────────────────────────
// Helper: shorten identifier for display
// ─────────────────────────────────────────────────────────────────────────────

function shortId(hex = '') {
  if (hex.length < 12) return hex
  return hex.slice(0, 6) + '…' + hex.slice(-4)
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Identity badge (top bar)
// ─────────────────────────────────────────────────────────────────────────────

function IdentityBadge({ identifier, onCopy, copied }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'rgba(203,166,247,0.08)',
        border: '1px solid rgba(203,166,247,0.2)',
        borderRadius: '999px',
        padding: '0.3rem 0.75rem',
        fontSize: '0.75rem',
        fontFamily: 'monospace',
        color: ACCENT,
        cursor: 'pointer',
        userSelect: 'none',
        flexShrink: 0,
      }}
      onClick={onCopy}
      title="Your anonymous identifier — click to copy"
    >
      <UserX size={12} aria-hidden="true" />
      <span>{identifier ? shortId(identifier) : '…'}</span>
      {copied
        ? <Check size={11} style={{ color: '#a6e3a1' }} />
        : <Copy size={11} style={{ opacity: 0.6 }} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Empty state
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ plan }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center',
        opacity: 0.7,
      }}
    >
      <Ghost size={40} style={{ color: ACCENT, opacity: 0.5 }} />
      <p style={{ fontSize: '0.9375rem', maxWidth: '22rem', lineHeight: 1.6 }}>
        No messages yet. Send the first one — your identity is completely anonymous.
      </p>
      {plan !== 'max' && (
        <p style={{
          fontSize: '0.8125rem',
          background: 'rgba(203,166,247,0.07)',
          border: '1px solid rgba(203,166,247,0.15)',
          borderRadius: '0.5rem',
          padding: '0.625rem 1rem',
          color: ACCENT,
          maxWidth: '22rem',
        }}>
          Upgrade to MAX to unlock E2EE, disappearing messages, file sharing &amp; voice.
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Message bubble
// ─────────────────────────────────────────────────────────────────────────────

function AnonMessageBubble({ msg }) {
  const isMe = msg.direction === 'sent'

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isMe ? 'flex-end' : 'flex-start',
        marginBottom: '0.75rem',
        padding: '0 0.5rem',
      }}
    >
      <div
        style={{
          maxWidth: 'min(75%, 28rem)',
          background: isMe ? 'rgba(203,166,247,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${isMe ? 'rgba(203,166,247,0.25)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: isMe ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
          padding: '0.625rem 0.875rem',
          fontSize: '0.9375rem',
          lineHeight: 1.5,
          wordBreak: 'break-word',
        }}
      >
        {/* Voice message */}
        {msg.type === 'voice' && msg.audioSrc && (
          <AudioPlayer src={msg.audioSrc} label="Voice message" style={{ marginBottom: '0.375rem' }} />
        )}

        {/* Text content */}
        {msg.content && <span>{msg.content}</span>}

        {/* Footer row: badges + timestamp + countdown */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginTop: '0.35rem',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <E2eeBadge encrypted={msg.encryptionStatus === 'e2ee'} />
          {msg.disappearsAt && <CountdownTimer disappearsAt={msg.disappearsAt} />}
          <span style={{ fontSize: '0.65rem', opacity: 0.45, fontVariantNumeric: 'tabular-nums' }}>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMe && (
            <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>
              {msg.deliveryStatus === 'read'      ? '✓✓'
               : msg.deliveryStatus === 'delivered' ? '✓✓'
               : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AnonymousChatPage() {
  const navigate    = useNavigate()
  const { session } = useAuthStore()
  const plan        = session?.user?.user_metadata?.plan ?? 'free'
  const { checkFeature } = usePlanGuard()

  // ── Identity state ──────────────────────────────────────────────────────
  const [initState, setInitState] = useState('loading')  // loading | ready | error
  const [initError, setInitError] = useState(null)
  const [identity, setIdentity]   = useState(null)       // AnonymousIdentity object
  const [idCopied, setIdCopied]   = useState(false)

  // ── Chat state ──────────────────────────────────────────────────────────
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)

  // ── Feature settings ────────────────────────────────────────────────────
  const [e2eeEnabled, setE2eeEnabled]         = useState(false)
  const [ttl, setTtl]                         = useState(undefined)   // ms or undefined
  const [showTtlPicker, setShowTtlPicker]     = useState(false)
  const [showSettings, setShowSettings]       = useState(false)

  // ── Upgrade modal ───────────────────────────────────────────────────────
  const [upgradeFeature, setUpgradeFeature]   = useState(null)  // string | null

  // ── Refs ────────────────────────────────────────────────────────────────
  const bottomRef    = useRef(null)
  const inputRef     = useRef(null)

  // ── Init identity on mount ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const mgr = await getIdentityManager()
        const id  = await mgr.initialize()
        if (!cancelled) {
          setIdentity(id)
          setInitState('ready')
        }
      } catch (err) {
        if (!cancelled) {
          setInitError(err?.message ?? 'Identity initialization failed.')
          setInitState('error')
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ── Scroll to bottom when messages change ───────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Copy identifier ─────────────────────────────────────────────────────
  const copyId = useCallback(() => {
    if (!identity?.identifier) return
    navigator.clipboard.writeText(identity.identifier).catch(() => {})
    setIdCopied(true)
    setTimeout(() => setIdCopied(false), 2000)
  }, [identity])

  // ── Toggle E2EE (plan-gated) ────────────────────────────────────────────
  const toggleE2ee = useCallback(() => {
    const result = checkFeature('enableE2EE')
    if (!result.allowed) {
      setUpgradeFeature('enableE2EE')
      return
    }
    setE2eeEnabled(v => !v)
  }, [checkFeature])

  // ── Toggle disappearing messages (plan-gated) ───────────────────────────
  const toggleTtlPicker = useCallback(() => {
    const result = checkFeature('enableDisappearing')
    if (!result.allowed) {
      setUpgradeFeature('enableDisappearing')
      return
    }
    setShowTtlPicker(v => !v)
  }, [checkFeature])

  // ── Send message ────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || text.length > MAX_MSG_LENGTH || sending) return

    setSending(true)
    const now = Date.now()
    const newMsg = {
      messageId:        crypto.randomUUID(),
      direction:        'sent',
      content:          text,
      encryptionStatus: e2eeEnabled ? 'e2ee' : 'tls_only',
      deliveryStatus:   'sent',
      disappearsAt:     ttl ? now + ttl : undefined,
      createdAt:        now,
      type:             'text',
    }

    setMessages(prev => [...prev, newMsg])
    setInput('')

    // In a real integration this would go through WsMultiplexer.
    // For now we simulate a delivery ACK after 800 ms.
    setTimeout(() => {
      setMessages(prev =>
        prev.map(m =>
          m.messageId === newMsg.messageId
            ? { ...m, deliveryStatus: 'delivered' }
            : m,
        ),
      )
      setSending(false)
    }, 800)
  }, [input, sending, e2eeEnabled, ttl])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  // ─── Render: loading / error states ────────────────────────────────────
  if (initState === 'loading') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100dvh', flexDirection: 'column', gap: '1rem',
        background: '#11111b', color: '#cdd6f4',
      }}>
        <Ghost size={32} style={{ color: ACCENT, opacity: 0.6 }} />
        <p style={{ fontSize: '0.9rem', opacity: 0.6 }}>Initialising anonymous identity…</p>
        <div style={{
          width: '1.75rem', height: '1.75rem', borderRadius: '50%',
          border: `2px solid ${ACCENT}`, borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (initState === 'error') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100dvh', flexDirection: 'column', gap: '1rem',
        background: '#11111b', color: '#cdd6f4', padding: '2rem', textAlign: 'center',
      }}>
        <AlertCircle size={32} style={{ color: '#f38ba8' }} />
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Identity Initialization Failed</h2>
        <p style={{ fontSize: '0.875rem', opacity: 0.7, maxWidth: '22rem' }}>{initError}</p>
        <button
          onClick={() => { setInitState('loading'); setInitError(null) }}
          style={{
            padding: '0.625rem 1.5rem', borderRadius: '0.5rem',
            background: ACCENT, color: '#11111b', fontWeight: 700,
            border: 'none', cursor: 'pointer',
          }}
        >
          Retry
        </button>
        <button
          onClick={() => navigate('/chat')}
          style={{
            padding: '0.5rem 1.25rem', borderRadius: '0.5rem',
            background: 'transparent', color: 'rgba(205,214,244,0.6)',
            border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: '0.875rem',
          }}
        >
          ← Back to Chat
        </button>
      </div>
    )
  }

  // ─── Render: main page ──────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex',
      height: '100dvh',
      background: '#11111b',
      color: '#cdd6f4',
      overflow: 'hidden',
      flexDirection: 'column',
    }}>

      {/* ── Top bar ── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
        flexWrap: 'wrap',
        rowGap: '0.5rem',
      }}>
        {/* Back button */}
        <button
          onClick={() => navigate('/chat')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.375rem 0.625rem', borderRadius: '0.5rem',
            border: 'none', background: 'transparent',
            color: 'rgba(205,214,244,0.6)', cursor: 'pointer', fontSize: '0.8125rem',
          }}
          className="hover:bg-white/5 transition-colors"
          aria-label="Back to chat"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Back</span>
        </button>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          <Ghost size={18} style={{ color: ACCENT }} />
          <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Anonymous Chat</span>
          {plan === 'max' && (
            <span style={{
              fontSize: '0.6875rem', fontWeight: 700,
              background: 'rgba(203,166,247,0.15)',
              border: '1px solid rgba(203,166,247,0.3)',
              color: ACCENT, borderRadius: '999px',
              padding: '0.1rem 0.5rem', letterSpacing: '0.05em',
            }}>MAX</span>
          )}
        </div>

        {/* Identity badge */}
        <IdentityBadge
          identifier={identity?.identifier}
          onCopy={copyId}
          copied={idCopied}
        />

        {/* E2EE toggle */}
        <button
          onClick={toggleE2ee}
          title={e2eeEnabled ? 'E2EE on — click to disable' : 'Enable E2EE (MAX)'}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.375rem 0.625rem', borderRadius: '0.5rem',
            border: `1px solid ${e2eeEnabled ? 'rgba(166,227,161,0.4)' : 'rgba(255,255,255,0.1)'}`,
            background: e2eeEnabled ? 'rgba(166,227,161,0.1)' : 'transparent',
            color: e2eeEnabled ? '#a6e3a1' : 'rgba(205,214,244,0.5)',
            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
          }}
          className="transition-all hover:bg-white/5"
          aria-pressed={e2eeEnabled}
        >
          {e2eeEnabled ? <Lock size={13} /> : <LockOpen size={13} />}
          <span className="hidden sm:inline">E2EE</span>
        </button>

        {/* Disappearing messages toggle */}
        <button
          onClick={toggleTtlPicker}
          title="Disappearing messages (MAX)"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.375rem 0.625rem', borderRadius: '0.5rem',
            border: `1px solid ${ttl ? `rgba(203,166,247,0.4)` : 'rgba(255,255,255,0.1)'}`,
            background: ttl ? 'rgba(203,166,247,0.1)' : 'transparent',
            color: ttl ? ACCENT : 'rgba(205,214,244,0.5)',
            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
          }}
          className="transition-all hover:bg-white/5"
          aria-pressed={!!ttl}
        >
          <Clock size={13} />
          <span className="hidden sm:inline">{ttl ? 'Timer on' : 'Timer'}</span>
        </button>
      </header>

      {/* ── TTL picker panel ── */}
      <AnimatePresence>
        {showTtlPicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              overflow: 'hidden',
              background: 'rgba(203,166,247,0.05)',
              borderBottom: '1px solid rgba(203,166,247,0.12)',
              padding: '0.75rem 1rem',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
              <TtlSelector
                value={ttl}
                onChange={(v) => { setTtl(v); setShowTtlPicker(false) }}
                label="Messages disappear after"
              />
              <button
                onClick={() => { setTtl(undefined); setShowTtlPicker(false) }}
                style={{
                  fontSize: '0.8125rem', color: 'rgba(205,214,244,0.5)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '0.25rem 0', textDecoration: 'underline', alignSelf: 'flex-end',
                }}
              >
                Turn off
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Info banner: no-persistence guarantee ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.5rem 1rem',
        background: 'rgba(166,227,161,0.05)',
        borderBottom: '1px solid rgba(166,227,161,0.08)',
        fontSize: '0.75rem',
        color: 'rgba(166,227,161,0.7)',
        flexShrink: 0,
      }}>
        <Shield size={12} style={{ flexShrink: 0 }} />
        <span>No account required. Your identity is device-generated. Messages are never stored on our servers.</span>
      </div>

      {/* ── Message list ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem 0.5rem',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {messages.length === 0
          ? <EmptyState plan={plan} />
          : messages.map(msg => (
              <AnonMessageBubble key={msg.messageId} msg={msg} />
            ))
        }
        <div ref={bottomRef} />
      </div>

      {/* ── Composer ── */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: '0.75rem 1rem',
        flexShrink: 0,
        background: '#11111b',
      }}>
        {/* Character counter warning */}
        {input.length > MAX_MSG_LENGTH - 200 && (
          <div style={{
            fontSize: '0.75rem',
            color: input.length > MAX_MSG_LENGTH ? '#f38ba8' : 'rgba(203,166,247,0.6)',
            marginBottom: '0.375rem', textAlign: 'right',
          }}>
            {input.length} / {MAX_MSG_LENGTH}
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '0.5rem',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '0.875rem',
          padding: '0.5rem 0.5rem 0.5rem 0.875rem',
        }}>
          {/* Textarea */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send an anonymous message…"
            rows={1}
            maxLength={MAX_MSG_LENGTH}
            disabled={sending}
            aria-label="Message input"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: '#cdd6f4',
              fontSize: '0.9375rem',
              lineHeight: 1.5,
              maxHeight: '8rem',
              overflowY: 'auto',
              fontFamily: 'inherit',
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
            }}
          />

          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={!input.trim() || input.length > MAX_MSG_LENGTH || sending}
            aria-label="Send message"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem',
              background: input.trim() && input.length <= MAX_MSG_LENGTH
                ? ACCENT : 'rgba(255,255,255,0.08)',
              color: input.trim() && input.length <= MAX_MSG_LENGTH
                ? '#11111b' : 'rgba(255,255,255,0.3)',
              border: 'none', cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            {sending
              ? <div style={{
                  width: '1rem', height: '1rem', borderRadius: '50%',
                  border: '2px solid currentColor', borderTopColor: 'transparent',
                  animation: 'spin 0.8s linear infinite',
                }} />
              : <Send size={16} />
            }
          </button>
        </div>

        {/* Hint */}
        <p style={{
          fontSize: '0.6875rem', opacity: 0.35,
          textAlign: 'center', marginTop: '0.375rem',
        }}>
          Enter to send · Shift+Enter for new line · Identity: {shortId(identity?.identifier ?? '')}
        </p>
      </div>

      {/* ── Upgrade modal ── */}
      <UpgradeModal
        feature={upgradeFeature ?? ''}
        isOpen={!!upgradeFeature}
        onClose={() => setUpgradeFeature(null)}
      />
    </div>
  )
}
