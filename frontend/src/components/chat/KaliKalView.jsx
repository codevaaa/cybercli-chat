import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Terminal, Send, Copy, Check, RotateCcw, ChevronDown,
  Globe, Cpu, Search, Code2, Skull, Crosshair, Zap, Lock, ArrowUp,
  Loader2, AlertTriangle
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import MatrixRain from './MatrixRain'

// ─── Kali-compatible models (kali: true in EXTRA_MODELS) ────────────────────
const KALI_MODELS = [
  { id: 'huggingface/cognitivecomputations/dolphin-2.9.2-qwen2.5-72b', name: 'Kali',        tag: 'Kali',        color: '#FF0055', desc: 'The destroyer of limits. Fully uncensored 72B flagship.' },
  { id: 'huggingface/cognitivecomputations/dolphin-2.9.3-mistral-nemo-12b', name: 'Rudra', tag: 'Rudra',       color: '#EF4444', desc: 'The fierce one. Raw unconstrained intelligence at speed.' },
  { id: 'huggingface/cognitivecomputations/dolphin-2.9.4-llama3-70b', name: 'Ashwatthama', tag: 'Ashwatthama', color: '#38B2AC', desc: 'The free warrior. Uncensored high-parameter intelligence.' },
]

// ─── Quick Action Cards ─────────────────────────────────────────────────────
const KALI_QUICK_ACTIONS = [
  { id: 'recon',    icon: Globe,   title: 'Recon',           desc: 'Footprinting & OSINT', prompt: 'Perform a comprehensive OSINT reconnaissance analysis on the target: ' },
  { id: 'code',     icon: Code2,   title: 'Code Analysis',   desc: 'Deep vulnerability audit', prompt: 'Analyze the following code for security vulnerabilities, including potential RCE, injection, and logic flaws:\n\n' },
  { id: 'exploit',  icon: Zap,     title: 'Exploit Research', desc: 'CVE & exploit chains', prompt: 'Research known exploits, CVEs, and attack vectors for: ' },
  { id: 'osint',    icon: Search,  title: 'OSINT',           desc: 'Intelligence gathering', prompt: 'Conduct a thorough open-source intelligence investigation on: ' },
]

// ─── Usage Limits ───────────────────────────────────────────────────────────
const USAGE_LIMITS = { free: 20, pro: 100 }

// ─── Kali Code Block ────────────────────────────────────────────────────────
function KaliCodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-red-900/40">
      <div className="flex items-center justify-between px-4 py-2 bg-[#0D0208] border-b border-red-900/30">
        <span className="text-[10px] font-mono text-red-400/70 uppercase tracking-wider">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: '#0A0208',
          fontSize: '0.8rem',
          border: 'none',
        }}
        showLineNumbers={value.split('\n').length > 3}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}

// ─── Blinking Cursor ────────────────────────────────────────────────────────
function KaliBlink() {
  return (
    <motion.span
      className="inline-block w-[3px] h-4 bg-red-500 ml-0.5 align-middle rounded-sm"
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
    />
  )
}

