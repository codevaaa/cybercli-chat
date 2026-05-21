import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Plus, Search, MessageSquare, FolderOpen, Layers, Code2, Sliders,
  ChevronLeft, ChevronRight, ChevronDown, Mic, Paperclip, Radio,
  Copy, Check, GitBranch, Volume2, VolumeX, Trash2, Pin, X,
  Download, Zap, Settings, AlertCircle, Globe, Terminal, Image as ImageIcon, Brain, Folder,
  Play, Key, RefreshCw, Ghost, LogOut, HelpCircle, ArrowUpCircle, Info
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import api from '../../lib/api.js'
import { useTTS } from '../../hooks/useTTS.js'
import VoiceChatModal from '../../components/chat/VoiceChatModal.jsx'
import { useAuthStore } from '@stores/authStore.js'

// ─── Constants ──────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

const MODELS = [
  { id: 'groq/llama-3.1-8b',        name: 'Cyber-Fast',       tag: 'Fast',     color: '#10B981', desc: 'Optimized for speed and quick everyday responses.' },
  { id: 'gemini/gemini-2.5-flash',  name: 'Cyber-Balanced',   tag: 'Balanced', color: '#3B82F6', desc: 'Balanced response, ideal for rich multi-turn reasoning.' },
  { id: 'openrouter/gpt-4o-mini',   name: 'Cyber-Mini',        tag: 'Capable',  color: '#8B5CF6', desc: 'Broad intelligence with highly optimized coding capability.' },
  { id: 'groq/llama-3.1-70b',       name: 'Cyber-Smart',      tag: 'Smart',    color: '#F59E0B', desc: 'Deep problem-solving and structured logical analysis.' },
  { id: 'council',                  name: 'Cyber-Council',    tag: 'Debate',   color: '#D97757', desc: 'Simultaneous multi-model consensus debate engine.' },
]

const QUICK_ACTIONS = [
  { label: '</> Code',    value: 'Help me write code for ' },
  { label: 'Learn',       value: 'Explain the concept of ' },
  { label: 'Create',      value: 'Help me create ' },
  { label: 'Write',       value: 'Write a ' },
  { label: 'Life stuff',  value: 'Give me advice on ' },
]

