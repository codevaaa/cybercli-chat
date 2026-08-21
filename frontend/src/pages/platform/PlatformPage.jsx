/**
 * PlatformPage — Main Agent Platform interface (Kiro Web + Antigravity hybrid).
 *
 * Layout:
 *   - Left sidebar: Logo, Automations, + New session, Sessions list, user avatar
 *   - Center: Chat/agent streaming area with messages
 *   - Input: Task input with model selector and controls
 *
 * Connects to agent-platform backend at localhost:4000 via WebSocket
 * for real-time agent execution streaming.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@stores/authStore.js'
import { getFreshToken } from '@lib/api.js'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const PLATFORM_WS  = import.meta.env.VITE_PLATFORM_WS || (window.location.hostname === 'localhost' ? 'ws://localhost:4000/ws' : 'wss://codeva-agent-platform.onrender.com/ws')
const PLATFORM_API = import.meta.env.VITE_PLATFORM_API || (window.location.hostname === 'localhost' ? 'http://localhost:4000/api' : 'https://codeva-agent-platform.onrender.com/api')

const MODELS = [
  { id: 'auto', name: 'Auto' },
  { id: 'codeva/ravan', name: 'Ravan' },
  { id: 'codeva/madhav', name: 'Madhav' },
  { id: 'codeva/chanakya', name: 'Chanakya' },
  { id: 'codeva/arjun', name: 'Arjun' },
  { id: 'codeva/panchayat', name: 'Panchayat (Council)' },
]

export default function PlatformPage() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()
  const { user }       = useAuthStore()

  // State
  const [ws, setWs]               = useState(null)
  const [connected, setConnected] = useState(false)
  const [sessions, setSessions]   = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [model, setModel]         = useState('auto')
  const [isRunning, setIsRunning] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [taskProgress, setTaskProgress]   = useState({ total: 0, completed: 0, running: 0 })
  const [status, setStatus]       = useState('idle') // idle, planning, running, synthesizing, completed

  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamContent])

  // WebSocket connection
  useEffect(() => {
    const socket = new WebSocket(PLATFORM_WS)

    socket.onopen = () => {
      setConnected(true)
      console.log('[Platform WS] Connected')
    }

    socket.onclose = () => {
      setConnected(false)
      // Auto-reconnect
      setTimeout(() => {
        setWs(new WebSocket(PLATFORM_WS))
      }, 3000)
    }

    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        handleWSMessage(msg)
      } catch {}
    }

    setWs(socket)
    return () => socket.close()
  }, [])

  // Handle initial goal from URL params (from PlatformWelcome)
  useEffect(() => {
    const goal = searchParams.get('goal')
    if (goal && connected && ws) {
      setInput('')
      runGoal(goal)
    }
  }, [searchParams, connected])

  // ── WebSocket Message Handler ─────────────────────────────────────────────
  const handleWSMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'orchestrator:planning':
        setStatus('planning')
        setStreamContent('')
        break
      case 'orchestrator:graph_ready':
        setStatus('running')
        setTaskProgress({ total: msg.tasks?.length || msg.stats?.total || 0, completed: 0, running: 0 })
        break
      case 'task:started':
        setTaskProgress(p => ({ ...p, running: p.running + 1 }))
        break
      case 'agent:token':
        setStreamContent(prev => prev + (msg.token || ''))
        break
      case 'task:completed':
        setTaskProgress(p => ({ ...p, completed: p.completed + 1, running: Math.max(0, p.running - 1) }))
        break
      case 'task:failed':
        setTaskProgress(p => ({ ...p, running: Math.max(0, p.running - 1) }))
        break
      case 'orchestrator:synthesizing':
        setStatus('synthesizing')
        break
      case 'orchestrator:completed':
        setStatus('completed')
        setIsRunning(false)
        setMessages(prev => [...prev, { role: 'assistant', content: msg.result || streamContent }])
        setStreamContent('')
        break
      case 'orchestrator:failed':
      case 'orchestrator:error':
        setStatus('idle')
        setIsRunning(false)
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${msg.error || 'Unknown error'}`, isError: true }])
        setStreamContent('')
        break
      case 'pong':
        break
    }
  }, [streamContent])

  // ── Run a goal ─────────────────────────────────────────────────────────────
  const runGoal = useCallback((goalText) => {
    if (!ws || ws.readyState !== 1) return

    const sessionId = crypto.randomUUID()
    setActiveSession(sessionId)
    setIsRunning(true)
    setStatus('planning')
    setStreamContent('')
    setTaskProgress({ total: 0, completed: 0, running: 0 })

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: goalText }])

    // Send to platform
    ws.send(JSON.stringify({
      type:        'run',
      sessionId,
      goal:        goalText,
      projectPath: '', // TODO: from selected repository
      maxParallel: 4,
    }))

    // Save session
    setSessions(prev => [{ id: sessionId, goal: goalText, time: Date.now() }, ...prev])
  }, [ws])

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!input.trim() || isRunning) return
    runGoal(input.trim())
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="h-screen flex bg-[var(--bg-primary)]">
      {/* ═══ LEFT SIDEBAR ═══ */}
      <aside className="w-[260px] border-r border-[var(--border-subtle)] flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 flex items-center gap-2">
          <img src="/favicon.svg" alt="CodeVaa" className="w-6 h-6" />
          <span className="font-bold text-sm text-[var(--text-primary)]">CODEVAA</span>
          <span className="text-[10px] text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded">preview</span>
        </div>

        <div className="px-4">
          <button className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-1.5 transition-colors">
            Automations
          </button>
        </div>

        {/* New session */}
        <div className="px-4 mt-4">
          <button
            onClick={() => { setMessages([]); setStreamContent(''); setStatus('idle'); inputRef.current?.focus() }}
            className="flex items-center gap-2 text-sm text-[var(--text-primary)] hover:text-[var(--accent)] py-1.5 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New session
          </button>
        </div>

        {/* Sessions list */}
        <div className="px-4 mt-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--text-secondary)]">Sessions</span>
            <button className="text-xs text-[var(--accent)] hover:underline">Show all</button>
          </div>
          <div className="space-y-1">
            {sessions.slice(0, 10).map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSession(s.id)}
                className={`w-full text-left text-xs px-2 py-1.5 rounded-lg truncate transition-colors ${activeSession === s.id ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}
              >
                {s.goal?.slice(0, 40) || 'Session'}
              </button>
            ))}
          </div>
        </div>

        {/* User footer */}
        <div className="px-4 py-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold">
              {(user?.email || 'U')[0].toUpperCase()}
            </div>
            <span className="text-xs text-[var(--text-secondary)] truncate flex-1">{user?.email || 'user@codeva.ai'}</span>
            <button
              onClick={() => navigate('/platform/settings')}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.28.47.78.81 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 && !isRunning && (
            <div className="h-full flex flex-col items-center justify-center">
              <img src="/favicon.svg" alt="" className="w-12 h-12 opacity-60 mb-4" />
              <h2 className="text-xl text-[var(--accent)] font-medium mb-2">What can I help you with?</h2>
              <p className="text-sm text-[var(--text-muted)]">Describe a task and your agent team will execute it.</p>
            </div>
          )}

          <div className="max-w-[720px] mx-auto space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? '' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-[var(--accent)]/20' : 'bg-[var(--bg-tertiary)]'}`}>
                  {msg.role === 'user'
                    ? <span className="text-xs text-[var(--accent)] font-bold">{(user?.email || 'U')[0].toUpperCase()}</span>
                    : <img src="/favicon.svg" alt="" className="w-4 h-4" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  {msg.role === 'user' ? (
                    <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className={`text-sm leading-relaxed ${msg.isError ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming content */}
            {isRunning && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full flex-shrink-0 bg-[var(--bg-tertiary)] flex items-center justify-center">
                  <img src="/favicon.svg" alt="" className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <div className="flex-1 min-w-0">
                  {/* Status indicator */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                    <span className="text-xs text-[var(--text-muted)]">
                      {status === 'planning' && 'Planning your task...'}
                      {status === 'running' && `Running: ${taskProgress.completed}/${taskProgress.total} tasks complete`}
                      {status === 'synthesizing' && 'Synthesizing results...'}
                    </span>
                  </div>

                  {/* Stream output */}
                  {streamContent && (
                    <div className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamContent}</ReactMarkdown>
                      <span className="inline-block w-0.5 h-4 bg-[var(--accent)] animate-pulse ml-0.5" />
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="px-6 pb-6 pt-2">
          <form onSubmit={handleSubmit} className="max-w-[720px] mx-auto">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-2xl overflow-hidden focus-within:border-[var(--accent)]/50 transition-colors">
              <div className="px-4 pt-3 pb-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isRunning}
                  placeholder={isRunning ? 'Agent is working...' : 'Ask a question or describe a task...'}
                  className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none disabled:opacity-50"
                />
              </div>
              <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/></svg>
                    {MODELS.find(m => m.id === model)?.name || 'Auto'}
                  </span>
                  {!connected && <span className="text-[var(--warning)]">● Offline</span>}
                  {connected && <span className="text-[var(--success)]">● Connected</span>}
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isRunning || !connected}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${input.trim() && !isRunning && connected ? 'bg-[var(--accent)] text-white' : 'bg-[var(--border-medium)] text-[var(--text-muted)] cursor-not-allowed'}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <footer className="px-6 py-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <img src="/favicon.svg" alt="" className="w-4 h-4 opacity-40" />
          <div className="flex gap-3 text-[10px] text-[var(--text-muted)]">
            <a href="/terms-of-service" className="hover:text-[var(--text-secondary)]">Site Terms</a>
            <a href="/privacy-policy" className="hover:text-[var(--text-secondary)]">Privacy Policy</a>
          </div>
        </footer>
      </main>
    </div>
  )
}
