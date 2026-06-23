/**
 * AnonNewChatModal — Start a new 1-on-1 chat or add a contact.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Ghost, QrCode, UserPlus } from 'lucide-react'

const C = {
  bg:     '#233138',
  border: '#2a3942',
  accent: '#00a884',
  text:   '#e9edef',
  muted:  '#8696a0',
  input:  '#182229',
}

export default function AnonNewChatModal({ isOpen, onClose, onStartChat, onAddContact, ownId }) {
  const [pseudonymId, setPseudonymId] = useState('')
  const [nickname, setNickname]       = useState('')
  const [tab, setTab]                 = useState('paste') // paste | qr

  const handleStart = () => {
    if (!pseudonymId.trim()) return
    onStartChat?.(pseudonymId.trim(), nickname.trim())
    setPseudonymId('')
    setNickname('')
    onClose()
  }

  const handleAddOnly = () => {
    if (!pseudonymId.trim()) return
    onAddContact?.(pseudonymId.trim(), nickname.trim() || pseudonymId.slice(0, 8))
    setPseudonymId('')
    setNickname('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 201,
              background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: '0.875rem',
              padding: '1.5rem',
              width: 'min(28rem, calc(100vw - 2rem))',
              maxHeight: '90dvh', overflowY: 'auto',
              boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Ghost size={18} color="#00a884" />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.text }}>New Chat</h2>
              </div>
              <button onClick={onClose} style={closeBtnStyle}><X size={18} /></button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '1.25rem', borderRadius: '0.5rem', overflow: 'hidden', border: `1px solid ${C.border}` }}>
              {[
                { key: 'paste', label: 'Paste ID' },
                { key: 'qr',   label: 'QR Code'  },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    flex: 1, padding: '0.5rem',
                    background: tab === t.key ? C.accent : 'transparent',
                    color: tab === t.key ? '#111b21' : C.muted,
                    border: 'none', cursor: 'pointer',
                    fontWeight: tab === t.key ? 700 : 400,
                    fontSize: '0.85rem',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'paste' ? (
              <>
                <label style={labelStyle}>Their Pseudonym ID</label>
                <input
                  value={pseudonymId}
                  onChange={e => setPseudonymId(e.target.value)}
                  placeholder="Paste full hex pseudonym ID…"
                  style={inputStyle}
                  autoFocus
                />

                <label style={{ ...labelStyle, marginTop: '0.875rem' }}>Nickname (optional)</label>
                <input
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="e.g. Alice"
                  style={inputStyle}
                />

                <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1.25rem' }}>
                  <button
                    onClick={handleAddOnly}
                    disabled={!pseudonymId.trim()}
                    style={{ ...secondaryBtnStyle, flex: 1 }}
                  >
                    <UserPlus size={14} /> Add Contact
                  </button>
                  <button
                    onClick={handleStart}
                    disabled={!pseudonymId.trim()}
                    style={{ ...primaryBtnStyle, flex: 1 }}
                  >
                    Start Chat
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                {/* Own QR code placeholder */}
                <p style={{ color: C.muted, fontSize: '0.82rem', marginBottom: '0.75rem' }}>Your QR code — share to receive connection requests</p>
                <div style={{
                  background: '#fff', borderRadius: '0.5rem',
                  padding: '1rem', display: 'inline-block', marginBottom: '1rem',
                }}>
                  <QrCode size={80} color="#111b21" />
                </div>
                <p style={{ fontSize: '0.68rem', color: C.muted, fontFamily: 'monospace', wordBreak: 'break-all', margin: '0 0 1rem' }}>
                  {ownId?.slice(0, 32) ?? 'Loading…'}
                </p>
                <p style={{ color: C.muted, fontSize: '0.78rem' }}>
                  Scanner coming soon — use Paste ID tab to connect manually.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

const closeBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#8696a0', padding: '0.25rem', borderRadius: '0.375rem',
  display: 'flex', alignItems: 'center',
}
const labelStyle = {
  display: 'block', fontSize: '0.78rem', color: '#8696a0',
  marginBottom: '0.375rem', fontWeight: 500,
}
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: '#182229', border: '1px solid #2a3942',
  borderRadius: '0.5rem', padding: '0.625rem 0.75rem',
  color: '#e9edef', fontSize: '0.9rem', outline: 'none',
  fontFamily: 'monospace',
}
const primaryBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
  background: '#00a884', color: '#111b21', border: 'none',
  borderRadius: '0.5rem', padding: '0.625rem 1rem',
  fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
}
const secondaryBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
  background: 'transparent', color: '#e9edef',
  border: '1px solid #2a3942',
  borderRadius: '0.5rem', padding: '0.625rem 1rem',
  fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer',
}
