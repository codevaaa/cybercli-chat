/**
 * AnonGroupCard — Group list item in the sidebar.
 */

import { Ghost, Users } from 'lucide-react'
import { getAvatarColor } from './useAnonChat.js'

const C = {
  hover:  '#2a3942',
  border: '#222d34',
  text:   '#e9edef',
  muted:  '#8696a0',
  accent: '#00a884',
}

function formatTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + 'm ago'
  if (diff < 86_400_000) return 'Today'
  if (diff < 172_800_000) return 'Yesterday'
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function AnonGroupCard({ group, conversation, isActive, onClick }) {
  const color = getAvatarColor(group.id)

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
      {/* Group avatar — stacked ghosts */}
      <div style={{
        width: '2.75rem', height: '2.75rem', borderRadius: '50%',
        background: color, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <Ghost size={14} color="rgba(255,255,255,0.85)" style={{ position: 'absolute', top: '8px', left: '8px' }} />
        <Ghost size={14} color="rgba(255,255,255,0.55)" style={{ position: 'absolute', bottom: '6px', right: '7px' }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span style={{ fontWeight: 500, fontSize: '0.9375rem', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {group.name}
          </span>
          <span style={{ fontSize: '0.68rem', color: C.muted, flexShrink: 0 }}>
            {formatTime(group.lastActivity)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
          <Users size={11} color={C.muted} />
          <span style={{ fontSize: '0.78rem', color: C.muted }}>
            {group.memberCount} members
          </span>
          {conversation?.lastMessage && (
            <>
              <span style={{ color: C.muted, fontSize: '0.78rem' }}>·</span>
              <span style={{ fontSize: '0.78rem', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {conversation.lastMessage}
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  )
}
