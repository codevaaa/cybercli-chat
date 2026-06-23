/**
 * AnonGroupCreateModal — Create a new anonymous group.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Ghost, Plus, Tag } from 'lucide-react'
import { getAvatarColor } from './useAnonChat.js'

const C = {
  bg:     '#233138',
  border: '#2a3942',
  accent: '#00a884',
  text:   '#e9edef',
  muted:  '#8696a0',
  input:  '#182229',
}

export default function AnonGroupCreateModal({ isOpen, onClose, onCreateGroup }) {
  const [name,      setName]      = useState('')
  const [memberInput, setMemberInput] = useState('')
  const [members,   setMembers]   = useState([])

  const addMember = () => {
    const id = memberInput.trim()
    if (!id || members.includes(id)) return
    setMembers(prev => [...prev, id])
    setMemberInput('')
  }

  const removeMember = (id) => setMembers(prev => prev.filter(m => m !== id))

  const handleCreate = () => {
    if (!name.trim()) return
    onCreateGroup?.(name.trim(), members)
    setName('')
    setMembers([])
    setMemberInput('')
    onClose()
  }

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
              maxHeight: '90dvh', overflowY: 'auto',
              boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Ghost size={18} color={C.accent} />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.text }}>Create Group</h2>
              </div>
              <button onClick={onClose} style={closeBtnStyle}><X size={18} /></button>
            </div>

            {/* Group avatar preview */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: '4rem', height: '4rem', borderRadius: '50%',
                background: getAvatarColor(name || 'g'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                <Ghost size={22} color="rgba(255,255,255,0.9)" style={{ position: 'absolute', top: '10px', left: '11px' }} />
                <Ghost size={16} color="rgba(255,255,255,0.55)" style={{ position: 'absolute', bottom: '8px', right: '9px' }} />
              </div>
            </div>

            {/* Group name */}
            <label style={labelStyle}>Group Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Dev Team"
              style={inputStyle}
              autoFocus
            />

            {/* Add members */}
            <label style={{ ...labelStyle, marginTop: '1rem' }}>Add Members by Pseudonym ID</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.625rem' }}>
              <input
                value={memberInput}
                onChange={e => setMemberInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMember() } }}
                placeholder="Paste pseudonym ID…"
                style={{ ...inputStyle, flex: 1, marginBottom: 0, fontFamily: 'monospace' }}
              />
              <button
                onClick={addMember}
                style={{
                  background: C.accent, color: '#111b21',
                  border: 'none', borderRadius: '0.5rem',
                  padding: '0 0.75rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center',
                }}
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Member tags */}
            {members.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1rem' }}>
                {members.map(m => (
                  <span
                    key={m}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      background: 'rgba(0,168,132,0.12)',
                      border: `1px solid rgba(0,168,132,0.25)`,
                      borderRadius: '999px',
                      padding: '0.2rem 0.5rem 0.2rem 0.625rem',
                      fontSize: '0.78rem', color: C.accent,
                    }}
                  >
                    <Tag size={10} />
                    {m.slice(0, 10)}…
                    <button
                      onClick={() => removeMember(m)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: '0', lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {members.length === 0 && (
              <p style={{ fontSize: '0.78rem', color: C.muted, marginBottom: '1rem' }}>
                No members added yet. You can add members after creation too.
              </p>
            )}

            {/* Create button */}
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              style={{
                width: '100%', padding: '0.75rem',
                background: name.trim() ? C.accent : '#2a3942',
                color: name.trim() ? '#111b21' : C.muted,
                border: 'none', borderRadius: '0.5rem',
                fontWeight: 700, fontSize: '0.9375rem',
                cursor: name.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Create Group
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
const labelStyle = {
  display: 'block', fontSize: '0.78rem', color: '#8696a0',
  marginBottom: '0.375rem', fontWeight: 500,
}
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: '#182229', border: '1px solid #2a3942',
  borderRadius: '0.5rem', padding: '0.625rem 0.75rem',
  color: '#e9edef', fontSize: '0.9rem', outline: 'none',
}
