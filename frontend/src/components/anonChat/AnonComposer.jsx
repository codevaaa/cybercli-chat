/**
 * AnonComposer — Message input bar (WhatsApp style).
 * Emoji picker, attach (MAX gated), text area, mic (MAX gated), send button.
 */

import { useState, useRef, useCallback } from 'react'
import { Smile, Paperclip, Mic, Send } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

const C = {
  input_bg: '#202c33',
  accent:   '#00a884',
  muted:    '#8696a0',
  text:     '#e9edef',
  border:   '#2a3942',
  bg:       '#111b21',
}

const MAX_LEN = 4096

// 20 common emojis
const EMOJIS = ['😀','😂','🥹','😍','🥺','😎','🤔','👍','👋','🙌','🔥','💯','❤️','🎉','✅','⚡','🙏','😅','🤣','💪']

function EmojiPicker({ onSelect, onClose }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.12 }}
        style={{
          position: 'absolute', bottom: '100%', left: 0,
          zIndex: 50,
          background: '#233138',
          border: `1px solid ${C.border}`,
          borderRadius: '0.75rem',
          padding: '0.625rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '0.25rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          marginBottom: '0.5rem',
        }}
      >
        {EMOJIS.map(e => (
          <button
            key={e}
            onClick={() => onSelect(e)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '1.375rem', padding: '0.25rem',
              borderRadius: '0.375rem', lineHeight: 1,
            }}
            onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={ev => ev.currentTarget.style.background = 'none'}
          >
            {e}
          </button>
        ))}
      </motion.div>
    </>
  )
}

export default function AnonComposer({ onSend, onAttach, onVoice, planIsMax }) {
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const textareaRef = useRef(null)

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 112) + 'px'
  }, [])

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > MAX_LEN) return
    onSend(trimmed)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [text, onSend])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const insertEmoji = useCallback((emoji) => {
    setText(prev => prev + emoji)
    setShowEmoji(false)
    textareaRef.current?.focus()
  }, [])

  const canSend = text.trim().length > 0 && text.length <= MAX_LEN

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: '0.5rem',
      padding: '0.5rem 0.75rem 0.75rem',
      background: C.bg,
      flexShrink: 0,
      position: 'relative',
    }}>
      {/* Emoji picker */}
      <AnimatePresence>
        {showEmoji && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />}
      </AnimatePresence>

      {/* Emoji button */}
      <button
        onClick={() => setShowEmoji(v => !v)}
        aria-label="Emoji"
        style={iconBtnStyle(showEmoji)}
      >
        <Smile size={20} />
      </button>

      {/* Attach button */}
      <button
        onClick={() => onAttach?.()}
        aria-label="Attach file"
        title={planIsMax ? 'Attach file' : 'Attach file (MAX plan)'}
        style={iconBtnStyle(false)}
      >
        <Paperclip size={20} />
      </button>

      {/* Text input */}
      <div style={{
        flex: 1,
        background: C.input_bg,
        borderRadius: '0.625rem',
        padding: '0.5rem 0.75rem',
        display: 'flex', alignItems: 'flex-end',
      }}>
        {text.length > MAX_LEN - 300 && (
          <span style={{
            position: 'absolute', top: '-1.25rem', right: '1rem',
            fontSize: '0.68rem',
            color: text.length > MAX_LEN ? '#f38ba8' : C.muted,
          }}>
            {text.length}/{MAX_LEN}
          </span>
        )}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => { setText(e.target.value); adjustHeight() }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          rows={1}
          maxLength={MAX_LEN}
          aria-label="Message input"
          style={{
            flex: 1, background: 'transparent',
            border: 'none', outline: 'none',
            resize: 'none', color: C.text,
            fontSize: '0.9375rem', lineHeight: 1.5,
            maxHeight: '7rem', overflowY: 'auto',
            fontFamily: 'inherit',
            '::placeholder': { color: C.muted },
          }}
        />
      </div>

      {/* Mic or Send */}
      {canSend ? (
        <button
          onClick={handleSend}
          aria-label="Send message"
          style={{
            width: '2.5rem', height: '2.5rem', borderRadius: '50%',
            background: C.accent, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#111b21', flexShrink: 0,
            transition: 'transform 0.1s',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Send size={18} />
        </button>
      ) : (
        <button
          onClick={() => onVoice?.()}
          aria-label="Voice message"
          title={planIsMax ? 'Hold to record' : 'Voice messages (MAX plan)'}
          style={iconBtnStyle(false)}
        >
          <Mic size={20} />
        </button>
      )}
    </div>
  )
}

function iconBtnStyle(active) {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '2.5rem', height: '2.5rem', borderRadius: '50%',
    background: 'none', border: 'none', cursor: 'pointer',
    color: active ? '#00a884' : '#8696a0',
    flexShrink: 0,
    transition: 'color 0.15s',
  }
}
