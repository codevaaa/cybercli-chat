/**
 * AnonChatWindow — Right panel: chat header, message area, composer.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  Ghost, Search, Phone, Video, MoreVertical, ChevronLeft,
  Lock, Shield, Info,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import AnonMessageBubble, { DateSeparator } from './AnonMessageBubble.jsx'
import AnonComposer from './AnonComposer.jsx'
import { getAvatarColor } from './useAnonChat.js'
import { UpgradeModal } from '../../chat/components/UpgradeModal.tsx'

const C = {
  panel:    '#0b141a',
  header:   '#202c33',
  border:   '#222d34',
  accent:   '#00a884',
  accent2:  '#cba6f7',
  text:     '#e9edef',
  muted:    '#8696a0',
  e2ee_bg:  'rgba(0,168,132,0.08)',
  e2ee_border: 'rgba(0,168,132,0.2)',
}

// ─── Date grouping helper ─────────────────────────────────────────────────────
function getDateLabel(ts) {
  const d   = new Date(ts)
  const now = new Date()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString())       return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

function groupMessagesByDate(msgs) {
  const groups = []
  let lastLabel = null
  for (const msg of msgs) {
    const label = getDateLabel(msg.createdAt)
    if (label !== lastLabel) {
      groups.push({ type: 'separator', label, id: 'sep_' + label })
      lastLabel = label
    }
    groups.push({ type: 'message', msg })
  }
  return groups
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyPanel() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '1rem', padding: '2rem',
      background: C.panel, textAlign: 'center',
    }}>
      <div style={{
        width: '5rem', height: '5rem', borderRadius: '50%',
        background: 'rgba(0,168,132,0.08)',
        border: '1px solid rgba(0,168,132,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ghost size={28} color={C.accent} />
      </div>
      <div>
        <p style={{ margin: '0 0 0.375rem', fontWeight: 600, fontSize: '1.0625rem', color: C.text }}>
          Anonymous Chat
        </p>
        <p style={{ margin: 0, fontSize: '0.875rem', color: C.muted, maxWidth: '22rem', lineHeight: 1.6 }}>
          Select a conversation from the sidebar to start chatting.
          All messages relay peer-to-peer with no server storage.
        </p>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        background: C.e2ee_bg, border: `1px solid ${C.e2ee_border}`,
        borderRadius: '0.5rem', padding: '0.5rem 0.875rem',
        fontSize: '0.78rem', color: C.accent,
      }}>
        <Shield size={13} />
        <span>Your identity is cryptographically generated — no account details shared</span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AnonChatWindow({
  conversation, contact, group,
  messages, sendMessage,
  e2eeEnabled, ttl,
  planIsMax,
  onBack,
  onShowProfile,
}) {
  const bottomRef = useRef(null)
  const [upgradeFeature, setUpgradeFeature] = useState(null)

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isGroup = conversation?.type === 'group'
  const name    = isGroup ? group?.name : contact?.nickname ?? contact?.id?.slice(0, 12)
  const id      = isGroup ? group?.id   : contact?.id
  const color   = getAvatarColor(id ?? '')
  const online  = !isGroup && contact?.online

  const grouped = useMemo(() => groupMessagesByDate(messages ?? []), [messages])

  const handleSend = useCallback((text) => {
    if (!conversation?.id) return
    sendMessage(conversation.id, text)
  }, [conversation?.id, sendMessage])

  const handleAttach = useCallback(() => {
    if (!planIsMax) { setUpgradeFeature('sendFile'); return }
    // File picker would open here
  }, [planIsMax])

  const handleVoice = useCallback(() => {
    if (!planIsMax) { setUpgradeFeature('sendVoice'); return }
    // Voice recorder would start here
  }, [planIsMax])

  if (!conversation) return <EmptyPanel />

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', background: C.panel,
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.625rem',
        padding: '0.5rem 1rem',
        background: C.header,
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        {/* Mobile back button */}
        <button onClick={onBack} style={{ ...iconBtn, display: 'flex' }} aria-label="Back">
          <ChevronLeft size={20} />
        </button>

        {/* Avatar */}
        <button
          onClick={onShowProfile}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, borderRadius: '50%' }}
        >
          <div style={{
            width: '2.5rem', height: '2.5rem', borderRadius: '50%',
            background: color, position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isGroup ? (
              <>
                <Ghost size={12} color="rgba(255,255,255,0.85)" style={{ position: 'absolute', top: '7px', left: '8px' }} />
                <Ghost size={10} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', bottom: '5px', right: '7px' }} />
              </>
            ) : (
              <Ghost size={16} color="rgba(255,255,255,0.9)" />
            )}
            {online && (
              <span style={{
                position: 'absolute', bottom: '1px', right: '1px',
                width: '0.6rem', height: '0.6rem', borderRadius: '50%',
                background: C.accent, border: '2px solid ' + C.header,
              }} />
            )}
          </div>
        </button>

        {/* Name + status */}
        <button
          onClick={onShowProfile}
          style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
        >
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9375rem', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name ?? 'Chat'}
          </p>
          <p style={{ margin: 0, fontSize: '0.72rem', color: online ? C.accent : C.muted }}>
            {isGroup
              ? `${group?.memberCount ?? '?'} members`
              : online ? 'online' : 'last seen recently'}
          </p>
        </button>

        {/* Actions */}
        <button style={iconBtn} aria-label="Search in chat" title="Search"><Search size={18} /></button>
        <button style={{ ...iconBtn, opacity: 0.3, cursor: 'not-allowed' }} aria-label="Voice call (coming soon)" title="Voice call (coming soon)"><Phone size={18} /></button>
        <button style={{ ...iconBtn, opacity: 0.3, cursor: 'not-allowed' }} aria-label="Video call (coming soon)" title="Video call (coming soon)"><Video size={18} /></button>
        <button style={iconBtn} aria-label="More options" onClick={onShowProfile}><MoreVertical size={18} /></button>
      </div>

      {/* ── E2EE banner ── */}
      <AnimatePresence>
        {e2eeEnabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden', flexShrink: 0 }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.375rem',
              padding: '0.35rem 1rem',
              background: C.e2ee_bg,
              borderBottom: `1px solid ${C.e2ee_border}`,
              fontSize: '0.72rem', color: C.accent,
            }}>
              <Lock size={11} />
              <span>🔒 Messages are end-to-end encrypted</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TTL banner ── */}
      {ttl && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0.375rem',
          padding: '0.3rem 1rem',
          background: 'rgba(203,166,247,0.06)',
          borderBottom: '1px solid rgba(203,166,247,0.12)',
          fontSize: '0.72rem', color: C.accent2, flexShrink: 0,
        }}>
          ⏱ Disappearing messages on
        </div>
      )}

      {/* ── Message area ── */}
      <div
        style={{
          flex: 1, overflowY: 'auto',
          padding: '0.5rem 0',
          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'%3E%3C/svg%3E")',
        }}
      >
        {grouped.length === 0 ? (
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '2rem',
            textAlign: 'center',
          }}>
            <div>
              <div style={{
                width: '4rem', height: '4rem', borderRadius: '50%',
                background: 'rgba(0,168,132,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 0.875rem',
              }}>
                <Lock size={20} color={C.accent} />
              </div>
              <p style={{ margin: '0 0 0.375rem', fontSize: '0.875rem', color: C.text }}>
                No messages yet
              </p>
              <p style={{ margin: 0, fontSize: '0.78rem', color: C.muted, maxWidth: '16rem' }}>
                {e2eeEnabled
                  ? '🔒 End-to-end encrypted. Send your first message.'
                  : 'Send a message to start the conversation.'}
              </p>
            </div>
          </div>
        ) : (
          grouped.map(item =>
            item.type === 'separator'
              ? <DateSeparator key={item.id} label={item.label} />
              : <AnonMessageBubble key={item.msg.messageId} msg={item.msg} />
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Composer ── */}
      <AnonComposer
        onSend={handleSend}
        onAttach={handleAttach}
        onVoice={handleVoice}
        planIsMax={planIsMax}
      />

      {/* ── Upgrade modal ── */}
      <UpgradeModal
        feature={upgradeFeature ?? ''}
        isOpen={!!upgradeFeature}
        onClose={() => setUpgradeFeature(null)}
      />
    </div>
  )
}

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#8696a0', padding: '0.375rem', borderRadius: '50%',
  display: 'flex', alignItems: 'center',
}
