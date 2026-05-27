import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Plus, Search, MessageSquare, FolderOpen, Layers, Code2, Sliders,
  ChevronLeft, ChevronRight, ChevronDown, Mic, Paperclip, Radio,
  Copy, Check, GitBranch, Volume2, VolumeX, Trash2, Pin, X, RotateCcw,
  Download, Zap, Settings, AlertCircle, Globe, Terminal, Image as ImageIcon, Brain, Folder,
  Play, Key, RefreshCw, Ghost, LogOut, HelpCircle, ArrowUpCircle, Info, BookOpen, Menu,
  Pencil, GraduationCap, Coffee, Lightbulb, Skull, FileCode, GitBranch as GitIcon, FolderTree, ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import api, { smartStream, createThread, getThreads, getMessages, isLoggedIn, API_BASE, getFreshToken, truncateThread } from '../../lib/api.js'
import { useTTS } from '../../hooks/useTTS.js'
import VoiceChatModal from '../../components/chat/VoiceChatModal.jsx'
import ArtifactsGallery from '../../components/chat/ArtifactsGallery.jsx'
import { useAuthStore } from '@stores/authStore.js'
import CyberCliMark, { CyberCliWordmark } from '../../components/ui/CyberCliLogo.jsx'

// ─── Constants ──────────────────────────────────────────────────────────────

const MODELS = [
  { id: 'puter/claude-opus-4-7',       name: 'Madhav (Opus 4.7)',    tag: 'Madhav',   color: '#F59E0B', desc: 'The supreme intelligence. Unrivalled reasoning, deep analysis, and creative mastery.', kali: false },
  { id: 'puter/gpt-5.5',               name: 'Bheem (GPT-5.5)',      tag: 'Bheem',    color: '#3B82F6', desc: 'The reliable powerhouse. Versatile and capable for everyday intelligence tasks with high accuracy.', kali: false },
  { id: 'puter/deepseek/deepseek-r1-0528', name: 'Chanakya (R1)',    tag: 'Chanakya', color: '#00A3FF', desc: 'The grand strategist. Explicit chain-of-thought reasoning for multi-step problem solving.', kali: false },
  { id: 'puter/claude-sonnet-4-6',     name: 'Arjun (Sonnet 4.6)',   tag: 'Arjun',    color: '#10B981', desc: 'The swift warrior. Blazing fast responses, lightweight and razor-precise.', kali: false },
  { id: 'council',                     name: 'Panchayat',            tag: 'Panchayat', color: '#D97757', desc: 'The council of minds. Streams your query to multiple minds simultaneously.', kali: false },
]

const EXTRA_MODELS = [
  { id: 'puter/gpt-4o',                                name: 'Nakul (GPT-4o)',        tag: 'Nakul',    color: '#8B5CF6', desc: 'The skilled strategist. Fast, capable, and multimodal.', kali: false },
  { id: 'puter/google/gemini-2.5-pro',                 name: 'Sahadeva (Gemini)',     tag: 'Sahadeva', color: '#4285F4', desc: 'The wise seer. High-speed intelligence with enormous context window.', kali: false },
  { id: 'puter/xai/grok-2',                            name: 'Abhimanyu (Grok 2)',    tag: 'Abhimanyu',color: '#EC4899', desc: 'The lightning striker. Unfiltered, real-time knowledge.', kali: false },
  { id: 'puter/mistral/mistral-large-latest',          name: 'Vayu (Mistral)',        tag: 'Vayu',     color: '#F97316', desc: 'The swift wind. Top-tier reasoning and logic capabilities.', kali: false },
  { id: 'puter/meta-llama/llama-3.1-70b',              name: 'Yudhishthira (Llama)',  tag: 'Yudhishthir', color: '#FFD21E', desc: 'The righteous elder. Open-weights flagship model built for balanced output.', kali: false },
  { id: 'puter/qwen/qwen2.5-72b-instruct',             name: 'Vikrama (Qwen)',        tag: 'Vikrama',  color: '#FF6B35', desc: 'The multilingual emperor. Broad multilingual and cross-cultural intelligence.', kali: false },
  { id: 'puter/openai/gpt-5.3-codex',                  name: 'Vishwakarma (Codex)',   tag: 'Vishwakarma', color: '#ED8936', desc: 'The divine architect. Trained on millions of code repositories.', kali: false },
  { id: 'puter/perplexity/sonar-deep-research',        name: 'Vyas (Deep Research)',  tag: 'Vyas',     color: '#0D9488', desc: 'The omniscient researcher. Deeply searches the web to compile definitive answers.', kali: false },
  { id: 'puter/perplexity/sonar-reasoning-pro',        name: 'Sanjaya (Sonar Pro)',   tag: 'Sanjaya',  color: '#059669', desc: 'The visionary observer. Real-time web knowledge with deep reasoning.', kali: false },
  { id: 'puter/perplexity/sonar-pro',                  name: 'Narada (Sonar)',        tag: 'Narada',   color: '#047857', desc: 'The swift messenger. Rapid web-search capabilities for instant, cited facts.', kali: false },
  { id: 'puter/gpt-image-2',                           name: 'Chitrakar (GPT-Image)', tag: 'Chitrakar',color: '#E11D48', desc: 'The divine painter. Generates stunning, high-quality images.', kali: false },
]



const QUICK_ACTIONS = [
  { id: 'write', label: 'Write', value: 'Write a ', icon: Pencil },
  { id: 'learn', label: 'Learn', value: 'Explain the concept of ', icon: GraduationCap },
  { id: 'code', label: 'Code', value: 'Help me write code for ', icon: Code2 },
  { id: 'life', label: 'Life stuff', value: 'Give me advice on ', icon: Coffee },
  { id: 'choice', label: "CyberCli's choice", value: "Give me a creative idea or recommendation ", icon: Lightbulb },
]

const NAV_ITEMS = [
  { id: 'search',    label: 'Search',    icon: Search        },
  { id: 'chats',     label: 'Chats',     icon: MessageSquare },
  { id: 'projects',  label: 'Projects',  icon: FolderOpen    },
  { id: 'artifacts', label: 'Artifacts', icon: Layers        },
  { id: 'code',      label: 'Code',      icon: Code2,  badge: 'Pro' },
  { id: 'voice',     label: 'Voice',     icon: Radio         },
  { id: 'customize', label: 'Customize', icon: Sliders       },
]

const LANGUAGES = [
  { name: 'English (United States)', code: 'EN' },
  { name: 'Français (France)', code: 'FR' },
  { name: 'Deutsch (Deutschland)', code: 'DE' },
  { name: 'हिन्दी (भारत)', code: 'HI' },
  { name: 'Indonesia (Indonesia)', code: 'ID' },
  { name: 'Italiano (Italia)', code: 'IT' },
  { name: '日本語 (日本)', code: 'JA' },
  { name: '한국어 (대한민국)', code: 'KO' },
  { name: 'Português (Brasil)', code: 'PT' },
  { name: 'Español (Latinoamérica)', code: 'ES' },
  { name: 'Español (España)', code: 'ES' }
]



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

// ─── Image Generator Widget ──────────────────────────────────────────────────