const NAV_ITEMS = [
  { id: 'search',    label: 'Search',    icon: Search        },
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

// ─── Code Block with Sandboxed Execution ─────────────────────────────────────

function CodeBlock({ language, value, codeExecutionEnabled }) {
  const [copied, setCopied] = useState(false)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState(null)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRun = async () => {
    setRunning(true)
    setRunResult(null)
    try {
      const { data } = await api.post('/execute', { code: value, language: 'javascript' })
      setRunResult(data)
    } catch (err) {
      console.error('Code execution error:', err)
      setRunResult({
        success: false,
        output: err.response?.data?.error || err.message || 'Execution failed.'
      })
    } finally {
      setRunning(false)
    }
  }

  const isJS = language === 'javascript' || language === 'js'

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-border-subtle">
      <div className="flex items-center justify-between px-4 py-2 bg-background-tertiary border-b border-border-subtle">
        <span className="text-xs font-mono text-foreground-muted">{language || 'code'}</span>
        <div className="flex items-center gap-3">
          {codeExecutionEnabled && isJS && (
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-1 text-xs text-accent hover:text-accent-light font-medium transition-colors"
            >
              {running ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {running ? 'Running...' : 'Run Code'}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground-primary transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: 0, background: '#1a1a1a', fontSize: '0.8125rem' }}
        showLineNumbers={value.split('\n').length > 3}
      >
        {value}
      </SyntaxHighlighter>

      {/* Console output display */}
      {runResult && (
        <div className="border-t border-border-subtle bg-[#0c0c10]/95 p-3.5 font-mono text-xs text-left">
          <div className="flex items-center justify-between text-[10px] text-foreground-muted uppercase tracking-wider font-bold mb-2 pb-1.5 border-b border-white/[0.04]">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              Console Output
            </span>
            <button onClick={() => setRunResult(null)} className="hover:text-foreground-primary">Clear</button>
          </div>
          {runResult.success ? (
            <div className="text-emerald-400 font-semibold mb-1 text-[11px] flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              ✓ Program executed successfully
            </div>
          ) : (
            <div className="text-rose-400 font-semibold mb-1 text-[11px] flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              ✗ Program execution failed
            </div>
          )}
          <pre className="whitespace-pre-wrap text-gray-200 bg-black/30 p-2.5 rounded-lg border border-white/[0.03] max-h-48 overflow-y-auto leading-relaxed">{runResult.output}</pre>
        </div>
      )}
    </div>
  )
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg, index, isStreaming, onCopy, onSpeak, onFork, onStop, ttsLoading, isPlaying, copied, codeExecutionEnabled }) {
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
          <div className="text-sm leading-relaxed text-foreground-primary prose-custom w-full">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  if (!inline && match) {
                    return (
                      <CodeBlock
                        language={match[1]}
                        value={String(children).replace(/\n$/, '')}
                        codeExecutionEnabled={codeExecutionEnabled}
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
  const selectedIndex = MODELS.findIndex(m => m.id === selectedModel)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNext = () => {
    const nextIdx = (selectedIndex + 1) % MODELS.length
    onSelect(MODELS[nextIdx].id)
  }

  const handlePrev = () => {
    const prevIdx = (selectedIndex - 1 + MODELS.length) % MODELS.length
    onSelect(MODELS[prevIdx].id)
  }

  const handleWheel = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.deltaY > 0) {
      handleNext()
    } else {
      handlePrev()
    }
  }

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
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-full mb-3 right-0 w-[290px] rounded-2xl border border-border-subtle shadow-2xl p-4 z-50 overflow-hidden flex flex-col items-center gap-3"
            style={{ 
              background: 'rgba(15, 15, 20, 0.95)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.05), 0 0 30px rgba(217, 119, 87, 0.05)'
            }}
          >
            {/* Holographic background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full pointer-events-none filter blur-[40px] opacity-15"
              style={{ background: `radial-gradient(circle, ${selected.color}, transparent)` }} />

            <div className="w-full flex items-center justify-between border-b border-white/[0.06] pb-2 flex-shrink-0 z-10">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">3D Intel Selector</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider" style={{ background: `${selected.color}15`, color: selected.color }}>
                {selected.tag}
              </span>
            </div>

            {/* 3D Cylinder View Container */}
            <div 
              onWheel={handleWheel}
              className="relative w-full h-[150px] flex items-center justify-center select-none overflow-hidden rounded-xl border border-white/[0.02]"
              style={{ 
                perspective: '600px', 
                transformStyle: 'preserve-3d',
                background: 'rgba(0, 0, 0, 0.2)' 
              }}
            >
              {/* Cycling arrows */}
              <button 
                onClick={handlePrev}
                className="absolute top-2 z-20 p-1 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5 rotate-180" />
              </button>

              {/* 3D Cylinder Body */}
              <motion.div
                animate={{ rotateX: selectedIndex * 36 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="w-full h-full relative flex items-center justify-center"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {MODELS.map((model, i) => {
                  const angle = -i * 36; // degrees
                  const translateZ = 95; // px distance from center of cylinder
                  const isSelected = i === selectedIndex;
                  const diff = Math.abs(i - selectedIndex);
                  
                  // Only render items close to viewport to avoid overlap issues
                  const isVisible = diff <= 2 || diff === MODELS.length - 1 || diff === MODELS.length - 2;

                  return (
                    <div
                      key={model.id}
                      onClick={() => onSelect(model.id)}
                      style={{
                        position: 'absolute',
                        transform: `rotateX(${angle}deg) translateZ(${translateZ}px)`,
                        transformStyle: 'preserve-3d',
                        backfaceVisibility: 'hidden',
                        opacity: isSelected ? 1 : 0.25 - (diff * 0.05),
                        display: isVisible ? 'flex' : 'none',
                        pointerEvents: isSelected ? 'auto' : 'none',
                      }}
                      className={`w-[210px] items-center justify-between px-3.5 py-2.5 rounded-xl border cursor-pointer transition-all duration-300 ${
                        isSelected 
                          ? 'border-accent bg-accent/10 shadow-[0_0_20px_rgba(217,119,87,0.2)]' 
                          : 'border-white/[0.04] bg-white/[0.01]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: model.color, boxShadow: `0 0 8px ${model.color}` }} />
                        <span className="text-sm font-semibold text-white tracking-wide">{model.name}</span>
                      </div>
                    </div>
                  );
                })}
              </motion.div>

              <button 
                onClick={handleNext}
                className="absolute bottom-2 z-20 p-1 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Model Description Text Box */}
            <div className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl p-2.5 flex-shrink-0 z-10 text-center min-h-[50px] flex items-center justify-center">
              <motion.p 
                key={selected.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[11px] leading-normal font-medium text-gray-400"
              >
                {selected.desc}
              </motion.p>
            </div>
            
            {/* Scroll Indicator */}
            <span className="text-[9px] text-gray-600 font-semibold tracking-wider uppercase select-none pointer-events-none">
              Drag or Scroll Wheel to Navigate
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Input Area ───────────────────────────────────────────────────────────────

function InputArea({
  input,
  setInput,
  onSend,
  loading,
  selectedModel,
  onModelChange,
  onMicClick,
  onWaveformClick,
  webSearchEnabled,
  onToggleWebSearch,
  codeExecutionEnabled,
  onToggleCodeExecution,
  imageGenerationEnabled,
  onToggleImageGeneration,
  memoryEnabled,
  onToggleMemory,
  inlineSpeechListening
}) {
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
        className="rounded-2xl border border-border-subtle transition-all overflow-hidden"
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
          <div className="flex items-center gap-1 flex-shrink-0 flex-wrap sm:flex-nowrap">
            <ModelSelector selectedModel={selectedModel} onSelect={onModelChange} />

            <button
              onClick={onMicClick}
              className={`p-2 rounded-xl transition-all relative ${
                inlineSpeechListening
                  ? 'text-accent bg-accent/10 border border-accent/20'
                  : 'text-foreground-muted hover:text-accent hover:bg-background-tertiary border border-transparent'
              }`}
              title="Voice input (Speech-to-Text)"
            >
              {inlineSpeechListening && (
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  style={{ border: '2px solid #D97757' }}
                  animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
              <Mic className={`w-4 h-4 ${inlineSpeechListening ? 'animate-pulse' : ''}`} />
            </button>

            <button
              onClick={onWaveformClick}
              className="p-2 rounded-xl text-foreground-muted hover:text-foreground-primary hover:bg-background-tertiary transition-all"
              title="Voice-to-Voice Mode"
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

        {/* Divider */}
        <div className="border-t border-border-subtle/40" />

        {/* Capabilities shelf */}
        <div className="px-4 py-2.5 bg-background-tertiary/20 flex items-center gap-4 text-[11px] flex-wrap">
          <span className="text-foreground-muted text-[9px] uppercase font-bold tracking-wider">Capabilities:</span>
          
          <button
            onClick={onToggleWebSearch}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all ${
              webSearchEnabled 
                ? 'border-[#D97757]/30 bg-[#D97757]/10 text-[#D97757] font-medium' 
                : 'border-transparent text-foreground-muted hover:text-foreground-secondary'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Web Search</span>
          </button>

          <button
            onClick={onToggleCodeExecution}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all ${
              codeExecutionEnabled 
                ? 'border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981] font-medium' 
                : 'border-transparent text-foreground-muted hover:text-foreground-secondary'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Code Sandbox</span>
          </button>

          <button
            onClick={onToggleImageGeneration}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all ${
              imageGenerationEnabled 
                ? 'border-[#8B5CF6]/30 bg-[#8B5CF6]/10 text-[#8B5CF6] font-medium' 
                : 'border-transparent text-foreground-muted hover:text-foreground-secondary'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Image Gen</span>
          </button>

          <button
            onClick={onToggleMemory}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all ${
              memoryEnabled 
                ? 'border-[#3B82F6]/30 bg-[#3B82F6]/10 text-[#3B82F6] font-medium' 
                : 'border-transparent text-foreground-muted hover:text-foreground-secondary'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Memory</span>
          </button>
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

// ─── Full Inline Settings Dialog ──────────────────────────────────────────────

const SETTINGS_TABS = [
  { id: 'general',      label: 'General' },
  { id: 'account',      label: 'Account' },
  { id: 'privacy',      label: 'Privacy' },
  { id: 'billing',      label: 'Billing' },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'connectors',   label: 'Connectors' },
  { id: 'api_keys',     label: 'API Keys' },
]

function SettingsDialog({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    display_name: '',
    nickname: '',
    custom_instructions: '',
    appearance: 'system',
    chat_font: 'inter',
    voice: 'ava',
    voice_speed: 'normal',
    notifications_responses: true,
    notifications_dispatch: false,
    web_search_enabled: false,
    code_execution_enabled: false,
    image_generation_enabled: false,
    memory_enabled: false,
  })
  const [apiKeys, setApiKeys] = useState([])
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState(null)
  const [connectorStatus, setConnectorStatus] = useState({ openrouter: false, groq: false, gemini: false })

  useEffect(() => {
    if (!isOpen) return
    api.get('/settings').then(r => {
      setSettings(prev => ({ ...prev, ...r.data }))
    }).catch(console.error)
    api.get('/api-keys').then(r => setApiKeys(r.data || [])).catch(console.error)
  }, [isOpen])

  const patchSetting = async (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaving(true)
    try { await api.patch('/settings', { [key]: value }) } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  const handleBlurSave = async (key, value) => {
    setSaving(true)
    try { await api.patch('/settings', { [key]: value }) } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  const handleGenerateKey = async (e) => {
    e.preventDefault()
    if (!newKeyName.trim()) return
    try {
      const { data } = await api.post('/api-keys', { name: newKeyName })
      setGeneratedKey(data.key)
      setNewKeyName('')
      const r = await api.get('/api-keys')
      setApiKeys(r.data || [])
    } catch (err) { console.error(err) }
  }

  const handleRevokeKey = async (id) => {
    if (!confirm('Revoke this API key?')) return
    try {
      await api.delete(`/api-keys/${id}`)
      setApiKeys(prev => prev.filter(k => k._id !== id))
    } catch (err) { console.error(err) }
  }

  const Toggle = ({ value, onChange }) => (
    <button
      onClick={() => onChange(!value)}
      className={`w-10 h-6 rounded-full transition-all relative flex items-center p-0.5 flex-shrink-0 ${
        value ? 'bg-accent' : 'bg-white/10'
      }`}
    >
      <div className={`w-5 h-5 bg-white rounded-full transition-all shadow ${value ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )

  const Pills = ({ options, value, onChange }) => (
    <div className="flex items-center gap-1">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            value === o.value
              ? 'bg-accent text-white'
              : 'bg-background-tertiary text-foreground-muted hover:text-foreground-primary'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )

  const Row = ({ label, desc, children }) => (
    <div className="flex items-center justify-between py-3.5 border-b border-border-subtle/40 last:border-0">
      <div className="min-w-0 pr-4">
        <p className="text-sm font-medium text-foreground-primary">{label}</p>
        {desc && <p className="text-xs text-foreground-muted mt-0.5">{desc}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )

  const tabContent = {
    general: (
      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-muted mb-3">Profile</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
              style={{ background: 'rgba(217,119,87,0.15)', color: '#D97757' }}>
              {(settings.display_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
            </div>
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={settings.display_name || ''}
                onChange={e => setSettings(p => ({...p, display_name: e.target.value}))}
                onBlur={e => handleBlurSave('display_name', e.target.value)}
                placeholder="Full name"
                className="w-full bg-background-tertiary text-sm text-foreground-primary placeholder:text-foreground-muted border border-border-subtle rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent"
              />
              <input
                type="text"
                value={settings.nickname || ''}
                onChange={e => setSettings(p => ({...p, nickname: e.target.value}))}
                onBlur={e => handleBlurSave('nickname', e.target.value)}
                placeholder="What should CyberCli call you?"
                className="w-full bg-background-tertiary text-sm text-foreground-primary placeholder:text-foreground-muted border border-border-subtle rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <label className="block text-xs font-semibold text-foreground-muted mb-1.5">Custom Instructions</label>
          <textarea
            value={settings.custom_instructions || ''}
            onChange={e => setSettings(p => ({...p, custom_instructions: e.target.value}))}
            onBlur={e => handleBlurSave('custom_instructions', e.target.value)}
            placeholder="e.g. Always respond in concise bullet points. Prefer Python over JS."
            rows={4}
            className="w-full bg-background-tertiary text-sm text-foreground-primary placeholder:text-foreground-muted border border-border-subtle rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent resize-none"
          />
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-muted mb-2">Preferences</h3>
          <Row label="Appearance">
            <Pills
              options={[{label:'System',value:'system'},{label:'Light',value:'light'},{label:'Dark',value:'dark'}]}
              value={settings.appearance || 'system'}
              onChange={v => patchSetting('appearance', v)}
            />
          </Row>
          <Row label="Chat Font">
            <Pills
              options={[{label:'Inter',value:'inter'},{label:'Serif',value:'serif'},{label:'Mono',value:'mono'}]}
              value={settings.chat_font || 'inter'}
              onChange={v => patchSetting('chat_font', v)}
            />
          </Row>
          <Row label="Voice">
            <select
              value={settings.voice || 'ava'}
              onChange={e => patchSetting('voice', e.target.value)}
              className="bg-background-tertiary text-sm text-foreground-primary border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:border-accent"
            >
              {['Ava','Nova','Luna','Orion','Echo'].map(v => <option key={v} value={v.toLowerCase()}>{v}</option>)}
            </select>
          </Row>
          <Row label="Voice Speed">
            <Pills
              options={[{label:'Slow',value:'slow'},{label:'Normal',value:'normal'},{label:'Fast',value:'fast'}]}
              value={settings.voice_speed || 'normal'}
              onChange={v => patchSetting('voice_speed', v)}
            />
          </Row>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-muted mb-2">Notifications</h3>
          <Row label="Response completions" desc="Get notified when long responses finish">
            <Toggle value={!!settings.notifications_responses} onChange={v => patchSetting('notifications_responses', v)} />
          </Row>
          <Row label="Dispatch messages" desc="Notify on queued background completions">
            <Toggle value={!!settings.notifications_dispatch} onChange={v => patchSetting('notifications_dispatch', v)} />
          </Row>
        </div>
      </div>
    ),
    account: (
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-muted mb-3">Account Info</h3>
        <div className="p-4 rounded-xl bg-background-secondary border border-border-subtle space-y-2">
          <p className="text-xs text-foreground-muted">Signed in as</p>
          <p className="text-sm font-medium text-foreground-primary">{localStorage.getItem('user_email') || 'user@example.com'}</p>
        </div>
        <div className="space-y-2">
          <button className="w-full px-4 py-2.5 rounded-xl border border-border-subtle text-sm text-foreground-secondary hover:text-foreground-primary hover:bg-background-secondary transition-all text-left">Change Email</button>
          <button className="w-full px-4 py-2.5 rounded-xl border border-border-subtle text-sm text-foreground-secondary hover:text-foreground-primary hover:bg-background-secondary transition-all text-left">Change Password</button>
          <button className="w-full px-4 py-2.5 rounded-xl border border-rose-500/20 text-sm text-rose-400 hover:bg-rose-500/5 transition-all text-left">Delete Account</button>
        </div>
      </div>
    ),
    privacy: (
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-muted mb-3">Privacy Settings</h3>
        <Row label="Improve AI with your data" desc="Allow CyberCli to use your messages to train models">
          <Toggle value={false} onChange={() => {}} />
        </Row>
        <Row label="Share usage analytics" desc="Send anonymized usage metrics">
          <Toggle value={true} onChange={() => {}} />
        </Row>
        <Row label="Personalized suggestions" desc="Tailor suggestions based on history">
          <Toggle value={true} onChange={() => {}} />
        </Row>
        <div className="pt-4">
          <button className="px-4 py-2.5 rounded-xl border border-rose-500/20 text-sm text-rose-400 hover:bg-rose-500/5 transition-all">Clear All Conversation History</button>
        </div>
      </div>
    ),
    billing: (
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-muted mb-3">Billing &amp; Plan</h3>
        <div className="p-5 rounded-2xl border border-accent/20 bg-accent/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground-primary">Free Plan</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-accent/20 text-accent font-bold">CURRENT</span>
          </div>
          <p className="text-xs text-foreground-muted">50 requests/hr · 8+ providers · All features</p>
        </div>
        <div className="p-5 rounded-2xl border border-border-subtle bg-background-secondary">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground-primary">Pro Plan — $12/mo</span>
          </div>
          <p className="text-xs text-foreground-muted mb-4">500 requests/hr · Priority routing · Early features · Council Mode unlimited</p>
          <button
            onClick={async () => {
              try {
                const { data } = await api.post('/stripe/create-checkout-session', { plan: 'pro' })
                window.location.href = data.url
              } catch(e) { alert('Stripe checkout failed') }
            }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #D97757, #B85D3D)' }}
          >
            Upgrade to Pro →
          </button>
        </div>
      </div>
    ),
    capabilities: (
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-muted mb-3">AI Capabilities</h3>
        <Row label="Web Search" desc="Allow fetching live web results">
          <Toggle value={!!settings.web_search_enabled} onChange={v => patchSetting('web_search_enabled', v)} />
        </Row>
        <Row label="Code Execution" desc="Run JavaScript in a sandboxed environment">
          <Toggle value={!!settings.code_execution_enabled} onChange={v => patchSetting('code_execution_enabled', v)} />
        </Row>
        <Row label="Image Generation" desc="Generate images from AI prompts">
          <Toggle value={!!settings.image_generation_enabled} onChange={v => patchSetting('image_generation_enabled', v)} />
        </Row>
        <Row label="Memory" desc="Remember facts across conversations">
          <Toggle value={!!settings.memory_enabled} onChange={v => patchSetting('memory_enabled', v)} />
        </Row>
        <Row label="Council Mode" desc="Debate answers across multiple AI models">
          <span className="text-xs px-2 py-0.5 rounded-md bg-accent/20 text-accent font-bold">PRO</span>
        </Row>
      </div>
    ),
    connectors: (
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-muted mb-3">AI Provider Connectors</h3>
        {[
          { name: 'OpenRouter', desc: 'GPT-4o, Claude, Mistral and 200+ models', color: '#10B981' },
          { name: 'Groq', desc: 'Ultra-fast Llama inference', color: '#F59E0B' },
          { name: 'Gemini', desc: 'Google Gemini Flash & Pro', color: '#4285F4' },
          { name: 'Cerebras', desc: 'Wafer-scale AI inference', color: '#8B5CF6' },
          { name: 'Cloudflare AI', desc: 'Edge-native model routing', color: '#F97316' },
          { name: 'HuggingFace', desc: '100K+ open source models', color: '#FFD21E' },
        ].map(c => (
          <div key={c.name} className="flex items-center justify-between p-3.5 rounded-xl border border-border-subtle bg-background-secondary">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
              <div>
                <p className="text-sm font-medium text-foreground-primary">{c.name}</p>
                <p className="text-xs text-foreground-muted">{c.desc}</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-400">Active</span>
          </div>
        ))}
      </div>
    ),
    api_keys: (
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-muted mb-3">API Keys</h3>
        {generatedKey && (
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 space-y-2">
            <p className="text-xs font-semibold">✓ Key generated! Copy now — won't be shown again.</p>
            <pre className="p-2.5 bg-black/40 border border-emerald-500/20 rounded-lg text-xs font-mono select-all break-all text-white">{generatedKey}</pre>
            <button onClick={() => setGeneratedKey(null)} className="text-xs underline text-emerald-400 hover:text-emerald-200">Done</button>
          </div>
        )}
        <form onSubmit={handleGenerateKey} className="flex gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            placeholder="Key name, e.g. Local Daemon"
            className="flex-1 bg-background-tertiary text-sm text-foreground-primary placeholder:text-foreground-muted border border-border-subtle rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={!newKeyName.trim()}
            className="px-4 py-2 bg-accent hover:bg-accent-light text-white text-xs font-semibold rounded-xl transition-all shadow-md disabled:opacity-50"
          >
            Create
          </button>
        </form>
        <div className="space-y-2">
          {apiKeys.map(key => (
            <div key={key._id} className="flex items-center justify-between p-3.5 rounded-xl border border-border-subtle/50 bg-background-tertiary/40">
              <div>
                <p className="text-xs font-medium text-foreground-primary">{key.name}</p>
                <p className="text-[10px] font-mono text-foreground-muted mt-0.5">{key.key}</p>
              </div>
              <button onClick={() => handleRevokeKey(key._id)} className="p-1 text-foreground-muted hover:text-red-500 rounded-lg">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {apiKeys.length === 0 && <p className="text-xs text-foreground-muted text-center py-4">No API keys yet.</p>}
        </div>
      </div>
    ),
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
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
              className="w-full max-w-2xl max-h-[80vh] rounded-2xl border border-border-subtle shadow-2xl pointer-events-auto flex overflow-hidden"
              style={{ background: 'var(--bg-elevated)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Left nav */}
              <div className="w-44 flex-shrink-0 border-r border-border-subtle flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground-primary">Settings</h2>
                  {saving && <div className="w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />}
                </div>
                <nav className="flex-1 px-2 pb-4 space-y-0.5 overflow-y-auto">
                  {SETTINGS_TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
                        activeTab === tab.id
                          ? 'bg-accent/15 text-foreground-primary font-medium'
                          : 'text-foreground-muted hover:text-foreground-primary hover:bg-background-tertiary'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
              {/* Right content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle flex-shrink-0">
                  <h3 className="text-sm font-semibold text-foreground-primary">
                    {SETTINGS_TABS.find(t => t.id === activeTab)?.label}
                  </h3>
                  <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      {tabContent[activeTab]}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
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

// ─── Projects Sub-View Component ───────────────────────────────────────────────

function ProjectsView({ threads, navigate, setActiveNav, handleCreateThread }) {
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#D97757')
  const [selectedFolder, setSelectedFolder] = useState(null)

  const loadFolders = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/folders')
      setFolders(data.folders || [])
    } catch (err) {
      console.error('Error loading folders:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFolders()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await api.post('/folders', { name, color })
      setName('')
      setShowCreate(false)
      loadFolders()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this project? Chats inside will remain but will be unlinked.')) return
    try {
      await api.delete(`/folders/${id}`)
      loadFolders()
      if (selectedFolder?._id === id) setSelectedFolder(null)
    } catch (err) {
      console.error(err)
    }
  }

  if (selectedFolder) {
    const folderChats = threads.filter(t => t.folder_id === selectedFolder._id)
    return (
      <div className="p-6 max-w-4xl mx-auto w-full">
        <button
          onClick={() => setSelectedFolder(null)}
          className="text-xs text-foreground-muted hover:text-foreground-primary mb-4 flex items-center gap-1"
        >
          ← Back to Projects
        </button>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-8 h-8" style={{ color: selectedFolder.color }} />
            <h2 className="text-2xl font-serif font-bold text-foreground-primary">{selectedFolder.name}</h2>
          </div>
          <button
            onClick={() => handleCreateThread('New Chat', selectedFolder._id).then(() => setActiveNav('chats'))}
            className="px-4 py-2 bg-accent hover:bg-accent-light text-white text-xs font-semibold rounded-xl transition-all shadow-md"
          >
            + New Chat in Project
          </button>
        </div>

        <div className="space-y-2">
          {folderChats.map(chat => (
            <div
              key={chat._id}
              onClick={() => { navigate(`/chat/${chat._id}`); setActiveNav('chats') }}
              className="p-4 rounded-xl border border-border-subtle bg-background-secondary hover:bg-background-tertiary cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-foreground-muted" />
                <span className="text-sm font-medium text-foreground-primary">{chat.title}</span>
              </div>
              <span className="text-xs text-foreground-muted group-hover:text-foreground-secondary">
                {new Date(chat.last_message_at).toLocaleDateString()}
              </span>
            </div>
          ))}
          {folderChats.length === 0 && (
            <div className="text-center py-12 text-foreground-muted text-sm border border-dashed border-border-subtle rounded-2xl bg-background-secondary">
              No chats in this project yet. Start a new one above!
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground-primary">Projects</h2>
          <p className="text-xs text-foreground-muted">Group your chats and files into local security directories.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-accent hover:bg-accent-light text-white text-xs font-semibold rounded-xl transition-all shadow-md"
        >
          + Create Project
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-2xl border border-border-subtle bg-background-secondary space-y-4">
          <h3 className="text-sm font-bold text-foreground-primary">Create New Project</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted mb-1.5">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Vulnerability Scan"
                className="w-full bg-background-tertiary text-sm text-foreground-primary placeholder:text-foreground-muted border border-border-subtle rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted mb-1.5">Theme Color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {['#D97757', '#B85D3D', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center"
                    style={{ backgroundColor: c, borderColor: color === c ? '#FFF' : 'transparent' }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl text-foreground-muted hover:text-foreground-primary hover:bg-background-tertiary transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-accent hover:bg-accent-light text-white text-xs font-semibold rounded-xl transition-all"
            >
              Save Project
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent animate-spin rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map(folder => {
            const count = threads.filter(t => t.folder_id === folder._id).length
            return (
              <div
                key={folder._id}
                onClick={() => setSelectedFolder(folder)}
                className="p-5 rounded-2xl border border-border-subtle bg-background-secondary hover:bg-background-tertiary hover:scale-[1.01] transition-all cursor-pointer flex flex-col justify-between h-36 group relative"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${folder.color}15`, border: `1px solid ${folder.color}33` }}>
                    <FolderOpen className="w-5 h-5" style={{ color: folder.color }} />
                  </div>
                  <button
                    onClick={(e) => handleDelete(folder._id, e)}
                    className="p-1 rounded-lg text-foreground-muted hover:text-red-500 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-foreground-primary truncate">{folder.name}</h3>
                  <p className="text-[11px] text-foreground-muted mt-0.5">{count} {count === 1 ? 'chat' : 'chats'}</p>
                </div>
              </div>
            )
          })}
          {folders.length === 0 && (
            <div className="col-span-full text-center py-16 text-foreground-muted text-sm border border-dashed border-border-subtle rounded-3xl bg-background-secondary/50">
              No projects created yet. Let's build your first security environment folder!
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Artifacts Sub-View Component ─────────────────────────────────────────────

function ArtifactsView({ messages }) {
  const [artifacts, setArtifacts] = useState([])

  useEffect(() => {
    const items = []
    messages.forEach((msg, msgIdx) => {
      if (msg.role !== 'assistant') return

      // Extract code blocks
      const codeRegex = /```(\w+)?\n([\s\S]*?)```/g
      let match
      let blockIdx = 1
      while ((match = codeRegex.exec(msg.content)) !== null) {
        const lang = match[1] || 'code'
        const code = match[2]
        const preview = code.split('\n').slice(0, 3).join('\n')
        items.push({
          id: `code-${msgIdx}-${blockIdx}`,
          type: 'code',
          title: `Code Snippet (${lang})`,
          language: lang,
          content: code,
          preview: preview,
        })
        blockIdx++
      }

      // Extract image links
      const imgRegex = /!\[(.*?)\]\((.*?)\)/g
      let imgMatch
      let imgIdx = 1
      while ((imgMatch = imgRegex.exec(msg.content)) !== null) {
        const alt = imgMatch[1] || 'Generated Image'
        const url = imgMatch[2]
        items.push({
          id: `img-${msgIdx}-${imgIdx}`,
          type: 'image',
          title: alt,
          url: url,
        })
        imgIdx++
      }
    })
    setArtifacts(items)
  }, [messages])

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content)
    alert('Copied snippet to clipboard!')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-serif font-bold text-foreground-primary">Artifacts Gallery</h2>
        <p className="text-xs text-foreground-muted">Interactive catalog of code scripts and images generated in this chat session.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {artifacts.map(art => (
          <div
            key={art.id}
            className="rounded-2xl border border-border-subtle bg-background-secondary overflow-hidden hover:border-accent/40 transition-all flex flex-col justify-between"
          >
            {art.type === 'image' ? (
              <div className="flex flex-col">
                <div className="aspect-square w-full bg-black relative group overflow-hidden">
                  <img
                    src={art.url}
                    alt={art.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                    <a
                      href={art.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-white text-black text-xs font-bold rounded-xl shadow-lg hover:scale-105 transition-all"
                    >
                      Open Full Image
                    </a>
                  </div>
                </div>
                <div className="p-4 border-t border-border-subtle">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider" style={{ color: '#D97757', background: 'rgba(217,119,87,0.1)', borderColor: 'rgba(217,119,87,0.25)' }}>Image Asset</span>
                  <h3 className="text-sm font-semibold text-foreground-primary mt-2 truncate">{art.title}</h3>
                </div>
              </div>
            ) : (
              <div className="p-5 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-md border border-[#10B981]/20 uppercase tracking-wider font-mono">{art.language}</span>
                    <button
                      onClick={() => handleCopy(art.content)}
                      className="text-xs text-foreground-muted hover:text-foreground-primary flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </button>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground-primary truncate mb-2">{art.title}</h3>
                  <pre className="bg-[#0f0f13] border border-white/[0.03] p-3 rounded-lg font-mono text-[11px] text-foreground-secondary overflow-hidden max-h-24 leading-relaxed">
                    {art.preview}
                    {art.content.split('\n').length > 3 && '\n...'}
                  </pre>
                </div>
                <div className="mt-4 pt-3 border-t border-white/[0.04] flex justify-end">
                  <button
                    onClick={() => handleCopy(art.content)}
                    className="px-3.5 py-1.5 bg-background-tertiary hover:bg-background-elevated text-xs font-semibold rounded-xl text-foreground-primary transition-all"
                  >
                    Copy Snippet
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {artifacts.length === 0 && (
          <div className="col-span-full text-center py-16 text-foreground-muted text-sm border border-dashed border-border-subtle rounded-3xl bg-background-secondary/50">
            No artifacts found in this chat session. Generate code or images to build up this gallery!
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Code Sub-View Component (CLI & API Keys) ─────────────────────────────────

function CodeView() {
  const [daemonConnected, setDaemonConnected] = useState(false)
  const [apiKeys, setApiKeys] = useState([])
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadDaemonStatus = async () => {
    try {
      const { data } = await api.get('/daemon/status')
      setDaemonConnected(data.connected)
    } catch (err) {
      console.error(err)
    }
  }

  const loadApiKeys = async () => {
    try {
      const { data } = await api.get('/api-keys')
      setApiKeys(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadDaemonStatus()
    loadApiKeys()
    const intv = setInterval(loadDaemonStatus, 5000)
    return () => clearInterval(intv)
  }, [])

  const handleGenerateKey = async (e) => {
    e.preventDefault()
    if (!newKeyName.trim()) return
    setLoading(true)
    try {
      const { data } = await api.post('/api-keys', { name: newKeyName })
      setGeneratedKey(data.key)
      setNewKeyName('')
      loadApiKeys()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeKey = async (id) => {
    if (!confirm('Revoke this API Key? Any CLI daemon using this key will immediately disconnect.')) return
    try {
      await api.delete(`/api-keys/${id}`)
      loadApiKeys()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-foreground-primary">Developer & Workspace Link</h2>
        <p className="text-xs text-foreground-muted">Securely link your local folders to CyberCli for agentic filesystem execution.</p>
      </div>

      {/* Daemon Status Card */}
      <div className="p-5 rounded-2xl border border-border-subtle bg-background-secondary flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: daemonConnected ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${daemonConnected ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
            <Terminal className={`w-6 h-6 ${daemonConnected ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground-primary flex items-center gap-2">
              Daemon Linkage
              <span className={`w-2 h-2 rounded-full inline-block ${daemonConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            </h3>
            <p className="text-xs text-foreground-muted mt-1 max-w-md">
              {daemonConnected
                ? 'Your local terminal daemon is actively connected. CyberCli is armed to safely read/write workspace files.'
                : 'No daemon linked. Start the secure daemon process in your local workspace to enable file edits.'}
            </p>
          </div>
        </div>
      </div>

      {/* Setup Guide */}
      <div className="p-5 rounded-2xl border border-border-subtle bg-background-secondary space-y-3.5">
        <h3 className="text-sm font-semibold text-foreground-primary flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" />
          Quick Setup Guide
        </h3>
        <p className="text-xs text-foreground-secondary leading-relaxed">
          Open a terminal inside your target development directory on your local machine and run:
        </p>
        <pre className="bg-[#0f0f13] border border-white/[0.03] p-3 rounded-lg font-mono text-[11px] text-foreground-secondary select-all leading-relaxed whitespace-pre-wrap">
          # Install CLI globally{"\n"}npm install -g cybercli{"\n\n"}# Link workspace using your API key below{"\n"}cybercli link --key YOUR_API_KEY
        </pre>
      </div>

      {/* API Key Section */}
      <div className="p-5 rounded-2xl border border-border-subtle bg-background-secondary space-y-4">
        <h3 className="text-sm font-semibold text-foreground-primary flex items-center gap-2">
          <Key className="w-4 h-4 text-accent" />
          API Access Keys
        </h3>

        {generatedKey && (
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 space-y-2">
            <p className="text-xs font-semibold">✓ API Key Generated successfully! Copy this key now. It will not be shown again.</p>
            <pre className="p-2.5 bg-black/40 border border-emerald-500/20 rounded-lg text-xs font-mono select-all select-text font-bold tracking-wide break-all text-white">{generatedKey}</pre>
            <button
              onClick={() => setGeneratedKey(null)}
              className="text-xs underline text-emerald-400 hover:text-emerald-200"
            >
              Done, I have copied it
            </button>
          </div>
        )}

        <form onSubmit={handleGenerateKey} className="flex gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            placeholder="e.g. Local Terminal Daemon"
            className="flex-1 bg-background-tertiary text-sm text-foreground-primary placeholder:text-foreground-muted border border-border-subtle rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={loading || !newKeyName.trim()}
            className="px-4 py-2 bg-accent hover:bg-accent-light text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
          >
            Create Key
          </button>
        </form>

        <div className="space-y-2 mt-4">
          {apiKeys.map(key => (
            <div
              key={key._id}
              className="flex items-center justify-between p-3.5 rounded-xl border border-border-subtle/50 bg-background-tertiary/40"
            >
              <div>
                <p className="text-xs font-medium text-foreground-primary">{key.name}</p>
                <p className="text-[10px] font-mono text-foreground-muted mt-1">{key.key}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-[10px] text-foreground-muted hidden sm:inline">
                  Created {new Date(key.created_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleRevokeKey(key._id)}
                  className="p-1 text-foreground-muted hover:text-red-500 hover:bg-white/5 rounded-lg transition-all"
                  title="Revoke Key"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {apiKeys.length === 0 && (
            <div className="text-center py-6 text-foreground-muted text-xs">
              No API Keys generated yet. Create one above to link a daemon.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Customize Sub-View Component ──────────────────────────────────────────────

function CustomizeView({
  webSearchEnabled,
  setWebSearchEnabled,
  codeExecutionEnabled,
  setCodeExecutionEnabled,
  imageGenerationEnabled,
  setImageGenerationEnabled,
  memoryEnabled,
  setMemoryEnabled
}) {
  const [settings, setSettings] = useState(null)
  const [customInstructions, setCustomInstructions] = useState('')
  const [memories, setMemories] = useState([])
  const [newMemory, setNewMemory] = useState('')
  const [loading, setLoading] = useState(false)
  const [savingInstructions, setSavingInstructions] = useState(false)

  const loadSettings = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/settings')
      setSettings(data)
      setCustomInstructions(data.custom_instructions || '')
      setMemories(data.memories || [])
      setWebSearchEnabled(data.web_search_enabled || false)
      setCodeExecutionEnabled(data.code_execution_enabled || false)
      setImageGenerationEnabled(data.image_generation_enabled || false)
      setMemoryEnabled(data.memories && data.memories.length > 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSaveInstructions = async () => {
    setSavingInstructions(true)
    try {
      await api.patch('/settings', { custom_instructions: customInstructions })
      alert('Custom instructions updated successfully!')
    } catch (err) {
      console.error(err)
    } finally {
      setSavingInstructions(false)
    }
  }

  const handleAddMemory = async (e) => {
    e.preventDefault()
    if (!newMemory.trim()) return
    const updatedMem = [...memories, newMemory.trim()]
    try {
      const { data } = await api.patch('/settings', { memories: updatedMem })
      setMemories(data.memories || [])
      setNewMemory('')
      setMemoryEnabled(true)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteMemory = async (idx) => {
    const updatedMem = memories.filter((_, i) => i !== idx)
    try {
      const { data } = await api.patch('/settings', { memories: updatedMem })
      setMemories(data.memories || [])
      if (updatedMem.length === 0) setMemoryEnabled(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleCapability = async (field, value, setter) => {
    setter(value)
    try {
      await api.patch('/settings', { [field]: value })
    } catch (err) {
      console.error(err)
      setter(!value) // revert
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent animate-spin rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-foreground-primary">Customize CyberCli</h2>
        <p className="text-xs text-foreground-muted">Train your AI, define default behavior, and manage long-term agent memory.</p>
      </div>

      {/* Toggle Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl border border-border-subtle bg-background-secondary flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-[#D97757]" />
            <div>
              <p className="text-xs font-semibold text-foreground-primary">Default Web Search</p>
              <p className="text-[10px] text-foreground-muted mt-0.5">Allow web indexing for current answers</p>
            </div>
          </div>
          <button
            onClick={() => handleToggleCapability('web_search_enabled', !webSearchEnabled, setWebSearchEnabled)}
            className={`w-10 h-6 rounded-full transition-all relative flex items-center p-0.5 ${webSearchEnabled ? 'bg-accent' : 'bg-white/10'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-all shadow ${webSearchEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="p-4 rounded-2xl border border-border-subtle bg-background-secondary flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-[#10B981]" />
            <div>
              <p className="text-xs font-semibold text-foreground-primary">Default Code Execution</p>
              <p className="text-[10px] text-foreground-muted mt-0.5">Allow Javascript sandboxed tests</p>
            </div>
          </div>
          <button
            onClick={() => handleToggleCapability('code_execution_enabled', !codeExecutionEnabled, setCodeExecutionEnabled)}
            className={`w-10 h-6 rounded-full transition-all relative flex items-center p-0.5 ${codeExecutionEnabled ? 'bg-accent' : 'bg-white/10'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-all shadow ${codeExecutionEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="p-4 rounded-2xl border border-border-subtle bg-background-secondary flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-5 h-5 text-[#8B5CF6]" />
            <div>
              <p className="text-xs font-semibold text-foreground-primary">Default Image Gen</p>
              <p className="text-[10px] text-foreground-muted mt-0.5">Toggle image generation prompts</p>
            </div>
          </div>
          <button
            onClick={() => handleToggleCapability('image_generation_enabled', !imageGenerationEnabled, setImageGenerationEnabled)}
            className={`w-10 h-6 rounded-full transition-all relative flex items-center p-0.5 ${imageGenerationEnabled ? 'bg-accent' : 'bg-white/10'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-all shadow ${imageGenerationEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="p-4 rounded-2xl border border-border-subtle bg-background-secondary flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-[#3B82F6]" />
            <div>
              <p className="text-xs font-semibold text-foreground-primary">Activate Profile Memory</p>
              <p className="text-[10px] text-foreground-muted mt-0.5">Inject stored memories into prompt context</p>
            </div>
          </div>
          <button
            onClick={() => handleToggleCapability('memory_enabled', !memoryEnabled, setMemoryEnabled)}
            className={`w-10 h-6 rounded-full transition-all relative flex items-center p-0.5 ${memoryEnabled ? 'bg-accent' : 'bg-white/10'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-all shadow ${memoryEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Custom Instructions */}
      <div className="p-5 rounded-2xl border border-border-subtle bg-background-secondary space-y-4">
        <h3 className="text-sm font-semibold text-foreground-primary">Custom Instructions</h3>
        <p className="text-xs text-foreground-muted">Specify details or rules that you want CyberCli to remember across all your threads.</p>
        <textarea
          value={customInstructions}
          onChange={e => setCustomInstructions(e.target.value)}
          placeholder="e.g. Always write code in TypeScript. Keep explanations brief."
          rows={5}
          className="w-full bg-background-tertiary text-sm text-foreground-primary placeholder:text-foreground-muted border border-border-subtle rounded-xl px-4 py-3 focus:outline-none focus:border-accent resize-none leading-relaxed"
        />
        <div className="flex justify-end">
          <button
            onClick={handleSaveInstructions}
            disabled={savingInstructions}
            className="px-4 py-2 bg-accent hover:bg-accent-light text-white text-xs font-semibold rounded-xl transition-all shadow-md disabled:opacity-50"
          >
            {savingInstructions ? 'Saving...' : 'Save Instructions'}
          </button>
        </div>
      </div>

      {/* Memory Manager */}
      <div className="p-5 rounded-2xl border border-border-subtle bg-background-secondary space-y-4">
        <h3 className="text-sm font-semibold text-foreground-primary flex items-center gap-2">
          <Brain className="w-4 h-4 text-accent" />
          Memory Database
        </h3>
        <p className="text-xs text-foreground-muted">Facts CyberCli has captured or you have explicitly stored about yourself.</p>

        <form onSubmit={handleAddMemory} className="flex gap-2">
          <input
            type="text"
            value={newMemory}
            onChange={e => setNewMemory(e.target.value)}
            placeholder="Add new memory fact, e.g. My favorite programming language is Go"
            className="flex-1 bg-background-tertiary text-sm text-foreground-primary placeholder:text-foreground-muted border border-border-subtle rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={!newMemory.trim()}
            className="px-4 py-2 bg-accent hover:bg-accent-light text-white text-xs font-semibold rounded-xl transition-all shadow-md"
          >
            Add Fact
          </button>
        </form>

        <div className="space-y-2 mt-4">
          {memories.map((mem, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3.5 rounded-xl border border-border-subtle/50 bg-background-tertiary/40 text-xs text-foreground-primary font-medium"
            >
              <span>{mem}</span>
              <button
                type="button"
                onClick={() => handleDeleteMemory(idx)}
                className="p-1 text-foreground-muted hover:text-red-500 hover:bg-white/5 rounded-lg transition-all"
                title="Forget Fact"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {memories.length === 0 && (
            <div className="text-center py-6 text-foreground-muted text-xs">
              No memories saved yet. Add a fact to train CyberCli's memory.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Search Sub-View Component ────────────────────────────────────────────────

function SearchView({ navigate, setActiveNav }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef(null)

  const doSearch = async (q) => {
    if (!q.trim()) { setResults([]); setSearched(false); return }
    setLoading(true)
    try {
      const { data } = await api.get(`/search?q=${encodeURIComponent(q)}`)
      setResults(data.results || [])
      setSearched(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const v = e.target.value
    setQuery(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(v), 400)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-serif font-bold text-foreground-primary">Search Conversations</h2>
        <p className="text-xs text-foreground-muted">Find messages and threads across all your chats.</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search your conversations…"
          autoFocus
          className="w-full bg-background-secondary border border-border-subtle rounded-2xl pl-11 pr-4 py-3.5 text-sm text-foreground-primary placeholder:text-foreground-muted focus:outline-none focus:border-accent transition-all"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        )}
      </div>

      <div className="space-y-2">
        {results.map(r => (
          <button
            key={r._id || r.thread_id}
            onClick={() => { navigate(`/chat/${r._id || r.thread_id}`); setActiveNav('chats') }}
            className="w-full text-left p-4 rounded-2xl border border-border-subtle bg-background-secondary hover:bg-background-tertiary hover:border-accent/30 transition-all group"
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="text-sm font-medium text-foreground-primary group-hover:text-accent transition-colors truncate">{r.title || 'Untitled'}</h3>
              <span className="text-[10px] text-foreground-muted flex-shrink-0">{r.last_message_at ? new Date(r.last_message_at).toLocaleDateString() : ''}</span>
            </div>
            {r.excerpt && <p className="text-xs text-foreground-muted leading-relaxed line-clamp-2">{r.excerpt}</p>}
          </button>
        ))}
        {searched && results.length === 0 && (
          <div className="text-center py-12 text-foreground-muted text-sm border border-dashed border-border-subtle rounded-2xl">
            No results found for "{query}"
          </div>
        )}
      </div>
    </div>
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
  const [incognitoMode, setIncognitoMode] = useState(false)
  const incognitoMessagesRef = useRef([])

  // Capability states
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const [codeExecutionEnabled, setCodeExecutionEnabled] = useState(false)
  const [imageGenerationEnabled, setImageGenerationEnabled] = useState(false)
  const [memoryEnabled, setMemoryEnabled] = useState(false)

  // Voice overlay state
  const [voiceChatOpen, setVoiceChatOpen] = useState(false)
  const voiceChatOpenRef = useRef(false)

  // Inline Speech to Text state
  const [inlineSpeechListening, setInlineSpeechListening] = useState(false)
  const inlineRecognitionRef = useRef(null)
  const inlineStartTextRef = useRef('')

  const toggleInlineSpeech = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.')
      return
    }

    if (inlineSpeechListening) {
      if (inlineRecognitionRef.current) {
        try { inlineRecognitionRef.current.stop() } catch {}
      }
      setInlineSpeechListening(false)
      return
    }

    inlineStartTextRef.current = input
    
    try {
      const rec = new SR()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'en-US'

      rec.onstart = () => {
        setInlineSpeechListening(true)
      }

      rec.onresult = (event) => {
        let interim = ''
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            final += t
          } else {
            interim += t
          }
        }
        const spoken = (final + interim).trim()
        const separator = inlineStartTextRef.current ? ' ' : ''
        setInput((inlineStartTextRef.current + separator + spoken).trim())
      }

      rec.onerror = (e) => {
        console.error('Inline speech error:', e)
        setInlineSpeechListening(false)
      }

      rec.onend = () => {
        setInlineSpeechListening(false)
      }

      inlineRecognitionRef.current = rec
      rec.start()
    } catch (err) {
      console.error('Failed to start speech recognition:', err)
      setInlineSpeechListening(false)
    }
  }, [inlineSpeechListening, input])

  const messagesEndRef = useRef(null)
  const creatingThreadRef = useRef(null)

  const {
    speak,
    stop,
    isPlaying,
    isLoading: ttsLoading,
    updateProvider,
    updateVoice
  } = useTTS()

  const activeThreadId = threadId || null

  useEffect(() => {
    voiceChatOpenRef.current = voiceChatOpen
  }, [voiceChatOpen])

  // ── Data loading ──

  useEffect(() => {
    loadThreads()
  }, [])

  useEffect(() => {
    if (threadId) {
      if (creatingThreadRef.current === threadId) {
        creatingThreadRef.current = null
      } else {
        loadMessages(threadId)
      }
    } else {
      setMessages([])
    }
  }, [threadId])

  useEffect(() => {
    // Fetch default capabilities setting
    const fetchCapabilities = async () => {
      try {
        const { data } = await api.get('/settings')
        setWebSearchEnabled(data.web_search_enabled || false)
        setCodeExecutionEnabled(data.code_execution_enabled || false)
        setImageGenerationEnabled(data.image_generation_enabled || false)
        setMemoryEnabled(data.memories && data.memories.length > 0)
      } catch (err) {
        console.error('Failed to load initial settings:', err)
      }
    }
    fetchCapabilities()
  }, [])

  useEffect(() => {
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

  const handleCreateThread = async (title = 'New Chat', folderId = null) => {
    try {
      const { data } = await api.post('/chat', { title, model_id: selectedModel, folder_id: folderId })
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

  const handleSend = useCallback(async (textOverride) => {
    const rawText = typeof textOverride === 'string' ? textOverride : input
    if (!rawText.trim() || loading) return
    const userText = rawText.trim()

    // Incognito path — bypass DB entirely
    if (incognitoMode) {
      if (typeof textOverride !== 'string') setInput('')
      setLoading(true)
      setError(null)
      const userMsg = { role: 'user', content: userText }
      const history = [...messages.map(m => ({ role: m.role, content: m.content })), userMsg]
      setMessages(prev => [...prev, userMsg])
      const assistantMsg = { role: 'assistant', content: '', model: selectedModel }
      setMessages(prev => [...prev, assistantMsg])
      const assistantIdx = messages.length + 1
      setStreamingIndex(assistantIdx)
      let fullReply = ''
      try {
        const token = localStorage.getItem('sb-access-token')
        const res = await fetch(`${API_BASE}/completions`, {
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
        let streamBuffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          streamBuffer += decoder.decode(value, { stream: true })
          const lines = streamBuffer.split('\n')
          streamBuffer = lines.pop() || ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data: ')) continue
            const raw = trimmed.slice(6)
            if (raw === '[DONE]') break
            try {
              const parsed = JSON.parse(raw)
              if (parsed.type === 'token') {
                fullReply += parsed.content
                setMessages(prev => {
                  const next = [...prev]
                  if (next.length > 0) next[next.length - 1] = { ...next[next.length - 1], content: fullReply }
                  return next
                })
              }
            } catch {}
          }
        }
        if (voiceChatOpenRef.current) speak(fullReply)
      } catch (err) {
        console.error('Incognito stream error:', err)
        setMessages(prev => {
          const next = [...prev]
          if (next.length > 0) next[next.length - 1] = { ...next[next.length - 1], content: `Error: ${err.message}` }
          return next
        })
      } finally {
        setStreamingIndex(null)
        setLoading(false)
      }
      return
    }
    
    if (typeof textOverride !== 'string') {
      setInput('')
    }
    
    setLoading(true)
    setError(null)

    let currentId = activeThreadId
    if (!currentId) {
      try {
        const { data } = await api.post('/chat', { title: userText.substring(0, 50), model_id: selectedModel })
        setThreads(prev => [data, ...prev])
        currentId = data._id
        creatingThreadRef.current = currentId
        navigate(`/chat/${currentId}`, { replace: true })
      } catch (err) {
        console.error('Failed to create thread silently:', err)
        setLoading(false)
        return
      }
    }

    const token = localStorage.getItem('sb-access-token')
    const userMsg = { role: 'user', content: userText }
    const history = [...messages.map(m => ({ role: m.role, content: m.content })), userMsg]

    setMessages(prev => [...prev, userMsg])

    // Setup streaming output bubble
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
        body: JSON.stringify({
          messages: history,
          model: selectedModel,
          webSearchEnabled,
          codeExecutionEnabled,
          imageGenerationEnabled,
          memoryEnabled
        })
      })
      if (!res.ok) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let streamBuffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        streamBuffer += decoder.decode(value, { stream: true })
        
        const lines = streamBuffer.split('\n')
        // Preserve incomplete line for next packet
        streamBuffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          const raw = trimmed.slice(6)
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw)
            if (parsed.type === 'token') {
              fullReply += parsed.content
              setMessages(prev => {
                const next = [...prev]
                if (next.length > 0) {
                  next[next.length - 1] = { ...next[next.length - 1], content: fullReply }
                }
                return next
              })
            }
          } catch {}
        }
      }

      await loadMessages(currentId)
      await loadThreads()

      // Speak result if voice overlay is currently open
      if (voiceChatOpenRef.current) {
        speak(fullReply)
      }
    } catch (err) {
      console.error('Chat stream error:', err)
      setMessages(prev => {
        const next = [...prev]
        if (next.length > 0) {
          next[next.length - 1] = { ...next[next.length - 1], content: `Error: ${err.message}` }
        }
        return next
      })
      setError('Failed to get response.')
    } finally {
      setStreamingIndex(null)
      setLoading(false)
    }
  }, [input, loading, activeThreadId, messages, selectedModel, webSearchEnabled, codeExecutionEnabled, imageGenerationEnabled, memoryEnabled, speak, incognitoMode])

  // ── User info (from localStorage) ──
  const userName = localStorage.getItem('user_name') || 'User'
  const userEmail = localStorage.getItem('user_email') || ''
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  const [showProfilePopover, setShowProfilePopover] = useState(false)
  const { signOut } = useAuthStore()

  const handleLogOut = async () => {
    try {
      await signOut()
      navigate('/auth/login')
    } catch (err) {
      console.error('Error logging out:', err)
    }
  }

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

            {/* New Chat */}
            <div className="px-3 pb-2 flex-shrink-0">
              <button
                onClick={() => { navigate('/chat'); setMessages([]); setActiveNav('chats') }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ color: '#D4D4D4' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Plus className="w-4 h-4" />
                New Chat
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
                      isActive={activeThreadId === t._id && activeNav === 'chats'}
                      onSelect={() => { navigate(`/chat/${t._id}`); setActiveNav('chats') }}
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
                    isActive={activeThreadId === t._id && activeNav === 'chats'}
                    onSelect={() => { navigate(`/chat/${t._id}`); setActiveNav('chats') }}
                    onDelete={(e) => handleDeleteThread(t._id, e)}
                    onPin={(e) => handlePinThread(t._id, e)}
                  />
                ))}
              </div>

              {threads.length === 0 && (
                <p className="text-xs text-gray-600 text-center mt-6">No conversations yet</p>
              )}
            </div>

            {/* Bottom user bar with Popover */}
            <div 
              className="flex-shrink-0 border-t border-white/[0.06] p-3 relative"
              onMouseEnter={() => setShowProfilePopover(true)}
              onMouseLeave={() => setShowProfilePopover(false)}
            >
              <AnimatePresence>
                {showProfilePopover && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute bottom-[60px] left-[12px] w-[256px] rounded-xl border border-white/[0.08] shadow-2xl p-1.5 z-50 flex flex-col gap-0.5"
                    style={{ 
                      background: 'rgba(26, 26, 26, 0.98)', 
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 truncate tracking-wide">
                      {userEmail || 'bhaktikisakti.11@gmail.com'}
                    </div>
                    <div className="h-[1px] bg-white/[0.06] my-1" />
                    
                    <button 
                      onClick={() => { setSettingsOpen(true); setShowProfilePopover(false); }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Settings className="w-4 h-4 text-gray-500 group-hover:text-[#D97757] transition-colors" />
                        <span>Settings</span>
                      </div>
                      <span className="text-[9px] text-gray-650 tracking-tight font-bold uppercase">⚙ ↑Ctrl,</span>
                    </button>

                    <button 
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Globe className="w-4 h-4 text-gray-500 group-hover:text-[#D97757] transition-colors" />
                        <span>Language</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                    </button>

                    <button 
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left group"
                    >
                      <HelpCircle className="w-4 h-4 text-gray-500 group-hover:text-[#D97757] transition-colors" />
                      <span>Get help</span>
                    </button>

                    <button 
                      onClick={() => { navigate('/settings/billing'); setShowProfilePopover(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left group"
                    >
                      <ArrowUpCircle className="w-4 h-4 text-gray-500 group-hover:text-[#D97757] transition-colors" />
                      <span>Upgrade plan</span>
                    </button>

                    <button 
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left group"
                    >
                      <Download className="w-4 h-4 text-gray-500 group-hover:text-[#D97757] transition-colors" />
                      <span>Get apps and extensions</span>
                    </button>

                    <button 
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Info className="w-4 h-4 text-gray-500 group-hover:text-[#D97757] transition-colors" />
                        <span>Learn more</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                    </button>

                    <div className="h-[1px] bg-white/[0.06] my-1" />

                    <button 
                      onClick={handleLogOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-350 hover:bg-red-500/10 transition-all text-left group"
                    >
                      <LogOut className="w-4 h-4 text-red-500/60 group-hover:text-red-400 transition-colors" />
                      <span>Log out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

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
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(217,119,87,0.2)', color: '#D97757' }}>FREE</span>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
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
        <header className="flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b border-border-subtle/30 bg-background-primary/20">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground-primary hover:bg-background-secondary transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {activeThreadId && activeNav === 'chats' && (
            <div className="flex items-center gap-2 text-sm text-foreground-muted">
              <span className="truncate max-w-[200px] font-medium text-foreground-secondary">
                {threads.find(t => t._id === activeThreadId)?.title || 'Chat'}
              </span>
            </div>
          )}

          {activeNav !== 'chats' && (
            <span className="text-sm font-semibold capitalize text-foreground-secondary">
              {activeNav}
            </span>
          )}

          <div className="flex-1" />

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground-primary hover:bg-background-secondary transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIncognitoMode(m => !m)}
            title={incognitoMode ? 'Exit Incognito' : 'Incognito Mode'}
            className={`p-1.5 rounded-lg transition-colors ${
              incognitoMode
                ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                : 'text-foreground-muted hover:text-foreground-primary hover:bg-background-secondary'
            }`}
          >
            <Ghost className="w-4 h-4" />
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

        {/* Incognito banner */}
        <AnimatePresence>
          {incognitoMode && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-4 mb-2 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#FCD34D' }}
            >
              <Ghost className="w-4 h-4 flex-shrink-0" />
              <span>Incognito Mode — conversations are not saved to the database.</span>
              <button onClick={() => setIncognitoMode(false)} className="ml-auto hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area based on Nav selection */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          {activeNav === 'chats' ? (
            messages.length === 0 && !loading ? (
              <div className="h-full flex flex-col justify-between">
                <div className="flex-1 flex items-center justify-center">
                  <HeroState />
                </div>
                {/* Input in center */}
                <div className="px-4 pb-6">
                  <InputArea
                    input={input}
                    setInput={setInput}
                    onSend={handleSend}
                    loading={loading}
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                    onMicClick={toggleInlineSpeech}
                    onWaveformClick={() => setVoiceChatOpen(true)}
                    webSearchEnabled={webSearchEnabled}
                    onToggleWebSearch={() => setWebSearchEnabled(v => !v)}
                    codeExecutionEnabled={codeExecutionEnabled}
                    onToggleCodeExecution={() => setCodeExecutionEnabled(v => !v)}
                    imageGenerationEnabled={imageGenerationEnabled}
                    onToggleImageGeneration={() => setImageGenerationEnabled(v => !v)}
                    memoryEnabled={memoryEnabled}
                    onToggleMemory={() => setMemoryEnabled(v => !v)}
                    inlineSpeechListening={inlineSpeechListening}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
                  {loading && messages.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <motion.div
                        className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin"
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
                        codeExecutionEnabled={codeExecutionEnabled}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                {/* Input pinned at bottom */}
                <div className="px-4 py-4 border-t border-border-subtle bg-background-primary flex-shrink-0">
                  <InputArea
                    input={input}
                    setInput={setInput}
                    onSend={handleSend}
                    loading={loading}
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                    onMicClick={toggleInlineSpeech}
                    onWaveformClick={() => setVoiceChatOpen(true)}
                    webSearchEnabled={webSearchEnabled}
                    onToggleWebSearch={() => setWebSearchEnabled(v => !v)}
                    codeExecutionEnabled={codeExecutionEnabled}
                    onToggleCodeExecution={() => setCodeExecutionEnabled(v => !v)}
                    imageGenerationEnabled={imageGenerationEnabled}
                    onToggleImageGeneration={() => setImageGenerationEnabled(v => !v)}
                    memoryEnabled={memoryEnabled}
                    onToggleMemory={() => setMemoryEnabled(v => !v)}
                    inlineSpeechListening={inlineSpeechListening}
                  />
                </div>
              </div>
            )
          ) : activeNav === 'search' ? (
            <SearchView navigate={navigate} setActiveNav={setActiveNav} />
          ) : activeNav === 'projects' ? (
            <ProjectsView
              threads={threads}
              navigate={navigate}
              setActiveNav={setActiveNav}
              handleCreateThread={handleCreateThread}
            />
          ) : activeNav === 'artifacts' ? (
            <ArtifactsView
              messages={messages}
            />
          ) : activeNav === 'code' ? (
            <CodeView />
          ) : activeNav === 'customize' ? (
            <CustomizeView
              webSearchEnabled={webSearchEnabled}
              setWebSearchEnabled={setWebSearchEnabled}
              codeExecutionEnabled={codeExecutionEnabled}
              setCodeExecutionEnabled={setCodeExecutionEnabled}
              imageGenerationEnabled={imageGenerationEnabled}
              setImageGenerationEnabled={setImageGenerationEnabled}
              memoryEnabled={memoryEnabled}
              setMemoryEnabled={setMemoryEnabled}
            />
          ) : null}
        </div>
      </main>

      {/* Voice Chat overlay modal */}
      <VoiceChatModal
        isOpen={voiceChatOpen}
        onClose={() => {
          setVoiceChatOpen(false)
          stop()
        }}
        onSendMessage={(text) => {
          handleSend(text)
        }}
        isPlaying={isPlaying}
        isProcessing={loading}
        speak={speak}
        stop={stop}
        updateProvider={updateProvider}
        updateVoice={updateVoice}
      />

      {/* Settings dialog */}
      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
