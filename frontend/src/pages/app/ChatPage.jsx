import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Plus, Search, MessageSquare, FolderOpen, Layers, Code2, Sliders,
  ChevronLeft, ChevronRight, ChevronDown, Mic, Paperclip, Radio,
  Copy, Check, GitBranch, Volume2, VolumeX, Trash2, Pin, X,
  Download, Zap, Settings, AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import api from '../../lib/api.js'
import { useTTS } from '../../hooks/useTTS.js'

// ─── Constants ──────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

const MODELS = [
  { id: 'groq/llama-3.1-8b',        name: 'Llama 3.1 8B',       tag: 'Fast',     color: '#10B981' },
  { id: 'gemini/gemini-2.5-flash',  name: 'Gemini 2.5 Flash',   tag: 'Balanced', color: '#3B82F6' },
  { id: 'openrouter/gpt-4o-mini',   name: 'GPT-4o Mini',        tag: 'Capable',  color: '#8B5CF6' },
  { id: 'groq/llama-3.1-70b',       name: 'Llama 3.1 70B',      tag: 'Smart',    color: '#F59E0B' },
  { id: 'council',                  name: 'Council Mode',       tag: 'Debate',   color: '#D97757' },
]

const QUICK_ACTIONS = [
  { label: '</> Code',    value: 'Help me write code for ' },
  { label: 'Learn',       value: 'Explain the concept of ' },
  { label: 'Create',      value: 'Help me create ' },
  { label: 'Write',       value: 'Write a ' },
  { label: 'Life stuff',  value: 'Give me advice on ' },
]

const NAV_ITEMS = [
  { id: 'chats',     label: 'Chats',     icon: MessageSquare },
  { id: 'projects',  label: 'Projects',  icon: FolderOpen    },
  { id: 'artifacts', label: 'Artifacts', icon: Layers        },
  { id: 'code',      label: 'Code',      icon: Code2,  badge: 'Pro' },
  { id: 'customize', label: 'Customize', icon: Sliders       },
]

// ─── Star SVG Icon ───────────────────────────────────────────────────────────

function StarIcon({ size = 64, color = '#D97757' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path
        d="M32 4 L35.5 28.5 L60 32 L35.5 35.5 L32 60 L28.5 35.5 L4 32 L28.5 28.5 Z"
        fill={color}
        opacity="0.9"
      />
      <path
        d="M32 12 L34 30 L52 32 L34 34 L32 52 L30 34 L12 32 L30 30 Z"
        fill="white"
        opacity="0.25"
      />
    </svg>
  )
}

// ─── Blink Cursor ────────────────────────────────────────────────────────────

function BlinkCursor() {
  return (
    <motion.span
      className="inline-block w-0.5 h-4 bg-foreground-primary ml-0.5 align-middle"
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
    />
  )
}

// ─── Code Block ──────────────────────────────────────────────────────────────

