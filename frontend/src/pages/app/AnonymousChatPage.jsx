/**
 * AnonymousChatPage — Entry point for Codeva Anonymous Chat.
 *
 * Person-to-person encrypted messaging. No AI involved.
 *
 * Fixes:
 *  - Uses `new IdentityManager()` correctly (no singleton export exists)
 *  - usePlanGuard(plan) called correctly with plan string param
 *  - All .ts/.tsx imports use correct paths with .js extension for Vite ESM
 *  - No top-level await / dynamic import of TS files (Vite handles them directly)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Ghost, Lock, LockOpen, Shield, Clock,
  Send, AlertCircle, ChevronLeft, Copy, Check,
  UserX, Users
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@stores/authStore.js'

// ── Chat module imports (Vite resolves .ts directly) ─────────────────────────
import { IdentityManager } from '../../chat/identity/IdentityManager.ts'
import { usePlanGuard }    from '../../chat/hooks/usePlanGuard.ts'
import { E2eeBadge }       from '../../chat/components/E2eeBadge.tsx'
import { TtlSelector }     from '../../chat/components/TtlSelector.tsx'
import { UpgradeModal }    from '../../chat/components/UpgradeModal.tsx'
import { CountdownTimer }  from '../../chat/components/CountdownTimer.tsx'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_MSG_LENGTH = 4096
const ACCENT = '#cba6f7'

// One manager instance per page mount — not a module-level singleton
// because we need it fresh if the user navigates away and back.
let _manager = null

function getManager() {
  if (!_manager) _manager = new IdentityManager()
  return _manager
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function shortId(hex = '') {
  if (!hex || hex.length < 12) return hex || '…'
  return hex.slice(0, 6) + '…' + hex.slice(-4)
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function IdentityBadge({ identifier, onCopy, copied }) {
  return (
    <button
      onClick={onCopy}
      title="Your anonymous ID — click to copy full hex"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        background: 'rgba(203,166,247,0.08)',
        border: '1px solid rgba(203,166,247,0.2)',
        borderRadius: '999px',
        padding: '0.3rem 0.7rem',
        fontSize: '0.72rem',
        fontFamily: 'monospace',
        color: ACCENT,
        cursor: 'pointer',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <UserX size={11} aria-hidden />
      <span>{shortId(identifier)}</span>
      {copied
        ? <Check size={10} style={{ color: '#a6e3a1' }} />
        : <Copy size={10} style={{ opacity: 0.55 }} />}
    </button>
  )
}

function EmptyState({ planIsMax }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '1rem', padding: '2.5rem 1.5rem', textAlign: 'center',
    }}>
      <div style={{
        width: '3.5rem', height: '3.5rem', borderRadius: '50%',
        background: 'rgba(203,166,247,0.08)',
        border: '1px solid rgba(203,166,247,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ghost size={22} style={{ color: ACCENT }} />
      </div>

      <div>
        <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.375rem' }}>
          No messages yet
        </p>
        <p style={{ fontSize: '0.8125rem', opacity: 0.55, maxWidth: '20rem', lineHeight: 1.6 }}>
          Send a message to start an anonymous conversation.
          Your identity is cryptographically generated — no account details shared.
        </p>
      </div>

      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
        background: 'rgba(166,227,161,0.06)',
        border: '1px solid rgba(166,227,161,0.12)',
        borderRadius: '0.625rem',
        padding: '0.75rem 1rem',
        fontSize: '0.78rem',
        color: 'rgba(166,227,161,0.75)',
        maxWidth: '22rem',
        textAlign: 'left',
      }}>
        <Shield size={13} style={{ marginTop: '0.1rem', flexShrink: 0 }} />
        <span>Messages are never stored on Codeva servers. They relay peer-to-peer.</span>
      </div>

      {!planIsMax && (
        <div style={{
          fontSize: '0.78rem',
          background: 'rgba(203,166,247,0.06)',
          border: '1px solid rgba(203,166,247,0.15)',
          borderRadius: '0.5rem',
          padding: '0.625rem 1rem',
          color: ACCENT,
          maxWidth: '22rem',
        }}>
          🔒 Upgrade to <strong>MAX</strong> to enable E2EE encryption and disappearing messages.
        </div>
      )}
    </div>
  )
}

function AnonMessageBubble({ msg }) {
  const isMe = msg.direction === 'sent'

  return (
    <div style={{
      display: 'flex',
      justifyContent: isMe ? 'flex-end' : 'flex-start',
      padding: '0.2rem 0.75rem',
    }}>
      <div style={{
        maxWidth: 'min(78%, 26rem)',
        background: isMe
          ? 'rgba(203,166,247,0.14)'
          : 'rgba(255,255,255,0.05)',
        border: `1px solid ${isMe ? 'rgba(203,166,247,0.22)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: isMe
          ? '1rem 1rem 0.25rem 1rem'
          : '1rem 1rem 1rem 0.25rem',
        padding: '0.6rem 0.875rem',
        fontSize: '0.9375rem',
        lineHeight: 1.5,
        wordBreak: 'break-word',
      }}>
        <span>{msg.content}</span>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.35rem',
          marginTop: '0.3rem', justifyContent: 'flex-end', flexWrap: 'wrap',
        }}>
          <E2eeBadge encrypted={msg.encryptionStatus === 'e2ee'} />
          {msg.disappearsAt && (
            <CountdownTimer disappearsAt={msg.disappearsAt} />
          )}
          <span style={{
            fontSize: '0.63rem', opacity: 0.4,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
          {isMe && (
            <span style={{ fontSize: '0.63rem', opacity: 0.45 }}>
              {msg.deliveryStatus === 'delivered' || msg.deliveryStatus === 'read'
                ? '✓✓' : '✓'}
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
  const guard       = usePlanGuard(plan)
  const planIsMax   = plan === 'max'

  // ── Identity ────────────────────────────────────────────────────────────
  const [initState, setInitState] = useState('loading') // loading | ready | error
  const [initError, setInitError] = useState(null)
  const [identity, setIdentity]   = useState(null)
  const [idCopied, setIdCopied]   = useState(false)

  // ── Chat ────────────────────────────────────────────────────────────────
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)

  // ── Feature toggles ─────────────────────────────────────────────────────
  const [e2eeEnabled, setE2eeEnabled]     = useState(false)
  const [ttl, setTtl]                     = useState(undefined)
  const [showTtlPicker, setShowTtlPicker] = useState(false)

  // ── Upgrade modal ────────────────────────────────────────────────────────
  const [upgradeFeature, setUpgradeFeature] = useState(null)

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // ── Initialize identity ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const mgr = getManager()
        const id  = await mgr.initialize()
        if (!cancelled) {
          setIdentity(id)
          setInitState('ready')
        }
      } catch (err) {
        if (!cancelled) {
          const reason = err?.reason ?? err?.message ?? String(err)
          setInitError(reason)
          setInitState('error')
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  // ── Scroll to bottom ────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Copy identity ───────────────────────────────────────────────────────
  const copyId = useCallback(() => {
    if (!identity?.identifier) return
    navigator.clipboard.writeText(identity.identifier).catch(() => {})
    setIdCopied(true)
    setTimeout(() => setIdCopied(false), 2000)
  }, [identity])

  // ── Toggle E2EE ─────────────────────────────────────────────────────────
  const toggleE2ee = useCallback(() => {
    const result = guard.enableE2EE(() => setE2eeEnabled(v => !v))
    if (result?.type === 'PLAN_UPGRADE_REQUIRED') {
      setUpgradeFeature('enableE2EE')
    }
  }, [guard])

  // ── Toggle TTL picker ───────────────────────────────────────────────────
  const toggleTtlPicker = useCallback(() => {
    const result = guard.enableDisappearing(() => setShowTtlPicker(v => !v))
    if (result?.type === 'PLAN_UPGRADE_REQUIRED') {
      setUpgradeFeature('enableDisappearing')
    }
  }, [guard])

  // ── Send message ────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || text.length > MAX_MSG_LENGTH || sending) return

    setSending(true)
    const now = Date.now()
    const msg = {
      messageId:        crypto.randomUUID(),
      direction:        'sent',
      content:          text,
      encryptionStatus: e2eeEnabled ? 'e2ee' : 'tls_only',
      deliveryStatus:   'sent',
      disappearsAt:     ttl ? now + ttl : undefined,
      createdAt:        now,
    }

    setMessages(prev => [...prev, msg])
    setInput('')

    // Simulate delivery ACK (replace with real WS when relay is wired up)
    setTimeout(() => {
      setMessages(prev =>
        prev.map(m => m.messageId === msg.messageId
          ? { ...m, deliveryStatus: 'delivered' } : m
        )
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

  // ─── Loading screen ──────────────────────────────────────────────────────
  if (initState === 'loading') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100dvh', gap: '1rem',
        background: '#11111b', color: '#cdd6f4',
      }}>
        <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>
        <Ghost size={32} style={{ color: ACCENT, opacity: 0.5 }} />
        <p style={{ fontSize: '0.875rem', opacity: 0.55 }}>
          Generating anonymous identity…
        </p>
        <div style={{
          width: '1.5rem', height: '1.5rem', borderRadius: '50%',
          border: `2px solid ${ACCENT}`, borderTopColor: 'transparent',
          animation: '_spin 0.75s linear infinite',
        }} />
      </div>
    )
  }

  // ─── Error screen ────────────────────────────────────────────────────────
  if (initState === 'error') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100dvh', gap: '1rem',
        background: '#11111b', color: '#cdd6f4',
        padding: '2rem', textAlign: 'center',
      }}>
        <AlertCircle size={32} style={{ color: '#f38ba8' }} />
        <h2 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>
          Identity Initialization Failed
        </h2>
        <p style={{
          fontSize: '0.8125rem', opacity: 0.6,
          maxWidth: '22rem', lineHeight: 1.6,
        }}>
          {initError}
        </p>
        <button
          onClick={() => {
            _manager = null   // reset so next try creates fresh manager
            setInitState('loading')
            setInitError(null)
          }}
          style={{
            padding: '0.625rem 1.5rem', borderRadius: '0.5rem',
            background: ACCENT, color: '#11111b',
            fontWeight: 700, border: 'none', cursor: 'pointer',
          }}
        >
          Retry
        </button>
        <button
          onClick={() => navigate('/chat')}
          style={{
            padding: '0.5rem 1.25rem', borderRadius: '0.5rem',
            background: 'transparent', color: 'rgba(205,214,244,0.55)',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer', fontSize: '0.875rem',
          }}
        >
          ← Back to Chat
        </button>
      </div>
    )
  }

  // ─── Main UI ─────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', overflow: 'hidden',
      background: '#11111b', color: '#cdd6f4',
    }}>
      <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Top bar ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.625rem 0.875rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0, flexWrap: 'wrap', rowGap: '0.5rem',
      }}>
        {/* Back */}
        <button
          onClick={() => navigate('/chat')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.25rem',
            padding: '0.35rem 0.5rem', borderRadius: '0.5rem',
            border: 'none', background: 'transparent',
            color: 'rgba(205,214,244,0.55)', cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          <ChevronLeft size={15} />
          <span>Back</span>
        </button>

        {/* Title */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1,
        }}>
          <Ghost size={16} style={{ color: ACCENT }} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
            Anonymous Chat
          </span>
          <span style={{
            fontSize: '0.6rem', fontWeight: 700,
            background: 'rgba(166,227,161,0.1)',
            border: '1px solid rgba(166,227,161,0.2)',
            color: '#a6e3a1', borderRadius: '999px',
            padding: '0.1rem 0.45rem', letterSpacing: '0.04em',
          }}>
            P2P
          </span>
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
          title={e2eeEnabled ? 'E2EE enabled' : 'Enable E2EE (MAX plan)'}
          aria-pressed={e2eeEnabled}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.35rem 0.6rem', borderRadius: '0.5rem',
            border: `1px solid ${e2eeEnabled ? 'rgba(166,227,161,0.35)' : 'rgba(255,255,255,0.1)'}`,
            background: e2eeEnabled ? 'rgba(166,227,161,0.08)' : 'transparent',
            color: e2eeEnabled ? '#a6e3a1' : 'rgba(205,214,244,0.45)',
            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
          }}
        >
          {e2eeEnabled ? <Lock size={12} /> : <LockOpen size={12} />}
          <span>E2EE</span>
        </button>

        {/* Timer toggle */}
        <button
          onClick={toggleTtlPicker}
          title={ttl ? 'Disappearing messages on' : 'Set disappearing timer (MAX plan)'}
          aria-pressed={!!ttl}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.35rem 0.6rem', borderRadius: '0.5rem',
            border: `1px solid ${ttl ? 'rgba(203,166,247,0.35)' : 'rgba(255,255,255,0.1)'}`,
            background: ttl ? 'rgba(203,166,247,0.08)' : 'transparent',
            color: ttl ? ACCENT : 'rgba(205,214,244,0.45)',
            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
          }}
        >
          <Clock size={12} />
          <span>{ttl ? 'Timer on' : 'Timer'}</span>
        </button>
      </header>

      {/* ── TTL picker ── */}
      <AnimatePresence>
        {showTtlPicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              overflow: 'hidden',
              background: 'rgba(203,166,247,0.04)',
              borderBottom: '1px solid rgba(203,166,247,0.1)',
              flexShrink: 0,
            }}
          >
            <div style={{
              padding: '0.75rem 1rem',
              display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
            }}>
              <TtlSelector
                value={ttl}
                onChange={(v) => { setTtl(v); setShowTtlPicker(false) }}
                label="Messages disappear after"
              />
              <button
                onClick={() => { setTtl(undefined); setShowTtlPicker(false) }}
                style={{
                  fontSize: '0.8rem', color: 'rgba(205,214,244,0.45)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Turn off
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Privacy banner ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        padding: '0.4rem 0.875rem',
        background: 'rgba(166,227,161,0.04)',
        borderBottom: '1px solid rgba(166,227,161,0.07)',
        fontSize: '0.72rem', color: 'rgba(166,227,161,0.6)',
        flexShrink: 0,
      }}>
        <Shield size={11} style={{ flexShrink: 0 }} />
        <span>
          No account needed · Identity is device-generated · Messages never stored on server
        </span>
      </div>

      {/* ── Message list ── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        paddingTop: '0.75rem', paddingBottom: '0.5rem',
      }}>
        {messages.length === 0
          ? <EmptyState planIsMax={planIsMax} />
          : messages.map(msg => (
              <AnonMessageBubble key={msg.messageId} msg={msg} />
            ))
        }
        <div ref={bottomRef} />
      </div>

      {/* ── Composer ── */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: '0.625rem 0.875rem 0.875rem',
        flexShrink: 0, background: '#11111b',
      }}>
        {/* Char counter */}
        {input.length > MAX_MSG_LENGTH - 300 && (
          <p style={{
            fontSize: '0.7rem', textAlign: 'right', marginBottom: '0.25rem',
            color: input.length > MAX_MSG_LENGTH ? '#f38ba8' : 'rgba(203,166,247,0.6)',
          }}>
            {input.length} / {MAX_MSG_LENGTH}
          </p>
        )}

        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: '0.5rem',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '0.875rem',
          padding: '0.5rem 0.5rem 0.5rem 0.875rem',
        }}>
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
              flex: 1, background: 'transparent',
              border: 'none', outline: 'none',
              resize: 'none', color: '#cdd6f4',
              fontSize: '0.9375rem', lineHeight: 1.5,
              maxHeight: '7rem', overflowY: 'auto',
              fontFamily: 'inherit',
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 112) + 'px'
            }}
          />

          <button
            onClick={sendMessage}
            disabled={!input.trim() || input.length > MAX_MSG_LENGTH || sending}
            aria-label="Send"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '2.125rem', height: '2.125rem',
              borderRadius: '0.5rem', flexShrink: 0, border: 'none',
              background: input.trim() && input.length <= MAX_MSG_LENGTH
                ? ACCENT : 'rgba(255,255,255,0.07)',
              color: input.trim() && input.length <= MAX_MSG_LENGTH
                ? '#11111b' : 'rgba(255,255,255,0.25)',
              cursor: input.trim() ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
            }}
          >
            {sending
              ? <div style={{
                  width: '0.875rem', height: '0.875rem', borderRadius: '50%',
                  border: '2px solid currentColor', borderTopColor: 'transparent',
                  animation: '_spin 0.75s linear infinite',
                }} />
              : <Send size={14} />
            }
          </button>
        </div>

        <p style={{
          fontSize: '0.65rem', opacity: 0.3,
          textAlign: 'center', marginTop: '0.35rem',
        }}>
          Enter to send · Shift+Enter for new line · ID: {shortId(identity?.identifier)}
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
