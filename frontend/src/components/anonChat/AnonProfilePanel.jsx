/**
 * AnonProfilePanel — Right-side slide-in panel for contact / group info.
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Ghost, Copy, Check, Trash2, Ban, LogOut, Link2, Users } from 'lucide-react'
import { getAvatarColor } from './useAnonChat.js'

const C = {
  bg:     '#0b141a',
  panel:  '#182229',
  border: '#2a3942',
  accent: '#00a884',
  accent2:'#cba6f7',
  text:   '#e9edef',
  muted:  '#8696a0',
  danger: '#f38ba8',
}

function CopyableId({ id }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    navigator.clipboard.writeText(id).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [id])

  return (
    <button
      onClick={copy}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
        borderRadius: '0.375rem', padding: '0.3rem 0.6rem',
        color: C.muted, fontSize: '0.72rem', fontFamily: 'monospace',
        cursor: 'pointer', maxWidth: '100%', overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}
    >
      {id?.slice(0, 24) ?? ''}…
      {copied ? <Check size={11} color={C.accent} /> : <Copy size={11} />}
    </button>
  )
}

export default function AnonProfilePanel({ isOpen, onClose, type, contact, group, contacts, onShowInvite }) {
  const isGroup   = type === 'group'
  const name      = isGroup ? group?.name  : contact?.nickname
  const id        = isGroup ? group?.id    : contact?.id
  const color     = getAvatarColor(id ?? '')

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 0,
            width: 'min(22rem, 100%)',
            background: C.bg,
            borderLeft: `1px solid ${C.border}`,
            zIndex: 10,
            overflowY: 'auto',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: `1px solid ${C.border}`,
          }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: C.text }}>
              {isGroup ? 'Group Info' : 'Contact Info'}
            </h3>
            <button onClick={onClose} style={iconBtn}><X size={18} /></button>
          </div>

          {/* Avatar + name */}
          <div style={{
            padding: '1.5rem 1.25rem',
            borderBottom: `1px solid ${C.border}`,
            textAlign: 'center',
          }}>
            <div style={{
              width: '5rem', height: '5rem', borderRadius: '50%',
              background: color, margin: '0 auto 0.875rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              {isGroup ? (
                <>
                  <Ghost size={22} color="rgba(255,255,255,0.85)" style={{ position: 'absolute', top: '13px', left: '14px' }} />
                  <Ghost size={16} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', bottom: '10px', right: '12px' }} />
                </>
              ) : (
                <Ghost size={28} color="rgba(255,255,255,0.9)" />
              )}
            </div>
            <p style={{ margin: '0 0 0.375rem', fontWeight: 700, fontSize: '1.0625rem', color: C.text }}>{name}</p>
            {isGroup && group?.description && (
              <p style={{ margin: 0, fontSize: '0.82rem', color: C.muted }}>{group.description}</p>
            )}
          </div>

          {/* ID section */}
          <div style={{ padding: '0.875rem 1.25rem', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ margin: '0 0 0.375rem', fontSize: '0.72rem', color: C.muted, fontWeight: 500 }}>
              PSEUDONYM ID
            </p>
            <CopyableId id={isGroup ? group?.id : contact?.pseudonymId} />
          </div>

          {/* Group members */}
          {isGroup && group && (
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                <p style={{ margin: 0, fontSize: '0.72rem', color: C.muted, fontWeight: 500 }}>
                  MEMBERS ({group.memberCount})
                </p>
              </div>
              {(group.members ?? []).slice(0, 5).map(memberId => {
                const mc = contacts?.find(c => c.id === memberId)
                return (
                  <div key={memberId} style={{
                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                    padding: '0.4rem 0', borderBottom: `1px solid ${C.border}`,
                  }}>
                    <div style={{
                      width: '2rem', height: '2rem', borderRadius: '50%',
                      background: getAvatarColor(memberId),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Ghost size={12} color="rgba(255,255,255,0.9)" />
                    </div>
                    <span style={{ fontSize: '0.875rem', color: C.text }}>
                      {mc?.nickname ?? memberId.slice(0, 10) + '…'}
                    </span>
                  </div>
                )
              })}
              {group.memberCount > group.members?.length && (
                <p style={{ fontSize: '0.78rem', color: C.muted, margin: '0.375rem 0 0' }}>
                  +{group.memberCount - (group.members?.length ?? 0)} more
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ padding: '0.875rem 1.25rem', marginTop: 'auto' }}>
            {isGroup ? (
              <>
                <ActionBtn icon={Link2} label="Invite Link" color={C.accent} onClick={onShowInvite} />
                <ActionBtn icon={LogOut} label="Leave Group" color={C.danger} />
              </>
            ) : (
              <>
                <ActionBtn icon={Ban}    label="Block Contact" color={C.danger} />
              </>
            )}
            <ActionBtn icon={Trash2} label={isGroup ? 'Delete Group' : 'Delete Chat'} color={C.danger} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ActionBtn({ icon: Icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        width: '100%', padding: '0.75rem 0.625rem',
        background: 'none', border: 'none', cursor: 'pointer',
        borderRadius: '0.5rem', color,
        fontSize: '0.875rem',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      <Icon size={16} />
      {label}
    </button>
  )
}

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#8696a0', padding: '0.25rem', borderRadius: '0.375rem',
  display: 'flex', alignItems: 'center',
}