function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-border-subtle">
      <div className="flex items-center justify-between px-4 py-2 bg-background-tertiary border-b border-border-subtle">
        <span className="text-xs font-mono text-foreground-muted">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground-primary transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: 0, background: '#1a1a1a', fontSize: '0.8125rem' }}
        showLineNumbers={value.split('\n').length > 3}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg, index, isStreaming, onCopy, onSpeak, onFork, onStop, ttsLoading, isPlaying, copied }) {
  const [hovering, setHovering] = useState(false)
  const isUser = msg.role === 'user'
  const isAssistant = msg.role === 'assistant'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Assistant avatar */}
      {isAssistant && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(217,119,87,0.12)' }}>
            <StarIcon size={16} color="#D97757" />
          </div>
        </div>
      )}

      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
        {/* Content */}
        {isUser ? (
          <div
            className="px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed text-foreground-primary"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(217,119,87,0.25)',
            }}
          >
            {msg.content}
          </div>
        ) : (
          <div className="text-sm leading-relaxed text-foreground-primary prose-custom">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  if (!inline && match) {
                    return (
                      <CodeBlock
                        language={match[1]}
                        value={String(children).replace(/\n$/, '')}
                      />
                    )
                  }
                  return (
                    <code
                      className="px-1.5 py-0.5 rounded text-xs font-mono bg-background-tertiary text-foreground-primary"
                      {...props}
                    >
                      {children}
                    </code>
                  )
                },
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-3 pl-5 space-y-1 list-disc">{children}</ul>,
                ol: ({ children }) => <ol className="mb-3 pl-5 space-y-1 list-decimal">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-4 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h3>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-accent pl-4 my-3 text-foreground-secondary italic">
                    {children}
                  </blockquote>
                ),
                strong: ({ children }) => <strong className="font-semibold text-foreground-primary">{children}</strong>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer"
                    className="text-accent hover:text-accent-light underline underline-offset-2">
                    {children}
                  </a>
                ),
              }}
            >
              {msg.content}
            </ReactMarkdown>
            {isStreaming && <BlinkCursor />}
          </div>
        )}

        {/* Model badge for assistant */}
        {isAssistant && msg.model && !isStreaming && (
          <div className="mt-1.5 text-[10px] text-foreground-muted font-medium px-2 py-0.5 rounded bg-background-secondary border border-border-subtle">
            {MODELS.find(m => m.id === msg.model)?.name || msg.model}
          </div>
        )}

        {/* Fork link */}
        {msg.is_fork_point && msg.forked_thread_id && (
          <Link
            to={`/chat/${msg.forked_thread_id}`}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-light font-medium"
          >
            <GitBranch className="w-3.5 h-3.5" />
            Go to branched thread →
          </Link>
        )}

        {/* Action row */}
        <AnimatePresence>
          {hovering && !isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-0.5 mt-1.5"
            >
              <button
                onClick={() => onCopy(msg.content, index)}
                className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground-primary hover:bg-background-secondary transition-all"
                title="Copy"
              >
                {copied === index ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {isAssistant && (
                <>
                  <button
                    onClick={() => isPlaying ? onStop() : onSpeak(msg.content)}
                    disabled={ttsLoading && !isPlaying}
                    className="p-1.5 rounded-lg text-foreground-muted hover:text-accent hover:bg-background-secondary transition-all"
                    title={isPlaying ? 'Stop' : 'Speak'}
                  >
                    {isPlaying ? <VolumeX className="w-3.5 h-3.5 text-accent" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => onFork(msg._id)}
                    className="p-1.5 rounded-lg text-foreground-muted hover:text-accent hover:bg-background-secondary transition-all"
                    title="Branch from here"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ─── Model Selector Dropdown ─────────────────────────────────────────────────

function ModelSelector({ selectedModel, onSelect }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = MODELS.find(m => m.id === selectedModel) || MODELS[0]

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary transition-all border border-border-subtle"
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: selected.color }} />
        <span>{selected.name}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-full mb-2 right-0 w-64 rounded-2xl border border-border-subtle shadow-xl p-1.5 z-50"
            style={{ background: 'var(--bg-elevated)' }}
          >
            {MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => { onSelect(model.id); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  selectedModel === model.id
                    ? 'bg-background-tertiary'
                    : 'hover:bg-background-secondary'
                }`}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: model.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground-primary truncate">{model.name}</div>
                </div>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={{
                    background: model.color + '20',
                    color: model.color,
                  }}
                >
                  {model.tag}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Input Area ───────────────────────────────────────────────────────────────

function InputArea({ input, setInput, onSend, loading, selectedModel, onModelChange, onMicClick }) {
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Quick actions */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => {
              setInput(action.value)
              textareaRef.current?.focus()
            }}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-border-subtle text-foreground-secondary hover:text-foreground-primary hover:border-accent/40 transition-all bg-background-secondary"
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Input pill */}
      <div
        className="rounded-2xl border border-border-subtle transition-all"
        style={{
          background: 'var(--bg-secondary)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        }}
      >
        <div className="flex items-end gap-2 p-3">
          {/* Attachment */}
          <button className="flex-shrink-0 p-2 rounded-xl text-foreground-muted hover:text-foreground-primary hover:bg-background-tertiary transition-all mb-0.5">
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="How can I help you today?"
            rows={1}
            disabled={loading}
            className="flex-1 bg-transparent text-sm text-foreground-primary placeholder:text-foreground-muted resize-none focus:outline-none leading-relaxed py-1.5 min-h-[36px]"
            style={{ maxHeight: '200px' }}
          />

          {/* Right controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <ModelSelector selectedModel={selectedModel} onSelect={onModelChange} />

            <button
              onClick={onMicClick}
              className="p-2 rounded-xl text-foreground-muted hover:text-accent hover:bg-background-tertiary transition-all"
              title="Voice input"
            >
              <Mic className="w-4 h-4" />
            </button>

            <button
              className="p-2 rounded-xl text-foreground-muted hover:text-foreground-primary hover:bg-background-tertiary transition-all"
              title="Waveform"
            >
              <Radio className="w-4 h-4" />
            </button>

            <button
              onClick={onSend}
              disabled={!input.trim() || loading}
              className={`ml-1 p-2 rounded-xl transition-all ${
                input.trim() && !loading
                  ? 'bg-accent text-white hover:bg-accent-light'
                  : 'bg-background-tertiary text-foreground-muted cursor-not-allowed'
              }`}
            >
              {loading ? (
                <motion.div
                  className="w-4 h-4 rounded-full border-2 border-current border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2L8 14M2 8L8 2L14 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-foreground-muted mt-2">
        CyberCli can make mistakes. Consider checking important information.
      </p>
    </div>
  )
}

// ─── Thread Item ──────────────────────────────────────────────────────────────

function ThreadItem({ thread, isActive, onSelect, onDelete, onPin }) {
  const [hovering, setHovering] = useState(false)

  return (
    <div
      className={`flex items-center gap-2 px-2 py-2 rounded-xl cursor-pointer transition-colors group ${
        isActive ? 'bg-background-tertiary text-foreground-primary' : 'hover:bg-background-secondary text-foreground-secondary hover:text-foreground-primary'
      }`}
      onClick={onSelect}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-foreground-muted" />
      <span className="text-[13px] truncate flex-1">{thread.title || 'Untitled Chat'}</span>
      <AnimatePresence>
        {hovering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-0.5 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onPin}
              className={`p-1 rounded hover:bg-background-elevated transition-colors ${thread.is_pinned ? 'text-accent' : 'text-foreground-muted'}`}
              title={thread.is_pinned ? 'Unpin' : 'Pin'}
            >
              <Pin className="w-3 h-3" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded hover:bg-background-elevated text-foreground-muted hover:text-red-500 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Settings Modal (inline) ──────────────────────────────────────────────────

function SettingsDialog({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-xl rounded-2xl border border-border-subtle p-6 pointer-events-auto"
              style={{ background: 'var(--bg-elevated)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground-primary">Settings</h2>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <Link
                to="/settings"
                onClick={onClose}
                className="block w-full text-center px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-light transition-colors"
              >
                Open Full Settings
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Hero State ───────────────────────────────────────────────────────────────

function HeroState() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center flex-1 text-center px-4"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } }
      }}
    >
      <motion.div
        variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <StarIcon size={72} color="#D97757" />
      </motion.div>

      <motion.h1
        variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="font-serif text-4xl md:text-5xl mb-3"
        style={{ color: '#FAF3E8', letterSpacing: '-0.02em', lineHeight: 1.15 }}
      >
        What shall we think through?
      </motion.h1>

      <motion.p
        variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-sm text-foreground-muted max-w-sm"
      >
        Select a model, ask anything, or pick a quick action below.
      </motion.p>
    </motion.div>
  )
}

// ─── Main ChatPage ────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { threadId } = useParams()
  const navigate = useNavigate()

  // State
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeNav, setActiveNav] = useState('chats')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('groq/llama-3.1-8b')
  const [copied, setCopied] = useState(null)
  const [streamingIndex, setStreamingIndex] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [error, setError] = useState(null)

  const messagesEndRef = useRef(null)
  const { speak, stop, isPlaying, isLoading: ttsLoading } = useTTS()

  const activeThreadId = threadId || null

  // ── Data loading ──

  useEffect(() => {
    loadThreads()
  }, [])

  useEffect(() => {
    if (threadId) {
      loadMessages(threadId)
    } else {
      setMessages([])
    }
  }, [threadId])

  useEffect(() => {
    // Check for pending prompt from landing page
    const pending = sessionStorage.getItem('pending_prompt')
    if (pending) {
      sessionStorage.removeItem('pending_prompt')
      setInput(pending)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingIndex])

  const loadThreads = async () => {
    try {
      const { data } = await api.get('/chat')
      setThreads(data.threads || [])
    } catch (err) {
      console.error('Failed to load threads:', err)
    }
  }

  const loadMessages = async (id) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/chat/${id}/messages`)
      setMessages(data.messages || [])
      const thread = threads.find(t => t._id === id)
      if (thread?.model_id) setSelectedModel(thread.model_id)
    } catch (err) {
      console.error('Failed to load messages:', err)
      setError('Failed to load conversation.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateThread = async (title = 'New Chat') => {
    try {
      const { data } = await api.post('/chat', { title, model_id: selectedModel })
      setThreads(prev => [data, ...prev])
      navigate(`/chat/${data._id}`)
      return data._id
    } catch (err) {
      console.error('Failed to create thread:', err)
      return null
    }
  }

  const handleDeleteThread = async (id, e) => {
    e?.stopPropagation()
    if (!confirm('Delete this conversation?')) return
    try {
      await api.delete(`/chat/${id}`)
      setThreads(prev => prev.filter(t => t._id !== id))
      if (activeThreadId === id) navigate('/chat')
    } catch (err) {
      console.error('Failed to delete thread:', err)
    }
  }

  const handlePinThread = async (id, e) => {
    e?.stopPropagation()
    const thread = threads.find(t => t._id === id)
    if (!thread) return
    try {
      const { data } = await api.patch(`/chat/${id}`, { is_pinned: !thread.is_pinned })
      setThreads(prev => prev.map(t => t._id === id ? data : t))
    } catch (err) {
      console.error('Failed to pin thread:', err)
    }
  }

  const handleFork = async (messageId) => {
    if (!activeThreadId || !messageId) return
    if (!confirm('Branch conversation from this message?')) return
    setLoading(true)
    try {
      const { data } = await api.post(`/chat/${activeThreadId}/fork`, { message_id: messageId })
      setThreads(prev => [data, ...prev])
      navigate(`/chat/${data._id}`)
    } catch (err) {
      console.error('Failed to fork:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (content, index) => {
    navigator.clipboard.writeText(content)
    setCopied(index)
    setTimeout(() => setCopied(null), 2000)
  }

  // ── Send message ──

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return
    const userText = input.trim()
    setInput('')
    setLoading(true)
    setError(null)

    let currentId = activeThreadId
    if (!currentId) {
      currentId = await handleCreateThread(userText.substring(0, 50))
      if (!currentId) { setLoading(false); return }
    }

    const token = localStorage.getItem('sb-access-token')
    const userMsg = { role: 'user', content: userText }
    const history = [...messages.map(m => ({ role: m.role, content: m.content })), userMsg]

    setMessages(prev => [...prev, userMsg])

    // Council mode
    if (selectedModel === 'council') {
      const assistantMsg = { role: 'assistant', content: '', model: 'council' }
      setMessages(prev => [...prev, assistantMsg])
      const assistantIdx = messages.length + 1

      try {
        const res = await fetch(`${API_BASE}/completions/council`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ messages: history })
        })
        if (!res.ok) throw new Error('Council streaming failed')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let synthesized = ''
        setStreamingIndex(assistantIdx)

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6)
            if (raw === '[DONE]') break
            try {
              const parsed = JSON.parse(raw)
              if (parsed.type === 'synthesis_token') {
                synthesized += parsed.content
                setMessages(prev => {
                  const next = [...prev]
                  next[next.length - 1] = { ...next[next.length - 1], content: synthesized }
                  return next
                })
              }
            } catch {}
          }
        }
      } catch (err) {
        console.error('Council error:', err)
        setError('Council mode failed: ' + err.message)
      } finally {
        setStreamingIndex(null)
      }
    } else {
      // Normal streaming
      const assistantMsg = { role: 'assistant', content: '', model: selectedModel }
      setMessages(prev => [...prev, assistantMsg])
      const assistantIdx = messages.length + 1
      setStreamingIndex(assistantIdx)
      let fullReply = ''

      try {
        const res = await fetch(`${API_BASE}/chat/${currentId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ messages: history, model: selectedModel })
        })
        if (!res.ok) throw new Error('Stream failed')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6)
            if (raw === '[DONE]') break
            try {
              const parsed = JSON.parse(raw)
              if (parsed.type === 'token') {
                fullReply += parsed.content
                setMessages(prev => {
                  const next = [...prev]
                  next[next.length - 1] = { ...next[next.length - 1], content: fullReply }
                  return next
                })
              }
            } catch {}
          }
        }

        await loadMessages(currentId)
        await loadThreads()
      } catch (err) {
        console.error('Chat error:', err)
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { ...next[next.length - 1], content: `Error: ${err.message}` }
          return next
        })
        setError('Failed to get response.')
      } finally {
        setStreamingIndex(null)
      }
    }

    setLoading(false)
  }, [input, loading, activeThreadId, messages, selectedModel])

  // ── User info (from localStorage) ──
  const userName = localStorage.getItem('user_name') || 'User'
  const userEmail = localStorage.getItem('user_email') || ''
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  const pinnedThreads = threads.filter(t => t.is_pinned)
  const recentThreads = threads.filter(t => !t.is_pinned).slice(0, 30)

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Sidebar ── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex-shrink-0 flex flex-col overflow-hidden border-r border-border-subtle"
            style={{ background: '#1a1a1a' }}
          >
            {/* Brand + collapse */}
            <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(217,119,87,0.15)' }}>
                  <StarIcon size={18} color="#D97757" />
                </div>
                <span className="font-semibold text-sm" style={{ color: '#FAF9F7' }}>CyberCli</span>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* New Chat + Search */}
            <div className="px-3 pb-2 space-y-1 flex-shrink-0">
              <button
                onClick={() => { navigate('/chat'); setMessages([]) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ color: '#D4D4D4' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ color: '#D4D4D4' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>

            {/* Nav items */}
            <div className="px-3 pb-3 flex-shrink-0">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors mb-0.5 ${
                    activeNav === item.id ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                  style={{ background: activeNav === item.id ? 'rgba(217,119,87,0.12)' : 'transparent' }}
                  onMouseEnter={e => { if (activeNav !== item.id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                  onMouseLeave={e => { if (activeNav !== item.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(217,119,87,0.2)', color: '#D97757' }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-white/[0.06] my-1 mx-3 flex-shrink-0" />

            {/* Recents */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {(pinnedThreads.length > 0 || recentThreads.length > 0) && (
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 mb-2 px-2">
                  Recents
                </p>
              )}

              {pinnedThreads.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-medium text-gray-600 px-2 mb-1">Pinned</p>
                  {pinnedThreads.map(t => (
                    <ThreadItem
                      key={t._id}
                      thread={t}
                      isActive={activeThreadId === t._id}
                      onSelect={() => navigate(`/chat/${t._id}`)}
                      onDelete={(e) => handleDeleteThread(t._id, e)}
                      onPin={(e) => handlePinThread(t._id, e)}
                    />
                  ))}
                </div>
              )}

              <div className="space-y-0.5">
                {recentThreads.map(t => (
                  <ThreadItem
                    key={t._id}
                    thread={t}
                    isActive={activeThreadId === t._id}
                    onSelect={() => navigate(`/chat/${t._id}`)}
                    onDelete={(e) => handleDeleteThread(t._id, e)}
                    onPin={(e) => handlePinThread(t._id, e)}
                  />
                ))}
              </div>

              {threads.length === 0 && (
                <p className="text-xs text-gray-600 text-center mt-6">No conversations yet</p>
              )}
            </div>

            {/* Bottom user bar */}
            <div className="flex-shrink-0 border-t border-white/[0.06] p-3">
              <div className="flex items-center gap-2.5 px-2 py-2">
                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'rgba(217,119,87,0.2)', color: '#D97757' }}
                >
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-gray-200 truncate">{userName}</div>
                  <div className="text-[10px] text-gray-600 truncate">{userEmail || 'Free Plan'}</div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(217,119,87,0.2)', color: '#D97757' }}>FREE</span>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main Area ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header strip */}
        <header className="flex items-center gap-3 px-4 py-3 flex-shrink-0">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground-primary hover:bg-background-secondary transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {activeThreadId && (
            <div className="flex items-center gap-2 text-sm text-foreground-muted">
              <span className="truncate max-w-[200px]">
                {threads.find(t => t._id === activeThreadId)?.title || 'Chat'}
              </span>
            </div>
          )}

          <div className="flex-1" />

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground-primary hover:bg-background-secondary transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </header>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-4 mb-2 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm"
              style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#FCA5A5' }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !loading ? (
            <div className="h-full flex flex-col">
              <HeroState />
              {/* Input in center */}
              <div className="px-4 pb-6">
                <InputArea
                  input={input}
                  setInput={setInput}
                  onSend={handleSend}
                  loading={loading}
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  onMicClick={() => {}}
                />
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {loading && messages.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <motion.div
                    className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
              ) : (
                messages.map((msg, i) => (
                  <MessageBubble
                    key={msg._id || `msg-${i}`}
                    msg={msg}
                    index={i}
                    isStreaming={streamingIndex === i}
                    onCopy={handleCopy}
                    onSpeak={(text) => speak(text)}
                    onFork={handleFork}
                    onStop={stop}
                    ttsLoading={ttsLoading}
                    isPlaying={isPlaying}
                    copied={copied}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input pinned at bottom (when messages exist) */}
        {messages.length > 0 && (
          <div className="px-4 py-4 flex-shrink-0 border-t border-border-subtle" style={{ background: 'var(--bg-primary)' }}>
            <InputArea
              input={input}
              setInput={setInput}
              onSend={handleSend}
              loading={loading}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              onMicClick={() => {}}
            />
          </div>
        )}
      </main>

      {/* Settings dialog */}
      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
