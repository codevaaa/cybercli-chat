/**
 * AnonContactCard — Single contact / chat list item (WhatsApp style).
 */

import { getAvatarColor } from './useAnonChat.js'
import { Ghost } from 'lucide-react'

const C = {
  hover:  '#2a3942',
  border: '#222d34',
  text:   '#e9edef',
  muted:  '#8696a0',
  online: '#00a884',
  accent: '#00a884',
}

function formatTime(ts) {
  if (!ts) return ''
  const now = Date.now()
  const diff = now - ts
  if (diff < 60_000)    return 'now'
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + 'm'
  if (diff < 86_400_000) return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function AnonContactCard({ contact, conversation, isActive, onClick }) {
  const name    = contact?.nickname ?? contact?.id?.slice(0, 8) ?? 'Unknown'
  const id      = contact?.id ?? ''
  const color   = getAvatarColor(id)
  const online  = contact?.online ?? false
  const unread  = conversation?.unread ?? 0
  const preview = conversation?.lastMessage ?? ''
  const time    = conversation?.lastMessageTime

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        width: '100%', padding: '0.625rem 1rem',
        background: isActive ? C.hover : 'transparent',
        border: 'none', cursor: 'pointer',
        borderBottom: `1px solid ${C.border}`,
        textAlign: 'left',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.hover }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
    >
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: '2.75rem', height: '2.75rem', borderRadius: '50%',
          background: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ghost size={18} color="rgba(255,255,255,0.9)" />
        </div>
        {online && (
          <span style={{
            position: 'absolute', bottom: '1px', right: '1px',
            width: '0.7rem', height: '0.7rem', borderRadius: '50%',
            background: C.online, border: '2px solid #111b21',
          }} />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span style={{ fontWeight: 500, fontSize: '0.9375rem', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </span>
          {time && (
            <span style={{ fontSize: '0.68rem', color: unread > 0 ? C.accent : C.muted, flexShrink: 0 }}>
              {formatTime(time)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.15rem' }}>
          <span style={{
            fontSize: '0.8rem', color: C.muted,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {preview || id.slice(0, 20) + '…'}
          </span>
          {unread > 0 && (
            <span style={{
              background: C.accent, color: '#111b21',
              borderRadius: '999px',
              padding: '0.05rem 0.4rem',
              fontSize: '0.7rem', fontWeight: 700,
              flexShrink: 0, minWidth: '1.2rem', textAlign: 'center',
            }}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
