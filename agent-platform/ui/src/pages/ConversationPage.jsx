/**
 * ConversationPage — Antigravity-style main chat interface
 *
 * Layout (matching your Antigravity screenshots):
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ [CodeVaa] [←] [→]    │  [File] [View] [Window]    │ [Install IDE] │
 * ├───────────────────────┼─────────────────────────────┼───────────────┤
 * │ [+ New Conversation]  │  📁 project_name ▼          │               │
 * │ [🔁 Conversation Hist]│                             │               │
 * │ [⏰ Scheduled Tasks]  │                             │               │
 * │                       │  ┌─────────────────────────┐│               │
 * │ Projects:             │  │ Ask anything, @ to      ││               │
 * │  📁 project1          │  │ mention, / for actions  ││               │
 * │   ├─ Conv 1   3d     │  │ ┌─────────────────────┐ ││               │
 * │   └─ Conv 2   4d     │  │ │+ Gemini 3.6 Flash▾│→│ ││               │
 * │  📁 project2          │  │ └─────────────────────┘ ││               │
 * │   └─ Conv 3   1mo    │  │ 📁 Local ▼               ││               │
 * │                       │  └─────────────────────────┘│               │
 * │ [Settings]            │                             │               │
 * └───────────────────────┴─────────────────────────────┴───────────────┘
 */
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlatformStore } from '../store/platformStore.js'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import clsx from 'clsx'
import {
  Plus, RotateCcw, Clock, FolderOpen, ChevronDown, ChevronRight,
  Send, ArrowDown, Paperclip, AtSign, Slash, Loader, Square,
  MessageSquare, MoreHorizontal, Trash2, Pin, Archive, Settings,
  ExternalLink, Zap, Circle, Search
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
// MODELS AVAILABLE
// ═══════════════════════════════════════════════════════════════════════════
const AVAILABLE_MODELS = [
  { id: 'auto',              name: 'Auto',                   badge: null },
  { id: 'codeva/ravan',      name: 'Ravan',                  badge: 'High' },
  { id: 'codeva/madhav',     name: 'Madhav',                 badge: 'High' },
  { id: 'codeva/chanakya',   name: 'Chanakya',               badge: 'High' },
  { id: 'codeva/arjun',      name: 'Arjun',                  badge: 'Fast' },
  { id: 'codeva/bheem',      name: 'Bheem',                  badge: 'Fast' },
  { id: 'codeva/panchayat',  name: 'Panchayat (Council)',    badge: 'Max' },
]

export default function ConversationPage({ onOpenSettings, onLogout, user }) {
  const {
    runGoal, cancelSession, sessionStatus, result, connected,
    tasks, agentTokens, activeSession
  } = usePlatformStore()

  const [messages, setMessages]         = useState([])
  const [input, setInput]               = useState('')
  const [selectedModel, setSelectedModel] = useState('auto')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const [activeProject, setActiveProject] = useState(null)
  const [conversations, setConversations] = useState(() => loadConversations())
  const [activeConvId, setActiveConvId]   = useState(null)
  const [isStreaming, setIsStreaming]     = useState(false)

  const messagesEndRef = useRef(null)
  const textareaRef    = useRef(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, agentTokens])

  // When result arrives, add it to messages
  useEffect(() => {
    if (result && isStreaming) {
      setMessages(prev => [...prev, { role: 'assistant', content: result, timestamp: Date.now() }])
      setIsStreaming(false)
    }
  }, [result])

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return

    const userMsg = { role: 'user', content: input.trim(), timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsStreaming(true)

    // Run via the platform
    runGoal(input.trim(), { projectPath: activeProject?.path, maxParallel: 4 })

    // Save conversation
    const conv = {
      id: activeConvId || crypto.randomUUID(),
      title: input.trim().slice(0, 50),
      project: activeProject?.name || 'No Project',
      lastMessage: Date.now(),
      messages: [...messages, userMsg],
    }
    saveConversation(conv)
    setActiveConvId(conv.id)
    setConversations(loadConversations())
  }, [input, isStreaming, activeProject, messages, activeConvId])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const startNewConversation = () => {
    setMessages([])
    setActiveConvId(null)
    setIsStreaming(false)
    textareaRef.current?.focus()
  }

  const loadConversation = (conv) => {
    setActiveConvId(conv.id)
    setMessages(conv.messages || [])
    setIsStreaming(false)
  }

  // Group conversations by project
  const projects = groupByProject(conversations)

  return (
    <div className="flex h-full overflow-hidden">
      {/* ═══════ LEFT SIDEBAR ═══════ */}
      <div className="w-60 flex-shrink-0 bg-surface border-r border-border flex flex-col">
        {/* Top actions */}
        <div className="p-3 space-y-1">
          <button
            onClick={startNewConversation}
            className="w-full btn-primary flex items-center justify-center gap-2 py-2.5"
          >
            <Plus size={14} />
            New Conversation
          </button>
          <button className="w-full btn-ghost flex items-center gap-2 text-xs py-2">
            <RotateCcw size={12} />
            Conversation History
          </button>
          <button className="w-full btn-ghost flex items-center gap-2 text-xs py-2">
            <Clock size={12} />
            Scheduled Tasks
          </button>
        </div>

        {/* Projects & Conversations */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs text-muted uppercase tracking-wider font-semibold">Projects</span>
            <div className="flex gap-1">
              <button className="text-muted hover:text-white p-0.5"><Search size={11} /></button>
              <button className="text-muted hover:text-white p-0.5"><RotateCcw size={11} /></button>
            </div>
          </div>

          {Object.entries(projects).map(([project, convs]) => (
            <ProjectGroup
              key={project}
              project={project}
              conversations={convs}
              activeConvId={activeConvId}
              onSelect={loadConversation}
            />
          ))}

          {Object.keys(projects).length === 0 && (
            <div className="text-xs text-muted text-center py-8 px-4">
              No conversations yet.<br />Start by typing a message below.
            </div>
          )}
        </div>

        {/* Bottom — Settings */}
        <div className="p-3 border-t border-border">
          <button
            onClick={() => onOpenSettings?.()}
            className="w-full flex items-center gap-2 text-xs text-muted hover:text-white py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Settings size={12} />
            Settings
          </button>
        </div>
      </div>

      {/* ═══════ MAIN CHAT AREA ═══════ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar — Project selector + Install IDE */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="relative">
            <button
              onClick={() => setShowProjectPicker(v => !v)}
              className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
            >
              <FolderOpen size={13} />
              <span>{activeProject?.name || 'No Project'}</span>
              <ChevronDown size={11} />
            </button>

            <AnimatePresence>
              {showProjectPicker && (
                <ProjectPicker
                  projects={Object.keys(projects)}
                  active={activeProject?.name}
                  onSelect={(name) => { setActiveProject({ name, path: '' }); setShowProjectPicker(false) }}
                  onClose={() => setShowProjectPicker(false)}
                />
              )}
            </AnimatePresence>
          </div>

          <button className="flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors">
            <Zap size={11} />
            Install IDE
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && !isStreaming && (
            <EmptyState />
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center flex-shrink-0 mt-1">
                <Zap size={12} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <StreamingContent tasks={tasks} agentTokens={agentTokens} sessionStatus={sessionStatus} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-4 pb-4 pt-2">
          <div className="bg-surface border border-border rounded-2xl overflow-hidden transition-colors focus-within:border-accent/50">
            {/* Textarea */}
            <div className="px-4 pt-3 pb-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything, @ to mention, / for actions"
                rows={1}
                className="w-full bg-transparent text-sm text-white placeholder-muted resize-none focus:outline-none leading-relaxed"
                style={{ minHeight: '24px', maxHeight: '120px' }}
                onInput={(e) => {
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                }}
              />
            </div>

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-3 py-2">
              {/* Left: attachments, mentions, slash commands */}
              <div className="flex items-center gap-1">
                <button className="p-1.5 text-muted hover:text-white rounded-md hover:bg-white/5 transition-colors" title="Attach file">
                  <Plus size={14} />
                </button>
              </div>

              {/* Right: model picker + send */}
              <div className="flex items-center gap-2">
                {/* Model selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowModelPicker(v => !v)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-muted hover:text-white hover:bg-white/5 border border-border transition-colors"
                  >
                    <Circle size={6} fill="#D97757" className="text-accent" />
                    {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || 'Auto'}
                    {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.badge && (
                      <span className="text-accent text-[10px]">
                        {AVAILABLE_MODELS.find(m => m.id === selectedModel).badge}
                      </span>
                    )}
                    <ChevronDown size={9} />
                  </button>

                  <AnimatePresence>
                    {showModelPicker && (
                      <ModelPicker
                        models={AVAILABLE_MODELS}
                        selected={selectedModel}
                        onSelect={(id) => { setSelectedModel(id); setShowModelPicker(false) }}
                        onClose={() => setShowModelPicker(false)}
                      />
                    )}
                  </AnimatePresence>
                </div>

                {/* Context indicator */}
                <button className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted hover:text-white hover:bg-white/5 border border-border transition-colors">
                  <FolderOpen size={10} />
                  Local
                  <ChevronDown size={9} />
                </button>

                {/* Send / Stop */}
                {isStreaming ? (
                  <button
                    onClick={() => { cancelSession(); setIsStreaming(false) }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-danger/20 text-danger hover:bg-danger/30 transition-colors"
                  >
                    <Square size={12} />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || !connected}
                    className={clsx(
                      'w-7 h-7 flex items-center justify-center rounded-lg transition-all',
                      input.trim() && connected
                        ? 'bg-accent text-white hover:bg-accent2'
                        : 'bg-border text-muted cursor-not-allowed'
                    )}
                  >
                    {input.trim() ? <Send size={12} /> : <ArrowDown size={12} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-accent2/20 border border-accent/30 flex items-center justify-center mb-4">
        <Zap size={20} className="text-accent" />
      </div>
      <h2 className="text-lg font-semibold text-white mb-1">CodeVaa Agent Platform</h2>
      <p className="text-sm text-muted max-w-md">
        Ask anything, @ to mention a file, / for actions. Your agent team will plan, execute, and deliver autonomously.
      </p>
    </div>
  )
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <div className={clsx('flex items-start gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={clsx(
        'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-1',
        isUser
          ? 'bg-accent/20 border border-accent/30'
          : 'bg-gradient-to-br from-accent to-accent2'
      )}>
        {isUser
          ? <span className="text-xs text-accent font-bold">U</span>
          : <Zap size={12} className="text-white" />
        }
      </div>

      {/* Content */}
      <div className={clsx('flex-1 min-w-0', isUser && 'text-right')}>
        <div className={clsx(
          'inline-block max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-accent/10 border border-accent/20 text-white text-left'
            : 'bg-surface border border-border text-white/90 text-left'
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StreamingContent({ tasks, agentTokens, sessionStatus }) {
  const taskList   = Object.values(tasks)
  const isPlanning = sessionStatus === 'planning'
  const running    = taskList.filter(t => t.status === 'running')
  const completed  = taskList.filter(t => t.status === 'completed')

  // Combine all streaming tokens
  const allTokens = Object.values(agentTokens).join('')

  return (
    <div className="space-y-2">
      {isPlanning && (
        <div className="flex items-center gap-2 text-xs text-accent animate-pulse">
          <Loader size={11} className="animate-spin" />
          Planning your request...
        </div>
      )}

      {taskList.length > 0 && (
        <div className="text-xs text-muted">
          {completed.length}/{taskList.length} tasks complete
          {running.length > 0 && ` · ${running.length} running`}
        </div>
      )}

      {running.map(task => (
        <div key={task.id} className="text-xs">
          <div className="flex items-center gap-1.5 text-accent mb-1">
            <Loader size={10} className="animate-spin" />
            <span className="font-medium">{task.title}</span>
          </div>
        </div>
      ))}

      {allTokens && (
        <div className="bg-black/20 rounded-xl px-3 py-2 text-sm text-white/80 font-mono leading-relaxed streaming-cursor whitespace-pre-wrap">
          {allTokens.slice(-1500)}
        </div>
      )}

      {sessionStatus === 'synthesizing' && (
        <div className="flex items-center gap-2 text-xs text-accent animate-pulse">
          <Loader size={11} className="animate-spin" />
          Synthesizing results from all agents...
        </div>
      )}
    </div>
  )
}

function ProjectGroup({ project, conversations, activeConvId, onSelect }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-white/70 hover:text-white rounded-md hover:bg-white/5 transition-colors"
      >
        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <FolderOpen size={11} className="text-muted" />
        <span className="font-medium truncate">{project}</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden pl-5 space-y-0.5"
          >
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={clsx(
                  'w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors',
                  activeConvId === conv.id
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted hover:text-white hover:bg-white/5'
                )}
              >
                <span className="truncate max-w-[140px]">{conv.title}</span>
                <span className="text-[10px] text-muted/50 flex-shrink-0">{formatAge(conv.lastMessage)}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ProjectPicker({ projects, active, onSelect, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="absolute top-full left-0 mt-1 w-56 bg-surface border border-border rounded-xl shadow-xl z-50 py-2 overflow-hidden"
    >
      <div className="px-3 py-1.5">
        <input className="input w-full text-xs" placeholder="Search" />
      </div>
      <div className="max-h-48 overflow-y-auto py-1">
        {projects.map(p => (
          <button
            key={p}
            onClick={() => onSelect(p)}
            className={clsx(
              'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-white/5 transition-colors',
              active === p ? 'text-accent' : 'text-white/80'
            )}
          >
            <div className="flex items-center gap-2">
              <FolderOpen size={12} className="text-muted" />
              {p}
            </div>
            {active === p && <span className="text-accent">✓</span>}
          </button>
        ))}
        <hr className="border-border my-1" />
        <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted hover:text-white hover:bg-white/5">
          <Plus size={11} /> New Project
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted hover:text-white hover:bg-white/5">
          <Zap size={11} /> Quick Start
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted hover:text-white hover:bg-white/5">
          <FolderOpen size={11} /> No Project
        </button>
      </div>
    </motion.div>
  )
}

function ModelPicker({ models, selected, onSelect, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="absolute bottom-full right-0 mb-1 w-52 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden"
    >
      {models.map(m => (
        <button
          key={m.id}
          onClick={() => onSelect(m.id)}
          className={clsx(
            'w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-white/5 transition-colors',
            selected === m.id ? 'text-accent' : 'text-white/80'
          )}
        >
          <span>{m.name}</span>
          <div className="flex items-center gap-1.5">
            {m.badge && <span className="badge bg-accent/10 text-accent text-[10px]">{m.badge}</span>}
            {selected === m.id && <span className="text-accent">✓</span>}
          </div>
        </button>
      ))}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatAge(timestamp) {
  if (!timestamp) return ''
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  return `${months}mo`
}

function groupByProject(conversations) {
  const groups = {}
  for (const conv of conversations) {
    const project = conv.project || 'No Project'
    if (!groups[project]) groups[project] = []
    groups[project].push(conv)
  }
  // Sort each group by most recent
  for (const key in groups) {
    groups[key].sort((a, b) => (b.lastMessage || 0) - (a.lastMessage || 0))
  }
  return groups
}

function loadConversations() {
  try {
    return JSON.parse(localStorage.getItem('codeva_conversations') || '[]')
  } catch { return [] }
}

function saveConversation(conv) {
  const all = loadConversations()
  const idx = all.findIndex(c => c.id === conv.id)
  if (idx >= 0) all[idx] = conv
  else all.unshift(conv)
  // Keep last 100
  localStorage.setItem('codeva_conversations', JSON.stringify(all.slice(0, 100)))
}
