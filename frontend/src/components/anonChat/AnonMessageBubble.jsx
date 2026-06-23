/**
 * AnonMessageBubble — WhatsApp-style message bubble with delivery ticks,
 * E2EE badge, countdown timer, and context menu.
 */

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Reply, Copy, Trash2, Forward, Lock } from 'lucide-react'
import { E2eeBadge }      from '../../chat/components/E2eeBadge.tsx'
import { CountdownTimer } from '../../chat/components/CountdownTimer.tsx'

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  bubble_me:   '#005c4b',
  bubble_them: '#202c33',
  text:        '#e9edef',
  muted:       '#8696a0',
  menu_bg:     '#233138',
  menu_border: '#2a3942',
  accent:      '#00a884',
}

// ─── Tick icons ───────────────────────────────────────────────────────────────
function DeliveryTicks({ status }) {
  if (!status || status === 'sending') {
    return <span style={{ fontSize: '0.65rem', color: C.muted }}>✓</span>
  }
  if (status === 'sent') {
    return <span style={{ fontSize: '0.65rem', color: C.muted }}>✓</span>
  }
  if (status === 'delivered') {
    return <span style={{ fontSize: '0.65rem', color: C.muted }}>✓✓</span>
  }
  if (status === 'read') {
    return <span style={{ fontSize: '0.65rem', color: C.accent }}>✓✓</span>
  }
  return null
}

// ─── Context menu ─────────────────────────────────────────────────────────────
function ContextMenu({ x, y, onClose, onReply, onCopy, onDelete, onForward }) {
  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 99 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.1 }}
        style={{
          position: 'fixed',
          top: y, left: x,
          zIndex: 100,
          background: C.menu_bg,
          border: `1px solid ${C.menu_border}`,
          borderRadius: '0.5rem',
          padding: '0.375rem 0',
          minWidth: '10rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}
      >
        {[
          { icon: Reply,   label: 'Reply',   action: onReply },
          { icon: Copy,    label: 'Copy',    action: onCopy },
          { icon: Forward, label: 'Forward', action: onForward },
          { icon: Trash2,  label: 'Delete',  action: onDelete,  danger: true },
        ].map(({ icon: Icon, label, action, danger }) => (
          <button
            key={label}
            onClick={() => { action?.(); onClose() }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              width: '100%', padding: '0.5rem 0.875rem',
              background: 'none', border: 'none', cursor: 'pointer',
              color: danger ? '#f38ba8' : C.text,
              fontSize: '0.875rem',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </motion.div>
    </>
  )
}

// ─── Date separator ───────────────────────────────────────────────────────────
export function DateSeparator({ label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0.75rem 1rem',
    }}>
      <span style={{
        background: '#182229',
        border: '1px solid #2a3942',
        borderRadius: '0.5rem',
        padding: '0.2rem 0.75rem',
        fontSize: '0.72rem',
        color: C.muted,
      }}>
        {label}
      </span>
    </div>
  )
}

// ─── Main bubble ─────────────────────────────────────────────────────────────
export default function AnonMessageBubble({ msg, onDelete }) {
  const isMe = msg.direction === 'sent'
  const [menu, setMenu] = useState(null)
  const bubbleRef = useRef(null)

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    setMenu({ x: Math.min(e.clientX, window.innerWidth - 180), y: Math.min(e.clientY, window.innerHeight - 200) })
  }, [])

  const handleLongPressStart = useRef(null)
  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0]
    handleLongPressStart.current = setTimeout(() => {
      setMenu({ x: Math.min(touch.clientX, window.innerWidth - 180), y: Math.min(touch.clientY, window.innerHeight - 200) })
    }, 500)
  }, [])
  const onTouchEnd = useCallback(() => {
    clearTimeout(handleLongPressStart.current)
  }, [])

  const copyText = useCallback(() => {
    navigator.clipboard.writeText(msg.content).catch(() => {})
  }, [msg.content])

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isMe ? 'flex-end' : 'flex-start',
        padding: '0.15rem 1rem',
      }}
    >
      <div
        ref={bubbleRef}
        onContextMenu={handleContextMenu}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          maxWidth: 'min(75%, 28rem)',
          background: isMe ? C.bubble_me : C.bubble_them,
          borderRadius: isMe
            ? '0.75rem 0.75rem 0.15rem 0.75rem'
            : '0.75rem 0.75rem 0.75rem 0.15rem',
          padding: '0.5rem 0.75rem 0.4rem',
          cursor: 'context-menu',
          position: 'relative',
          wordBreak: 'break-word',
        }}
      >
        {/* Message text */}
        <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.5, color: C.text }}>
          {msg.content}
        </p>

        {/* Footer row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.3rem',
          marginTop: '0.2rem', justifyContent: 'flex-end', flexWrap: 'wrap',
        }}>
          {msg.encryptionStatus === 'e2ee' && (
            <Lock size={9} style={{ color: '#8696a0', flexShrink: 0 }} aria-label="E2EE" />
          )}
          {msg.disappearsAt && (
            <CountdownTimer disappearsAt={msg.disappearsAt} />
          )}
          <span style={{
            fontSize: '0.68rem', color: C.muted,
            fontVariantNumeric: 'tabular-nums', flexShrink: 0,
          }}>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMe && <DeliveryTicks status={msg.deliveryStatus} />}
        </div>
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {menu && (
          <ContextMenu
            x={menu.x} y={menu.y}
            onClose={() => setMenu(null)}
            onReply={() => {}}
            onCopy={copyText}
            onDelete={() => onDelete?.(msg.messageId)}
            onForward={() => {}}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
