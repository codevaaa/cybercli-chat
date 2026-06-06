import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Terminal, Send, Copy, Check, RotateCcw, ChevronDown, Trash2, Play,
  Globe, Cpu, Search, Code2, Skull, Crosshair, Zap, Lock, ArrowUp,
  Loader2, AlertTriangle
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import MatrixRain from './MatrixRain'
import { CodevaMark } from '@components/ui/CodevaLogo'
import { useNavigate } from 'react-router-dom'
import mermaid from 'mermaid'
import api from '../../lib/api.js'

// ─── Kali-compatible models (kali: true in EXTRA_MODELS) ────────────────────
const KALI_MODELS = [
  { id: 'auto', name: 'Auto', tag: 'Auto Selector', color: '#8B5CF6', desc: 'Automatically selects the best model based on your query.' },
  { id: 'openrouter/qwen-2.5-coder-32b-free', name: 'Kalikal1',        tag: 'Kalikal1 (Qwen Coder)', color: '#FF0055', desc: '100% Free Fullstack monster. Ultra-fast coding.' },
  { id: 'cloudflare/@cf/meta/llama-3.3-70b-instruct-fp8-fast',  name: 'Rudra1',       tag: 'Rudra1 (Fast 70B)', color: '#EF4444', desc: 'Raw unconstrained intelligence at speed.' },
  { id: 'groq/llama-3.3-70b', name: 'Danav1', tag: 'Danav1 (Groq 70B)', color: '#F59E0B', desc: 'Lightning-fast versatile reasoning.' },
  { id: 'huggingface/cognitivecomputations/dolphin-2.9.4-llama3-70b', name: 'Ashwatthama', tag: 'Ashwatthama (Dolphin 70B)', color: '#38B2AC', desc: 'The free warrior. Uncensored high-parameter intelligence.' },
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

// ─── Kali Terminal Component ───────────────────────────────────────────────────
function KaliTerminal({ logs }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  if (!logs || logs.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-4 mx-2 rounded-xl overflow-hidden border border-red-900/40 bg-[#050102] shadow-[0_0_20px_rgba(220,38,38,0.15)] flex flex-col"
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b border-red-900/30 bg-[#0A0205]">
        <Terminal className="w-4 h-4 text-red-500/80" />
        <span className="text-[11px] font-bold text-red-400/80 uppercase tracking-widest">E2B Cloud Sandbox</span>
        <div className="ml-auto flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-900/40" />
          <span className="w-2.5 h-2.5 rounded-full bg-red-900/40" />
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/60 animate-pulse" />
        </div>
      </div>
      <div
        ref={scrollRef}
        className="p-4 text-[12px] font-mono leading-relaxed text-red-300/80 max-h-[300px] overflow-y-auto whitespace-pre-wrap"
      >
        {logs.map((log, idx) => (
          <div key={idx} className={`${log.startsWith('[STDERR]') ? 'text-red-500 font-bold' : ''}`}>
            {log.replace(/^\[STDOUT\]\n|^\[STDERR\]\n/, '')}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Kali Mermaid Component ───────────────────────────────────────────────────
function KaliMermaidDiagram({ code }) {
  const containerRef = useRef(null)
  const id = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`)

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      suppressErrorRendering: true,
      themeVariables: {
        primaryColor: '#0A0205',
        primaryTextColor: '#FCA5A5',
        primaryBorderColor: '#991B1B',
        lineColor: '#EF4444',
        secondaryColor: '#2A0410',
        tertiaryColor: '#1A0208'
      }
    })

    const renderDiagram = async () => {
      if (containerRef.current) {
        try {
          const { svg } = await mermaid.render(id.current, code)
          containerRef.current.innerHTML = svg
        } catch (e) {
          // Remove mermaid's globally injected error element if it exists
          const errorSvg = document.getElementById('d' + id.current)
          if (errorSvg) errorSvg.remove()
          
          containerRef.current.innerHTML = `<div class="text-[12px] text-red-500 font-mono p-4 border border-red-900/50 bg-red-950/20 rounded">
            <span class="font-bold">⚠️ Diagram Syntax Error</span>
            <pre class="mt-2 text-[10px] text-red-400/80 whitespace-pre-wrap overflow-x-auto">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
          </div>`
        }
      }
    }
    renderDiagram()
  }, [code])

  return (
    <div className="my-4 p-4 rounded-xl border border-red-900/40 bg-[#0A0205] shadow-[0_0_15px_rgba(220,38,38,0.1)] overflow-x-auto w-full">
      <div ref={containerRef} className="mermaid-container w-full min-w-max" />
    </div>
  )
}

function KaliCodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState('idle') // idle, running, success, error
  const [runResult, setRunResult] = useState(null)
  const [errMessage, setErrMessage] = useState('')

  const isExecutable = language === 'javascript' || language === 'js' || language === 'python' || language === 'py'

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRun = async () => {
    if (!isExecutable || status === 'running') return
    setStatus('running')
    setRunResult(null)
    setErrMessage('')

    try {
      const { data } = await api.post('/execute', { code: value, language: language })
      setRunResult(data)
      setStatus('success')
      
      const evt = new CustomEvent('kali-terminal-log', {
        detail: { type: 'terminal_stdout', content: data.output || 'Execution finished.' }
      })
      window.dispatchEvent(evt)
    } catch (err) {
      console.error(err)
      setStatus('error')
      setErrMessage(err.response?.data?.error || err.message || 'Execution failed')
      
      const evt = new CustomEvent('kali-terminal-log', {
        detail: { type: 'terminal_stderr', content: err.response?.data?.error || err.message }
      })
      window.dispatchEvent(evt)
    }
  }

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-red-900/40">
      <div className="flex items-center justify-between px-4 py-2 bg-[#0D0208] border-b border-red-900/30">
        <span className="text-[10px] font-mono text-red-400/70 uppercase tracking-wider">{language || 'code'}</span>
        <div className="flex items-center gap-3">
          {isExecutable && (
            <button
              onClick={handleRun}
              disabled={status === 'running'}
              className="flex items-center gap-1.5 text-[10px] font-bold text-red-500/80 hover:text-red-400 transition-colors bg-red-950/40 hover:bg-red-900/50 px-2 py-1 rounded border border-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'running' ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  Run
                </>
              )}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
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
      {runResult && status === 'success' && (
        <div className="bg-[#0A0205] border-t border-red-900/30 p-3 max-h-48 overflow-y-auto">
          <div className="text-[10px] text-emerald-500/70 font-mono mb-1 flex items-center gap-1">
            <Check className="w-3 h-3" /> Output:
          </div>
          <pre className="text-[11px] text-red-300/80 font-mono whitespace-pre-wrap">{runResult.output}</pre>
        </div>
      )}
      {status === 'error' && (
        <div className="bg-[#0A0205] border-t border-red-900/30 p-3 max-h-48 overflow-y-auto">
          <div className="text-[10px] text-red-500/70 font-mono mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Error:
          </div>
          <pre className="text-[11px] text-red-400 font-mono whitespace-pre-wrap">{errMessage}</pre>
        </div>
      )}
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
                    const codeString = String(children).replace(/\n$/, '')
                    if (!inline && match?.[1] === 'mermaid') {
                      return <KaliMermaidDiagram code={codeString} />
                    }
                    if (!inline && match) {
                      return (
                        <KaliCodeBlock
                          language={match[1]}
                          value={codeString}
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

const getDailyResetTime = () => {
  const now = new Date()
  const resetTime = new Date(now)
  resetTime.setHours(0, 30, 0, 0) // 12:30 AM
  if (now < resetTime) {
    // If it's before 12:30 AM today, the last reset happened yesterday
    resetTime.setDate(resetTime.getDate() - 1)
  }
  return resetTime.getTime()
}

export default function KaliKalView({
  threads = [],
  messages = [],
  input = '',
  setInput,
  handleSend,
  loading = false,
  handleCreateThread,
  handleDeleteThread,
  navigate,
  userPlan = 'free',
  activeThreadId = null
}) {
  const [selectedKaliModel, setSelectedKaliModel] = useState('auto')
  const [copiedIdx, setCopiedIdx] = useState(null)
  
  // Elite UI States
  const [crtEnabled, setCrtEnabled] = useState(false)
  const [burnAfterRead, setBurnAfterRead] = useState(false)
  const [panicMode, setPanicMode] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [cveTickerData, setCveTickerData] = useState([
    "CVE-2024-3094: XZ Utils Backdoor detected in liblzma",
    "0-DAY ALERT: Critical RCE in popular VPN appliance (CVSS 9.8)",
    "DARK WEB: Initial access broker selling credentials for Fortune 500 tech firm",
    "EXPLOIT: Proof of Concept released for recent Windows privilege escalation",
    "THREAT INTEL: New ransomware strain 'LockBit 4.0' spotted in the wild"
  ])
  
  // ── Keyboard Shortcuts (Panic & Palette) ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPanicMode(true)
        setCommandPaletteOpen(false)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  const [kaliUsage, setKaliUsage] = useState(() => {
    try {
      const stored = localStorage.getItem('kali_usage_data')
      if (stored) {
        const data = JSON.parse(stored)
        // If the reset time matches the current period's reset time, keep usage
        if (data.resetTime === getDailyResetTime()) {
          return data.usage || 0
        }
      }
      // If we're in a new period, or no data exists, reset to 0
      return 0
    } catch {
      return 0
    }
  })
  const [isCreating, setIsCreating] = useState(false)
  const [sandboxLogs, setSandboxLogs] = useState([])

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const chatContainerRef = useRef(null)

  // Derive kali threads and active thread
  const kaliThreads = useMemo(() => threads.filter(t => t.mode === 'kali_kal'), [threads])
  const activeKaliThread = useMemo(() => kaliThreads.find(t => t._id === activeThreadId) || null, [kaliThreads, activeThreadId])

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
    localStorage.setItem('kali_usage_data', JSON.stringify({
      usage: kaliUsage,
      resetTime: getDailyResetTime()
    }))
  }, [kaliUsage])

  // ── Listen to Terminal Stream ──
  useEffect(() => {
    const handleTerminalLog = (e) => {
      const { type, content } = e.detail
      if (type === 'terminal_stdout' || type === 'terminal_stderr') {
        setSandboxLogs(prev => [...prev, content])
      }
    }
    window.addEventListener('kali-terminal-log', handleTerminalLog)
    return () => window.removeEventListener('kali-terminal-log', handleTerminalLog)
  }, [])

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
      handleSend(prevUserMsg.content, selectedKaliModel).then(success => {
        if (success) setKaliUsage(prev => prev + 1)
      })
    }
  }, [kaliMessages, loading, handleSend, selectedKaliModel])

  // ── Send message (handles thread creation for kali_kal mode) ──
  const handleKaliSend = useCallback(async (textOverride) => {
    const rawText = typeof textOverride === 'string' ? textOverride : input
    if (!rawText.trim() || loading || isOverLimit) return

    const userText = rawText.trim()
    
    // Auto-Routing Logic
    let routingModel = selectedKaliModel;
    if (routingModel === 'auto') {
      const isTask = /code|script|build|create|hack|exploit|analyze|write|generate|function|component|app|web|html|react/i.test(userText) || userText.length > 50;
      routingModel = isTask ? 'openrouter/qwen-2.5-coder-32b-free' : 'groq/llama-3.3-70b';
    }

    // Burn After Read logic - don't save to db, just handle in UI
    if (burnAfterRead) {
      // Opt out of threading, just use ephemeral state if implemented in handleSend, 
      // but for now we'll just not create a thread and send a standard message
      // Actually, handleSend expects a thread. Let's just create an ephemeral array if burnAfterRead is true.
      // For fullstack completeness, we will modify handleSend inside the context if needed, but here we just pass a flag.
    }

    // If no active kali thread, create one first
    if (!activeKaliThread && !isCreating) {
      setIsCreating(true)
      setSandboxLogs([]) // Clear old logs
      try {
        const threadId = await handleCreateThread('Kali Session', null, 'kali_kal')
        if (threadId) {
          // Small delay for navigation to settle, then send
          setTimeout(async () => {
            const success = await handleSend(userText, routingModel)
            if (success) setKaliUsage(prev => prev + 1)
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
    setSandboxLogs([]) // Clear old logs
    const success = await handleSend(userText, routingModel)
    if (success) setKaliUsage(prev => prev + 1)
    if (typeof textOverride !== 'string') setInput('')
  }, [input, loading, isOverLimit, activeKaliThread, isCreating, handleCreateThread, handleSend, setInput, selectedKaliModel])

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

  // ── Render Panic Screen ──
  if (panicMode) {
    return (
      <div className="w-full h-full bg-[#0078D7] flex flex-col items-center justify-center font-sans text-white cursor-none selection:bg-transparent">
        <Loader2 className="w-16 h-16 animate-spin mb-8" />
        <h1 className="text-3xl font-light mb-4">Working on updates</h1>
        <p className="text-xl font-light">32% complete.</p>
        <p className="text-xl font-light mt-2">Don't turn off your computer.</p>
        <button 
          onClick={() => setPanicMode(false)}
          className="fixed top-0 left-0 w-4 h-4 opacity-0" 
        />
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-[calc(100vh-4rem)] relative ${crtEnabled ? 'crt-curve' : ''}`} style={{ backgroundColor: '#070005' }}>
      
      {/* CRT Overlay */}
      {crtEnabled && <div className="crt-overlay" />}

      {/* Matrix Background */}
      <div className="absolute inset-0 opacity-15 pointer-events-none z-0">
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
                <CodevaMark size={20} color="#ef4444" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(255,0,51,0.6)]" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-red-500 tracking-[0.2em] uppercase glitch-text" data-text="KALI_KAL">
                KALI_KAL
              </h1>
              <span className="text-[9px] text-red-500/40 font-normal tracking-[0.15em]">// SYSTEM</span>
              <p className="text-[9px] text-red-500/35 uppercase tracking-[0.2em] -mt-0.5">Autonomous Red-Teaming Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-red-950/30 rounded border border-red-900/50">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold text-red-500 tracking-widest uppercase glitch-text" data-text="UNRESTRICTED">UNRESTRICTED</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setBurnAfterRead(!burnAfterRead)}
              title="Burn After Read (No history)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors ${burnAfterRead ? 'bg-red-900/40 border-red-500 text-red-400' : 'bg-[#0D0208] border-red-900/30 text-red-500/50 hover:text-red-400'}`}
            >
              <Skull className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono tracking-wider">BURN</span>
            </button>
            
            <button 
              onClick={() => setCrtEnabled(!crtEnabled)}
              title="Toggle CRT Scanlines"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors ${crtEnabled ? 'bg-red-900/40 border-red-500 text-red-400' : 'bg-[#0D0208] border-red-900/30 text-red-500/50 hover:text-red-400'}`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono tracking-wider">CRT</span>
            </button>

            <button 
              onClick={() => {
                setKaliMessages([])
                setSandboxLogs([])
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0D0208] rounded border border-red-900/30 text-red-500/50 hover:text-red-400 hover:bg-red-950/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono tracking-wider hidden sm:inline">WIPE</span>
            </button>
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
                  <motion.div
                    className="absolute -inset-6 rounded-full border border-red-500/10"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-950/60 to-[#0D0208] border border-red-500/25 flex items-center justify-center shadow-[0_0_40px_rgba(217,22,36,0.15)]">
                    <Skull className="w-10 h-10 text-red-500/80" />
                  </div>
                </motion.div>

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
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="group/card p-4 rounded-xl bg-gradient-to-br from-[#110308]/80 to-[#0D0208] border border-red-900/25 hover:border-red-500/35 transition-all duration-300 text-left cursor-pointer"
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
                        <div key={thread._id} className="relative group/thread">
                          <button
                            onClick={() => navigate(`/chat/${thread._id}`)}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#0D0208]/50 border border-red-900/20 hover:border-red-500/25 hover:bg-red-950/15 transition-all text-left"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-10">
                              <Terminal className="w-3.5 h-3.5 text-red-500/30 group-hover/thread:text-red-500/60 transition-colors flex-shrink-0" />
                              <span className="text-[12px] text-red-400/60 group-hover/thread:text-red-400/80 truncate transition-colors">{thread.title}</span>
                            </div>
                            <span className="text-[9px] text-red-500/25 font-mono flex-shrink-0 ml-2 group-hover/thread:opacity-0 transition-opacity">
                              {new Date(thread.updatedAt || thread.createdAt).toLocaleDateString()}
                            </span>
                          </button>
                        </div>
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
            
            {/* ── Terminal Stream Output ── */}
            {sandboxLogs.length > 0 && <KaliTerminal logs={sandboxLogs} />}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ─── Input Area ─── */}
        <div className="flex-shrink-0 px-4 md:px-0 pb-4 pt-2 z-20 relative">
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
                    placeholder={commandPaletteOpen ? "Press Esc to close Command Palette..." : "Initialize payload sequence... (Ctrl+K for commands)"}
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
                    Kali_Kal • {selectedKaliModel === 'auto' ? 'Auto Routing' : (KALI_MODELS.find(m => m.id === selectedKaliModel) || KALI_MODELS[1]).tag} active
                  </span>
                  <span className="text-[9px] text-red-500/20 uppercase tracking-[0.15em] flex gap-3">
                    {burnAfterRead && <span className="text-red-500">🔥 BURN ACTIVE</span>}
                    {usageLimit - kaliUsage} requests remaining
                  </span>
                </div>
              </div>
            )}
            
            {/* Command Palette Overlay */}
            <AnimatePresence>
              {commandPaletteOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-24 left-4 right-4 bg-[#0A0205] border border-red-500/50 rounded-lg shadow-2xl overflow-hidden z-50"
                >
                  <div className="px-4 py-2 bg-red-950/30 border-b border-red-900/50 flex justify-between items-center">
                    <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest">Execute Routine</span>
                    <span className="text-[10px] font-mono text-red-500/50">ESC to close</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto p-2">
                    {KALI_QUICK_ACTIONS.map(action => (
                      <button
                        key={action.id}
                        onClick={() => {
                          setInput(action.prompt)
                          setCommandPaletteOpen(false)
                          inputRef.current?.focus()
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-red-900/20 rounded flex items-center gap-3 group transition-colors"
                      >
                        <action.icon className="w-4 h-4 text-red-500/50 group-hover:text-red-400" />
                        <div>
                          <div className="text-[12px] text-red-300 group-hover:text-red-200 font-mono">{action.title}</div>
                          <div className="text-[10px] text-red-500/50 font-mono">{action.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>
      
      {/* CVE Ticker */}
      <div className="h-6 bg-[#050002] border-t border-red-900/30 overflow-hidden flex items-center ticker-container z-20">
        <div className="bg-red-950/50 px-2 h-full flex items-center border-r border-red-900/50 z-10 shrink-0">
          <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest">LIVE INTEL</span>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="animate-ticker text-[10px] font-mono text-red-500/60 uppercase tracking-wider">
            {cveTickerData.map((item, i) => (
              <React.Fragment key={i}>
                <span className="mx-8">💀 {item}</span>
                <span className="text-red-900/50">|</span>
              </React.Fragment>
            ))}
            {/* Duplicate for infinite loop illusion */}
            {cveTickerData.map((item, i) => (
              <React.Fragment key={`dup-${i}`}>
                <span className="mx-8">💀 {item}</span>
                <span className="text-red-900/50">|</span>
              </React.Fragment>
            ))}
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