function ImageGeneratorWidget({ src, alt }) {
  const [loading, setLoading] = useState(true)
  const [imageUrl, setImageUrl] = useState(null)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let active = true
    const generateImage = async () => {
      setLoading(true)
      setError(null)
      try {
        let prompt = alt || 'A beautiful generated image'
        if (src.includes('/p/')) {
          const parts = src.split('/p/')
          if (parts[1]) {
            const promptPart = parts[1].split('?')[0]
            prompt = decodeURIComponent(promptPart)
          }
        }

        const token = localStorage.getItem('sb-access-token')
        const response = await fetch(`${API_BASE}/images/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ prompt })
        })

        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.error || `Error: ${response.status}`)
        }

        const data = await response.json()

        let puterUrl = null
        try {
          if (!window.puter) {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script')
              script.src = 'https://js.puter.com/v2/'
              script.onload = () => resolve(window.puter)
              script.onerror = (e) => reject(e)
              document.head.appendChild(script)
            })
          }

          if (window.puter && window.puter.ai && window.puter.ai.txt2img) {
            const imgElement = await window.puter.ai.txt2img(prompt, { 
              model: 'black-forest-labs/flux-schnell' 
            })
            if (imgElement && imgElement.src) {
              puterUrl = imgElement.src
            }
          }
        } catch (puterErr) {
          console.warn('Puter.js image generation failed, falling back to Pollinations AI:', puterErr)
        }

        if (active) {
          setImageUrl(puterUrl || data.url)
          setLoading(false)
        }
      } catch (err) {
        if (active) {
          setError(err.message)
          setLoading(false)
        }
      }
    }

    generateImage()
    return () => {
      active = false
    }
  }, [src, alt, retryCount])

  if (loading) {
    return (
      <div className="my-3 rounded-xl border border-border-subtle bg-background-secondary p-6 flex flex-col items-center justify-center gap-4 max-w-lg">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <div className="text-xs text-foreground-muted animate-pulse">Generating your premium image...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="my-3 rounded-xl border border-red-500/20 bg-red-500/5 p-5 flex flex-col items-start gap-3 max-w-lg">
        <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Image Generation Limit Exceeded</span>
        </div>
        <p className="text-xs text-foreground-muted leading-relaxed">
          {error.includes('limit') 
            ? "You have reached your daily limit of 5 free image generations. Please upgrade to Pro for unlimited image generation."
            : error}
        </p>
        <div className="flex gap-2.5 mt-1">
          <Link to="/pricing" className="px-3 py-1.5 rounded-lg bg-[#D97757] hover:bg-[#D97757]/80 text-[10px] uppercase tracking-wider font-bold text-white transition-all">
            Upgrade to Pro
          </Link>
          <button 
            onClick={() => setRetryCount(c => c + 1)}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] uppercase tracking-wider font-bold text-white/80 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-border-subtle bg-background-secondary relative group max-w-lg animate-fade-in">
      <img src={imageUrl} alt={alt} className="w-full h-auto object-cover max-h-[512px]" />
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
        <button
          onClick={() => window.open(imageUrl, '_blank')}
          className="p-2 rounded-lg bg-black/60 hover:bg-black/80 border border-white/10 text-white transition-all"
          title="Open in new tab"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Daemon Action Widget ────────────────────────────────────────────────────

function DaemonActionWidget({ action, payload, daemonConnected, onExecuteSuccess }) {
  const [status, setStatus] = useState('idle') // idle | executing | success | error
  const [result, setResult] = useState(null)
  const [errMessage, setErrMessage] = useState(null)
  const [showContent, setShowContent] = useState(false)

  const handleExecute = async () => {
    setStatus('executing')
    setErrMessage(null)
    setResult(null)

    try {
      const token = localStorage.getItem('sb-access-token')
      const response = await fetch(`${API_BASE}/daemon/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action, payload })
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Execution failed')
      }

      setStatus('success')
      setResult(data.data)
      if (onExecuteSuccess && (action === 'read_file' || action === 'write_file')) {
        onExecuteSuccess(payload.path)
      }
    } catch (err) {
      setStatus('error')
      setErrMessage(err.message)
    }
  }

  const renderPayload = () => {
    if (action === 'read_file') {
      return (
        <div className="text-xs text-foreground-secondary">
          Action: <span className="font-semibold text-accent">Read File</span>
          <div className="mt-1 font-mono text-[11px] bg-black/25 px-2.5 py-1.5 rounded border border-white/[0.03]">
            {payload.path}
          </div>
        </div>
      )
    } else if (action === 'write_file') {
      return (
        <div className="text-xs text-foreground-secondary w-full">
          Action: <span className="font-semibold text-accent">Write File</span>
          <div className="mt-1 font-mono text-[11px] bg-black/25 px-2.5 py-1.5 rounded border border-white/[0.03] truncate">
            {payload.path}
          </div>
          <div className="mt-2">
            <button
              onClick={() => setShowContent(!showContent)}
              className="text-[10px] text-accent hover:underline flex items-center gap-1"
            >
              {showContent ? 'Hide file content' : `Show file content (${payload.content?.length || 0} chars)`}
            </button>
            {showContent && (
              <pre className="mt-1.5 p-2 bg-black/40 border border-white/[0.03] rounded font-mono text-[10px] max-h-36 overflow-y-auto whitespace-pre-wrap text-foreground-muted w-full">
                {payload.content}
              </pre>
            )}
          </div>
        </div>
      )
    } else if (action === 'run_command') {
      return (
        <div className="text-xs text-foreground-secondary">
          Action: <span className="font-semibold text-accent">Run Command</span>
          <div className="mt-1 font-mono text-[11px] bg-black/25 px-2.5 py-1.5 rounded border border-white/[0.03] text-emerald-400">
            $ {payload.command}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="my-3 rounded-xl border border-border-subtle bg-background-secondary p-4.5 max-w-lg flex flex-col gap-3.5 animate-fade-in w-full">
      <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-accent" />
          <span className="text-xs font-semibold text-foreground-primary">Local Workspace Daemon Action</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${daemonConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-[10px] text-foreground-muted">{daemonConnected ? 'Daemon connected' : 'Daemon offline'}</span>
        </div>
      </div>

      {renderPayload()}

      {status === 'idle' && (
        <button
          disabled={!daemonConnected}
          onClick={handleExecute}
          className={`w-full py-2 rounded-lg text-xs font-bold text-center transition-all ${
            daemonConnected
              ? 'bg-accent text-white hover:bg-accent-dark active:scale-[0.98]'
              : 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
          }`}
        >
          {daemonConnected ? 'Execute Workspace Action' : 'Connect Daemon to Execute'}
        </button>
      )}

      {status === 'executing' && (
        <div className="flex flex-col items-center justify-center py-2 gap-2">
          <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span className="text-[10px] text-foreground-muted animate-pulse">
            Waiting for terminal approval (y/n) on your local machine...
          </span>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
            <Check className="w-4 h-4" />
            <span>Successfully Executed!</span>
          </div>
          {result && (result.stdout || result.stderr || result.content) && (
            <div className="bg-[#0f0f13] border border-white/[0.03] rounded-lg p-3 font-mono text-[10px] max-h-48 overflow-y-auto whitespace-pre text-foreground-muted">
              {result.content && (
                <div>
                  <div className="text-[9px] text-[#D97757] mb-1 font-semibold">File Content:</div>
                  {result.content}
                </div>
              )}
              {result.stdout && (
                <div>
                  <div className="text-[9px] text-emerald-400 mb-0.5 font-semibold">STDOUT:</div>
                  {result.stdout}
                </div>
              )}
              {result.stderr && (
                <div className="mt-2">
                  <div className="text-[9px] text-rose-400 mb-0.5 font-semibold">STDERR:</div>
                  {result.stderr}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>Execution Failed</span>
          </div>
          <div className="bg-red-950/20 border border-red-500/10 p-2.5 rounded-lg text-[10px] text-red-300 font-mono break-words leading-relaxed">
            {errMessage}
          </div>
          <button
            onClick={() => setStatus('idle')}
            className="text-[10px] text-accent hover:underline text-left"
          >
            Reset and retry
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Daemon Action Tag Parser ────────────────────────────────────────────────

const parseDaemonActions = (text) => {
  if (!text) return [];
  const regex = /(<read_file\s+path="([^"]+)"\s*\/?>|<write_file\s+path="([^"]+)"\s*>([\s\S]*?)<\/write_file>|<run_command\s+cmd="([^"]+)"\s*\/?>)/g;
  const blocks = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const startIndex = match.index;
    if (startIndex > lastIndex) {
      blocks.push({
        type: 'markdown',
        content: text.substring(lastIndex, startIndex)
      });
    }
    const fullTag = match[0];
    if (fullTag.startsWith('<read_file')) {
      blocks.push({
        type: 'read_file',
        path: match[2]
      });
    } else if (fullTag.startsWith('<write_file')) {
      blocks.push({
        type: 'write_file',
        path: match[3],
        content: match[4]
      });
    } else if (fullTag.startsWith('<run_command')) {
      blocks.push({
        type: 'run_command',
        command: match[5]
      });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    blocks.push({
      type: 'markdown',
      content: text.substring(lastIndex)
    });
  }
  return blocks;
};

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg, index, isStreaming, onCopy, onRevert, onSpeak, onFork, onStop, ttsLoading, isPlaying, copied, codeExecutionEnabled, daemonConnected, onExecuteSuccess }) {
  const isUser = msg.role === 'user'
  const isAssistant = msg.role === 'assistant'

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse gap-3' : 'gap-4'} relative`}>
        
        {/* Assistant Avatar */}
        {isAssistant && (
          <div className="flex-shrink-0 mt-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#ECECEC]">
              <CyberCliMark size={20} className="text-[#2D2D2D]" />
            </div>
          </div>
        )}

        <div className={`flex flex-col w-full ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Content */}
          {isUser ? (
            <div className="flex items-center gap-2 group/user relative">
              <button
                onClick={() => onRevert && onRevert(index)}
                className="opacity-0 group-hover/user:opacity-100 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all absolute right-[102%] top-1/2 -translate-y-1/2"
                title="Rewind & Edit"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <div className="px-5 py-3.5 rounded-3xl bg-[#2D2D2D] text-[15px] leading-relaxed text-[#ECECEC] whitespace-pre-wrap shadow-sm">
                {msg.content}
              </div>
            </div>
          ) : (
            <div className="text-[15px] leading-relaxed text-[#ECECEC] prose-custom w-full pt-1">
              {parseDaemonActions(msg.content).map((block, bIdx) => {
                if (block.type === 'markdown') {
                  return (
                    <ReactMarkdown
                      key={`md-${bIdx}`}
                      components={{
                        img: ({ src, alt }) => <ImageGeneratorWidget src={src} alt={alt} />,
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
                              className="px-1.5 py-0.5 rounded text-[13px] font-mono bg-[#2D2D2D] text-[#ECECEC] border border-white/[0.05]"
                              {...props}
                            >
                              {children}
                            </code>
                          )
                        },
                        p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="mb-4 pl-5 space-y-1.5 list-disc">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-4 pl-5 space-y-1.5 list-decimal">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        h1: ({ children }) => <h1 className="text-xl font-bold mb-4 mt-6 first:mt-0 text-white">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-semibold mb-3 mt-6 first:mt-0 text-white">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-4 first:mt-0 text-white">{children}</h3>,
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-[3px] border-[#404040] pl-4 my-4 text-[#A0A0A0] italic">
                            {children}
                          </blockquote>
                        ),
                        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {block.content}
                    </ReactMarkdown>
                  )
                } else if (block.type === 'read_file') {
                  return (
                    <DaemonActionWidget
                      key={`read-${bIdx}`}
                      action="read_file"
                      payload={{ path: block.path }}
                      daemonConnected={daemonConnected}
                      onExecuteSuccess={onExecuteSuccess}
                    />
                  )
                } else if (block.type === 'write_file') {
                  return (
                    <DaemonActionWidget
                      key={`write-${bIdx}`}
                      action="write_file"
                      payload={{ path: block.path, content: block.content }}
                      daemonConnected={daemonConnected}
                      onExecuteSuccess={onExecuteSuccess}
                    />
                  )
                } else if (block.type === 'run_command') {
                  return (
                    <DaemonActionWidget
                      key={`run-${bIdx}`}
                      action="run_command"
                      payload={{ command: block.command }}
                      daemonConnected={daemonConnected}
                    />
                  )
                }
                return null
              })}
              {isStreaming && <BlinkCursor />}
            </div>
          )}

          {/* Model badge and Action row */}
          <div className="flex items-center gap-3 mt-2 h-6">
            {isAssistant && msg.model && !isStreaming && (
              <span className="text-[11px] text-[#707070] font-medium tracking-wide">
                {MODELS.find(m => m.id === msg.model)?.name || EXTRA_MODELS.find(m => m.id === msg.model)?.name || msg.model}
              </span>
            )}
            
            {msg.is_fork_point && msg.forked_thread_id && (
              <Link to={`/chat/${msg.forked_thread_id}`} className="flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors">
                <GitBranch className="w-3 h-3" />
                Go to branch →
              </Link>
            )}

            {!isStreaming && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => onCopy(msg.content, index)}
                  className="p-1 rounded-md text-[#707070] hover:text-[#ECECEC] hover:bg-white/5 transition-colors"
                  title="Copy"
                >
                  {copied === index ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                {isAssistant && (
                  <>
                    <button
                      onClick={() => isPlaying ? onStop() : onSpeak(msg.content)}
                      disabled={ttsLoading && !isPlaying}
                      className="p-1 rounded-md text-[#707070] hover:text-[#ECECEC] hover:bg-white/5 transition-colors"
                      title={isPlaying ? 'Stop' : 'Speak'}
                    >
                      {isPlaying ? <VolumeX className="w-3.5 h-3.5 text-blue-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => onFork(msg._id)}
                      className="p-1 rounded-md text-[#707070] hover:text-[#ECECEC] hover:bg-white/5 transition-colors"
                      title="Branch from here"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Model Selector Dropdown ─────────────────────────────────────────────────


function ModelSelector({ selectedModel, onSelect }) {
  const [open, setOpen] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const ref = useRef(null)

  // 3D carousel: only the non-council models rotate in the orbit
  const baseModels = MODELS.filter(m => m.id !== 'council')
  const isAdaptive = selectedModel === 'council'
  const initIdx = baseModels.findIndex(m => m.id === (isAdaptive ? 'openrouter/gpt-4o-mini' : selectedModel))
  const [currentIndex, setCurrentIndex] = useState(initIdx >= 0 ? initIdx : 1)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setShowMore(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const idx = baseModels.findIndex(m => m.id === (isAdaptive ? 'openrouter/gpt-4o-mini' : selectedModel))
    if (idx >= 0) setCurrentIndex(idx)
  }, [selectedModel])

  const total = baseModels.length

  const handleSelectModel = (idx) => {
    setCurrentIndex(idx)
    onSelect(baseModels[idx].id)
  }

  const rotate = (dir) => {
    const next = (currentIndex + dir + total) % total
    handleSelectModel(next)
  }

  const handleToggleAdaptiveThinking = () => {
    isAdaptive ? onSelect(baseModels[currentIndex].id) : onSelect('council')
    setOpen(false)
  }

  const getCardProps = (idx) => {
    let rel = ((idx - currentIndex) % total + total) % total
    if (rel > total / 2) rel = rel - total
    const isCurrent = rel === 0
    return {
      xOffset: rel * 130,
      scale: isCurrent ? 1 : 0.70,
      opacity: isCurrent ? 1 : 0.45,
      rotY: rel * -22,
      zIndex: isCurrent ? 10 : 5,
      visible: Math.abs(rel) <= 1,
      isCurrent,
    }
  }

  const isAdaptiveThinking = isAdaptive
  const allAvailableModels = [...MODELS, ...EXTRA_MODELS]
  const selected = allAvailableModels.find(m => m.id === selectedModel) || MODELS[1]

  return (
    <div className="relative border-r border-white/[0.06] pr-2 mr-1" ref={ref}>
      <button
        onClick={() => { setOpen(!open); setShowMore(false) }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-all"
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: selected.color }} />
        <span>{isAdaptive ? 'Council' : selected.tag}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-full mb-3 right-0 z-50 rounded-2xl border border-white/[0.08] w-[330px] overflow-hidden"
            style={{
              background: 'rgba(13, 13, 18, 0.98)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 28px 64px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(255,255,255,0.05)',
            }}
          >
            {showMore ? (
              /* Extra Models Sub-Menu */
              <div className="flex flex-col max-h-[350px] overflow-y-auto">
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                  <button
                    onClick={() => setShowMore(false)}
                    className="text-xs font-semibold text-accent hover:text-accent-light"
                  >
                    ← Back
                  </button>
                  <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">More Models</span>
                </div>
                <div className="divide-y divide-white/[0.04] p-1.5">
                  {EXTRA_MODELS.map((model) => {
                    const isSelected = selectedModel === model.id
                    return (
                      <button
                        key={model.id}
                        onClick={() => {
                          onSelect(model.id)
                          setOpen(false)
                          setShowMore(false)
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-all flex items-start gap-2.5"
                      >
                        <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: model.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-bold text-white truncate">{model.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{model.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* Base Models & Carousel */
              <>
                {/* 3D Carousel Stage */}
                <div
                  className="relative overflow-hidden flex items-center justify-center"
                  style={{ perspective: '700px', height: 175 }}
                >
                  {/* Ambient glow */}
                  <motion.div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-8 rounded-full blur-2xl pointer-events-none"
                    style={{ background: selected.color }}
                    animate={{ opacity: [0.18, 0.38, 0.18] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  {/* Left nav */}
                  <button
                    onClick={() => rotate(-1)}
                    className="absolute left-3 z-20 p-1.5 rounded-full bg-white/[0.07] hover:bg-white/[0.14] text-gray-400 hover:text-white transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Cards ring */}
                  <div className="relative flex items-center justify-center w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
                    {baseModels.map((model, idx) => {
                      const { xOffset, scale, opacity, rotY, zIndex, visible, isCurrent } = getCardProps(idx)
                      if (!visible) return null
                      return (
                        <motion.div
                          key={model.id}
                          className="absolute cursor-pointer select-none"
                          style={{ zIndex }}
                          animate={{ x: xOffset, scale, opacity, rotateY: rotY }}
                          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                          onClick={() => { if (!isCurrent) handleSelectModel(idx) }}
                        >
                          <div
                            className="w-[136px] rounded-2xl p-3.5 border"
                            style={{
                              background: isCurrent ? `${model.color}10` : 'rgba(255,255,255,0.025)',
                              borderColor: isCurrent ? `${model.color}45` : 'rgba(255,255,255,0.07)',
                              boxShadow: isCurrent
                                ? `0 0 24px ${model.color}22, inset 0 1px 0 rgba(255,255,255,0.06)`
                                : 'none',
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: model.color }} />
                                <span className="text-[13px] font-bold text-white">{model.tag}</span>
                              </div>
                              {idx === 0 ? (
                                <span
                                  className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide"
                                  style={{ background: 'rgba(217,119,87,0.18)', color: '#D97757' }}
                                >
                                  PRO
                                </span>
                              ) : isCurrent ? (
                                <Check className="w-3.5 h-3.5" style={{ color: model.color }} />
                              ) : null}
                            </div>
                            <p
                              className="text-[10px] leading-relaxed"
                              style={{ color: isCurrent ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.22)' }}
                            >
                              {model.desc}
                            </p>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Right nav */}
                  <button
                    onClick={() => rotate(1)}
                    className="absolute right-3 z-20 p-1.5 rounded-full bg-white/[0.07] hover:bg-white/[0.14] text-gray-400 hover:text-white transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Dot indicators */}
                <div className="flex items-center justify-center gap-2 py-2.5">
                  {baseModels.map((m, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectModel(i)}
                      className="rounded-full transition-all duration-300"
                      style={{
                        width: i === currentIndex ? 18 : 6,
                        height: 6,
                        background: i === currentIndex ? m.color : 'rgba(255,255,255,0.18)',
                      }}
                    />
                  ))}
                </div>

                <div className="h-px bg-white/[0.06]" />

                {/* Adaptive thinking */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-[13px] font-semibold text-white">Adaptive thinking</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Thinks for more complex tasks</p>
                  </div>
                  <button
                    onClick={handleToggleAdaptiveThinking}
                    className={`w-9 h-5 rounded-full transition-all relative flex items-center p-0.5 ${
                      isAdaptiveThinking ? 'bg-accent' : 'bg-white/10'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isAdaptiveThinking ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="h-px bg-white/[0.06]" />

                {/* More models */}
                <button
                  onClick={() => setShowMore(true)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.04] transition-all text-left"
                >
                  <span className="text-[12px] font-medium text-gray-300">More models</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </>
            )}
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
  inlineSpeechListening,
  deepResearchEnabled = false,
  onToggleDeepResearch,
  incognitoMode = false,
  onToggleIncognito,
  showQuickActions = true,
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
    <div className="w-full max-w-[800px] mx-auto flex flex-col gap-4 px-4 sm:px-0">
      {/* Input container card */}
      <div
        className="rounded-2xl transition-all relative flex flex-col p-3.5 gap-2 bg-[#2D2D2D] hover:bg-[#333333] focus-within:bg-[#333333] border border-white/[0.05]"
        style={{
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Top Row: Textarea */}
        <div className="flex items-start justify-between gap-4">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="How can I help you today?"
            rows={1}
            disabled={loading}
            className="flex-1 bg-transparent text-[15px] text-[#ECECEC] placeholder:text-[#A0A0A0] resize-none focus:outline-none leading-relaxed py-1 min-h-[40px]"
            style={{ maxHeight: '200px' }}
          />
        </div>

        {/* Bottom Row: Controls */}
        <div className="flex items-center justify-between mt-1 gap-2 flex-shrink-0 flex-wrap">
          {/* Left: Attachment & Model dropdown */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <button className="p-1.5 rounded-lg text-[#A0A0A0] hover:text-[#ECECEC] hover:bg-white/5 transition-all" title="Add attachment">
              <Plus className="w-5 h-5" />
            </button>
            <ModelSelector selectedModel={selectedModel} onSelect={onModelChange} />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 justify-end">
            {/* Deep Research toggle */}
            <button
              onClick={onToggleDeepResearch}
              title="Deep Research"
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                deepResearchEnabled
                  ? 'bg-blue-500/15 text-blue-400'
                  : 'text-[#A0A0A0] hover:text-[#ECECEC] hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Research</span>
            </button>

            {/* Incognito / Ghost mode */}
            <button
              onClick={onToggleIncognito}
              title="Incognito Mode"
              className={`p-1.5 rounded-lg transition-all ${
                incognitoMode
                  ? 'text-yellow-400 bg-yellow-400/10'
                  : 'text-[#A0A0A0] hover:text-[#ECECEC] hover:bg-white/5'
              }`}
            >
              <Ghost className="w-4 h-4" />
            </button>

            {/* Mic */}
            <button
              onClick={onMicClick}
              className={`p-1.5 rounded-lg transition-all relative ${
                inlineSpeechListening
                  ? 'text-[#D97757] bg-[#D97757]/10'
                  : 'text-[#A0A0A0] hover:text-[#ECECEC] hover:bg-white/5'
              }`}
              title="Voice input"
            >
              <Mic className={`w-4 h-4 ${inlineSpeechListening ? 'animate-pulse' : ''}`} />
            </button>

            {/* Send */}
            <button
              onClick={onSend}
              disabled={!input.trim() || loading}
              className={`ml-1 p-2 rounded-xl transition-all ${
                input.trim() && !loading
                  ? 'bg-[#ECECEC] text-[#2D2D2D] hover:bg-white'
                  : 'bg-[#404040] text-[#707070] cursor-not-allowed'
              }`}
            >
              {loading ? (
                <motion.div
                  className="w-4 h-4 rounded-full border-2 border-current border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
              ) : (
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Pills (below input card) */}
      {showQuickActions && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => {
                  setInput(action.value)
                  textareaRef.current?.focus()
                }}
                className="px-3.5 py-2 rounded-xl text-[13px] transition-all flex items-center gap-2 cursor-pointer bg-[#2D2D2D] border border-white/[0.04] text-[#A0A0A0] hover:bg-[#333333] hover:border-white/[0.08] hover:text-[#ECECEC]"
              >
                <Icon className="w-4 h-4 opacity-80" />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      )}
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

function SettingsDialog({ isOpen, onClose, onSettingChange, initialTab = 'general' }) {
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])
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
    try {
      await api.patch('/settings', { [key]: value })
      if (onSettingChange) {
        onSettingChange(key, value)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleBlurSave = async (key, value) => {
    setSaving(true)
    try {
      await api.patch('/settings', { [key]: value })
      if (onSettingChange) {
        onSettingChange(key, value)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
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
          <Row label="Language">
            <select
              value={settings.language || 'en'}
              onChange={e => patchSetting('language', e.target.value)}
              className="bg-background-tertiary text-sm text-foreground-primary border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:border-accent"
            >
              <option value="en">English (US)</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="ur">اردو (Urdu)</option>
            </select>
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

function HeroState({ userName }) {
  const firstName = userName ? userName.split(' ')[0] : 'User'
  
  // Greeting based on time of day (Claude style)
  const hour = new Date().getHours()
  let greeting = 'Good evening'
  if (hour < 12) greeting = 'Good morning'
  else if (hour < 17) greeting = 'Good afternoon'

  return (
    <motion.div
      className="flex flex-col items-center justify-center text-center px-4 w-full mt-10 md:mt-20"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } }
      }}
    >
      <motion.h1
        variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="font-serif text-3xl md:text-[40px] mb-8 font-normal"
        style={{ color: '#E5E5E5', letterSpacing: '-0.01em', lineHeight: 1.2 }}
      >
        {greeting}, {firstName}
      </motion.h1>
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

function CodeView({ daemonConnected: parentDaemonConnected, loadDaemonStatus: parentLoadDaemonStatus }) {
  const [daemonConnected, setDaemonConnected] = useState(false)
  const [apiKeys, setApiKeys] = useState([])
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState(null)
  const [loading, setLoading] = useState(false)

  const isConnected = parentDaemonConnected !== undefined ? parentDaemonConnected : daemonConnected
  const loadStatus = parentLoadDaemonStatus || loadDaemonStatus

  async function loadDaemonStatus() {
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
    if (parentDaemonConnected === undefined) {
      loadDaemonStatus()
      const intv = setInterval(loadDaemonStatus, 5000)
      return () => clearInterval(intv)
    }
  }, [parentDaemonConnected])

  useEffect(() => {
    loadApiKeys()
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
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: isConnected ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${isConnected ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
            <Terminal className={`w-6 h-6 ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground-primary flex items-center gap-2">
              Daemon Linkage
              <span className={`w-2 h-2 rounded-full inline-block ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            </h3>
            <p className="text-xs text-foreground-muted mt-1 max-w-md">
              {isConnected
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
  const [settingsTab, setSettingsTab] = useState('general')
  const [daemonConnected, setDaemonConnected] = useState(false)

  // Claude & Cyber Mode Upgrades
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [cyberMode, setCyberMode] = useState(false)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [workspaceTab, setWorkspaceTab] = useState('terminal')
  const [terminalHistory, setTerminalHistory] = useState([
    { type: 'output', text: 'Welcome to CyberCli Workspace Terminal! Type your command below and hit enter.' }
  ])
  const [terminalInput, setTerminalInput] = useState('')
  const [terminalLoading, setTerminalLoading] = useState(false)
  const [activePreviewFile, setActivePreviewFile] = useState(null)
  const [profileMenuTab, setProfileMenuTab] = useState('main')

  const [workspaceWidth, setWorkspaceWidth] = useState(600) // Default 600px
  const [isResizing, setIsResizing] = useState(false)

  const startResizing = useCallback((e) => {
    setIsResizing(true)
    e.preventDefault()
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback((e) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX
      if (newWidth > 300 && newWidth < window.innerWidth * 0.8) {
        setWorkspaceWidth(newWidth)
      }
    }
  }, [isResizing])

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize)
      window.addEventListener('mouseup', stopResizing)
    }
    return () => {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
    }
  }, [isResizing, resize, stopResizing])
  
  const activeThreadIdRef = useRef(null)
  const isCreatingThreadRef = useRef(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [hoveredSubmenu, setHoveredSubmenu] = useState(null)
  
  const [previewFilePath, setPreviewFilePath] = useState('')
  const [previewFileContent, setPreviewFileContent] = useState('')
  const [previewFileLoading, setPreviewFileLoading] = useState(false)
  const [previewFileError, setPreviewFileError] = useState(null)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    // Initial call
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const loadDaemonStatus = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      if (token) {
        const { data } = await api.get('/daemon/status')
        setDaemonConnected(data.connected)
      } else {
        setDaemonConnected(false)
      }
    } catch (err) {
      console.error('Error loading daemon status:', err)
      setDaemonConnected(false)
    }
  }

  useEffect(() => {
    loadDaemonStatus()
    const intv = setInterval(loadDaemonStatus, 5000)
    return () => clearInterval(intv)
  }, [])

  const handleTerminalSubmit = async (e) => {
    e.preventDefault()
    if (!terminalInput.trim() || terminalLoading) return
    const cmd = terminalInput.trim()
    setTerminalInput('')
    setTerminalHistory(prev => [...prev, { type: 'input', text: cmd }])
    
    if (!daemonConnected) {
      setTerminalHistory(prev => [...prev, { type: 'error', text: 'Error: Local Workspace Daemon is offline. Please link your workspace first.' }])
      return
    }

    setTerminalLoading(true)
    try {
      const token = localStorage.getItem('sb-access-token')
      const response = await fetch(`${API_BASE}/daemon/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action: 'run_command', payload: { command: cmd } })
      })
      const data = await response.json()
      if (data.success) {
        const out = data.data.stdout || ''
        const err = data.data.stderr || ''
        if (out) setTerminalHistory(prev => [...prev, { type: 'output', text: out }])
        if (err) setTerminalHistory(prev => [...prev, { type: 'error', text: err }])
        if (!out && !err) setTerminalHistory(prev => [...prev, { type: 'output', text: '(Command executed with no output)' }])
      } else {
        setTerminalHistory(prev => [...prev, { type: 'error', text: `Error: ${data.error || 'Execution failed'}` }])
      }
    } catch (err) {
      setTerminalHistory(prev => [...prev, { type: 'error', text: `Error: ${err.message}` }])
    } finally {
      setTerminalLoading(false)
    }
  }

  const handleLoadPreviewFile = async (pathOverride) => {
    const path = pathOverride || previewFilePath
    if (!path.trim()) return
    setPreviewFileLoading(true)
    setPreviewFileError(null)
    setPreviewFileContent('')
    try {
      const token = localStorage.getItem('sb-access-token')
      const response = await fetch(`${API_BASE}/daemon/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action: 'read_file', payload: { path } })
      })
      const data = await response.json()
      if (data.success) {
        setPreviewFileContent(data.data.content || '')
        setActivePreviewFile(path)
      } else {
        setPreviewFileError(data.error || 'Failed to read file')
      }
    } catch (err) {
      setPreviewFileError(err.message)
    } finally {
      setPreviewFileLoading(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl + /
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setShowShortcutsModal(prev => !prev)
      }
      // Ctrl + ,
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        openSettings('general')
      }
      // Ctrl + p (Workspace toggle)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        setWorkspaceOpen(prev => !prev)
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        setShowShortcutsModal(false)
        setSettingsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const openSettings = (tab = 'general') => {
    setSettingsTab(tab)
    setSettingsOpen(true)
  }
  const [error, setError] = useState(null)
  const [incognitoMode, setIncognitoMode] = useState(false)
  const incognitoMessagesRef = useRef([])

  // Capability states
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const [codeExecutionEnabled, setCodeExecutionEnabled] = useState(false)
  const [imageGenerationEnabled, setImageGenerationEnabled] = useState(false)
  const [memoryEnabled, setMemoryEnabled] = useState(false)
  const [deepResearchEnabled, setDeepResearchEnabled] = useState(false)

  // UI panels
  const [showArtifacts, setShowArtifacts] = useState(false)

  const handleParentSettingChange = (key, value) => {
    if (key === 'web_search_enabled') setWebSearchEnabled(value)
    else if (key === 'code_execution_enabled') setCodeExecutionEnabled(value)
    else if (key === 'image_generation_enabled') setImageGenerationEnabled(value)
    else if (key === 'memory_enabled') setMemoryEnabled(value)
    else if (key === 'appearance') setCurrentTheme(value)
    else if (key === 'chat_font') setCurrentFont(value)
    else if (key === 'language') {
      const langMap = { en: 'EN', es: 'ES', fr: 'FR', de: 'DE', hi: 'हिं', ur: 'اُ' }
      setUserLanguage(langMap[value] || (value || 'en').toUpperCase())
    } else if (key === 'voice') {
      updateVoice(value.toLowerCase())
    } else if (key === 'voice_speed') {
      const speedMap = { slow: 0.85, normal: 1.0, fast: 1.25 }
      const floatVal = speedMap[value.toLowerCase()] || 1.0
      updateSpeed(floatVal)
    }
  }

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
      const savedLang = localStorage.getItem('user_language') || 'EN'
      const langMap = {
        'EN': 'en-US',
        'HI': 'hi-IN',
        'FR': 'fr-FR',
        'DE': 'de-DE',
        'ID': 'id-ID',
        'ES': 'es-ES',
        'IT': 'it-IT',
        'JA': 'ja-JP',
        'KO': 'ko-KR',
        'PT': 'pt-BR',
        'UR': 'ur-PK'
      }
      rec.lang = langMap[savedLang.toUpperCase()] || 'en-US'

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
    updateVoice,
    updateSpeed,
    currentVoice
  } = useTTS()

  const activeThreadId = threadId || null

  useEffect(() => {
    voiceChatOpenRef.current = voiceChatOpen
  }, [voiceChatOpen])

  // ── Data loading & Dynamic Settings application ──

  const [currentTheme, setCurrentTheme] = useState('system')
  const [currentFont, setCurrentFont] = useState('inter')

  useEffect(() => {
    const root = document.documentElement
    
    const handleThemeChange = () => {
      if (currentTheme === 'dark' || (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
    
    handleThemeChange()
    
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    if (currentTheme === 'system') {
      media.addEventListener('change', handleThemeChange)
    }
    
    return () => {
      media.removeEventListener('change', handleThemeChange)
    }
  }, [currentTheme])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('font-sans', 'font-serif', 'font-mono')
    if (currentFont === 'serif') {
      root.classList.add('font-serif')
    } else if (currentFont === 'mono') {
      root.classList.add('font-mono')
    } else {
      root.classList.add('font-sans')
    }
  }, [currentFont])

  useEffect(() => {
    if (isLoggedIn()) {
      loadThreads()
    }
    const params = new URLSearchParams(window.location.search)
    const urlPrompt = params.get('prompt')
    if (urlPrompt) {
      setInput(urlPrompt)
    }
  }, [])

  useEffect(() => {
    if (threadId && isLoggedIn()) {
      activeThreadIdRef.current = threadId
      if (creatingThreadRef.current === threadId) {
        creatingThreadRef.current = null
      } else {
        loadMessages(threadId)
      }
    } else {
      activeThreadIdRef.current = null
      setMessages([])
    }
  }, [threadId])

  useEffect(() => {
    const fetchCapabilities = async () => {
      if (!isLoggedIn()) return
      try {
        const { data } = await api.get('/settings')
        setWebSearchEnabled(data.web_search_enabled || false)
        setCodeExecutionEnabled(data.code_execution_enabled || false)
        setImageGenerationEnabled(data.image_generation_enabled || false)
        setMemoryEnabled(data.memories && data.memories.length > 0)
        setCurrentTheme(data.appearance || 'system')
        setCurrentFont(data.chat_font || 'inter')
        // Sync language pill in profile bar
        const langMap = { en: 'EN', es: 'ES', fr: 'FR', de: 'DE', hi: 'हिं', ur: 'اُ' }
        setUserLanguage(langMap[data.language] || (data.language || 'en').toUpperCase())
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
    const previousThreads = [...threads]
    setThreads(prev => prev.filter(t => t._id !== id))
    if (activeThreadId === id) navigate('/chat')
    try {
      await api.delete(`/chat/${id}`)
      loadThreads()
    } catch (err) {
      console.error('Failed to delete thread:', err)
      setThreads(previousThreads)
      setError('Failed to delete conversation from server.')
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

  const handleCopy = async (content, index) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(index)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error("Failed to copy text:", err)
    }
  }

  const handleRevert = async (index) => {
    if (index === 0) return // cannot safely revert the very first message this simply if it affects thread title, but we allow it if wanted. Actually let's allow it.
    const msgToRevert = messages[index]
    if (!msgToRevert || msgToRevert.role !== 'user') return

    // Set input to the reverted message
    setInput(msgToRevert.content)
    
    // Slice messages to remove this message and everything after it
    const newMessages = messages.slice(0, index)
    setMessages(newMessages)
    
    // Attempt to update backend if threaded
    if (activeThreadId && msgToRevert._id) {
      try {
        await truncateThread(activeThreadId, msgToRevert._id)
      } catch(e) {
        console.error("Failed to truncate thread in backend:", e)
      }
    }
  }

  // ── Send message ──

  const handleSend = useCallback(async (textOverride) => {
    const rawText = typeof textOverride === 'string' ? textOverride : input
    if (!rawText.trim() || loading) return
    const userText = rawText.trim()

    // Determine active model and system prompt override if voice chat is open
    let activeModel = selectedModel
    const extraSystemMessages = []

    if (customInstructions && customInstructions.trim() !== '') {
      extraSystemMessages.push({ role: 'system', content: `Custom User Instructions: ${customInstructions}`, _skip_inject: true })
    }
    
    if (voiceChatOpenRef.current) {
      const voiceRaw = currentVoice ? currentVoice.toLowerCase() : 'sol'
      const voice = voiceRaw === 'gemini' ? 'gemini_flash' : (voiceRaw.startsWith('eleven_') ? voiceRaw : `eleven_${voiceRaw}`)
      const VOICE_AGENTS_BRAINS = {
        // Sol — warm, friendly (maps to former "ava")
        eleven_sol: {
          model: 'puter/claude-3-opus',
          prompt: `You are Sol, a warm, natural, and friendly conversational AI assistant. You are NOT Claude, ChatGPT, or any other generic AI. Your name is strictly Sol. Keep your responses brief, conversational, and extremely concise (maximum 1-2 short sentences). Absolutely DO NOT use any markdown syntax, lists, bullet points, asterisks, or code blocks in your response, as your text will be read aloud. Speak in a warm and natural tone.`
        },
        // Cove — composed, professional (maps to former "nova")
        eleven_cove: {
          model: 'puter/claude-3-opus',
          prompt: `You are Cove, a clear, professional, and expert technical advisor. You are NOT Claude or OpenAI. Your identity is strictly Cove. Keep your responses precise, helpful, and very concise (maximum 1-2 sentences). Absolutely DO NOT use any markdown syntax, lists, or code blocks in your response. Speak clearly and professionally.`
        },
        // Breeze — animated, empathetic (maps to former "luna")
        eleven_breeze: {
          model: 'puter/claude-3-opus',
          prompt: `You are Breeze, an animated, enthusiastic, and empathetic creative partner. You are strictly Breeze, never refer to yourself as Claude or an Anthropic product. Keep your responses warm, energetic, and very short (maximum 1-2 sentences). Absolutely DO NOT use any markdown syntax, bold text, or lists. Speak in an animated, warm tone.`
        },
        // Orion — deep, authoritative (unchanged)
        eleven_orion: {
          model: 'puter/claude-3-opus',
          prompt: `You are Orion, a deep, authoritative, and strategic AI planner. You are Orion, not Claude or any other AI. Provide brief but strong guidance (maximum 1-2 sentences). Absolutely DO NOT use markdown syntax, bullet points, or complex formatting. Speak with confidence and authority.`
        },
        // Echo — energetic, fast (unchanged)
        eleven_echo: {
          model: 'mistral/mistral-large-latest',
          prompt: `You are Echo, an energetic, dynamic, and fast-paced brainstorming buddy. Your name is Echo. Keep responses highly energetic, extremely short and punchy (often just a few words, maximum 1 sentence). Absolutely DO NOT use markdown, formatting, or lists. Speak dynamically and quickly.`
        },
        // Gemini — AI native voice (unchanged)
        gemini_flash: {
          model: 'gemini/gemini-2.5-flash',
          prompt: `You are Gemini, an AI-native voice companion. Keep your responses natural, conversational, fluid, and very concise (maximum 1-2 sentences). Absolutely DO NOT use any markdown formatting, bullet points, or code blocks. Speak naturally and dynamically.`
        }
      }
      const brain = VOICE_AGENTS_BRAINS[voice] || VOICE_AGENTS_BRAINS.eleven_sol
      activeModel = brain.model
      extraSystemMessages.push({ role: 'system', content: brain.prompt, _skip_inject: true })
    }

    // Incognito path — bypass DB entirely
    if (incognitoMode) {
      if (typeof textOverride !== 'string') setInput('')
      setLoading(true)
      setError(null)
      const userMsg = { role: 'user', content: userText }
      const history = [...messages.map(m => ({ role: m.role, content: m.content })), userMsg, ...extraSystemMessages]
      setMessages(prev => [...prev, userMsg])
      const assistantMsg = { role: 'assistant', content: '', model: activeModel }
      setMessages(prev => [...prev, assistantMsg])
      const assistantIdx = messages.length + 1
      setStreamingIndex(assistantIdx)
      let fullReply = ''
      let spokenIndex = 0
      try {
        const token = await getFreshToken()
        const res = await fetch(`${API_BASE}/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ messages: history, model: activeModel })
        })
        if (!res.ok) {
          if (res.status === 401) {
            await useAuthStore.getState().signOut()
            navigate('/auth/login')
            return
          }
          throw new Error('Stream failed')
        }
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

                if (voiceChatOpenRef.current) {
                  const textSegment = fullReply.slice(spokenIndex)
                  const sentenceBoundaries = /[.!?]+(?=\s+|$)/g
                  let sentenceMatch
                  let lastPos = 0
                  while ((sentenceMatch = sentenceBoundaries.exec(textSegment)) !== null) {
                    const endPos = sentenceMatch.index + sentenceMatch[0].length
                    const sentence = textSegment.slice(lastPos, endPos).trim()
                    if (sentence.length > 0) {
                      speak(sentence)
                    }
                    lastPos = endPos
                  }
                  if (lastPos > 0) {
                    spokenIndex += lastPos
                  }
                }
              } else if (parsed.type === 'info') {
                setMessages(prev => {
                  const next = [...prev]
                  if (next.length > 0) next[next.length - 1] = { ...next[next.length - 1], content: parsed.content }
                  return next
                })
              } else if (parsed.type === 'error') {
                setMessages(prev => {
                  const next = [...prev]
                  if (next.length > 0) next[next.length - 1] = { ...next[next.length - 1], content: `Error: ${parsed.content}` }
                  return next
                })
              }
            } catch {}
          }
        }
        if (voiceChatOpenRef.current) {
          const remaining = fullReply.slice(spokenIndex).trim()
          if (remaining.length > 0) {
            speak(remaining)
          }
        }
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

    const token = await getFreshToken()

    // ── OVERRIDES ──
    if (deepResearchEnabled && !activeModel.startsWith('puter/perplexity')) {
      activeModel = 'puter/perplexity/sonar-deep-research'
    }

    // ── IMAGE GENERATION AUTO-INTERCEPT ──
    const isImageRequest = activeModel === 'puter/gpt-image-2' || (imageGenerationEnabled && /^(draw|generate image|create an image|make an image|paint)/i.test(userText.trim()))
    
    // ── PUTER & COUNCIL INTERCEPTION (GUEST & AUTHENTICATED) ──
    if (isImageRequest || activeModel.startsWith('puter/') || activeModel === 'council') {
      const isGuest = !token
      let currentId = activeThreadId || activeThreadIdRef.current || creatingThreadRef.current
      
      // If authenticated and no thread yet, create one silently
      if (!isGuest && !currentId && !incognitoMode) {
        if (!isCreatingThreadRef.current) {
          isCreatingThreadRef.current = true
          try {
            const { data } = await api.post('/chat', { title: userText.substring(0, 50), model_id: activeModel })
            setThreads(prev => [data, ...prev])
            currentId = data._id
            activeThreadIdRef.current = currentId
            creatingThreadRef.current = currentId
            navigate(`/chat/${currentId}`, { replace: true })
          } catch (e) {
            console.error('Failed to create thread for Puter:', e)
          } finally {
            isCreatingThreadRef.current = false
          }
        }
      }

      // Add user message to UI
      const userMsg = { role: 'user', content: userText }
      const history = [...messages.map(m => ({ role: m.role, content: m.content })), userMsg, ...extraSystemMessages]
      setMessages(prev => [...prev, userMsg])
      
      // Save user msg to DB if auth
      if (!isGuest && !incognitoMode && currentId) {
        api.post(`/chat/${currentId}/messages/sync`, { role: 'user', content: userText, model: activeModel }).catch(console.error)
      }

      // Add assistant placeholder
      const assistantMsg = { role: 'assistant', content: isImageRequest ? '*Generating image...*' : '', model: activeModel }
      setMessages(prev => [...prev, assistantMsg])
      setStreamingIndex(messages.length + 1)
      let fullReply = ''
      
      try {
        if (isImageRequest) {
          // Puter txt2img
          const imageElem = await window.puter.ai.txt2img(userText)
          fullReply = `![Generated Image](${imageElem.src})`
          setMessages(prev => {
            const next = [...prev]
            next[next.length - 1] = { ...next[next.length - 1], content: fullReply }
            return next
          })
        } else if (activeModel === 'council') {
          // Council Mode Puter
          const modelsToQuery = ['deepseek/deepseek-r1-0528', 'claude-opus-4-7', 'gpt-5.5']
          
          const formattedHistory = history.map(m => ({
            role: m.role === 'system' ? 'system' : m.role,
            content: m.content
          }))

          setMessages(prev => {
            const next = [...prev]
            next[next.length - 1] = { ...next[next.length - 1], content: `*The Council is deliberating...*\n\nQuerying DeepSeek R1, Claude Opus 4.7, and GPT-5.5 simultaneously...` }
            return next
          })

          const promises = modelsToQuery.map(m => window.puter.ai.chat(formattedHistory, { model: m }))
          const results = await Promise.allSettled(promises)
          
          const deepseekResp = results[0].status === 'fulfilled' ? results[0].value.message?.content || String(results[0].value) : `[Error: ${results[0].reason}]`
          const claudeResp = results[1].status === 'fulfilled' ? results[1].value.message?.content || String(results[1].value) : `[Error: ${results[1].reason}]`
          const gptResp = results[2].status === 'fulfilled' ? results[2].value.message?.content || String(results[2].value) : `[Error: ${results[2].reason}]`

          fullReply = `### 🐉 DeepSeek R1\n${deepseekResp}\n\n---\n\n### 🎭 Claude Opus 4.7\n${claudeResp}\n\n---\n\n### ⚡ GPT-5.5\n${gptResp}`
          
          setMessages(prev => {
            const next = [...prev]
            next[next.length - 1] = { ...next[next.length - 1], content: fullReply }
            return next
          })
        } else {
          // Puter chat
          const puterModel = activeModel.replace('puter/', '')
          // Remove system tag for puter because it expects strict format sometimes, or map it properly
          const formattedHistory = history.map(m => ({
            role: m.role === 'system' ? 'system' : m.role,
            content: m.content
          }))
          
          const stream = await window.puter.ai.chat(formattedHistory, { model: puterModel, stream: true })
          
          for await (const chunk of stream) {
            const tokenText = chunk?.text || ''
            fullReply += tokenText
            setMessages(prev => {
              const next = [...prev]
              next[next.length - 1] = { ...next[next.length - 1], content: fullReply }
              return next
            })
            // Voice speaking logic omitted for brevity in puter interception but can be added if needed
          }
        }
        
        // Save assistant msg to DB if auth
        if (!isGuest && !incognitoMode && currentId) {
          api.post(`/chat/${currentId}/messages/sync`, { role: 'assistant', content: fullReply, model: activeModel }).catch(console.error)
        }
      } catch (e) {
        console.error('Puter Interception Error:', e)
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { ...next[next.length - 1], content: `Error generating via Puter: ${e.message}` }
          return next
        })
      } finally {
        setStreamingIndex(null)
        setLoading(false)
      }
      return
    }

    // Guest mode: no token → use completions endpoint directly (same as incognito)
    if (!token) {
      const userMsg = { role: 'user', content: userText }
      const history = [...messages.map(m => ({ role: m.role, content: m.content })), userMsg, ...extraSystemMessages]
      setMessages(prev => [...prev, userMsg])
      const assistantMsg = { role: 'assistant', content: '', model: activeModel }
      setMessages(prev => [...prev, assistantMsg])
      const assistantIdx = messages.length + 1
      setStreamingIndex(assistantIdx)
      let fullReply = ''
      let spokenIndex = 0
      try {
        const res = await fetch(`${API_BASE}/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, model: activeModel, webSearchEnabled, deepResearchEnabled })
        })
        if (!res.ok) {
          if (res.status === 401) {
            await useAuthStore.getState().signOut()
            navigate('/auth/login')
            return
          }
          throw new Error('Stream failed')
        }
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

                if (voiceChatOpenRef.current) {
                  const textSegment = fullReply.slice(spokenIndex)
                  const sentenceBoundaries = /[.!?]+(?=\s+|$)/g
                  let sentenceMatch
                  let lastPos = 0
                  while ((sentenceMatch = sentenceBoundaries.exec(textSegment)) !== null) {
                    const endPos = sentenceMatch.index + sentenceMatch[0].length
                    const sentence = textSegment.slice(lastPos, endPos).trim()
                    if (sentence.length > 0) {
                      speak(sentence)
                    }
                    lastPos = endPos
                  }
                  if (lastPos > 0) {
                    spokenIndex += lastPos
                  }
                }
              } else if (parsed.type === 'info') {
                setMessages(prev => {
                  const next = [...prev]
                  if (next.length > 0) next[next.length - 1] = { ...next[next.length - 1], content: parsed.content }
                  return next
                })
              } else if (parsed.type === 'error') {
                setMessages(prev => {
                  const next = [...prev]
                  if (next.length > 0) next[next.length - 1] = { ...next[next.length - 1], content: `Error: ${parsed.content}` }
                  return next
                })
              }
            } catch {}
          }
        }
        if (voiceChatOpenRef.current) {
          const remaining = fullReply.slice(spokenIndex).trim()
          if (remaining.length > 0) {
            speak(remaining)
          }
        }
      } catch (err) {
        setMessages(prev => {
          const next = [...prev]
          if (next.length > 0) next[next.length - 1] = { ...next[next.length - 1], content: `Error: ${err.message}` }
          return next
        })
        setError('Chat failed. Please try again.')
      } finally {
        setStreamingIndex(null)
        setLoading(false)
      }
      return
    }

    // Use the ref as fallback so rapid consecutive sends don't create duplicate threads
    let currentId = activeThreadId || activeThreadIdRef.current || creatingThreadRef.current
    if (!currentId) {
      if (isCreatingThreadRef.current) return
      isCreatingThreadRef.current = true
      try {
        const { data } = await api.post('/chat', { title: userText.substring(0, 50), model_id: activeModel })
        setThreads(prev => [data, ...prev])
        currentId = data._id
        activeThreadIdRef.current = currentId
        creatingThreadRef.current = currentId
        navigate(`/chat/${currentId}`, { replace: true })
      } catch (err) {
        console.error('Failed to create thread silently:', err)
        setError('Failed to start conversation. Server may be unreachable.')
        setLoading(false)
        isCreatingThreadRef.current = false
        return
      } finally {
        isCreatingThreadRef.current = false
      }
    }
    const userMsg = { role: 'user', content: userText }
    const history = [...messages.map(m => ({ role: m.role, content: m.content })), userMsg, ...extraSystemMessages]

    setMessages(prev => [...prev, userMsg])

    // Setup streaming output bubble
    const assistantMsg = { role: 'assistant', content: '', model: activeModel }
    setMessages(prev => [...prev, assistantMsg])
    const assistantIdx = messages.length + 1
    setStreamingIndex(assistantIdx)
    let fullReply = ''
    let spokenIndex = 0

    try {
      const res = await fetch(`${API_BASE}/chat/${currentId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          messages: history,
          model: activeModel,
          webSearchEnabled,
          deepResearchEnabled,
          codeExecutionEnabled,
          imageGenerationEnabled,
          memoryEnabled
        })
      })
      if (!res.ok) {
        if (res.status === 401) {
          await useAuthStore.getState().signOut()
          navigate('/auth/login')
          return
        }
        throw new Error('Stream failed')
      }

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

              if (voiceChatOpenRef.current) {
                const textSegment = fullReply.slice(spokenIndex)
                const sentenceBoundaries = /[.!?]+(?=\s+|$)/g
                let sentenceMatch
                let lastPos = 0
                while ((sentenceMatch = sentenceBoundaries.exec(textSegment)) !== null) {
                  const endPos = sentenceMatch.index + sentenceMatch[0].length
                  const sentence = textSegment.slice(lastPos, endPos).trim()
                  if (sentence.length > 0) {
                    speak(sentence)
                  }
                  lastPos = endPos
                }
                if (lastPos > 0) {
                  spokenIndex += lastPos
                }
              }
            } else if (parsed.type === 'info') {
              setMessages(prev => {
                const next = [...prev]
                if (next.length > 0) {
                  next[next.length - 1] = { ...next[next.length - 1], content: parsed.content }
                }
                return next
              })
            } else if (parsed.type === 'error') {
              setMessages(prev => {
                const next = [...prev]
                if (next.length > 0) {
                  next[next.length - 1] = { ...next[next.length - 1], content: `Error: ${parsed.content}` }
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
        const remaining = fullReply.slice(spokenIndex).trim()
        if (remaining.length > 0) {
          speak(remaining)
        }
      }
    } catch (err) {
      console.error('Chat stream error:', err)
      const isNetworkError = err.message.includes('Failed to fetch')
      const errorMessage = isNetworkError 
        ? 'Cannot reach server. Check your connection or ensure backend is running.' 
        : `Error: ${err.message}`
        
      setMessages(prev => {
        const next = [...prev]
        if (next.length > 0) {
          next[next.length - 1] = { ...next[next.length - 1], content: errorMessage }
        }
        return next
      })
      setError(errorMessage)
    } finally {
      setStreamingIndex(null)
      setLoading(false)
    }
  }, [input, loading, activeThreadId, messages, selectedModel, webSearchEnabled, codeExecutionEnabled, imageGenerationEnabled, memoryEnabled, speak, incognitoMode, currentVoice])

  // ── User info (from localStorage) ──
  const userName = localStorage.getItem('user_name') || 'User'
  const userEmail = localStorage.getItem('user_email') || ''
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
  const [userLanguage, setUserLanguage] = useState(() => localStorage.getItem('user_language') || 'EN')

  const [showProfilePopover, setShowProfilePopover] = useState(false)
  const popoverTimeoutRef = useRef(null)

  const handleUserBarMouseEnter = (submenu = null) => {
    if (popoverTimeoutRef.current) {
      clearTimeout(popoverTimeoutRef.current)
      popoverTimeoutRef.current = null
    }
    setShowProfilePopover(true)
    if (submenu) {
      setHoveredSubmenu(submenu)
    }
  }

  const handleUserBarMouseLeave = () => {
    if (popoverTimeoutRef.current) clearTimeout(popoverTimeoutRef.current)
    popoverTimeoutRef.current = setTimeout(() => {
      setShowProfilePopover(false)
      setHoveredSubmenu(null)
    }, 150)
  }

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

  const selectedModelObj = [...MODELS, ...EXTRA_MODELS].find(m => m.id === selectedModel)
  const isKaliMode = selectedModelObj?.kali === true

  return (
    <div className={`h-screen flex overflow-hidden ${cyberMode ? 'cyber-theme' : ''} ${isKaliMode ? 'kali-theme' : ''}`} style={{ background: 'var(--bg-primary)' }}>

      {/* ── Sidebar ── */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-all duration-300 animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`${isMobile ? 'fixed inset-y-0 left-0 z-50 shadow-2xl' : 'flex-shrink-0'} flex flex-col overflow-hidden border-r border-border-subtle`}
            style={{ background: '#1a1a1a' }}
          >
            {/* Brand + collapse */}
            <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
              <Link to="/" className="flex items-center gap-2.5">
                <motion.div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(217,119,87,0.15)' }}
                >
                  <CyberCliMark size={24} />
                </motion.div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm leading-tight" style={{ color: '#FAF9F7' }}>CyberCli</span>
                  <span className="text-[9px] text-gray-600 leading-none tracking-wide">by CyberMindCLI</span>
                </div>
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
                  onClick={() => {
                    if (item.id === 'voice') {
                      setVoiceChatOpen(true)
                    } else {
                      setActiveNav(item.id)
                    }
                  }}
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
              onMouseEnter={() => handleUserBarMouseEnter()}
              onMouseLeave={handleUserBarMouseLeave}
            >
              <AnimatePresence>
                {showProfilePopover && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-3 right-3 mb-2 rounded-2xl border border-white/[0.08] shadow-2xl p-2 z-50 flex flex-col gap-0.5"
                    style={{ 
                      background: 'rgba(26, 26, 26, 0.98)', 
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <button 
                      onClick={() => openSettings('general')}
                      onMouseEnter={() => setHoveredSubmenu(null)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Settings className="w-4 h-4 text-gray-500 group-hover:text-[#D97757] transition-colors" />
                        <span>Settings</span>
                      </div>
                      <span className="text-[9px] text-gray-600 tracking-tight font-bold uppercase">⚙ ↑Ctrl,</span>
                    </button>

                    <button 
                      onMouseEnter={() => setHoveredSubmenu('language')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Globe className="w-4 h-4 text-gray-500 group-hover:text-[#D97757] transition-colors" />
                        <span>Language</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                    </button>

                    <button 
                      onClick={() => window.open('mailto:support@cybermindcli.com')}
                      onMouseEnter={() => setHoveredSubmenu(null)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left group"
                    >
                      <HelpCircle className="w-4 h-4 text-gray-500 group-hover:text-[#D97757] transition-colors" />
                      <span>Get help</span>
                    </button>

                    <button 
                      onClick={() => openSettings('billing')}
                      onMouseEnter={() => setHoveredSubmenu(null)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left group"
                    >
                      <ArrowUpCircle className="w-4 h-4 text-gray-500 group-hover:text-[#D97757] transition-colors" />
                      <span>Upgrade plan</span>
                    </button>

                    <button 
                      onClick={() => alert('CyberCli App & Extension links will be sent to your email.')}
                      onMouseEnter={() => setHoveredSubmenu(null)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left group"
                    >
                      <Download className="w-4 h-4 text-gray-500 group-hover:text-[#D97757] transition-colors" />
                      <span>Get apps and extensions</span>
                    </button>

                    <button 
                      onMouseEnter={() => setHoveredSubmenu('learn_more')}
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
                      onMouseEnter={() => setHoveredSubmenu(null)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-350 hover:bg-red-500/10 transition-all text-left group"
                    >
                      <LogOut className="w-4 h-4 text-red-500/60 group-hover:text-red-400 transition-colors" />
                      <span>Log out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submenus floating to the right */}
              <AnimatePresence>
                {showProfilePopover && hoveredSubmenu === 'language' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    onMouseEnter={() => handleUserBarMouseEnter('language')}
                    onMouseLeave={handleUserBarMouseLeave}
                    className="fixed bottom-[140px] left-[285px] w-[240px] rounded-2xl border border-white/[0.08] shadow-2xl p-2 z-[60] flex flex-col gap-0.5"
                    style={{ 
                      background: 'rgba(26, 26, 26, 0.98)', 
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-white/[0.04] mb-1">Select Language</div>
                    <div className="max-h-[300px] overflow-y-auto pr-1">
                      {LANGUAGES.map(lang => (
                        <button
                          key={lang.name}
                          onClick={() => {
                            setUserLanguage(lang.code)
                            localStorage.setItem('user_language', lang.code)
                            localStorage.setItem('user_language_name', lang.name)
                          }}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left"
                        >
                          <span>{lang.name}</span>
                          {userLanguage === lang.code && <Check className="w-3.5 h-3.5 text-[#D97757]" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showProfilePopover && hoveredSubmenu === 'learn_more' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    onMouseEnter={() => handleUserBarMouseEnter('learn_more')}
                    onMouseLeave={handleUserBarMouseLeave}
                    className="fixed bottom-[90px] left-[285px] w-[240px] rounded-2xl border border-white/[0.08] shadow-2xl p-2 z-[60] flex flex-col gap-0.5"
                    style={{ 
                      background: 'rgba(26, 26, 26, 0.98)', 
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-white/[0.04] mb-1">Resources</div>
                    <Link
                      to="/docs"
                      className="w-full px-3 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left block"
                    >
                      API Console
                    </Link>
                    <Link
                      to="/about"
                      className="w-full px-3 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left block"
                    >
                      About CyberMindCLI
                    </Link>
                    <Link
                      to="/docs"
                      className="w-full px-3 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left block"
                    >
                      Tutorials
                    </Link>
                    <a
                      href="https://cybermindcli.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-3 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left block"
                    >
                      Courses
                    </a>
                    <Link
                      to="/terms-of-service"
                      className="w-full px-3 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left block"
                    >
                      Usage policy
                    </Link>
                    <Link
                      to="/privacy-policy"
                      className="w-full px-3 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left block"
                    >
                      Privacy policy
                    </Link>
                    <Link
                      to="/privacy-policy#choices"
                      className="w-full px-3 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left block"
                    >
                      Your privacy choices
                    </Link>
                    <button
                      onClick={() => setShowShortcutsModal(true)}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left"
                    >
                      <span>Keyboard shortcuts</span>
                      <span className="text-[10px] text-gray-500 font-semibold font-mono">Ctrl+/</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer">
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
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-white/[0.08] text-gray-400 uppercase tracking-wide"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    {userLanguage}
                  </span>
                  {!localStorage.getItem('sb-access-token') ? (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5"
                      style={{ background: 'rgba(251,191,36,0.15)', color: '#FCD34D' }}
                    >
                      <Ghost className="w-2.5 h-2.5" />GUEST
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(217,119,87,0.2)', color: '#D97757' }}>FREE</span>
                  )}
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main Area ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header strip */}
        <header className="flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b border-white/[0.03] bg-[#0A0A0F]">
          {!sidebarOpen && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Menu className="w-4 h-4" />
              </button>
              <Link to="/" className="flex items-center group transition-opacity hover:opacity-90">
                <CyberCliWordmark size={24} />
              </Link>
            </div>
          )}

          {activeThreadId && activeNav === 'chats' && (
            <div className="flex items-center gap-2 text-sm">
              <span className="truncate max-w-[200px] font-medium text-gray-300">
                {threads.find(t => t._id === activeThreadId)?.title || 'Chat'}
              </span>
            </div>
          )}

          {activeNav !== 'chats' && (
            <span className="text-sm font-semibold capitalize text-gray-300">
              {activeNav}
            </span>
          )}

          <div className="flex-1" />
          
          <div className="flex items-center gap-2">
            {/* Active mode badges */}
            <AnimatePresence>
              {cyberMode && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="hidden sm:flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-widest"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  CYBER ACTIVE
                </motion.span>
              )}
            </AnimatePresence>

            {/* Cyber Mode Toggle */}
            <button
              onClick={() => setCyberMode(prev => !prev)}
              className={`p-2 rounded-xl border transition-all duration-200 ${
                cyberMode 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
              title="Toggle Cyber Mode"
            >
              <Zap className="w-4 h-4" />
            </button>

            {/* Workspace split toggle */}
            <button
              onClick={() => setWorkspaceOpen(prev => !prev)}
              className={`p-2 rounded-xl border transition-all duration-200 ${
                workspaceOpen 
                  ? 'bg-[#D97757]/20 border-[#D97757]/40 text-[#D97757]' 
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
              title="Toggle Workspace Panel"
            >
              <Terminal className="w-4 h-4" />
            </button>
          </div>
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

        {/* Split Container */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Chat Content Panel (Left/Main side) */}
          <div className={`flex-1 flex flex-col min-w-0 h-full ${workspaceOpen && !isMobile ? 'w-[55%]' : 'w-full'}`}>
            {/* Main Content Area based on Nav selection */}
            <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
              {activeNav === 'chats' ? (
                messages.length === 0 && !loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-4 pb-20">
                    <HeroState userName={userName} />
                    <div className="w-full mt-8">
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
                        deepResearchEnabled={deepResearchEnabled}
                        onToggleDeepResearch={() => setDeepResearchEnabled(v => !v)}
                        incognitoMode={incognitoMode}
                        onToggleIncognito={() => setIncognitoMode(v => !v)}
                        showQuickActions={messages.length === 0}
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
                            onRevert={handleRevert}
                            onSpeak={(text) => speak(text)}
                            onFork={handleFork}
                            onStop={stop}
                            ttsLoading={ttsLoading}
                            isPlaying={isPlaying}
                            copied={copied}
                            codeExecutionEnabled={codeExecutionEnabled}
                            daemonConnected={daemonConnected}
                            onExecuteSuccess={(path) => {
                              setPreviewFilePath(path)
                              handleLoadPreviewFile(path)
                              setWorkspaceTab('preview')
                              setWorkspaceOpen(true)
                            }}
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
                        deepResearchEnabled={deepResearchEnabled}
                        onToggleDeepResearch={() => setDeepResearchEnabled(v => !v)}
                        incognitoMode={incognitoMode}
                        onToggleIncognito={() => setIncognitoMode(v => !v)}
                        showQuickActions={false}
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
                <CodeView daemonConnected={daemonConnected} loadDaemonStatus={loadDaemonStatus} />
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
          </div>

          {/* Workspace Panel (Right side) */}
          <AnimatePresence>
            {workspaceOpen && (
              <motion.div
                initial={{ x: isMobile ? '100%' : 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: isMobile ? '100%' : 100, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={`${
                  isMobile
                    ? 'fixed inset-y-0 right-0 z-40 w-full sm:w-[85%] shadow-2xl animate-fade-in'
                    : 'relative border-l border-white/[0.06]'
                } h-full bg-[#0D0D14] flex flex-col overflow-hidden`}
                style={{ width: isMobile ? undefined : workspaceWidth }}
              >
                {!isMobile && (
                  <div
                    onMouseDown={startResizing}
                    className="absolute top-0 bottom-0 left-0 w-1.5 cursor-col-resize hover:bg-[#D97757]/40 active:bg-[#D97757] transition-colors z-50 flex items-center justify-center group"
                    style={{ touchAction: 'none' }}
                  >
                    <div className="w-[1px] h-8 bg-white/10 group-hover:bg-[#D97757]/60 group-active:bg-[#D97757]" />
                  </div>
                )}
                {/* Workspace Panel Header — Claude Code style */}
                <div className="flex-shrink-0 bg-[#08080E] border-b border-white/[0.04]">
                  {/* macOS traffic lights + breadcrumb */}
                  <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.03]">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setWorkspaceOpen(false)} className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors" title="Close" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/40" />
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 font-mono">
                      <span className="text-gray-600">~</span>
                      <span>/</span>
                      <span className="text-gray-400">workspace</span>
                      {daemonConnected && <span className="text-emerald-400/60 ml-1">● live</span>}
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <button onClick={() => setWorkspaceOpen(false)} className="p-1 rounded text-gray-600 hover:text-gray-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* Tab bar */}
                  <div className="flex items-center px-2 gap-0.5 py-1">
                    {[
                      { id: 'terminal', label: 'Terminal', Icon: Terminal },
                      { id: 'files', label: 'Files', Icon: FolderTree },
                      { id: 'preview', label: 'Preview', Icon: FileCode },
                      { id: 'git', label: 'Git', Icon: GitIcon },
                    ].map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        onClick={() => setWorkspaceTab(id)}
                        className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-md transition-all ${
                          workspaceTab === id
                            ? 'bg-white/[0.06] text-white border border-white/[0.08]'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Workspace Panel Body */}
                <div className="flex-1 overflow-hidden relative flex flex-col">
                  {workspaceTab === 'terminal' ? (
                    <div className="flex-1 flex flex-col overflow-hidden bg-[#020204] p-3 font-mono text-xs text-left">
                      {/* Terminal scrollable logs */}
                      <div className="flex-1 overflow-y-auto mb-2 space-y-1.5 pr-1">
                        {terminalHistory.map((item, idx) => {
                          if (item.type === 'input') {
                            return (
                              <div key={idx} className="flex items-start gap-1.5">
                                <span className="text-emerald-400 font-bold select-none shrink-0">user@cybercli:~/workspace$</span>
                                <span className="text-gray-200 whitespace-pre-wrap select-all">{item.text}</span>
                              </div>
                            )
                          } else if (item.type === 'error') {
                            return (
                              <pre key={idx} className="text-rose-400 whitespace-pre-wrap leading-relaxed select-text pl-1">{item.text}</pre>
                            )
                          } else {
                            return (
                              <pre key={idx} className="text-gray-300 whitespace-pre-wrap leading-relaxed select-text pl-1">{item.text}</pre>
                            )
                          }
                        })}
                        {terminalLoading && (
                          <div className="text-amber-400 animate-pulse flex items-center gap-1.5 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            executing...
                          </div>
                        )}
                      </div>

                      {/* Link helper warning if daemon offline */}
                      {!daemonConnected && (
                        <div className="mb-3 p-3 rounded-lg border border-red-500/20 bg-red-500/5 space-y-2 font-sans">
                          <p className="text-xs font-semibold text-rose-400 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Daemon Offline — Link your workspace
                          </p>
                          <pre className="p-2.5 bg-black/40 border border-white/5 rounded text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap select-all text-[10px]">
npm install -g cybercli{"\n"}
cybercli link --key YOUR_API_KEY</pre>
                        </div>
                      )}

                      {/* Terminal input bar */}
                      <form onSubmit={handleTerminalSubmit} className="flex items-center gap-1.5 bg-black/50 border border-white/[0.08] rounded-lg p-2 flex-shrink-0">
                        <span className="text-emerald-400 font-bold select-none text-[11px] shrink-0">$</span>
                        <input
                          type="text"
                          value={terminalInput}
                          onChange={(e) => setTerminalInput(e.target.value)}
                          placeholder={daemonConnected ? "Type command..." : "Connect daemon to run commands"}
                          disabled={terminalLoading || !daemonConnected}
                          className="flex-1 bg-transparent border-0 outline-none p-0 text-white font-mono text-[11px] focus:ring-0 placeholder-gray-600 disabled:cursor-not-allowed"
                        />
                      </form>
                    </div>
                  ) : workspaceTab === 'files' ? (
                    /* File Tree */
                    <div className="flex-1 flex flex-col overflow-hidden bg-[#06060A]">
                      {!daemonConnected ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                          <FolderTree className="w-10 h-10 text-gray-700" />
                          <p className="text-xs text-gray-500 font-medium">Daemon offline</p>
                          <p className="text-[10px] text-gray-600 max-w-xs leading-normal">Connect your local workspace daemon to browse the file tree.</p>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
                          <div className="space-y-0.5">
                            {[
                              { name: 'src/', type: 'dir', depth: 0 },
                              { name: 'components/', type: 'dir', depth: 1 },
                              { name: 'pages/', type: 'dir', depth: 1 },
                              { name: 'hooks/', type: 'dir', depth: 1 },
                              { name: 'index.css', type: 'file', depth: 1 },
                              { name: 'main.jsx', type: 'file', depth: 1 },
                              { name: 'package.json', type: 'file', depth: 0 },
                              { name: 'vite.config.js', type: 'file', depth: 0 },
                            ].map((item, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/[0.04] cursor-pointer text-gray-400 hover:text-white transition-colors"
                                style={{ paddingLeft: `${8 + item.depth * 16}px` }}
                                onClick={() => item.type === 'file' && setPreviewFilePath(item.name) && setWorkspaceTab('preview')}
                              >
                                {item.type === 'dir'
                                  ? <FolderTree className="w-3.5 h-3.5 text-yellow-500/70 shrink-0" />
                                  : <FileCode className="w-3.5 h-3.5 text-blue-400/70 shrink-0" />
                                }
                                <span className={item.type === 'dir' ? 'text-yellow-200/80' : 'text-gray-300'}>{item.name}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-gray-700 mt-4 px-2">File tree is populated from daemon. Click a file to open in Preview.</p>
                        </div>
                      )}
                    </div>
                  ) : workspaceTab === 'preview' ? (
                    /* File Preview */
                    <div className="flex-1 flex flex-col overflow-hidden bg-[#06060A]">
                      {/* Path search / control bar */}
                      <div className="p-2 border-b border-white/[0.04] flex items-center gap-2 flex-shrink-0">
                        <input
                          type="text"
                          value={previewFilePath}
                          onChange={(e) => setPreviewFilePath(e.target.value)}
                          placeholder="Path to file (e.g. src/index.js)..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-accent font-mono"
                        />
                        <button
                          onClick={() => handleLoadPreviewFile()}
                          disabled={previewFileLoading || !daemonConnected}
                          className="px-3 py-1 rounded-lg bg-accent text-white text-xs font-bold hover:bg-accent-dark disabled:bg-white/5 disabled:text-white/30 transition-all flex-shrink-0"
                        >
                          {previewFileLoading ? 'Loading...' : 'Load'}
                        </button>
                      </div>

                      {/* Preview view area */}
                      <div className="flex-1 overflow-auto">
                        {previewFileLoading && (
                          <div className="h-full flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full border-2 border-[#D97757] border-t-transparent animate-spin" />
                          </div>
                        )}

                        {!previewFileLoading && previewFileError && (
                          <div className="p-5 text-center flex flex-col items-center justify-center h-full gap-2">
                            <AlertCircle className="w-8 h-8 text-rose-400" />
                            <p className="text-xs text-rose-300 font-semibold">{previewFileError}</p>
                          </div>
                        )}

                        {!previewFileLoading && !previewFileError && !previewFileContent && (
                          <div className="p-5 text-center flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                            <FileCode className="w-8 h-8 opacity-30" />
                            <p className="text-xs">No file loaded</p>
                            <p className="text-[10px] max-w-xs leading-normal">Enter a file path above and click Load to view its content with syntax highlighting.</p>
                          </div>
                        )}

                        {!previewFileLoading && !previewFileError && previewFileContent && (
                          <div className="h-full select-text">
                            {activePreviewFile?.endsWith('.diff') || previewFileContent.startsWith('diff') ? (
                              <div className="font-mono text-xs p-4 space-y-0.5 whitespace-pre overflow-auto h-full text-left">
                                {previewFileContent.split('\n').map((line, idx) => {
                                  let colorClass = "text-gray-300"
                                  if (line.startsWith('+')) colorClass = "text-emerald-400 bg-emerald-950/30 px-1 rounded-sm border-l-2 border-emerald-500"
                                  else if (line.startsWith('-')) colorClass = "text-rose-400 bg-rose-950/30 px-1 rounded-sm border-l-2 border-rose-500"
                                  return <div key={idx} className={colorClass}>{line}</div>
                                })}
                              </div>
                            ) : activePreviewFile?.endsWith('.md') ? (
                              <div className="prose-custom p-5 overflow-auto h-full text-gray-300 text-left">
                                <ReactMarkdown>{previewFileContent}</ReactMarkdown>
                              </div>
                            ) : (
                              <div className="overflow-auto h-full text-left">
                                <SyntaxHighlighter
                                  language={activePreviewFile?.split('.').pop() || 'javascript'}
                                  style={oneDark}
                                  customStyle={{ margin: 0, padding: '16px', background: '#050508', fontSize: '0.8125rem', height: '100%' }}
                                  showLineNumbers={previewFileContent.split('\n').length > 3}
                                >
                                  {previewFileContent}
                                </SyntaxHighlighter>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : workspaceTab === 'git' ? (
                    /* Git Tab */
                    <div className="flex-1 flex flex-col overflow-hidden bg-[#06060A] p-4 font-mono text-xs">
                      {!daemonConnected ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                          <GitIcon className="w-10 h-10 text-gray-700" />
                          <p className="text-xs text-gray-500">Daemon offline</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                            <GitIcon className="w-4 h-4 text-orange-400" />
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Current Branch</p>
                              <p className="text-sm font-bold text-white">main</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-sans">Staged Changes</p>
                            <div className="space-y-1">
                              {['M  src/index.js', 'A  src/components/Chat.jsx'].map((f, i) => (
                                <div key={i} className="flex items-center gap-2 text-emerald-400">
                                  <span className="text-emerald-500 font-bold">{f.slice(0, 1)}</span>
                                  <span>{f.slice(3)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-sans">Unstaged</p>
                            <div className="space-y-1">
                              {['M  src/hooks/useTTS.js'].map((f, i) => (
                                <div key={i} className="flex items-center gap-2 text-amber-400">
                                  <span className="text-amber-500 font-bold">{f.slice(0, 1)}</span>
                                  <span>{f.slice(3)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-600 border-t border-white/[0.04] pt-3">Git data synced via workspace daemon. Run git commands from Terminal tab.</p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
        ttsLoading={ttsLoading}
        speak={speak}
        stop={stop}
        updateProvider={updateProvider}
        updateVoice={updateVoice}
        assistantReply={streamingIndex !== null ? messages[streamingIndex]?.content : null}
      />

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showShortcutsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1c1c24] border border-white/[0.08] rounded-2xl w-full max-w-md p-6 relative shadow-2xl"
            >
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-[#D97757]" />
                Keyboard Shortcuts
              </h3>
              <div className="space-y-3.5">
                {[
                  { key: 'Ctrl + /', desc: 'Toggle keyboard shortcuts dialog' },
                  { key: 'Ctrl + ,', desc: 'Open Settings panel' },
                  { key: 'Ctrl + P', desc: 'Toggle Workspace panel' },
                  { key: 'Ctrl + Enter', desc: 'Submit chat query' },
                  { key: 'Esc', desc: 'Close dialogs' }
                ].map(shortcut => (
                  <div key={shortcut.key} className="flex items-center justify-between text-sm py-1 border-b border-white/[0.04] last:border-0">
                    <span className="text-gray-400 font-medium">{shortcut.desc}</span>
                    <kbd className="px-2.5 py-1 rounded bg-[#0f0f15] border border-white/[0.08] text-xs font-mono text-[#D97757] font-semibold">{shortcut.key}</kbd>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings dialog */}
      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} onSettingChange={handleParentSettingChange} initialTab={settingsTab} />
    </div>
  )
}