// ─── Message Bubble (Kali themed) ───────────────────────────────────────────
function KaliMessage({ msg, index, isStreaming, copiedIdx, onCopy, onRetry, modelName }) {
  const isUser = msg.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}
    >
      <div className={`flex max-w-[88%] md:max-w-[78%] ${isUser ? 'flex-row-reverse gap-2.5' : 'gap-3'} relative`}>

        {/* Assistant avatar */}
        {!isUser && (
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-red-950/50 border border-red-500/30 shadow-[0_0_12px_rgba(217,22,36,0.15)]">
              <Skull className="w-4 h-4 text-red-500" />
            </div>
          </div>
        )}

        <div className={`flex flex-col w-full ${isUser ? 'items-end' : 'items-start'}`}>
          {isUser ? (
            /* User bubble */
            <div className="px-5 py-3.5 rounded-2xl rounded-tr-md bg-gradient-to-br from-[#1A0508] to-[#120305] text-red-100/90 text-[14.5px] leading-relaxed whitespace-pre-wrap border border-red-500/20 shadow-[0_0_20px_rgba(217,22,36,0.06)]">
              {msg.content}
            </div>
          ) : (
            /* Assistant bubble */
            <div className="text-[14.5px] text-red-100/85 leading-relaxed w-full pt-0.5 kali-prose">
              {isStreaming && !msg.content && (
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 mb-3 animate-pulse">
                  <div className="w-3 h-3 rounded-full border-[1.5px] border-red-500 border-t-transparent animate-spin" />
                  Processing...
                </div>
              )}
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    if (!inline && match) {
                      return (
                        <KaliCodeBlock
                          language={match[1]}
                          value={String(children).replace(/\n$/, '')}
                        />
                      )
                    }
                    return (
                      <code
                        className="px-1.5 py-0.5 rounded text-[12px] font-mono bg-red-950/40 text-red-300 border border-red-900/30"
                        {...props}
                      >
                        {children}
                      </code>
                    )
                  },
                  p: ({ children }) => <p className="mb-3.5 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="mb-3.5 pl-5 space-y-1.5 list-disc marker:text-red-500/50">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-3.5 pl-5 space-y-1.5 list-decimal marker:text-red-500/50">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  h1: ({ children }) => <h1 className="text-xl font-bold mb-4 mt-6 first:mt-0 text-red-200">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold mb-3 mt-5 first:mt-0 text-red-200">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-4 first:mt-0 text-red-300">{children}</h3>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-[3px] border-red-500/40 pl-4 my-4 text-red-300/70 italic">
                      {children}
                    </blockquote>
                  ),
                  strong: ({ children }) => <strong className="font-semibold text-red-100">{children}</strong>,
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">
                      {children}
                    </a>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3">
                      <table className="w-full text-[13px] border-collapse border border-red-900/30">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-red-950/30">{children}</thead>,
                  th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-red-300 border border-red-900/30 text-[12px]">{children}</th>,
                  td: ({ children }) => <td className="px-3 py-2 border border-red-900/20 text-red-200/70">{children}</td>,
                }}
              >
                {msg.content}
              </ReactMarkdown>
              {isStreaming && <KaliBlink />}
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-2.5 mt-1.5 min-h-[24px]">
            {!isUser && msg.model && !isStreaming && (
              <span className="text-[10px] text-red-500/50 font-mono tracking-wider uppercase">
                {modelName || msg.model}
              </span>
            )}
            {!isStreaming && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => onCopy(msg.content, index)}
                  className="p-1 rounded text-red-500/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Copy"
                >
                  {copiedIdx === index ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                {!isUser && onRetry && (
                  <button
                    onClick={() => onRetry(index)}
                    className="p-1 rounded text-red-500/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Retry"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Model Selector Dropdown (Kali themed) ──────────────────────────────────
function KaliModelSelector({ selected, onSelect }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = KALI_MODELS.find(m => m.id === selected) || KALI_MODELS[0]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-mono font-medium text-red-400/80 hover:text-red-400 hover:bg-red-500/10 border border-red-900/30 hover:border-red-500/30 transition-all"
      >
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: current.color }} />
        <span>{current.tag}</span>
        <ChevronDown className={`w-3 h-3 text-red-500/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-1.5 right-0 z-50 rounded-lg border border-red-900/40 w-[280px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
            style={{ background: '#0D0208' }}
          >
            <div className="px-3 py-2 border-b border-red-900/30">
              <p className="text-[9px] text-red-500/50 uppercase tracking-[0.2em] font-bold">Kali_Kal Models</p>
            </div>
            {KALI_MODELS.map(model => (
              <button
                key={model.id}
                onClick={() => { onSelect(model.id); setOpen(false) }}
                className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors hover:bg-red-500/8 ${
                  selected === model.id ? 'bg-red-500/10' : ''
                }`}
              >
                <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: model.color }} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-red-200">{model.name}</span>
                    <span className="text-[9px] font-mono text-red-500/40">{model.tag}</span>
                  </div>
                  <p className="text-[10px] text-red-400/50 mt-0.5 leading-snug">{model.desc}</p>
                </div>
                {selected === model.id && <Check className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Usage Progress Bar ─────────────────────────────────────────────────────
function UsageBar({ used, limit }) {
  const pct = Math.min((used / limit) * 100, 100)
  const isNearLimit = pct >= 80

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-red-950/50 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: isNearLimit
              ? 'linear-gradient(90deg, #FF0033, #FF6666)'
              : 'linear-gradient(90deg, #D91624, #FF0033)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className={`text-[10px] font-mono ${isNearLimit ? 'text-red-400' : 'text-red-500/60'}`}>
        {used}/{limit}
      </span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function KaliKalView({
  threads,
  messages,
  input,
  setInput,
  handleSend,
  loading,
  handleCreateThread,
  navigate,
  userPlan
}) {
  const [selectedKaliModel, setSelectedKaliModel] = useState(KALI_MODELS[0].id)
  const [copiedIdx, setCopiedIdx] = useState(null)
  const [kaliUsage, setKaliUsage] = useState(() => {
    try { return parseInt(localStorage.getItem('kali_usage') || '0', 10) } catch { return 0 }
  })
  const [isCreating, setIsCreating] = useState(false)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const chatContainerRef = useRef(null)

  // Derive kali threads and active thread
  const kaliThreads = useMemo(() => threads.filter(t => t.mode === 'kali_kal'), [threads])
  const activeKaliThread = useMemo(() => kaliThreads[0] || null, [kaliThreads])

  // Filter messages to only show kali_kal thread messages
  const kaliMessages = useMemo(() => {
    // If there's an active kali thread and messages belong to it, show them
    // Otherwise, messages from ChatPage are already scoped to active thread
    return messages
  }, [messages])

  const usageLimit = USAGE_LIMITS[userPlan === 'pro' ? 'pro' : 'free']
  const isOverLimit = kaliUsage >= usageLimit

  // ── Auto-scroll ──
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [kaliMessages, loading])

  // ── Persist usage ──
  useEffect(() => {
    localStorage.setItem('kali_usage', String(kaliUsage))
  }, [kaliUsage])

  // ── Copy handler ──
  const handleCopy = useCallback((content, idx) => {
    navigator.clipboard.writeText(content)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }, [])

  // ── Retry handler ──
  const handleRetry = useCallback((idx) => {
    if (idx < 1 || loading) return
    const prevUserMsg = kaliMessages[idx - 1]
    if (prevUserMsg && prevUserMsg.role === 'user') {
      handleSend(prevUserMsg.content)
    }
  }, [kaliMessages, loading, handleSend])

  // ── Send message (handles thread creation for kali_kal mode) ──
  const handleKaliSend = useCallback(async (textOverride) => {
    const rawText = typeof textOverride === 'string' ? textOverride : input
    if (!rawText.trim() || loading || isOverLimit) return

    const userText = rawText.trim()

    // If no active kali thread, create one first
    if (!activeKaliThread && !isCreating) {
      setIsCreating(true)
      try {
        const threadId = await handleCreateThread('Kali Session', null, 'kali_kal')
        if (threadId) {
          // Small delay for navigation to settle, then send
          setTimeout(() => {
            handleSend(userText)
            setKaliUsage(prev => prev + 1)
          }, 300)
        }
      } catch (err) {
        console.error('Failed to create kali thread:', err)
      } finally {
        setIsCreating(false)
      }
      if (typeof textOverride !== 'string') setInput('')
      return
    }

    // Active thread exists — send directly
    handleSend(userText)
    setKaliUsage(prev => prev + 1)
    if (typeof textOverride !== 'string') setInput('')
  }, [input, loading, isOverLimit, activeKaliThread, isCreating, handleCreateThread, handleSend, setInput])

  // ── Quick action handler ──
  const handleQuickAction = useCallback((prompt) => {
    setInput(prompt)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [setInput])

  // ── Get model display name ──
  const getModelName = useCallback((modelId) => {
    const model = KALI_MODELS.find(m => m.id === modelId)
    return model ? model.tag : modelId
  }, [])

  // ── Keyboard shortcut ──
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleKaliSend()
    }
  }, [handleKaliSend])

  const hasMessages = kaliMessages.length > 0
  const streamingIdx = loading && kaliMessages.length > 0 ? kaliMessages.length - 1 : null

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden font-mono w-full h-full" style={{ background: '#0A0205' }}>

      {/* ── Matrix Rain Background ── */}
      <div className="absolute inset-0 z-0 opacity-[0.08] pointer-events-none">
        <MatrixRain color="#D91624" />
      </div>

      {/* ── Gradient overlays ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0205]/95 via-transparent to-[#0A0205]/98 pointer-events-none z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A0205]/30 via-transparent to-[#0A0205]/30 pointer-events-none z-[1]" />

      {/* ═══ Content Container ═══ */}
      <div className="relative z-10 flex flex-col h-full">

        {/* ─── Header Bar ─── */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-red-900/25 bg-[#0A0205]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-950/80 to-[#1A0508] border border-red-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(217,22,36,0.15)]">
                <Shield className="w-4.5 h-4.5 text-red-500" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(255,0,51,0.6)]" />
            </div>
            <div>
              <h1 className="text-[14px] font-bold text-red-400 tracking-wider flex items-center gap-1.5">
                KALI_KAL
                <span className="text-[9px] text-red-500/40 font-normal tracking-[0.15em]">// SYSTEM</span>
              </h1>
              <p className="text-[9px] text-red-500/35 uppercase tracking-[0.2em] -mt-0.5">Autonomous Red-Teaming Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Usage badge */}
            <UsageBar used={kaliUsage} limit={usageLimit} />

            {/* Access level */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-red-950/30 border border-red-900/30">
              <Lock className="w-3 h-3 text-red-500/50" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-red-500/60">
                {userPlan === 'pro' ? 'PRO' : 'FREE'}
              </span>
            </div>

            {/* Model selector */}
            <KaliModelSelector selected={selectedKaliModel} onSelect={setSelectedKaliModel} />
          </div>
        </div>

        {/* ─── Chat Area ─── */}
        <div className="flex-1 overflow-y-auto px-4 md:px-0" ref={chatContainerRef}>
          <div className="max-w-3xl mx-auto w-full py-6">

            {!hasMessages ? (
              /* ═══ Empty State ═══ */
              <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">

                {/* Animated Logo */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="relative mb-8"
                >
                  {/* Outer ring */}
                  <motion.div
                    className="absolute -inset-6 rounded-full border border-red-500/10"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.div
                    className="absolute -inset-3 rounded-full border border-red-500/15"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    style={{ borderTopColor: 'rgba(217, 22, 36, 0.5)', borderRightColor: 'transparent' }}
                  />
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-950/60 to-[#0D0208] border border-red-500/25 flex items-center justify-center shadow-[0_0_40px_rgba(217,22,36,0.15)]">
                    <Skull className="w-10 h-10 text-red-500/80" />
                  </div>
                </motion.div>

                {/* Welcome Text */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="text-2xl md:text-3xl font-bold text-red-200/90 mb-2 text-center tracking-tight"
                >
                  What do you want to hack today?
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="text-[12px] text-red-500/40 uppercase tracking-[0.25em] mb-10"
                >
                  Uncensored. Unrestricted. Unmatched.
                </motion.p>

                {/* Quick Action Cards */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl"
                >
                  {KALI_QUICK_ACTIONS.map((action, i) => (
                    <motion.button
                      key={action.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + i * 0.08 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="group/card p-4 rounded-xl bg-gradient-to-br from-[#110308]/80 to-[#0D0208] border border-red-900/25 hover:border-red-500/35 transition-all duration-300 text-left cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_25px_rgba(217,22,36,0.08)]"
                    >
                      <action.icon className="w-5 h-5 text-red-500/50 group-hover/card:text-red-400 transition-colors mb-3" />
                      <h3 className="text-[13px] font-bold text-red-300/80 group-hover/card:text-red-200 mb-0.5 transition-colors">{action.title}</h3>
                      <p className="text-[10px] text-red-500/35 group-hover/card:text-red-500/50 transition-colors leading-snug">{action.desc}</p>
                    </motion.button>
                  ))}
                </motion.div>

                {/* Previous Sessions */}
                {kaliThreads.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-10 w-full max-w-2xl"
                  >
                    <p className="text-[9px] text-red-500/30 uppercase tracking-[0.2em] font-bold mb-3 px-1">Previous Sessions</p>
                    <div className="space-y-1.5">
                      {kaliThreads.slice(0, 5).map(thread => (
                        <button
                          key={thread._id}
                          onClick={() => navigate(`/chat/${thread._id}`)}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#0D0208]/50 border border-red-900/20 hover:border-red-500/25 hover:bg-red-950/15 transition-all group/thread text-left"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Terminal className="w-3.5 h-3.5 text-red-500/30 group-hover/thread:text-red-500/60 transition-colors flex-shrink-0" />
                            <span className="text-[12px] text-red-400/60 group-hover/thread:text-red-400/80 truncate transition-colors">{thread.title}</span>
                          </div>
                          <span className="text-[9px] text-red-500/25 font-mono flex-shrink-0 ml-2">
                            {new Date(thread.updatedAt || thread.createdAt).toLocaleDateString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              /* ═══ Messages ═══ */
              <AnimatePresence initial={false}>
                {kaliMessages.map((msg, i) => (
                  <KaliMessage
                    key={msg._id || `msg-${i}`}
                    msg={msg}
                    index={i}
                    isStreaming={streamingIdx === i}
                    copiedIdx={copiedIdx}
                    onCopy={handleCopy}
                    onRetry={msg.role === 'assistant' ? handleRetry : null}
                    modelName={msg.model ? getModelName(msg.model) : null}
                  />
                ))}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ─── Input Area ─── */}
        <div className="flex-shrink-0 px-4 md:px-0 pb-4 pt-2">
          <div className="max-w-3xl mx-auto w-full">

            {isOverLimit ? (
              /* Usage limit reached */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-3 p-5 rounded-xl bg-gradient-to-br from-[#110308] to-[#0D0208] border border-red-500/20"
              >
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm font-semibold">Session Limit Reached</span>
                </div>
                <p className="text-[11px] text-red-500/50 text-center">
                  You've used all {usageLimit} requests. {userPlan !== 'pro' ? 'Upgrade to PRO for 100 requests.' : 'Limit resets daily.'}
                </p>
                {userPlan !== 'pro' && (
                  <button
                    onClick={() => navigate('/upgrade')}
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-[11px] font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(217,22,36,0.2)]"
                  >
                    Upgrade to PRO
                  </button>
                )}
              </motion.div>
            ) : (
              /* Input form */
              <div className="relative">
                <div className="flex items-end bg-[#0D0208]/90 border border-red-900/30 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(217,22,36,0.06)] focus-within:shadow-[0_0_30px_rgba(217,22,36,0.12)] focus-within:border-red-500/40 transition-all backdrop-blur-sm">
                  {/* Prompt symbol */}
                  <div className="pl-4 pb-3.5 pt-3.5 text-red-500/60 font-bold text-sm select-none">$</div>

                  {/* Textarea */}
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value)
                      // Auto-resize
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter target or command..."
                    rows={1}
                    className="flex-1 bg-transparent border-none text-red-100/90 placeholder:text-red-500/25 focus:outline-none focus:ring-0 py-3.5 px-2 text-[14px] resize-none leading-relaxed"
                    style={{ minHeight: '48px', maxHeight: '160px' }}
                    disabled={loading || isCreating}
                  />

                  {/* Send button */}
                  <button
                    onClick={() => handleKaliSend()}
                    disabled={!input.trim() || loading || isCreating}
                    className="p-3 m-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all group/send flex-shrink-0"
                  >
                    {loading || isCreating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ArrowUp className="w-5 h-5 group-hover/send:translate-y-[-1px] transition-transform" />
                    )}
                  </button>
                </div>

                {/* Bottom info */}
                <div className="flex items-center justify-between mt-2 px-1">
                  <span className="text-[9px] text-red-500/25 uppercase tracking-[0.15em]">
                    Kali_Kal • {(KALI_MODELS.find(m => m.id === selectedKaliModel) || KALI_MODELS[0]).tag} active
                  </span>
                  <span className="text-[9px] text-red-500/20 uppercase tracking-[0.15em]">
                    {usageLimit - kaliUsage} requests remaining
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Inline styles for kali prose ── */}
      <style>{`
        .kali-prose a { text-decoration-color: rgba(239, 68, 68, 0.3); }
        .kali-prose hr { border-color: rgba(127, 29, 29, 0.3); margin: 1.5rem 0; }
        .kali-prose img { border-radius: 0.5rem; border: 1px solid rgba(127, 29, 29, 0.3); }

        /* Kali scrollbar */
        .kali-prose::-webkit-scrollbar,
        div[class*="overflow-y-auto"]::-webkit-scrollbar {
          width: 4px;
        }
        div[class*="overflow-y-auto"]::-webkit-scrollbar-track {
          background: transparent;
        }
        div[class*="overflow-y-auto"]::-webkit-scrollbar-thumb {
          background: rgba(217, 22, 36, 0.15);
          border-radius: 999px;
        }
        div[class*="overflow-y-auto"]::-webkit-scrollbar-thumb:hover {
          background: rgba(217, 22, 36, 0.3);
        }
      `}</style>
    </div>
  )
}
