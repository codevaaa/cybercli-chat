/**
 * AnonInviteModal — Group invite link generator.
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, Link2, QrCode, AlertTriangle } from 'lucide-react'

const C = {
  bg:     '#233138',
  border: '#2a3942',
  accent: '#00a884',
  text:   '#e9edef',
  muted:  '#8696a0',
  input:  '#182229',
  danger: '#f38ba8',
}

const EXPIRY_OPTIONS = [
  { label: '1 hour',  value: 3_600_000 },
  { label: '24 hours', value: 86_400_000 },
  { label: '7 days',  value: 604_800_000 },
  { label: 'Never',   value: null },
]

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function AnonInviteModal({ isOpen, onClose, groupName = 'Group' }) {
  const [token, setToken]   = useState(() => generateToken())
  const [expiry, setExpiry] = useState(86_400_000)
  const [copied, setCopied] = useState(false)
  const [revoked, setRevoked] = useState(false)

  const link = `https://codeva.app/invite/${token}`

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(link).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [link])

  const revokeLink = useCallback(() => {
    setRevoked(true)
    setTimeout(() => {
      setToken(generateToken())
      setRevoked(false)
    }, 1000)
  }, [])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} onClick={onClose} />
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
              borderRadius: '0.875rem', padding: '1.5rem',
              width: 'min(28rem, calc(100vw - 2rem))',
              boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link2 size={18} color={C.accent} />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.text }}>
                  Invite to {groupName}
                </h2>
              </div>
              <button onClick={onClose} style={closeBtnStyle}><X size={18} /></button>
            </div>

            {/* Invite link */}
            <div style={{
              background: C.input, border: `1px solid ${C.border}`,
              borderRadius: '0.5rem', padding: '0.625rem 0.75rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              marginBottom: '1rem',
            }}>
              <span style={{ flex: 1, fontSize: '0.8rem', color: C.muted, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {revoked ? '⏳ Revoking…' : link}
              </span>
              <button
                onClick={copyLink}
                style={{
                  background: C.accent, color: '#111b21',
                  border: 'none', borderRadius: '0.375rem',
                  padding: '0.375rem 0.625rem',
                  cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  fontSize: '0.78rem', fontWeight: 600,
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* QR placeholder */}
            <div style={{
              background: '#fff', borderRadius: '0.5rem',
              padding: '1rem', textAlign: 'center',
              marginBottom: '1rem',
            }}>
              <QrCode size={80} color="#111b21" style={{ margin: '0 auto' }} />
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.68rem', color: '#555', fontFamily: 'monospace' }}>
                {link}
              </p>
            </div>

            {/* Expiry */}
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: C.muted, fontWeight: 500 }}>Link expires</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {EXPIRY_OPTIONS.map(opt => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setExpiry(opt.value)}
                    style={{
                      padding: '0.3rem 0.75rem',
                      borderRadius: '999px',
                      border: `1.5px solid ${expiry === opt.value ? C.accent : C.border}`,
                      background: expiry === opt.value ? 'rgba(0,168,132,0.12)' : 'transparent',
                      color: expiry === opt.value ? C.accent : C.muted,
                      fontSize: '0.8rem', cursor: 'pointer', fontWeight: expiry === opt.value ? 600 : 400,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Revoke */}
            <button
              onClick={revokeLink}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                width: '100%', padding: '0.625rem',
                background: 'rgba(243,139,168,0.08)',
                border: `1px solid rgba(243,139,168,0.2)`,
                borderRadius: '0.5rem', cursor: 'pointer',
                color: C.danger, fontSize: '0.875rem', justifyContent: 'center',
              }}
            >
              <AlertTriangle size={14} /> Revoke Link
            </button>
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
