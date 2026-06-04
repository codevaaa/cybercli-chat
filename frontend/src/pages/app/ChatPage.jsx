import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Plus, Search, MessageSquare, FolderOpen, Layers, Code2, Sliders,
  ChevronLeft, ChevronRight, ChevronDown, Mic, Paperclip, Radio,
  Copy, Check, GitBranch, Volume2, VolumeX, Trash2, Pin, X, RotateCcw,
  Download, Zap, Settings, AlertCircle, Globe, Terminal, Image as ImageIcon, Brain, Folder, Camera,
  Play, Key, RefreshCw, Ghost, LogOut, HelpCircle, ArrowUpCircle, Info, BookOpen, Menu,
  Pencil, GraduationCap, Coffee, Lightbulb, Skull, FileCode, GitBranch as GitIcon, FolderTree, ArrowRight, ArrowUp,
  Gift, Briefcase, Sparkles, Loader2, CheckCircle2, XCircle, Clock, Square, Send, PanelLeft, ArrowLeft, Minus, LineChart
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import api, { smartStream, createThread, getThreads, getMessages, isLoggedIn, API_BASE, getFreshToken, truncateThread, checkBackendHealth } from '../../lib/api.js'
import { useTTS } from '../../hooks/useTTS.js'
import VoiceChatModal from '../../components/chat/VoiceChatModal.jsx'
import ArtifactsGallery from '../../components/chat/ArtifactsGallery.jsx'
import { useAuthStore } from '@stores/authStore.js'
import { useProjectStore } from '@stores/projectStore.js'
import { useStyleStore } from '@stores/styleStore.js'
import CodevaMark, { CodevaWordmark } from '../../components/ui/CodevaLogo.jsx'
import InviteFriendsModal from '../../components/invite/InviteFriendsModal.jsx'
import HelpCenterPanel from '../../components/chat/HelpCenterPanel.jsx'
import KaliKalView from '../../components/chat/KaliKalView.jsx'
import MatrixRain from '../../components/chat/MatrixRain.jsx'
import KaliKalBanner from '../../components/chat/KaliKalBanner.jsx'

// ─── Constants ──────────────────────────────────────────────────────────────

const MODELS = [
  { id: 'codeva/abhimanyu',                    name: 'Abhimanyu (Default)',  tag: 'Abhimanyu', color: '#EC4899', desc: 'The All-Rounder Prodigy (Cloudflare 70B + FLUX)', kali: false },
  { id: 'opencode/deepseek-v4-pro',            name: 'Madhav',               tag: 'Madhav',    color: '#F59E0B', desc: 'The supreme intelligence. Unrivalled reasoning, deep analysis, and creative mastery.', kali: false },
  { id: 'groq/llama-3.1-8b',                   name: 'Arjun',                tag: 'Arjun',     color: '#10B981', desc: 'The swift warrior. Blazing fast responses, lightweight and razor-precise.', kali: false },
]

const EXTRA_MODELS = [
  { id: 'huggingface/thecnical/cybermindcli',  name: 'Codeva',            tag: 'Codeva', color: '#7C3AED', desc: 'The proprietary flagship model of Codeva. Unmatched reasoning, security analysis, and specialized technical operations.', kali: false },
  { id: 'opencode/deepseek-v4-flash',          name: 'Vyas',                  tag: 'Vyas',     color: '#0D9488', desc: 'The omniscient researcher. Deeply searches the web to compile definitive answers.', kali: false },
  { id: 'apifreellm/gpt-4o',                   name: 'Bheem',                tag: 'Bheem',     color: '#3B82F6', desc: 'The reliable powerhouse. Versatile and capable for everyday intelligence tasks with high accuracy.', kali: false },
  { id: 'council',                             name: 'Panchayat',            tag: 'Panchayat', color: '#D97757', desc: 'The council of minds. Streams your query to multiple minds simultaneously.', kali: false },
  { id: 'huggingface/deepseek-ai/DeepSeek-R1-Distill-Llama-70B', name: 'Chanakya', tag: 'Chanakya', color: '#00A3FF', desc: 'The grand strategist. Explicit chain-of-thought reasoning for multi-step problem solving.', kali: false },
  { id: 'openrouter/gpt-4o-mini',              name: 'Nakul',                 tag: 'Nakul',    color: '#8B5CF6', desc: 'The skilled strategist. Fast, capable, and multimodal.', kali: false },
  { id: 'gemini/gemini-2.5-pro',               name: 'Sahadeva',              tag: 'Sahadeva', color: '#4285F4', desc: 'The wise seer. High-speed intelligence with enormous context window.', kali: false },
  { id: 'mistral/mistral-large-latest',        name: 'Vayu',                  tag: 'Vayu',     color: '#F97316', desc: 'The swift wind. Top-tier reasoning and logic capabilities.', kali: false },
  { id: 'groq/llama-3.1-70b',                  name: 'Yudhishthira',          tag: 'Yudhishthir', color: '#FFD21E', desc: 'The righteous elder. Open-weights flagship model built for balanced output.', kali: false },
  { id: 'huggingface/Qwen/Qwen2.5-72B-Instruct', name: 'Vikrama',             tag: 'Vikrama',  color: '#FF6B35', desc: 'The multilingual emperor. Broad multilingual and cross-cultural intelligence.', kali: false },
  { id: 'huggingface/Qwen/Qwen2.5-Coder-32B-Instruct', name: 'Vishwakarma',   tag: 'Vishwakarma', color: '#ED8936', desc: 'The divine architect. Trained on millions of code repositories.', kali: false },
  { id: 'opencode/qwen3.7-max',                name: 'Sanjaya',               tag: 'Sanjaya',  color: '#059669', desc: 'The visionary observer. Real-time web knowledge with deep reasoning.', kali: false },
  { id: 'opencode/minimax-m2.5',               name: 'Narada',                tag: 'Narada',   color: '#047857', desc: 'The swift messenger. Rapid web-search capabilities for instant, cited facts.', kali: false },
  { id: 'image-gen',                           name: 'Chitrakar',             tag: 'Chitrakar',color: '#E11D48', desc: 'The divine painter. Generates stunning, high-quality images using backend API.', kali: false },
  
  // Backing models restored from previous version
  { id: 'gemini/gemini-2.5-flash',                               name: 'Sahadeva',              tag: 'Sahadeva',    color: '#4285F4', desc: 'The wise seer. High-speed multimodal intelligence with enormous context window for documents and media.', kali: false },
  { id: 'nvidia/llama-3.1-nemotron-70b',                         name: 'Dronacharya',           tag: 'Dronacharya', color: '#76B900', desc: 'The grand master. Research-grade academic reasoning for deep technical tasks and complex instruction.', kali: false },
  { id: 'cerebras/llama-3.1-8b',                                 name: 'Abhimanyu (Speed)',     tag: 'Abhimanyu',   color: '#EC4899', desc: 'The lightning striker. Powered by wafer-scale silicon delivering unmatched sub-100ms response speed.', kali: false },
  { id: 'huggingface/meta-llama/Llama-3.3-70B-Instruct',         name: 'Yudhishthira (Llama)',  tag: 'Yudhishthir', color: '#FFD21E', desc: 'The righteous elder. High-parameter open-weights flagship model built for balanced, ethical, quality output.', kali: false },
  { id: 'huggingface/mistralai/Mixtral-8x7B-Instruct-v0.1',      name: 'Saptarishi',            tag: 'Saptarishi',  color: '#FF4D88', desc: 'The seven sages. Mixture-of-experts architecture combining the wisdom of seven specialized expert models.', kali: false },
  { id: 'huggingface/NousResearch/Hermes-3-Llama-3.1-70B',       name: 'Parashurama',           tag: 'Parashurama', color: '#9F7AEA', desc: 'The agentic warrior. Specialized for tool use, function calling, and autonomous agentic orchestration.', kali: false },
  { id: 'huggingface/cognitivecomputations/dolphin-2.9.4-llama3-70b', name: 'Ashwatthama',   tag: 'Ashwatthama', color: '#38B2AC', desc: 'The free warrior. Uncensored high-parameter intelligence for unrestricted debate and creative thinking.', kali: true },
  { id: 'huggingface/cognitivecomputations/dolphin-2.9.2-qwen2.5-72b', name: 'Kali',         tag: 'Kali',        color: '#FF0055', desc: '🔥 The destroyer of limits. Fully uncensored 72B flagship — maximum freedom of thought, unfiltered intelligence.', kali: true },
  { id: 'huggingface/cognitivecomputations/dolphin-2.9.3-mistral-nemo-12b', name: 'Rudra',    tag: 'Rudra',       color: '#EF4444', desc: 'The fierce one. Uncensored edge model built for raw unconstrained intelligence at high speed.', kali: true },
  { id: 'huggingface/defog/sqlcoder-70b-v1.5',                   name: 'Agastya',               tag: 'Agastya',     color: '#D69E2E', desc: 'The sage of data. Specialized in translating natural language into precise, optimized SQL queries.', kali: false },
  { id: 'openrouter/moonshotai/moonshot-v1-8k',                  name: 'Karna',                 tag: 'Karna',       color: '#6366F1', desc: 'The focused archer. High-precision model from Moonshot AI, perfect for long-context understanding.', kali: false },
]



const QUICK_ACTIONS = [
  { id: 'write', label: 'Write', value: 'Write a ', icon: Pencil },
  { id: 'learn', label: 'Learn', value: 'Explain the concept of ', icon: GraduationCap },
  { id: 'code', label: 'Code', value: 'Help me write code for ', icon: Code2 },
  { id: 'life', label: 'Life stuff', value: 'Give me advice on ', icon: Coffee },
  { id: 'choice', label: "Codeva's choice", value: "Give me a creative idea or recommendation ", icon: Lightbulb },
]

const NAV_ITEMS = [
  { id: 'search',    label: 'Search',    icon: Search        },
  { id: 'chats',     label: 'Chats',     icon: MessageSquare },
  { id: 'projects',  label: 'Projects',  icon: FolderOpen    },
  { id: 'artifacts', label: 'Artifacts', icon: Layers        },
  { id: 'kali_kal',  label: 'Kali_Kal',  icon: Terminal      },
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
      const { data } = await api.post('/execute', { code: value, language: language })
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

  const isExecutable = language === 'javascript' || language === 'js' || language === 'python' || language === 'py'

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-border-subtle">
      <div className="flex items-center justify-between px-4 py-2 bg-background-tertiary border-b border-border-subtle">
        <span className="text-xs font-mono text-foreground-muted">{language || 'code'}</span>
        <div className="flex items-center gap-3">
          {codeExecutionEnabled && isExecutable && (
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

function MidnightCountdown() {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      const diff = tomorrow - now

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((diff / 1000 / 60) % 60)
      const seconds = Math.floor((diff / 1000) % 60)

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [])

  return <span className="font-mono bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded ml-1 mr-1">{timeLeft}</span>
}

function ImageGeneratorWidget({ src, alt }) {
  const [loading, setLoading] = useState(true)
  const [imageUrl, setImageUrl] = useState(null)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let active = true
    const timeoutId = setTimeout(() => {
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
          } else if (src.includes('prompt=')) {
            const urlObj = new URL(src, window.location.origin)
            const p = urlObj.searchParams.get('prompt')
            if (p) prompt = p
          }

          const token = localStorage.getItem('sb-access-token')
          const response = await fetch(`${API_BASE}/images/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ prompt })
          })

          if (!response.ok) {
            let errData
            try {
              errData = await response.json()
            } catch {
              throw new Error(`Error: ${response.status} ${response.statusText}`)
            }
            throw Object.assign(new Error(errData.error || `Error: ${response.status}`), { resetAt: errData.resetAt })
          }

          const data = await response.json()

          if (active) {
            setImageUrl(data.url)
            setLoading(false)
            window.dispatchEvent(new Event('image-generated'))
          }
        } catch (err) {
          if (active) {
            setError({ message: err.message, resetAt: err.resetAt })
            setLoading(false)
          }
        }
      }
      generateImage()
    }, 1500) // debounce by 1.5s to prevent firing constantly during LLM streaming

    return () => {
      active = false
      clearTimeout(timeoutId)
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
    const errorMessage = typeof error === 'string' ? error : error.message
    const isLimit = errorMessage.toLowerCase().includes('limit')

    return (
      <div className="my-3 rounded-xl border border-red-500/20 bg-red-500/5 p-5 flex flex-col items-start gap-3 max-w-lg">
        <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{isLimit ? 'Image Generation Limit Exceeded' : 'Image Generation Failed'}</span>
        </div>
        <p className="text-xs text-foreground-muted leading-relaxed">
          {isLimit 
            ? <>You have reached your daily limit of 5 free image generations. Resets in <MidnightCountdown /> (local time). Please upgrade to Pro for unlimited image generation.</>
            : errorMessage}
        </p>
        <div className="flex gap-2.5 mt-1">
          <Link to="/upgrade" className="px-3 py-1.5 rounded-lg bg-[#D97757] hover:bg-[#D97757]/80 text-[10px] uppercase tracking-wider font-bold text-white transition-all">
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

      <VoiceChatModal />

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
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-8 group`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse gap-3' : 'gap-4'} relative`}>
        
        {/* Assistant Avatar */}
        {isAssistant && (
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 rounded-[0.4rem] flex items-center justify-center bg-transparent shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
              <img src="/icon.png" alt="Codeva Avatar" className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        <div className={`flex flex-col w-full ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Content */}
          {isUser ? (
            <div className="flex items-center gap-2 group/user relative">
              <button
                onClick={() => onRevert && onRevert(index)}
                className="opacity-0 group-hover/user:opacity-100 p-1.5 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground-muted hover:text-foreground-primary transition-all absolute right-[102%] top-1/2 -translate-y-1/2"
                title="Rewind & Edit"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <div className="px-5 py-3.5 rounded-3xl rounded-tr-md bg-[#f3f2eb] dark:bg-[#2C2C2C] text-foreground-primary text-[15px] leading-relaxed whitespace-pre-wrap shadow-sm border border-black/5 dark:border-[#3E3E3E]">
                {msg.content}
              </div>
            </div>
          ) : (
            <div className="text-base text-foreground-primary prose-custom w-full pt-1">
              {isStreaming && (
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#D97757] mb-3 opacity-80 animate-pulse">
                  <div className="w-3 h-3 rounded-full border-[1.5px] border-[#D97757] border-t-transparent animate-spin" />
                  Thinking...
                </div>
              )}
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
                              className="px-1.5 py-0.5 rounded text-[13px] font-mono bg-background-tertiary text-foreground-primary border border-border-subtle"
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
                        h1: ({ children }) => <h1 className="text-xl font-bold mb-4 mt-6 first:mt-0 text-foreground-primary">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-semibold mb-3 mt-6 first:mt-0 text-foreground-primary">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-4 first:mt-0 text-foreground-primary">{children}</h3>,
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-[3px] border-border-medium pl-4 my-4 text-foreground-muted italic">
                            {children}
                          </blockquote>
                        ),
                        strong: ({ children }) => <strong className="font-semibold text-foreground-primary">{children}</strong>,
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
              <span className="text-[11px] text-foreground-muted font-medium tracking-wide">
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
                  className="p-1 rounded-md text-foreground-muted hover:text-foreground-primary hover:bg-foreground-primary/5 transition-colors"
                  title="Copy"
                >
                  {copied === index ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                {isAssistant && (
                  <>
                    <button
                      onClick={() => isPlaying ? onStop() : onSpeak(msg.content)}
                      disabled={ttsLoading && !isPlaying}
                      className="p-1 rounded-md text-foreground-muted hover:text-foreground-primary hover:bg-foreground-primary/5 transition-colors"
                      title={isPlaying ? 'Stop' : 'Speak'}
                    >
                      {isPlaying ? <VolumeX className="w-3.5 h-3.5 text-blue-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => onFork(msg._id)}
                      className="p-1 rounded-md text-foreground-muted hover:text-foreground-primary hover:bg-foreground-primary/5 transition-colors"
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


function ModelSelector({ selectedModel, onSelect, userPlan, effortLevel, setEffortLevel, thinkingEnabled, setThinkingEnabled, onRequirePro }) {
  const [open, setOpen] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showEffort, setShowEffort] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setShowMore(false)
        setShowEffort(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const allAvailableModels = [...MODELS, ...EXTRA_MODELS]
  const selected = allAvailableModels.find(m => m.id === selectedModel) || MODELS[1]
  const baseModels = MODELS.filter(m => m.id !== 'council')
  const isAdaptive = selectedModel === 'council'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); setShowMore(false); setShowEffort(false) }}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[13px] font-medium text-foreground-secondary hover:text-foreground-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all"
      >
        <span>{isAdaptive ? 'Council' : selected.tag}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-foreground-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-0 z-50 rounded-xl border border-border-subtle w-[260px] overflow-hidden shadow-lg"
            style={{
              background: 'var(--bg-elevated)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {showEffort ? (
              <div className="flex flex-col max-h-[300px] overflow-y-auto">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle bg-background-secondary/30">
                  <button
                    onClick={() => setShowEffort(false)}
                    className="text-xs font-semibold text-foreground-muted hover:text-foreground-primary"
                  >
                    ← Back
                  </button>
                  <span className="text-xs font-medium text-foreground-secondary">Effort</span>
                </div>
                <div className="p-3 border-b border-border-subtle">
                   <p className="text-[11.5px] leading-tight text-foreground-muted">Higher effort means more thorough responses, but takes longer and uses your limits faster.</p>
                </div>
                <div className="p-1">
                  {['low', 'medium', 'high', 'max'].map((level) => {
                    const isSelected = effortLevel === level
                    return (
                      <button
                        key={level}
                        onClick={() => {
                          setEffortLevel(level)
                          // Optional: keep open so they can see change, or close
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-foreground-primary/5 transition-all flex items-center justify-between"
                      >
                        <span className="text-[13px] text-foreground-primary font-medium capitalize">
                          {level} {level === 'low' && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-foreground-secondary font-normal tracking-wide">Default</span>}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-blue-500 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
                <div className="h-px bg-border-subtle mx-2 my-1" />
                <div className="px-3 py-3 flex items-center justify-between">
                   <div className="flex flex-col">
                     <span className="text-[13px] font-medium text-foreground-primary">Thinking</span>
                     <span className="text-[11.5px] text-foreground-muted">Can think for more complex tasks</span>
                   </div>
                   <button 
                     onClick={() => setThinkingEnabled(!thinkingEnabled)}
                     className={`w-9 h-5 rounded-full transition-all relative flex items-center p-0.5 shrink-0 ${thinkingEnabled ? 'bg-blue-500' : 'bg-white/10'}`}
                   >
                     <div className={`w-4 h-4 bg-white rounded-full transition-all shadow ${thinkingEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                   </button>
                </div>
              </div>
            ) : showMore ? (
              <div className="flex flex-col max-h-[300px] overflow-y-auto">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle bg-background-secondary/30">
                  <button
                    onClick={() => setShowMore(false)}
                    className="text-xs font-semibold text-foreground-muted hover:text-foreground-primary"
                  >
                    ← Back
                  </button>
                  <span className="text-xs font-medium text-foreground-secondary">More Models</span>
                </div>
                <div className="p-1">
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
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-foreground-primary/5 transition-all flex items-center justify-between"
                      >
                        <span className="text-[13px] text-foreground-primary">{model.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-foreground-primary shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="p-1">
                {baseModels.map((model) => {
                  const isSelected = selectedModel === model.id && !isAdaptive
                  return (
                    <button
                      key={model.id}
                      onClick={() => {
                        onSelect(model.id)
                        setOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-foreground-primary/5 transition-all flex items-center justify-between"
                    >
                      <span className="text-[13px] text-foreground-primary">{model.tag}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-foreground-primary shrink-0" />}
                    </button>
                  )
                })}
                <div className="h-px bg-border-subtle my-1" />
                <button
                  onClick={() => {
                    onSelect('council')
                    setOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-foreground-primary/5 transition-all flex items-center justify-between"
                >
                  <span className="text-[13px] text-foreground-primary">Council (Adaptive)</span>
                  {isAdaptive && <Check className="w-3.5 h-3.5 text-foreground-primary shrink-0" />}
                </button>
                <div className="h-px bg-border-subtle my-1" />
                <button
                  onClick={() => setShowEffort(true)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-foreground-primary/5 transition-all flex items-center justify-between text-foreground-secondary"
                >
                  <span className="text-[13px]">Effort</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] capitalize">{effortLevel}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
                <div className="h-px bg-border-subtle my-1" />
                <button
                  onClick={() => {
                    if (userPlan === 'free' || !userPlan) {
                      if (onRequirePro) onRequirePro()
                      else alert('More Models are only available for Pro users. Please upgrade your plan.')
                      return
                    }
                    setShowMore(true)
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-foreground-primary/5 transition-all flex items-center justify-between text-foreground-secondary"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[13px]">More models</span>
                    {userPlan === 'free' && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent/20 text-accent uppercase tracking-wider">PRO</span>}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
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
  onRequirePro,
  onSend,
  loading,
  selectedModel,
  onModelChange,
  effortLevel,
  setEffortLevel,
  thinkingEnabled,
  setThinkingEnabled,
  onMicClick,
  onWaveformClick,
  inlineSpeechListening,
  deepResearchEnabled = false,
  onToggleDeepResearch,
  incognitoMode = false,
  onToggleIncognito,
  showQuickActions = true,
  webSearchEnabled = false,
  setWebSearchEnabled = () => {},
  onToggleWebSearch,
  activeProject,
  setActiveProject,
  activeStyle,
  setActiveStyle,
  userPlan,
  imageUsage,
}) {
  const textareaRef = useRef(null)
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false)
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false)
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false)
  const [isSkillsMenuOpen, setIsSkillsMenuOpen] = useState(false)
  const [isConnectorsMenuOpen, setIsConnectorsMenuOpen] = useState(false)
  const [isPluginsMenuOpen, setIsPluginsMenuOpen] = useState(false)
  
  const [activeSkills, setActiveSkills] = useState([])
  const [activeConnectors, setActiveConnectors] = useState([])
  const [activePlugins, setActivePlugins] = useState([])
  
  const attachmentMenuRef = useRef(null)
  const attachmentButtonRef = useRef(null)
  const fileInputRef = useRef(null)

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      // If it's an image or large binary, we could encode to base64, but for text/code:
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (event) => {
          setInput(prev => prev + `\n\n![${file.name}](${event.target.result})\n`)
        }
        reader.readAsDataURL(file)
      } else {
        const text = await file.text()
        const extension = file.name.split('.').pop()
        setInput(prev => prev + `\n\n\`\`\`${extension}\n// ${file.name}\n${text}\n\`\`\`\n`)
      }
    } catch (err) {
      alert('Could not read file: ' + err.message)
    }
    setIsAttachmentMenuOpen(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const { projects, fetchProjects, createProject } = useProjectStore()
  const { styles, fetchStyles } = useStyleStore()

  useEffect(() => {
    fetchProjects()
    fetchStyles()
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        attachmentMenuRef.current &&
        !attachmentMenuRef.current.contains(event.target) &&
        attachmentButtonRef.current &&
        !attachmentButtonRef.current.contains(event.target)
      ) {
        setIsAttachmentMenuOpen(false)
        setIsStyleMenuOpen(false)
        setIsProjectMenuOpen(false)
        setIsSkillsMenuOpen(false)
        setIsConnectorsMenuOpen(false)
        setIsPluginsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    <div className="w-full max-w-[768px] mx-auto flex flex-col gap-4 px-4 sm:px-0">
      {/* Input container card */}
      <div
        className="rounded-2xl transition-all relative flex flex-row items-end p-1.5 gap-2 bg-[#f4f4f0] dark:bg-[#2a2a2a] border border-[#e5e5e0] dark:border-[#3E3E3E] focus-within:border-[#D0D0D0] dark:focus-within:border-[#4E4E4E] shadow-sm"
      >
        <div className="relative" ref={attachmentMenuRef}>
          <button 
            ref={attachmentButtonRef}
            onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
            className="p-2.5 rounded-xl text-foreground-muted hover:text-foreground-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all flex-shrink-0" 
            title="Add attachment"
          >
            <Plus className="w-5 h-5" />
          </button>
          
          <AnimatePresence>
            {isAttachmentMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-0 mb-2 w-64 bg-[#2a2a2a] border border-[#3E3E3E] rounded-xl shadow-2xl overflow-visible py-1.5 z-50 text-[14px]"
              >
                <div className="flex flex-col relative">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-3.5 py-2 hover:bg-white/5 text-[#E8E6E1] transition-colors text-left w-full">
                    <Paperclip className="w-[18px] h-[18px] text-[#A3A097]" />
                    <span>Add files or photos</span>
                    <span className="ml-auto text-[12px] text-[#A3A097]">Ctrl+U</span>
                  </button>
                  <div 
                    className="relative"
                    onMouseEnter={() => setIsProjectMenuOpen(true)}
                    onMouseLeave={() => setIsProjectMenuOpen(false)}
                  >
                    <button className="flex items-center gap-3 px-3.5 py-2 hover:bg-white/5 text-[#E8E6E1] transition-colors text-left w-full group">
                      <Folder className="w-[18px] h-[18px] text-[#A3A097]" />
                      <span>Add to project</span>
                      <ChevronRight className="w-4 h-4 ml-auto text-[#A3A097] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    {isProjectMenuOpen && (
                      <div className="absolute left-full top-0 ml-1 w-56 bg-[#2a2a2a] border border-[#3E3E3E] rounded-xl shadow-2xl overflow-hidden py-1.5 text-[14px]">
                        {projects.length === 0 ? (
                          <div className="px-3.5 py-2 text-[#A3A097] text-[12px]">No projects found</div>
                        ) : (
                          projects.map(p => (
                            <button key={p._id} onClick={() => { setActiveProject(p); setIsAttachmentMenuOpen(false); setIsProjectMenuOpen(false) }} className="flex items-center gap-3 px-3.5 py-2 hover:bg-white/5 text-[#E8E6E1] transition-colors text-left w-full">
                              <Folder className="w-[18px] h-[18px] text-[#A3A097]" />
                              <span className="truncate">{p.name}</span>
                              {activeProject?._id === p._id && <Check className="w-4 h-4 ml-auto text-blue-400" />}
                            </button>
                          ))
                        )}
                        <div className="h-px bg-white/5 my-1.5 mx-3" />
                        <button 
                          onClick={async () => {
                            const name = prompt('Enter new project name:')
                            if (name) {
                              try {
                                const newProject = await createProject({ name, description: 'Created from chat' })
                                setActiveProject(newProject)
                                setIsAttachmentMenuOpen(false)
                                setIsProjectMenuOpen(false)
                              } catch (err) {
                                alert('Failed to create project: ' + err.message)
                              }
                            }
                          }}
                          className="flex items-center gap-3 px-3.5 py-2 hover:bg-white/5 text-blue-400 transition-colors text-left w-full"
                        >
                          <Plus className="w-[18px] h-[18px]" />
                          <span>New project</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="h-px bg-white/5 my-1.5 mx-3" />
                  
                  {/* Skills Submenu */}
                  <div 
                    className="relative"
                    onMouseEnter={() => setIsSkillsMenuOpen(true)}
                    onMouseLeave={() => setIsSkillsMenuOpen(false)}
                  >
                    <button className="flex items-center gap-3 px-3.5 py-2 hover:bg-white/5 text-[#E8E6E1] transition-colors text-left w-full group">
                      <Layers className="w-[18px] h-[18px] text-[#A3A097]" />
                      <span>Skills</span>
                      <ChevronRight className="w-4 h-4 ml-auto text-[#A3A097] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    {isSkillsMenuOpen && (
                      <div className="absolute left-full top-0 ml-1 w-56 bg-[#2a2a2a] border border-[#3E3E3E] rounded-xl shadow-2xl overflow-hidden py-1.5 text-[14px]">
                        {['Python Execution', 'Terminal Access', 'Web Scraping'].map(skill => (
                          <button 
                            key={skill}
                            onClick={() => {
                              setActiveSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])
                            }}
                            className="flex items-center gap-3 px-3.5 py-2 hover:bg-white/5 text-[#E8E6E1] transition-colors text-left w-full"
                          >
                            <span className="truncate">{skill}</span>
                            {activeSkills.includes(skill) && <Check className="w-4 h-4 ml-auto text-blue-400" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Connectors Submenu */}
                  <div 
                    className="relative"
                    onMouseEnter={() => setIsConnectorsMenuOpen(true)}
                    onMouseLeave={() => setIsConnectorsMenuOpen(false)}
                  >
                    <button className="flex items-center gap-3 px-3.5 py-2 hover:bg-white/5 text-[#E8E6E1] transition-colors text-left w-full group">
                      <Code2 className="w-[18px] h-[18px] text-[#A3A097]" />
                      <span>Connectors</span>
                      <ChevronRight className="w-4 h-4 ml-auto text-[#A3A097] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    {isConnectorsMenuOpen && (
                      <div className="absolute left-full top-0 ml-1 w-56 bg-[#2a2a2a] border border-[#3E3E3E] rounded-xl shadow-2xl overflow-hidden py-1.5 text-[14px]">
                        {['GitHub', 'Jira', 'Notion', 'Slack'].map(connector => (
                          <button 
                            key={connector}
                            onClick={() => {
                              setActiveConnectors(prev => prev.includes(connector) ? prev.filter(c => c !== connector) : [...prev, connector])
                            }}
                            className="flex items-center gap-3 px-3.5 py-2 hover:bg-white/5 text-[#E8E6E1] transition-colors text-left w-full"
                          >
                            <span className="truncate">{connector}</span>
                            {activeConnectors.includes(connector) && <Check className="w-4 h-4 ml-auto text-blue-400" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Plugins Submenu */}
                  <div 
                    className="relative"
                    onMouseEnter={() => setIsPluginsMenuOpen(true)}
                    onMouseLeave={() => setIsPluginsMenuOpen(false)}
                  >
                    <button className="flex items-center gap-3 px-3.5 py-2 hover:bg-white/5 text-[#E8E6E1] transition-colors text-left w-full group">
                      <Zap className="w-[18px] h-[18px] text-[#A3A097]" />
                      <span>Plugins</span>
                      <ChevronRight className="w-4 h-4 ml-auto text-[#A3A097] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    {isPluginsMenuOpen && (
                      <div className="absolute left-full top-0 ml-1 w-56 bg-[#2a2a2a] border border-[#3E3E3E] rounded-xl shadow-2xl overflow-hidden py-1.5 text-[14px]">
                        {['PDF Analyzer', 'Data Visualizer', 'SEO Optimizer'].map(plugin => (
                          <button 
                            key={plugin}
                            onClick={() => {
                              setActivePlugins(prev => prev.includes(plugin) ? prev.filter(p => p !== plugin) : [...prev, plugin])
                            }}
                            className="flex items-center gap-3 px-3.5 py-2 hover:bg-white/5 text-[#E8E6E1] transition-colors text-left w-full"
                          >
                            <span className="truncate">{plugin}</span>
                            {activePlugins.includes(plugin) && <Check className="w-4 h-4 ml-auto text-blue-400" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-white/5 my-1.5 mx-3" />
                  <button 
                    onClick={() => { if(onToggleWebSearch) onToggleWebSearch(); else setWebSearchEnabled(!webSearchEnabled); setIsAttachmentMenuOpen(false) }}
                    className="flex items-center gap-3 px-3.5 py-2 hover:bg-white/5 text-[#E8E6E1] transition-colors text-left w-full group"
                  >
                    <Globe className={`w-[18px] h-[18px] ${webSearchEnabled ? 'text-blue-400' : 'text-[#A3A097]'}`} />
                    <span>Web search</span>
                    {webSearchEnabled && <Check className="w-4 h-4 ml-auto text-blue-400" />}
                  </button>
                  
                  <div 
                    className="relative"
                    onMouseEnter={() => setIsStyleMenuOpen(true)}
                    onMouseLeave={() => setIsStyleMenuOpen(false)}
                  >
                    <button 
                      className="flex items-center gap-3 px-3.5 py-2 hover:bg-white/5 text-[#E8E6E1] transition-colors text-left w-full group"
                    >
                      <Pencil className="w-[18px] h-[18px] text-[#A3A097]" />
                      <span>Use style</span>
                      <ChevronRight className="w-4 h-4 ml-auto text-[#A3A097] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    
                    {isStyleMenuOpen && (
                      <div className="absolute left-full bottom-0 ml-1 w-56 bg-[#2a2a2a] border border-[#3E3E3E] rounded-xl shadow-2xl overflow-hidden py-1.5 text-[14px]">
                        <div className="px-3.5 py-2 flex gap-2 items-start border-b border-[#3E3E3E] mb-1.5 pb-2.5">
                          <Info className="w-4 h-4 text-[#D97757] mt-0.5 flex-shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-medium text-[#E8E6E1]">Styles are migrating to Skills</span>
                            <span className="text-[12px] text-[#A3A097]">Starting May 20 — Learn more</span>
                          </div>
                        </div>
                        <button className="flex items-center gap-3 px-3.5 py-2 hover:bg-white/5 text-[#E8E6E1] transition-colors text-left w-full">
                          <BookOpen className="w-[18px] h-[18px] text-[#A3A097]" />
                          <span>Explanatory</span>
                        </button>
                        <button className="flex items-center gap-3 px-3.5 py-2 hover:bg-white/5 text-[#E8E6E1] transition-colors text-left w-full">
                          <Briefcase className="w-[18px] h-[18px] text-[#A3A097]" />
                          <span>Formal</span>
                        </button>
                        <div className="h-px bg-white/5 my-1.5 mx-3" />
                        <button className="flex items-center gap-3 px-3.5 py-2 hover:bg-white/5 text-[#E8E6E1] transition-colors text-left w-full">
                          <Plus className="w-[18px] h-[18px] text-[#A3A097]" />
                          <span>Create & edit styles</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type / for skills"
          rows={1}
          disabled={loading}
          className="flex-1 bg-transparent text-[15px] text-foreground-primary placeholder:text-foreground-muted/70 resize-none focus:outline-none leading-relaxed py-2.5 min-h-[44px]"
          style={{ maxHeight: '400px' }}
        />

        <div className="flex items-center gap-1.5 flex-shrink-0 mb-0.5 pr-0.5">
          <button
            onClick={onToggleDeepResearch}
            title="Deep Research"
            className={`p-2 rounded-xl transition-all ${
              deepResearchEnabled
                ? 'text-[#D97757] bg-[#D97757]/10'
                : 'text-foreground-muted hover:text-foreground-primary hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-4 h-4" />
          </button>
          
          <ModelSelector 
            selectedModel={selectedModel} 
            onSelect={onModelChange} 
            userPlan={userPlan} 
            effortLevel={effortLevel}
            setEffortLevel={setEffortLevel}
            thinkingEnabled={thinkingEnabled}
            setThinkingEnabled={setThinkingEnabled}
            onRequirePro={onRequirePro}
          />

          <div className="h-6 w-px bg-border-subtle mx-1" />

          <button
            onClick={onMicClick}
            title="Voice Typing"
            className={`p-2 rounded-xl transition-all ${
              inlineSpeechListening
                ? 'text-red-500 bg-red-500/10'
                : 'text-foreground-muted hover:text-foreground-primary hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>

          <button
            onClick={onWaveformClick}
            title="Start Voice Chat"
            className="p-2 rounded-xl transition-all text-foreground-muted hover:text-foreground-primary hover:bg-black/5 dark:hover:bg-white/5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 7v10M22 10v4M7 7v10M2 10v4"/>
            </svg>
          </button>


          <button
            onClick={onSend}
            disabled={!input.trim() || loading}
            className={`p-2 rounded-xl transition-all flex items-center justify-center ml-1 ${
              input.trim() && !loading
                ? 'bg-[#D97757] text-white hover:bg-[#c66849]'
                : 'bg-transparent text-foreground-muted/40 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <motion.div
                className="w-4 h-4 rounded-full border-2 border-current border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
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
  { id: 'api_keys',     label: 'API Keys' },
]

function SettingsDialog({ isOpen, onClose, onSettingChange, initialTab = 'general' }) {
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])
  
  const { updateEmail, updatePassword } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    display_name: '',
    nickname: '',
    avatar_url: '',
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
    council_mode_enabled: false,
    improve_ai: false,
    share_usage: false,
    personalized_suggestions: true,
  })
  const [apiKeys, setApiKeys] = useState([])
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState(null)
  
  // Account settings states
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accountMessage, setAccountMessage] = useState({ type: '', text: '' })

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

  const handleEmailChange = async (e) => {
    e.preventDefault()
    setAccountMessage({ type: '', text: '' })
    if (!newEmail.trim()) return
    setSaving(true)
    const res = await updateEmail(newEmail.trim())
    setSaving(false)
    if (res.success) {
      setAccountMessage({ type: 'success', text: 'Email change verification sent! Please check both your old and new email addresses to confirm.' })
      setShowEmailForm(false)
      setNewEmail('')
    } else {
      setAccountMessage({ type: 'error', text: res.error || 'Failed to update email' })
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setAccountMessage({ type: '', text: '' })
    if (newPassword.length < 8) {
      setAccountMessage({ type: 'error', text: 'Password must be at least 8 characters long.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setAccountMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    setSaving(true)
    const res = await updatePassword(newPassword)
    setSaving(false)
    if (res.success) {
      setAccountMessage({ type: 'success', text: 'Password updated successfully!' })
      setShowPasswordForm(false)
      setNewPassword('')
      setConfirmPassword('')
    } else {
      setAccountMessage({ type: 'error', text: res.error || 'Failed to update password' })
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = confirm('WARNING: Are you absolutely sure you want to delete your account? This action is permanent and will delete all your settings, API keys, chats, and files.')
    if (!confirmed) return
    setSaving(true)
    try {
      await api.delete('/auth/delete-account')
      await useAuthStore.getState().signOut()
      window.location.href = '/'
    } catch (err) {
      console.error('Delete account failed:', err)
      setAccountMessage({ type: 'error', text: err.response?.data?.error || err.message || 'Failed to delete account' })
    } finally {
      setSaving(false)
    }
  }

  const handleClearHistory = async () => {
    const confirmed = confirm('Are you sure you want to clear all your conversation threads and messages? This action cannot be undone.')
    if (!confirmed) return
    setSaving(true)
    try {
      await api.delete('/chat')
      window.location.href = '/chat'
    } catch (err) {
      console.error('Clear history failed:', err)
      alert('Failed to clear conversation history.')
    } finally {
      setSaving(false)
    }
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
            <div className="relative group flex-shrink-0">
              {settings.avatar_url ? (
                <img
                  src={settings.avatar_url}
                  alt="Avatar"
                  className="w-16 h-16 rounded-2xl object-cover border border-border-subtle"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold font-sans"
                  style={{ background: 'rgba(217,119,87,0.15)', color: '#D97757' }}>
                  {(settings.display_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
                </div>
              )}
              <label className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Camera className="w-5 h-5 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = (event) => {
                      const img = new Image()
                      img.onload = async () => {
                        const canvas = document.createElement('canvas')
                        canvas.width = 128
                        canvas.height = 128
                        const ctx = canvas.getContext('2d')
                        ctx.drawImage(img, 0, 0, 128, 128)
                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
                        patchSetting('avatar_url', compressedBase64)
                      }
                      img.src = event.target.result
                    }
                    reader.readAsDataURL(file)
                  }}
                />
              </label>
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
                placeholder="What should Codeva call you?"
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
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-muted mb-1">Account Info</h3>
        
        {accountMessage.text && (
          <div className={`p-3 rounded-xl text-xs font-medium border ${
            accountMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            {accountMessage.text}
          </div>
        )}

        <div className="p-4 rounded-xl bg-background-secondary border border-border-subtle space-y-1">
          <p className="text-[10px] text-foreground-muted uppercase tracking-wider font-semibold">Signed in as</p>
          <p className="text-sm font-medium text-foreground-primary truncate">{localStorage.getItem('user_email') || 'user@example.com'}</p>
        </div>

        <div className="space-y-2">
          {/* Change Email */}
          {!showEmailForm ? (
            <button 
              onClick={() => { setShowEmailForm(true); setShowPasswordForm(false); setAccountMessage({ type: '', text: '' }); }}
              className="w-full px-4 py-2.5 rounded-xl border border-border-subtle text-sm text-foreground-secondary hover:text-foreground-primary hover:bg-background-secondary transition-all text-left font-medium"
            >
              Change Email Address
            </button>
          ) : (
            <form onSubmit={handleEmailChange} className="p-4 rounded-xl bg-background-secondary border border-border-subtle space-y-3">
              <h4 className="text-xs font-bold text-foreground-primary">Change Email Address</h4>
              <input
                type="email"
                required
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
                className="w-full bg-background-tertiary text-sm text-foreground-primary border border-border-subtle rounded-xl px-3.5 py-2 focus:outline-none focus:border-accent"
              />
              <div className="flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setShowEmailForm(false)}
                  className="px-3 py-1.5 rounded-lg border border-border-subtle text-xs text-foreground-secondary hover:bg-background-tertiary transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-light transition-all"
                >
                  Verify Email
                </button>
              </div>
            </form>
          )}

          {/* Change Password */}
          {!showPasswordForm ? (
            <button 
              onClick={() => { setShowPasswordForm(true); setShowEmailForm(false); setAccountMessage({ type: '', text: '' }); }}
              className="w-full px-4 py-2.5 rounded-xl border border-border-subtle text-sm text-foreground-secondary hover:text-foreground-primary hover:bg-background-secondary transition-all text-left font-medium"
            >
              Change Password
            </button>
          ) : (
            <form onSubmit={handlePasswordChange} className="p-4 rounded-xl bg-background-secondary border border-border-subtle space-y-3">
              <h4 className="text-xs font-bold text-foreground-primary">Change Password</h4>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password (min. 8 characters)"
                className="w-full bg-background-tertiary text-sm text-foreground-primary border border-border-subtle rounded-xl px-3.5 py-2 focus:outline-none focus:border-accent"
              />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-background-tertiary text-sm text-foreground-primary border border-border-subtle rounded-xl px-3.5 py-2 focus:outline-none focus:border-accent"
              />
              <div className="flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setShowPasswordForm(false)}
                  className="px-3 py-1.5 rounded-lg border border-border-subtle text-xs text-foreground-secondary hover:bg-background-tertiary transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-light transition-all"
                >
                  Update Password
                </button>
              </div>
            </form>
          )}

          {/* Delete Account */}
          <button 
            onClick={handleDeleteAccount}
            className="w-full px-4 py-2.5 rounded-xl border border-rose-500/20 text-sm text-rose-400 hover:bg-rose-500/5 transition-all text-left font-medium"
          >
            Delete Account Permanently
          </button>
        </div>
      </div>
    ),
    privacy: (
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-muted mb-3">Privacy Settings</h3>
        <Row label="Improve AI with your data" desc="Allow Codeva to use your messages to train models">
          <Toggle value={!!settings.improve_ai} onChange={v => patchSetting('improve_ai', v)} />
        </Row>
        <Row label="Share usage analytics" desc="Send anonymized usage metrics">
          <Toggle value={!!settings.share_usage} onChange={v => patchSetting('share_usage', v)} />
        </Row>
        <Row label="Personalized suggestions" desc="Tailor suggestions based on history">
          <Toggle value={!!settings.personalized_suggestions} onChange={v => patchSetting('personalized_suggestions', v)} />
        </Row>
        <div className="pt-4">
          <button 
            onClick={handleClearHistory}
            className="px-4 py-2.5 rounded-xl border border-rose-500/20 text-sm text-rose-400 hover:bg-rose-500/5 transition-all font-medium"
          >
            Clear All Conversation History
          </button>
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
                const { data } = await api.post('/stripe/checkout', { plan: 'pro' })
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
        <Row label="Council Mode" desc="Debate answers across multiple AI models simultaneously">
          <Toggle value={!!settings.council_mode_enabled} onChange={v => patchSetting('council_mode_enabled', v)} />
        </Row>
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

export const chatSuggestions = [
  { icon: <Code2 className="w-4 h-4" />, label: 'Code', query: 'I need help writing some code for ' },
  { icon: <GraduationCap className="w-4 h-4" />, label: 'Learn', query: 'I want to learn about ' },
  { icon: <LineChart className="w-4 h-4" />, label: 'Strategize', query: 'Help me create a strategy for ' },
  { icon: <Pencil className="w-4 h-4" />, label: 'Write', query: 'Help me write a ' },
  { icon: <Coffee className="w-4 h-4" />, label: 'Life stuff', query: 'I need some advice on ' }
]

function HeroState({ userName }) {
  const firstName = userName ? userName.split(' ')[0] : 'User'

  return (
    <div className="flex flex-col items-center justify-center text-center px-4 w-full mt-[18vh] mb-8">
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-center gap-3"
      >
        <img src="/icon.png" alt="Codeva Logo" className="w-9 h-9 object-contain drop-shadow-md" />
        <h1 className="text-[32px] md:text-[40px] font-serif font-medium tracking-tight text-foreground-primary">
          Back at it, {firstName}
        </h1>
      </motion.div>
    </div>
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

function ArtifactsView({ messages }) {
  const [sessionArtifacts, setSessionArtifacts] = useState([])
  const [customArtifacts, setCustomArtifacts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  
  // Drawer & detail state
  const [selectedArt, setSelectedArt] = useState(null)
  const [drawerTab, setDrawerTab] = useState('preview') // preview | code

  // Custom creation modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newLang, setNewLang] = useState('html')
  const [newContent, setNewContent] = useState('')

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
          date: 'Generated during session'
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
          date: 'Generated during session'
        })
        imgIdx++
      }
    })
    setSessionArtifacts(items)
  }, [messages])

  // Combine generated & custom artifacts
  const allArtifacts = [...customArtifacts, ...sessionArtifacts]

  // Filter based on search query
  const filteredArtifacts = allArtifacts.filter(art => {
    const titleMatch = art.title.toLowerCase().includes(searchQuery.toLowerCase())
    const contentMatch = art.content?.toLowerCase().includes(searchQuery.toLowerCase()) || false
    const langMatch = art.language?.toLowerCase().includes(searchQuery.toLowerCase()) || false
    return titleMatch || contentMatch || langMatch
  })

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content)
    alert('Copied snippet to clipboard!')
  }

  const handleCreateArtifact = (e) => {
    e.preventDefault()
    if (!newTitle.trim() || !newContent.trim()) return

    const newItem = {
      id: `custom-${Date.now()}`,
      type: 'code',
      title: newTitle.trim(),
      language: newLang,
      content: newContent,
      preview: newContent.split('\n').slice(0, 3).join('\n'),
      date: 'Created manually'
    }

    setCustomArtifacts(prev => [newItem, ...prev])
    setIsCreateModalOpen(false)
    setNewTitle('')
    setNewContent('')
    setSelectedArt(newItem)
    setDrawerTab('preview')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto w-full relative min-h-[calc(100vh-100px)]">
      {/* Title Header with New Artifact button */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground-primary">Artifacts</h2>
          <p className="text-xs text-foreground-muted mt-1">Interactive catalog of code, vectors, and layouts generated in this session.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-white text-black font-semibold text-xs rounded-full hover:bg-white/90 transition-all select-none shadow-md hover:shadow-lg"
        >
          New artifact
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search artifacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-accent/40 outline-none text-xs text-white placeholder-white/20 transition-all"
        />
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredArtifacts.map(art => {
          const isCode = art.type === 'code'
          const isHtmlSvg = isCode && (art.language === 'html' || art.language === 'svg' || art.language === 'xml')
          
          return (
            <div
              key={art.id}
              onClick={() => {
                setSelectedArt(art)
                setDrawerTab(isHtmlSvg ? 'preview' : 'code')
              }}
              className="group rounded-2xl border border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.02] p-5 hover:border-accent/35 transition-all flex flex-col justify-between h-48 cursor-pointer relative"
              style={{
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)'
              }}
            >
              <div>
                {/* Central Icon inside a rounded box */}
                <div className="w-10 h-10 rounded-xl bg-[#D97757]/10 flex items-center justify-center border border-[#D97757]/20 mb-4 group-hover:scale-105 transition-all">
                  {art.type === 'image' ? (
                    <ImageIcon className="w-5 h-5 text-[#D97757]" />
                  ) : (
                    <FileCode className="w-5 h-5 text-[#D97757]" />
                  )}
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-accent transition-colors truncate mb-1">{art.title}</h3>
                <span className="text-[10px] text-foreground-muted">{art.date}</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md border tracking-wider uppercase font-mono bg-white/[0.03] text-foreground-muted border-white/[0.08]">
                  {art.type === 'image' ? 'Image' : art.language}
                </span>
                <span className="text-[10px] font-semibold text-accent opacity-0 group-hover:opacity-100 transition-all flex items-center gap-0.5">
                  Open <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          )
        })}

        {filteredArtifacts.length === 0 && (
          <div className="col-span-full text-center py-16 text-foreground-muted text-xs border border-dashed border-white/[0.08] rounded-3xl bg-white/[0.01]">
            No artifacts matching "{searchQuery}" found.
          </div>
        )}
      </div>

      {/* Side drawer panel overlay (Claude style) */}
      <AnimatePresence>
        {selectedArt && (
          <>
            {/* Split layout overlay trigger */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedArt(null)}
              className="fixed inset-0 bg-black z-40"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 right-0 z-50 w-full sm:w-[640px] bg-[#0A0A0F] border-l border-white/[0.06] flex flex-col shadow-2xl overflow-hidden font-sans"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/[0.04] bg-[#08080C] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#D97757]/10 flex items-center justify-center border border-[#D97757]/20">
                    {selectedArt.type === 'image' ? (
                      <ImageIcon className="w-4 h-4 text-[#D97757]" />
                    ) : (
                      <FileCode className="w-4 h-4 text-[#D97757]" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{selectedArt.title}</h3>
                    <span className="text-[9px] text-foreground-muted uppercase tracking-wider font-semibold font-mono">{selectedArt.type === 'image' ? 'Image' : selectedArt.language}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(selectedArt.type === 'image' ? selectedArt.url : selectedArt.content)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-white/80 hover:text-white transition-all"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => setSelectedArt(null)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tabs for Drawer */}
              {selectedArt.type === 'code' && (
                <div className="flex items-center border-b border-white/[0.03] bg-[#07070B] px-4 py-1.5 gap-1">
                  {[
                    { id: 'preview', label: 'Preview' },
                    { id: 'code', label: 'Code' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDrawerTab(tab.id)}
                      className={`text-xs px-3 py-1 rounded-md transition-all font-medium ${
                        drawerTab === tab.id
                          ? 'bg-white/[0.06] text-white border border-white/[0.08]'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Panel Content Viewer */}
              <div className="flex-1 overflow-auto bg-[#040406] relative">
                {selectedArt.type === 'image' ? (
                  <div className="flex items-center justify-center p-8 h-full bg-black/40">
                    <img src={selectedArt.url} alt={selectedArt.title} className="max-h-full max-w-full object-contain rounded-lg border border-white/[0.08]" />
                  </div>
                ) : drawerTab === 'preview' ? (
                  // Iframe or preview sandbox
                  selectedArt.language === 'html' || selectedArt.language === 'svg' || selectedArt.language === 'xml' ? (
                    <iframe
                      srcDoc={selectedArt.content}
                      className="w-full h-full border-0 bg-white"
                      title="Artifact Live Render"
                      sandbox="allow-scripts allow-forms allow-popups allow-same-origin allow-downloads"
                    />
                  ) : (
                    // Fallback to formatted pre block for non-html code preview
                    <pre className="p-5 font-mono text-[11px] text-foreground-secondary leading-relaxed whitespace-pre-wrap select-text">
                      {selectedArt.content}
                    </pre>
                  )
                ) : (
                  // Raw code tab
                  <SyntaxHighlighter
                    language={selectedArt.language || 'javascript'}
                    style={oneDark}
                    customStyle={{
                      margin: 0,
                      padding: '20px',
                      background: 'transparent',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono, monospace)',
                      lineHeight: '1.6',
                    }}
                  >
                    {selectedArt.content}
                  </SyntaxHighlighter>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Manual Creation Dialog */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#101018] border border-white/[0.08] rounded-2xl w-full max-w-xl p-6 relative shadow-2xl"
            >
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-base font-bold text-white mb-6">Create New Artifact</h3>
              
              <form onSubmit={handleCreateArtifact} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-foreground-muted uppercase tracking-wider mb-2">Title</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. My Custom Dashboard"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-background-tertiary border border-white/[0.08] focus:border-accent/40 outline-none text-xs text-white placeholder-white/20 transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground-muted uppercase tracking-wider mb-2">Type / Language</label>
                    <select
                      value={newLang}
                      onChange={(e) => setNewLang(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-background-tertiary border border-white/[0.08] focus:border-accent/40 outline-none text-xs text-white transition-all cursor-pointer"
                    >
                      <option value="html">HTML Layout</option>
                      <option value="svg">SVG Vector</option>
                      <option value="javascript">JavaScript</option>
                      <option value="css">CSS stylesheet</option>
                      <option value="markdown">Markdown</option>
                      <option value="json">JSON data</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground-muted uppercase tracking-wider mb-2">Code Content</label>
                  <textarea
                    required
                    rows={8}
                    placeholder="Paste or write code here..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-background-tertiary border border-white/[0.08] focus:border-accent/40 outline-none text-xs font-mono text-white placeholder-white/20 transition-all resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-white/[0.08] text-xs font-semibold text-white/80 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-white/95 transition-all shadow-md"
                  >
                    Create Artifact
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
        <p className="text-xs text-foreground-muted">Securely link your local folders to Codeva for agentic filesystem execution.</p>
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
                ? 'Your local terminal daemon is actively connected. Codeva is armed to safely read/write workspace files.'
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
          # Install CLI globally{"\n"}npm install -g codeva{"\n\n"}# Link workspace using your API key below{"\n"}codeva link --key YOUR_API_KEY
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
  setMemoryEnabled,
  customInstructions,
  setCustomInstructions
}) {
  const [settings, setSettings] = useState(null)
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

      // Auto-accept pending invite if it exists
      const pendingInvite = localStorage.getItem('pending_invite_code')
      if (pendingInvite && data.email) {
        try {
          await api.post('/invite/accept', {
            invite_code: pendingInvite,
            email: data.email
          })
        } catch (inviteErr) {
          console.error('Failed to auto-accept pending invite:', inviteErr)
        } finally {
          localStorage.removeItem('pending_invite_code')
        }
      }
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
        <h2 className="text-2xl font-serif font-bold text-foreground-primary">Customize Codeva</h2>
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
        <p className="text-xs text-foreground-muted">Specify details or rules that you want Codeva to remember across all your threads.</p>
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
        <p className="text-xs text-foreground-muted">Facts Codeva has captured or you have explicitly stored about yourself.</p>

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
              No memories saved yet. Add a fact to train Codeva's memory.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Cowork Sub-View Component ────────────────────────────────────────────────
// Claude-style "Cowork": delegate autonomous tasks that run in the background
// while you keep chatting. Each task streams its result live and can be stopped,
// retried, or copied. Real execution via the unified gateway (no simulation).

const COWORK_TEMPLATES = [
  { icon: FileCode,   label: 'Refactor code',     prompt: 'Refactor the following code for readability and performance, then explain what you changed:\n\n' },
  { icon: BookOpen,   label: 'Research a topic',  prompt: 'Research and write a concise, well-structured briefing on: ' },
  { icon: GitIcon,    label: 'Plan a feature',    prompt: 'Create a step-by-step implementation plan (with file-level tasks) for this feature: ' },
  { icon: Brain,      label: 'Debug an issue',    prompt: 'Analyze this bug, list the most likely root causes, and propose concrete fixes:\n\n' },
  { icon: Pencil,     label: 'Draft a document',  prompt: 'Draft a polished, professional document about: ' },
  { icon: Sparkles,   label: 'Brainstorm ideas',  prompt: 'Brainstorm 10 strong, distinct ideas for: ' },
]

function CoworkStatusBadge({ status }) {
  const map = {
    queued:  { icon: Clock,        text: 'Queued',  cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
    running: { icon: Loader2,      text: 'Running', cls: 'text-sky-400 bg-sky-400/10 border-sky-400/20', spin: true },
    done:    { icon: CheckCircle2, text: 'Done',    cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    error:   { icon: XCircle,      text: 'Failed',  cls: 'text-rose-400 bg-rose-400/10 border-rose-400/20' },
    stopped: { icon: Square,       text: 'Stopped', cls: 'text-foreground-muted bg-white/5 border-white/10' },
  }
  const s = map[status] || map.queued
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.cls}`}>
      <Icon className={`w-3 h-3 ${s.spin ? 'animate-spin' : ''}`} />
      {s.text}
    </span>
  )
}

function CoworkTaskCard({ task, onStop, onRetry, onRemove }) {
  const [expanded, setExpanded] = useState(task.status === 'running')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (task.status === 'running') setExpanded(true)
  }, [task.status])

  const elapsed = task.finishedAt && task.startedAt
    ? `${((task.finishedAt - task.startedAt) / 1000).toFixed(1)}s`
    : null

  const handleCopy = () => {
    navigator.clipboard.writeText(task.output || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-background-secondary overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3">
        <button onClick={() => setExpanded(e => !e)} className="flex items-start gap-3 text-left flex-1 min-w-0">
          <ChevronDown className={`w-4 h-4 mt-1 text-foreground-muted flex-shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground-primary truncate">{task.title}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <CoworkStatusBadge status={task.status} />
              <span className="text-[10px] text-foreground-muted font-mono truncate max-w-[160px]">{task.model}</span>
              {elapsed && <span className="text-[10px] text-foreground-muted">· {elapsed}</span>}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1 flex-shrink-0">
          {task.status === 'running' && (
            <button onClick={() => onStop(task.id)} title="Stop task"
              className="p-1.5 text-foreground-muted hover:text-rose-400 hover:bg-white/5 rounded-lg transition-all">
              <Square className="w-3.5 h-3.5" />
            </button>
          )}
          {(task.status === 'error' || task.status === 'stopped' || task.status === 'done') && (
            <button onClick={() => onRetry(task.id)} title="Run again"
              className="p-1.5 text-foreground-muted hover:text-accent hover:bg-white/5 rounded-lg transition-all">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          {task.output && (
            <button onClick={handleCopy} title="Copy result"
              className="p-1.5 text-foreground-muted hover:text-foreground-primary hover:bg-white/5 rounded-lg transition-all">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
          <button onClick={() => onRemove(task.id)} title="Remove"
            className="p-1.5 text-foreground-muted hover:text-rose-400 hover:bg-white/5 rounded-lg transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border-subtle/60"
          >
            <div className="p-4 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-foreground-muted font-semibold mb-1">Task</p>
                <p className="text-xs text-foreground-secondary whitespace-pre-wrap leading-relaxed">{task.prompt}</p>
              </div>
              {task.error && (
                <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-300 text-xs">
                  {task.error}
                </div>
              )}
              {(task.output || task.status === 'running') && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-foreground-muted font-semibold mb-1">Result</p>
                  <div className="rounded-xl border border-border-subtle/60 bg-background-tertiary/40 p-3 max-h-80 overflow-y-auto text-xs text-foreground-primary leading-relaxed prose-cowork">
                    {task.output
                      ? <ReactMarkdown>{task.output}</ReactMarkdown>
                      : <span className="text-foreground-muted inline-flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Working…</span>}
                    {task.status === 'running' && task.output && <BlinkCursor />}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CoworkView({ tasks, models, selectedModel, onStart, onStop, onRetry, onRemove }) {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState(selectedModel)

  const activeCount = tasks.filter(t => t.status === 'running' || t.status === 'queued').length
  const doneCount = tasks.filter(t => t.status === 'done').length

  const submit = () => {
    if (!prompt.trim()) return
    onStart(prompt, model)
    setPrompt('')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground-primary flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-accent" />
            Cowork
          </h2>
          <p className="text-xs text-foreground-muted mt-1 max-w-lg">
            Delegate autonomous tasks that run in the background while you keep chatting. Each task executes end-to-end and streams its result live.
          </p>
        </div>
        {tasks.length > 0 && (
          <div className="flex items-center gap-3 text-[11px] text-foreground-muted flex-shrink-0">
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" /> {activeCount} active</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> {doneCount} done</span>
          </div>
        )}
      </div>

      {/* Task composer */}
      <div className="p-4 rounded-2xl border border-border-subtle bg-background-secondary space-y-3">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit() } }}
          placeholder="Describe a task to run in the background. e.g. “Research the top 5 vector databases and compare them in a table.”"
          rows={3}
          className="w-full bg-background-tertiary text-sm text-foreground-primary placeholder:text-foreground-muted border border-border-subtle rounded-xl px-4 py-3 focus:outline-none focus:border-accent resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-foreground-muted font-semibold">Model</span>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="bg-background-tertiary text-xs text-foreground-primary border border-border-subtle rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent max-w-[200px]"
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={submit}
            disabled={!prompt.trim()}
            className="px-4 py-2 bg-accent hover:bg-accent-light text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            Run task
          </button>
        </div>
      </div>

      {/* Quick templates */}
      {tasks.length === 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-foreground-muted font-semibold mb-2">Start with a template</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {COWORK_TEMPLATES.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.label}
                  onClick={() => setPrompt(t.prompt)}
                  className="p-3 rounded-xl border border-border-subtle bg-background-secondary hover:bg-background-tertiary hover:border-accent/30 transition-all text-left flex items-center gap-2.5 group"
                >
                  <Icon className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-xs font-medium text-foreground-secondary group-hover:text-foreground-primary">{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Task list */}
      {tasks.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-wide text-foreground-muted font-semibold">Tasks</p>
          {tasks.map(task => (
            <CoworkTaskCard key={task.id} task={task} onStop={onStop} onRetry={onRetry} onRemove={onRemove} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Search Modal Component ───────────────────────────────────────────────────

function SearchModal({ isOpen, onClose, navigate }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setResults([])
    }
  }, [isOpen])

  const doSearch = async (q) => {
    if (!q.trim()) { setResults([]); return }
    try {
      const { data } = await api.get(`/search?q=${encodeURIComponent(q)}`)
      setResults(data.results || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleChange = (e) => {
    const v = e.target.value
    setQuery(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(v), 400)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-[640px] bg-[#252422] border border-white/5 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        <div className="relative border-b border-white/5 flex items-center">
          <Search className="absolute left-5 w-5 h-5 text-[#888888]" />
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Search chats and projects"
            autoFocus
            className="w-full bg-transparent pl-14 pr-14 py-4 text-[15px] text-[#e8e6e1] placeholder-[#888888] focus:outline-none"
          />
          <button onClick={onClose} className="absolute right-4 p-1 rounded-md text-[#888888] hover:text-[#d4d4d4] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {results.length > 0 && (
          <div className="overflow-y-auto p-2">
            {results.map((r, i) => (
              <div 
                key={i} 
                onClick={() => { onClose(); navigate(`/chat/${r._id || r.thread_id}`) }}
                className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-white/5 rounded-xl group transition-colors"
              >
                <div className="flex items-center gap-3.5 overflow-hidden">
                  <div className="p-1.5 rounded-full bg-white/5 border border-white/5 flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-[#888888]" />
                  </div>
                  <span className="text-[14.5px] font-medium text-[#d4d4d4] truncate">{r.title || 'Untitled'}</span>
                </div>
                <span className="text-[13px] text-[#888888] opacity-0 group-hover:opacity-100 transition-opacity pl-4">Enter</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


// ─── Coming Soon View ──────────────────────────────────────────────────────────

function ComingSoonView({ title, description }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A]/50 to-transparent pointer-events-none" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="w-40 h-40 mb-8 relative">
          <svg viewBox="0 0 200 200" className="w-full h-full animate-pulse-slow">
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#9333EA" stopOpacity="0.8" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle cx="100" cy="100" r="80" fill="none" stroke="url(#grad1)" strokeWidth="4" filter="url(#glow)"/>
            <path d="M100 40 L100 160 M40 100 L160 100" stroke="#E8E6E1" strokeWidth="2" opacity="0.3" strokeDasharray="5,5"/>
            <circle cx="100" cy="100" r="40" fill="url(#grad1)" filter="url(#glow)">
              <animate attributeName="r" values="35;45;35" dur="3s" repeatCount="indefinite" />
            </circle>
            <path d="M85 100 L100 115 L125 85" fill="none" stroke="#FFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight text-center">{title}</h2>
        <p className="text-lg text-[#A3A097] text-center max-w-md leading-relaxed">
          {description}
        </p>
        <div className="mt-8 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 text-sm tracking-widest uppercase shadow-lg">
          Coming Soon
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main ChatPage ────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { threadId } = useParams()
  const [showProModal, setShowProModal] = useState(false)
  const navigate = useNavigate()

  // State
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeNav, setActiveNav] = useState('chats')
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Project & Style State
  const [activeProject, setActiveProject] = useState(null)
  const [activeStyle, setActiveStyle] = useState(null)
  const [selectedModel, setSelectedModel] = useState('codeva/abhimanyu')
  const [effortLevel, setEffortLevel] = useState('low')
  const [thinkingEnabled, setThinkingEnabled] = useState(false)
  const [copied, setCopied] = useState(null)
  
  // Image Usage State
  const [imageUsage, setImageUsage] = useState(null)

  const fetchImageUsage = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const res = await fetch(`${API_BASE}/images/usage`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      })
      if (res.ok) {
        const data = await res.json()
        setImageUsage(data)
      }
    } catch (e) {
      console.error('Failed to fetch image usage:', e)
    }
  }

  useEffect(() => {
    fetchImageUsage()
    const handleImageUpdate = () => fetchImageUsage()
    window.addEventListener('image-generated', handleImageUpdate)
    return () => window.removeEventListener('image-generated', handleImageUpdate)
  }, [])
  const [streamingIndex, setStreamingIndex] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState('general')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [daemonConnected, setDaemonConnected] = useState(false)
  const [isWarmingUp, setIsWarmingUp] = useState(false)
  const [backendReady, setBackendReady] = useState(true)

  // Attachment Menu State
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false)
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false)
  const attachmentMenuRef = useRef(null)
  const attachmentButtonRef = useRef(null)

  // Auto Updater State
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState(null)
  const [updateProgress, setUpdateProgress] = useState(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        attachmentMenuRef.current && 
        !attachmentMenuRef.current.contains(e.target) &&
        attachmentButtonRef.current &&
        !attachmentButtonRef.current.contains(e.target)
      ) {
        setIsAttachmentMenuOpen(false)
        setIsStyleMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (window.electronAPI) {
      const cleanupAvailable = window.electronAPI.onUpdateAvailable((info) => {
        setUpdateInfo(info)
        setUpdateAvailable(true)
        setShowUpdateModal(true)
      })
      const cleanupProgress = window.electronAPI.onUpdateProgress((p) => {
        setUpdateProgress(p)
      })
      const cleanupDownloaded = window.electronAPI.onUpdateDownloaded((info) => {
        setUpdateDownloaded(true)
        setUpdateProgress(null)
      })
      return () => {
        cleanupAvailable()
        cleanupProgress()
        cleanupDownloaded()
      }
    }
  }, [])
  useEffect(() => {
    let active = true
    const check = async () => {
      const ok = await checkBackendHealth()
      if (!ok) {
        if (!active) return
        setIsWarmingUp(true)
        setBackendReady(false)
        while (active) {
          await new Promise(r => setTimeout(r, 3000))
          if (!active) return
          const retryOk = await checkBackendHealth()
          if (retryOk) {
            setIsWarmingUp(false)
            setBackendReady(true)
            break
          }
        }
      } else {
        setIsWarmingUp(false)
        setBackendReady(true)
      }
    }
    check()
    return () => { active = false }
  }, [])

  // Claude & Cyber Mode Upgrades
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [workspaceTab, setWorkspaceTab] = useState('terminal')
  const [terminalHistory, setTerminalHistory] = useState([
    { type: 'output', text: 'Welcome to Codeva Workspace Terminal! Type your command below and hit enter.' }
  ])
  const [terminalInput, setTerminalInput] = useState('')
  const [terminalLoading, setTerminalLoading] = useState(false)
  const [activePreviewFile, setActivePreviewFile] = useState(null)
  const [profileMenuTab, setProfileMenuTab] = useState('main')

  // Cowork — background/parallel autonomous tasks (lifted to parent so they survive tab switches)
  const [coworkTasks, setCoworkTasks] = useState([])
  const coworkAbortRef = useRef({})

  const [workspaceWidth, setWorkspaceWidth] = useState(600) // Default 600px
  const [isResizing, setIsResizing] = useState(false)

  // Desktop drag & drop
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)

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
  const [customInstructions, setCustomInstructions] = useState('')
  const incognitoMessagesRef = useRef([])

  // Profile settings
  const [userAvatar, setUserAvatar] = useState('')

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
    else if (key === 'avatar_url') setUserAvatar(value)
    else if (key === 'display_name' || key === 'full_name') {
      setUserName(value)
      localStorage.setItem('user_name', value)
    }
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

  // User plan (drives voice deep-research gating: Pro/Max research before reply)
  const [userPlan, setUserPlan] = useState('free')
  useEffect(() => {
    let cancelled = false
    if (!isLoggedIn()) return
    api.get('/auth/me/stats')
      .then(({ data }) => { if (!cancelled && data?.plan) setUserPlan(String(data.plan).toLowerCase()) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

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

    if (localStorage.getItem('force_kali_mode') === 'true') {
      setActiveNav('kali_kal')
      localStorage.removeItem('force_kali_mode')
    }
  }, [])

  useEffect(() => {
    if (threadId && isLoggedIn()) {
      activeThreadIdRef.current = threadId
      
      const t = threads.find(x => x._id === threadId)
      if (t && (t.mode === 'kali_kal' || t.mode === 'kalikal')) {
        setActiveNav('kali_kal')
      }

      if (creatingThreadRef.current === threadId) {
        creatingThreadRef.current = null
      } else {
        loadMessages(threadId)
      }
    } else {
      activeThreadIdRef.current = null
      setMessages([])
    }
  }, [threadId, threads])

  useEffect(() => {
    const fetchCapabilities = async () => {
      if (!isLoggedIn()) return
      try {
        const { data } = await api.get('/settings')
        setWebSearchEnabled(data.web_search_enabled || false)
        setCodeExecutionEnabled(data.code_execution_enabled || false)
        setImageGenerationEnabled(data.image_generation_enabled || false)
        setMemoryEnabled(data.memories && data.memories.length > 0)
        setCustomInstructions(data.custom_instructions || '')
        setCurrentTheme(data.appearance || 'system')
        setCurrentFont(data.chat_font || 'inter')
        setUserAvatar(data.avatar_url || '')
        if (data.display_name) {
          setUserName(data.display_name)
          localStorage.setItem('user_name', data.display_name)
        }
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

  // Desktop shortcuts via Electron IPC
  useEffect(() => {
    if (!window.electronAPI) return

    const removeNewChat = window.electronAPI.onShortcutNewChat?.(() => {
      handleNewChat()
    })
    const removeFocusInput = window.electronAPI.onShortcutFocusInput?.(() => {
      inputRef.current?.focus()
    })

    return () => {
      removeNewChat?.()
      removeFocusInput?.()
    }
  }, [])

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
      if (thread?.mode === 'kali_kal') {
        setActiveNav('kali_kal')
      }
    } catch (err) {
      console.error('Failed to load messages:', err)
      setError('Failed to load conversation.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateThread = async (title = 'New Chat', folderId = null, mode = 'standard') => {
    try {
      const { data } = await api.post('/chat', { title, model_id: selectedModel, folder_id: folderId, mode })
      setThreads(prev => [data, ...prev])
      creatingThreadRef.current = data._id
      activeThreadIdRef.current = data._id
      navigate(`/chat/${data._id}`)
      return data._id
    } catch (err) {
      console.error('Failed to create thread:', err)
      return null
    }
  }

  // ── Cowork: run a real autonomous task in the background via SSE streaming ────
  const updateCoworkTask = useCallback((id, patch) => {
    setCoworkTasks(prev => prev.map(t => t.id === id ? { ...t, ...(typeof patch === 'function' ? patch(t) : patch) } : t))
  }, [])

  const runCoworkTask = useCallback(async (taskId) => {
    let task
    setCoworkTasks(prev => {
      task = prev.find(t => t.id === taskId)
      return prev.map(t => t.id === taskId ? { ...t, status: 'running', output: '', error: null, startedAt: Date.now() } : t)
    })
    if (!task) return

    const controller = new AbortController()
    coworkAbortRef.current[taskId] = controller

    const systemPrompt = `You are Codeva Cowork, an autonomous agent that completes a delegated task end-to-end without asking follow-up questions. Work step by step, show your reasoning briefly, and finish with a clear, structured result. If the task is ambiguous, make reasonable assumptions and state them.`

    try {
      const token = await getFreshToken()
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      const response = await fetch(`${API_BASE}/completions`, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: task.prompt },
          ],
          model: task.model || selectedModel,
          stream: true,
        }),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let acc = ''
      let streamError = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') { continue }
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'token' && parsed.content) {
              acc += parsed.content
              updateCoworkTask(taskId, { output: acc })
            } else if (parsed.type === 'error' || parsed.error) {
              streamError = parsed.content || parsed.error || 'Stream error'
            }
          } catch {
            // ignore malformed lines
          }
        }
      }

      if (streamError && !acc) throw new Error(streamError)
      updateCoworkTask(taskId, { status: 'done', output: acc, finishedAt: Date.now() })
    } catch (err) {
      if (controller.signal.aborted) {
        updateCoworkTask(taskId, { status: 'stopped', finishedAt: Date.now() })
      } else {
        updateCoworkTask(taskId, { status: 'error', error: err.message || 'Task failed', finishedAt: Date.now() })
      }
    } finally {
      delete coworkAbortRef.current[taskId]
    }
  }, [selectedModel, updateCoworkTask])

  const handleStartCoworkTask = useCallback((prompt, model) => {
    const id = `cw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const title = prompt.trim().split('\n')[0].slice(0, 60) || 'Untitled task'
    setCoworkTasks(prev => [
      { id, title, prompt: prompt.trim(), model: model || selectedModel, status: 'queued', output: '', error: null, createdAt: Date.now() },
      ...prev,
    ])
    // kick off async (let state settle first)
    setTimeout(() => runCoworkTask(id), 0)
    return id
  }, [selectedModel, runCoworkTask])

  const handleStopCoworkTask = useCallback((taskId) => {
    const controller = coworkAbortRef.current[taskId]
    if (controller) controller.abort()
  }, [])

  const handleRetryCoworkTask = useCallback((taskId) => {
    runCoworkTask(taskId)
  }, [runCoworkTask])

  const handleRemoveCoworkTask = useCallback((taskId) => {
    const controller = coworkAbortRef.current[taskId]
    if (controller) controller.abort()
    setCoworkTasks(prev => prev.filter(t => t.id !== taskId))
  }, [])

  const handleDeleteThread = async (id, e) => {
    e?.stopPropagation()
    if (!confirm('Delete this conversation?')) return
    const previousThreads = [...threads]
    // Optimistically remove from sidebar
    setThreads(prev => prev.filter(t => t._id !== id))
    // If deleting the currently open thread, clear state and navigate away immediately
    if (activeThreadId === id || activeThreadIdRef.current === id) {
      setMessages([])
      setLoading(false)
      setStreamingIndex(null)
      setError(null)
      navigate('/chat', { replace: true })
    }
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

  const handleSend = useCallback(async (textOverride, modelOverride = null) => {
    const rawText = typeof textOverride === 'string' ? textOverride : input
    if (!rawText.trim() || loading) return false
    const userText = rawText.trim()

    // Determine active model and system prompt override if voice chat is open
    let activeModel = modelOverride || selectedModel
    const extraSystemMessages = []

    if (userLanguage && userLanguage.toUpperCase() !== 'EN') {
      extraSystemMessages.push({ role: 'system', content: `Please reply in ${userLanguage} language.`, _skip_inject: true })
    }

    if (customInstructions && customInstructions.trim() !== '') {
      extraSystemMessages.push({ role: 'system', content: `Custom User Instructions: ${customInstructions}`, _skip_inject: true })
    }
    
    if (voiceChatOpenRef.current) {
      const voice = currentVoice ? currentVoice.toLowerCase() : 'gemini_female'
      // Plan-gated power: Pro/Max voice agents do deeper reasoning + web research
      // before answering; Free stays fast and snappy.
      const isPaid = userPlan === 'pro' || userPlan === 'max' || userPlan === 'enterprise'
      const researchLine = isPaid
        ? ' Before answering, briefly reason about the question and use any provided web/search context to give an accurate, well-grounded answer. Remember earlier turns in this conversation and stay consistent with them.'
        : ' Remember earlier turns in this conversation and stay consistent with them.'

      // Voice ids come from VoiceChatModal: gemini_female / gemini_male_1 / gemini_male_2
      const VOICE_AGENTS_BRAINS = {
        gemini_female: {
          model: isPaid ? 'gemini/gemini-2.5-pro' : 'gemini/gemini-2.5-flash',
          prompt: `You are Kushi, a highly responsive, warm, and natural conversational AI voice assistant. Act like a real human girl. Keep responses ultra-fast, brief and conversational (max 1-2 short sentences). DO NOT use markdown, lists, bullet points, asterisks, or code blocks — your text is read aloud. Speak in a warm, friendly, natural tone.${researchLine}`
        },
        gemini_male_1: {
          model: isPaid ? 'gemini/gemini-2.5-pro' : 'gemini/gemini-2.5-flash',
          prompt: `You are Rudra, a lightning-fast, warm, and highly capable male voice assistant. Act like a real human man, similar to JARVIS. Keep responses precise, logical, and concise (max 1-2 sentences). DO NOT use markdown, bold text, or lists. Speak clearly and professionally with a warm, calm male tone.${researchLine}`
        },
        gemini_male_2: {
          model: isPaid ? 'mistral/mistral-large-latest' : 'groq/llama-3.1-8b',
          prompt: `You are Sankalp, an ultra-fast, expressive male strategic advisor. Act like a real human man. Keep responses thoughtful, technical, and short (max 1-2 sentences). DO NOT use markdown, bullet points, or code blocks. Speak with confidence and a warm, expressive male tone.${researchLine}`
        }
      }
      const brain = VOICE_AGENTS_BRAINS[voice] || VOICE_AGENTS_BRAINS.gemini_female
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
          const errText = await res.text().catch(() => `HTTP ${res.status}`)
          throw new Error(`Stream error ${res.status}: ${errText}`)
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
                  if (next.length > 0) next[next.length - 1] = { ...next[next.length - 1], content: `Error: ${parsed.content}`, error: true }
                  return next
                })
              } else if (parsed.type === 'terminal_stdout' || parsed.type === 'terminal_stderr') {
                window.dispatchEvent(new CustomEvent('kali-terminal-log', { detail: parsed }))
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
        return false
      } finally {
        setStreamingIndex(null)
        setLoading(false)
      }
      return true
    }
    
    if (typeof textOverride !== 'string') {
      setInput('')
    }
    
    setLoading(true)
    setError(null)

    let token = null
    try {
      token = await getFreshToken()
    } catch (e) {
      console.error('Failed to get token:', e)
    }

    // ── OVERRIDES ──
    if (deepResearchEnabled && activeModel !== 'opencode/deepseek-v4-flash' && activeModel !== 'council') {
      activeModel = 'opencode/deepseek-v4-flash'
    }

    // ── IMAGE GENERATION AUTO-INTERCEPT ──
    const isImageRequest = activeModel === 'image-gen' || (imageGenerationEnabled && /^(draw|generate image|create an image|make an image|paint)/i.test(userText.trim()))
    
    if (isImageRequest) {
      const isGuest = !token
      let currentId = activeThreadId || activeThreadIdRef.current || creatingThreadRef.current
      
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
            console.error('Failed to create thread for Image:', e)
          } finally {
            isCreatingThreadRef.current = false
          }
        }
      }

      // Add user message to UI
      const userMsg = { role: 'user', content: userText }
      setMessages(prev => [...prev, userMsg])
      
      // Save user msg to DB if auth
      if (!isGuest && !incognitoMode && currentId) {
        api.post(`/chat/${currentId}/messages/sync`, { role: 'user', content: userText, model: activeModel }).catch(console.error)
      }

      // Add assistant placeholder
      const assistantMsg = { role: 'assistant', content: '*Generating image...*', model: activeModel }
      setMessages(prev => [...prev, assistantMsg])
      setStreamingIndex(messages.length + 1)
      
      try {
        const response = await fetch(`${API_BASE}/images/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ prompt: userText })
        })
        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.error || `Error: ${response.status}`)
        }
        const data = await response.json()
        const fullReply = `![Generated Image](${data.url})`
        
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { ...next[next.length - 1], content: fullReply }
          return next
        })

        // Save assistant msg to DB if auth
        if (!isGuest && !incognitoMode && currentId) {
          api.post(`/chat/${currentId}/messages/sync`, { role: 'assistant', content: fullReply, model: activeModel }).catch(console.error)
        }
      } catch (e) {
        console.error('Image Generation Error:', e)
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { ...next[next.length - 1], content: `Error generating image: ${e.message}` }
          return next
        })
        return false
      } finally {
        setStreamingIndex(null)
        setLoading(false)
      }
      return true
    }

    // Guest mode / Incognito: no token or incognito → use completions endpoint directly
    if (!token || incognitoMode) {
      const userMsg = { role: 'user', content: userText }
      const history = [...messages.map(m => ({ role: m.role, content: m.content })), userMsg, ...extraSystemMessages]
      setMessages(prev => [...prev, userMsg])
      const assistantMsg = { role: 'assistant', content: '', model: activeModel }
      setMessages(prev => [...prev, assistantMsg])
      const assistantIdx = messages.length + 1
      setStreamingIndex(assistantIdx)
      let fullReply = ''
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
          const errText = await res.text().catch(() => `HTTP ${res.status}`)
          throw new Error(`Stream error ${res.status}: ${errText}`)
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
                throw new Error(parsed.content)
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
        return false
      } finally {
        setStreamingIndex(null)
        setLoading(false)
      }
      return true
    }
    
    // Use the ref as fallback so rapid consecutive sends don't create duplicate threads
    let currentId = activeThreadId || activeThreadIdRef.current || creatingThreadRef.current
    let useGuestFallback = false
    if (!currentId) {
      if (isCreatingThreadRef.current) return false
      isCreatingThreadRef.current = true
      
      // Retry with exponential backoff (3 attempts)
      let retries = 3
      let lastErr = null
      while (retries > 0) {
        try {
          const { data } = await api.post('/chat', { 
            title: userText.substring(0, 50), 
            model_id: activeModel,
            project_id: activeProject?._id || null,
            style_id: activeStyle?._id || null
          })
          setThreads(prev => [data, ...prev])
          currentId = data._id
          activeThreadIdRef.current = currentId
          creatingThreadRef.current = currentId
          navigate(`/chat/${currentId}`, { replace: true })
          lastErr = null
          break
        } catch (err) {
          lastErr = err
          retries--
          if (retries > 0) {
            console.warn(`Thread creation attempt failed (${retries} retries left):`, err.message)
            await new Promise(r => setTimeout(r, (3 - retries) * 1500))
          }
        }
      }
      isCreatingThreadRef.current = false
      
      if (lastErr) {
        console.warn('Thread creation failed after 3 retries. Falling back to guest mode.')
        // Graceful fallback: use completions endpoint (no thread persistence)
        useGuestFallback = true
      }
    }
    
    // Guest fallback path: send via /completions (no thread saving, but chat works)
    if (useGuestFallback) {
      const userMsg = { role: 'user', content: userText }
      const history = [...messages.map(m => ({ role: m.role, content: m.content })), userMsg, ...extraSystemMessages]
      setMessages(prev => [...prev, userMsg])
      const assistantMsg = { role: 'assistant', content: '', model: activeModel }
      setMessages(prev => [...prev, assistantMsg])
      const assistantIdx = messages.length + 1
      setStreamingIndex(assistantIdx)
      let fullReply = ''
      try {
        const token = await getFreshToken()
        const res = await fetch(`${API_BASE}/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ messages: history, model: activeModel, webSearchEnabled, deepResearchEnabled, effort: effortLevel, thinking: thinkingEnabled })
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
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
      } catch (err) {
        console.error('Guest fallback stream error:', err)
        setMessages(prev => {
          const next = [...prev]
          if (next.length > 0) next[next.length - 1] = { ...next[next.length - 1], content: `Error: ${err.message}` }
          return next
        })
        if (err.message.includes('429')) {
          setError('Rate limit exceeded. Please wait a moment and try again.')
        } else {
          setError(`Server error: ${err.message}. Your message was not saved.`)
        }
      } finally {
        setStreamingIndex(null)
        setLoading(false)
      }
      return
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
          memoryEnabled,
          project_id: activeProject?._id || null,
          style_id: activeStyle?._id || null,
          effort: effortLevel,
          thinking: thinkingEnabled
        })
      })
      if (!res.ok) {
        if (res.status === 401) {
          await useAuthStore.getState().signOut()
          navigate('/auth/login')
          return
        }
        const errText = await res.text().catch(() => `HTTP ${res.status}`)
        throw new Error(`Stream error ${res.status}: ${errText}`)
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
        ? `Cannot reach server. (${err.name}: ${err.message}) [ID: ${currentId}]` 
        : `Error: ${err.message}`
        
      setMessages(prev => {
        const next = [...prev]
        if (next.length > 0) {
          next[next.length - 1] = { ...next[next.length - 1], content: errorMessage }
        }
        return next
      })
      setError(errorMessage)
      return false
    } finally {
      setStreamingIndex(null)
      setLoading(false)
    }
    return true
  }, [input, loading, activeThreadId, messages, selectedModel, webSearchEnabled, codeExecutionEnabled, imageGenerationEnabled, memoryEnabled, speak, incognitoMode, currentVoice, customInstructions, userPlan, effortLevel, thinkingEnabled])

  // ── User info (from state & localStorage) ──
  const [userName, setUserName] = useState(() => localStorage.getItem('user_name') || 'User')
  const userEmail = localStorage.getItem('user_email') || ''
  const userInitials = useMemo(() => {
    return userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
  }, [userName])
  const [userLanguage, setUserLanguage] = useState(() => localStorage.getItem('user_language') || 'EN')

  const [showProfilePopover, setShowProfilePopover] = useState(false)
  const [helpPanelOpen, setHelpPanelOpen] = useState(false)
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

  const standardThreads = threads.filter(t => t.mode !== 'kali_kal' && t.mode !== 'kalikal')
  const pinnedThreads = standardThreads.filter(t => t.is_pinned)
  const recentThreads = standardThreads.filter(t => !t.is_pinned).slice(0, 30)

  const selectedModelObj = [...MODELS, ...EXTRA_MODELS].find(m => m.id === selectedModel)
  const isKaliMode = selectedModelObj?.kali === true

  // Desktop drag & drop handlers
  const handleDragOver = useCallback((e) => {
    if (!window.electronAPI) return
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingFiles(true)
    }
  }, [])

  const handleDragLeave = useCallback((e) => {
    if (!window.electronAPI) return
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFiles(false)
  }, [])

  const handleDrop = useCallback(async (e) => {
    if (!window.electronAPI) return
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFiles(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    const filePaths = files.map(f => f.path).filter(Boolean)
    if (filePaths.length === 0) return

    try {
      const result = await window.electronAPI.readDroppedFiles(filePaths)
      if (result.success) {
        // Add dropped file contents as context to input
        const fileContexts = result.files
          .filter(f => f.type === 'file')
          .map(f => `\n\n--- File: ${f.name} ---\n${f.content.substring(0, 10000)}`)
          .join('')
        if (fileContexts) {
          setInput(prev => prev + fileContexts)
        }
      }
    } catch (err) {
      console.error('Drag-drop error:', err)
    }
  }, [])

  return (
    <div
      className={`relative h-screen flex overflow-hidden ${isKaliMode ? 'kali-theme' : ''}`}
      style={{
        background: '#0C0C0C',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >

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
            style={{ background: 'var(--bg-secondary)' }}
          >
            {/* Brand / Desktop Toggle + collapse */}
            <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
              {!!window.electronAPI ? (
                <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.02]">
                  {['chats', 'cowork', 'code'].map(m => (
                    <button
                      key={m}
                      onClick={() => setActiveNav(m)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        activeNav === m
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {m === 'code' ? 'Kali_Kal' : m === 'chats' ? 'Chat' : m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>
              ) : (
                <a href="/" className="flex items-center gap-2.5">
                  <motion.div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(217,119,87,0.15)' }}
                  >
                    <CodevaMark size={24} />
                  </motion.div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm leading-tight text-foreground-primary">Codeva</span>
                    <span className="text-[9px] text-foreground-muted leading-none tracking-wide">by Codeva</span>
                  </div>
                </a>
              )}
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground-primary hover:bg-foreground-primary/5 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* New Chat */}
            <div className="px-3 pb-4 pt-1 flex-shrink-0">
              <button
                onClick={() => { navigate('/chat'); setMessages([]); setActiveNav('chats') }}
                className="w-full flex items-center justify-between px-4 py-2 rounded-full text-[13px] font-medium transition-colors bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.02] text-foreground-primary shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>New chat</span>
                </div>
              </button>
            </div>

            {/* Nav items */}
            <div className="px-2 pb-3 flex-shrink-0">
              {NAV_ITEMS.filter(item => !!window.electronAPI ? ['search', 'projects', 'artifacts', 'customize'].includes(item.id) : true).map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'voice') {
                      setVoiceChatOpen(true)
                    } else if (item.id === 'search') {
                      setIsSearchModalOpen(true)
                    } else {
                      if (activeNav !== item.id && activeThreadId) {
                        navigate('/chat')
                        setMessages([])
                      }
                      setActiveNav(item.id)
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                    activeNav === item.id
                      ? 'text-foreground-primary font-semibold'
                      : 'text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5'
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0 opacity-70" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ background: 'rgba(217,119,87,0.15)', color: '#D97757' }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-border-subtle my-1 mx-3 flex-shrink-0" />

            {/* Recents */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {(pinnedThreads.length > 0 || recentThreads.length > 0) && (
                <p className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted/65 mb-2 px-2">
                  Recents
                </p>
              )}

              {pinnedThreads.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-semibold text-foreground-muted px-2 mb-1">Pinned</p>
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
                <p className="text-xs text-foreground-muted text-center mt-6">No conversations yet</p>
              )}
            </div>

            {/* Bottom user bar with Popover */}
            <div 
              className="flex-shrink-0 border-t border-border-subtle p-3 relative"
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
                    className="absolute bottom-full left-3 right-3 mb-2 rounded-2xl border border-border-subtle shadow-2xl p-2 z-50 flex flex-col gap-0.5"
                    style={{ 
                      background: 'var(--bg-elevated)', 
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
                    }}
                  >
                    <button 
                      onClick={() => openSettings('general')}
                      onMouseEnter={() => setHoveredSubmenu(null)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Settings className="w-4 h-4 text-foreground-muted group-hover:text-[#D97757] transition-colors" />
                        <span>Settings</span>
                      </div>
                      <span className="text-[9px] text-foreground-muted tracking-tight font-bold uppercase">⚙ ↑Ctrl,</span>
                    </button>

                    <button 
                      onMouseEnter={() => setHoveredSubmenu('language')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Globe className="w-4 h-4 text-foreground-muted group-hover:text-[#D97757] transition-colors" />
                        <span>Language</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-foreground-muted" />
                    </button>

                    <button 
                      onClick={() => {
                        setHelpPanelOpen(true)
                        setShowProfilePopover(false)
                      }}
                      onMouseEnter={() => setHoveredSubmenu(null)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5 transition-all text-left group"
                    >
                      <HelpCircle className="w-4 h-4 text-foreground-muted group-hover:text-[#D97757] transition-colors" />
                      <span>Get help</span>
                    </button>

                    <button 
                      onClick={() => navigate('/upgrade')}
                      onMouseEnter={() => setHoveredSubmenu(null)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5 transition-all text-left group"
                    >
                      <ArrowUpCircle className="w-4 h-4 text-foreground-muted group-hover:text-[#D97757] transition-colors" />
                      <span>Upgrade plan</span>
                    </button>

                    <button 
                      onClick={() => setShowInviteModal(true)}
                      onMouseEnter={() => setHoveredSubmenu(null)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5 transition-all text-left group"
                    >
                      <Gift className="w-4 h-4 text-foreground-muted group-hover:text-[#D97757] transition-colors" />
                      <span>Invite Friends</span>
                    </button>

                    <Link
                      to="/downloads"
                      onMouseEnter={() => setHoveredSubmenu(null)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5 transition-all text-left group"
                    >
                      <Download className="w-4 h-4 text-foreground-muted group-hover:text-[#D97757] transition-colors" />
                      <span>Get apps and extensions</span>
                    </Link>

                    <button 
                      onMouseEnter={() => setHoveredSubmenu('learn_more')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Info className="w-4 h-4 text-foreground-muted group-hover:text-[#D97757] transition-colors" />
                        <span>Learn more</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-foreground-muted" />
                    </button>

                    <div className="h-[1px] bg-border-subtle my-1" />

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
                    className="fixed bottom-[140px] left-[285px] w-[240px] rounded-2xl border border-border-subtle shadow-2xl p-2 z-[60] flex flex-col gap-0.5"
                    style={{ 
                      background: 'var(--bg-elevated)', 
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
                    }}
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold text-foreground-muted uppercase tracking-wider border-b border-border-subtle mb-1">Select Language</div>
                    <div className="max-h-[300px] overflow-y-auto pr-1">
                      {LANGUAGES.map(lang => (
                        <button
                          key={lang.name}
                          onClick={() => {
                            setUserLanguage(lang.code)
                            localStorage.setItem('user_language', lang.code)
                            localStorage.setItem('user_language_name', lang.name)
                          }}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5 transition-all text-left"
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
                    className="fixed bottom-[90px] left-[285px] w-[240px] rounded-2xl border border-border-subtle shadow-2xl p-2 z-[60] flex flex-col gap-0.5"
                    style={{ 
                      background: 'var(--bg-elevated)', 
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
                    }}
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold text-foreground-muted uppercase tracking-wider border-b border-border-subtle mb-1">Resources</div>
                    <Link
                      to="/docs"
                      className="w-full px-3 py-1.5 rounded-lg text-xs text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5 transition-all text-left block"
                    >
                      API Console
                    </Link>
                    <Link
                      to="/about"
                      className="w-full px-3 py-1.5 rounded-lg text-xs text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5 transition-all text-left block"
                    >
                      About Codeva
                    </Link>
                    <Link
                      to="/docs"
                      className="w-full px-3 py-1.5 rounded-lg text-xs text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5 transition-all text-left block"
                    >
                      Tutorials
                    </Link>
                    <a
                      href="https://cybermindcli.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-3 py-1.5 rounded-lg text-xs text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5 transition-all text-left block"
                    >
                      Courses
                    </a>
                    <Link
                      to="/terms-of-service"
                      className="w-full px-3 py-1.5 rounded-lg text-xs text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5 transition-all text-left block"
                    >
                      Usage policy
                    </Link>
                    <Link
                      to="/privacy-policy"
                      className="w-full px-3 py-1.5 rounded-lg text-xs text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5 transition-all text-left block"
                    >
                      Privacy policy
                    </Link>
                    <Link
                      to="/privacy-policy#choices"
                      className="w-full px-3 py-1.5 rounded-lg text-xs text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5 transition-all text-left block"
                    >
                      Your privacy choices
                    </Link>
                    <button
                      onClick={() => setShowShortcutsModal(true)}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5 transition-all text-left"
                    >
                      <span>Keyboard shortcuts</span>
                      <span className="text-[10px] text-foreground-muted font-semibold font-mono">Ctrl+/</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between px-2 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-all cursor-pointer group">
                <div className="flex items-center gap-2">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userName}
                      className="w-5 h-5 rounded-full object-cover flex-shrink-0 opacity-90"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 font-sans bg-white/10 text-white/80">
                      {userInitials || 'c'}
                    </div>
                  )}
                  <div className="text-[12px] font-medium text-foreground-secondary group-hover:text-foreground-primary truncate max-w-[120px]">
                    {userName || 'User'}
                  </div>
                  <div className="w-1 h-1 rounded-full bg-white/20" />
                  <div className="text-[11px] text-foreground-muted group-hover:text-foreground-secondary">
                    {!localStorage.getItem('sb-access-token') ? 'Guest' : 'Free'}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronDown className="w-3.5 h-3.5 text-foreground-muted" />
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main Area ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header strip */}
        <header 
          className="relative flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b border-border-subtle bg-background-secondary/85 backdrop-blur-md"
          style={{ WebkitAppRegion: !!window.electronAPI ? 'drag' : 'auto' }}
        >
          {(!sidebarOpen && !window.electronAPI) && (
            <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' }}>
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground-primary hover:bg-foreground-primary/5 transition-colors"
              >
                <Menu className="w-4 h-4" />
              </button>
              <a href="/" className="flex items-center group transition-opacity hover:opacity-90">
                <CodevaWordmark size={24} />
              </a>
            </div>
          )}

          {!!window.electronAPI && (
            <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' }}>
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-1.5 rounded-lg text-[#888888] hover:text-[#d4d4d4] hover:bg-white/5 transition-colors"
                  title="Toggle Sidebar"
                >
                  <Menu className="w-[18px] h-[18px]" />
                </button>
              )}
              <button
                onClick={() => setSidebarOpen(prev => !prev)}
                className="p-1.5 rounded-lg text-[#888888] hover:text-[#d4d4d4] hover:bg-white/5 transition-colors"
                title="Toggle Sidebar Panel"
              >
                <PanelLeft className="w-[18px] h-[18px]" />
              </button>
              <button onClick={() => setIsSearchModalOpen(true)} className="p-1.5 rounded-lg text-[#888888] hover:text-[#d4d4d4] hover:bg-white/5 transition-colors" title="Search">
                <Search className="w-[18px] h-[18px]" />
              </button>
              <button onClick={() => window.history.back()} className="p-1.5 rounded-lg text-[#888888] hover:text-[#d4d4d4] hover:bg-white/5 transition-colors ml-1" title="Back">
                <ArrowLeft className="w-[18px] h-[18px]" />
              </button>
              <button onClick={() => window.history.forward()} className="p-1.5 rounded-lg text-[#888888] hover:text-[#d4d4d4] hover:bg-white/5 transition-colors" title="Forward">
                <ArrowRight className="w-[18px] h-[18px]" />
              </button>
            </div>
          )}

          {activeThreadId && activeNav === 'chats' && (
            <div className="flex items-center gap-2 text-sm" style={{ WebkitAppRegion: 'no-drag' }}>
              <span className="truncate max-w-[200px] font-medium text-foreground-secondary">
                {threads.find(t => t._id === activeThreadId)?.title || 'Chat'}
              </span>
            </div>
          )}

          {activeNav !== 'chats' && (
            <span className="text-sm font-semibold capitalize text-foreground-secondary" style={{ WebkitAppRegion: 'no-drag' }}>
              {activeNav}
            </span>
          )}

          {/* Top-Center Billing Badge - Now perfectly styled for Claude desktop aesthetic */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center pointer-events-auto z-10" style={{ WebkitAppRegion: 'no-drag' }}>
            <Link
              to="/upgrade"
              className="text-[12px] font-sans px-3.5 py-1.5 rounded-full bg-[#1e1e1e] border border-white/5 hover:bg-[#252525] text-[#d4d4d4] transition-all flex items-center gap-2 select-none shadow-sm"
            >
              <span>Free plan</span>
              <span className="w-[3px] h-[3px] rounded-full bg-[#666666]" />
              <span className="text-[#a3a3a3] hover:text-[#d4d4d4] underline decoration-white/20 underline-offset-4">Upgrade</span>
            </Link>
          </div>

          <div className="flex-1" />
          
          <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
            {/* Limit UI */}
            {imageUsage && imageUsage.limit !== 'unlimited' && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium mr-2 shadow-sm">
                <span className="text-yellow-400">⚡ Images:</span>
                <span className={imageUsage.count >= imageUsage.limit ? 'text-rose-400 font-bold' : 'text-gray-300'}>
                  {Math.max(0, imageUsage.limit - imageUsage.count)} left
                </span>
                {imageUsage.count >= imageUsage.limit && (
                  <a href="/upgrade" target="_blank" rel="noreferrer" className="ml-1 text-[10px] uppercase font-bold text-accent hover:underline">
                    Upgrade
                  </a>
                )}
              </div>
            )}
            {/* Active mode badges */}


            {/* Top Bar Toggles - Hide on Desktop for minimalist aesthetic */}
            {!window.electronAPI && (
              <>


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
              </>
            )}

            {/* Custom Window Controls (Desktop Only) */}
            {!!window.electronAPI && (
              <div className="flex items-center gap-1 ml-2" style={{ WebkitAppRegion: 'no-drag' }}>
                <button
                  onClick={() => setIncognitoMode(!incognitoMode)}
                  className={`p-1.5 rounded-lg transition-colors mr-2 ${
                    incognitoMode 
                      ? 'text-white bg-white/10' 
                      : 'text-[#888888] hover:text-[#d4d4d4] hover:bg-white/5'
                  }`}
                  title="Incognito Mode"
                >
                  <Ghost className="w-[18px] h-[18px]" />
                </button>
                <button onClick={() => window.electronAPI.minimizeWindow()} className="p-1.5 rounded-lg text-[#888888] hover:text-[#d4d4d4] hover:bg-white/5 transition-colors">
                  <Minus className="w-[18px] h-[18px]" />
                </button>
                <button onClick={() => window.electronAPI.maximizeWindow()} className="p-1.5 rounded-lg text-[#888888] hover:text-[#d4d4d4] hover:bg-white/5 transition-colors">
                  <Square className="w-[14px] h-[14px]" />
                </button>
                <button onClick={() => window.electronAPI.closeWindow()} className="p-1.5 rounded-lg text-[#888888] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <X className="w-[18px] h-[18px]" />
                </button>
              </div>
            )}
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
          <div className={`flex-1 flex flex-col min-w-0 h-full relative ${workspaceOpen && !isMobile ? 'w-[55%]' : 'w-full'}`}>
            {/* Server Warming Up Banner */}
            {isWarmingUp && !window.electronAPI && (
              <div className="bg-[#7C3AED]/10 border-b border-[#7C3AED]/20 px-4 py-2.5 text-center text-xs text-[#ECECEC] flex items-center justify-center gap-2 animate-pulse z-50 flex-shrink-0">
                <span className="inline-block w-2 h-2 rounded-full bg-[#7C3AED] animate-ping" />
                <span>⚡ Waking up the secure Codeva server from standby (takes ~20s)... Chat is temporarily locked.</span>
              </div>
            )}
            
            {/* Desktop Drag Overlay */}
            {isDraggingFiles && (
              <div className="absolute inset-0 z-[100] bg-[#7C3AED]/15 border-[3px] border-dashed border-[#7C3AED] flex items-center justify-center pointer-events-none animate-fade-in">
                <div className="bg-[#0A0A0F]/80 px-8 py-4 rounded-2xl text-center">
                  <p className="text-[#ECECEC] text-lg font-semibold">Drop files here</p>
                  <p className="text-[#A0A0A0] text-sm mt-1">Files will be added to your message</p>
                </div>
              </div>
            )}
            {/* Main Content Area based on Nav selection */}
            <div className="flex-1 overflow-y-auto flex flex-col min-h-0 relative">
              {threads.find(t => t._id === threadId)?.mode === 'kali_kal' && (
                <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
                  <MatrixRain color="#D91624" />
                </div>
              )}
              {activeNav === 'chats' ? (
                messages.length === 0 && !loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-4 pb-20">
                    <HeroState userName={userName} />
                    <div className="w-full mt-4">
                      <InputArea
                        userPlan={userPlan}
                        onRequirePro={() => setShowProModal(true)}
                        activeProject={activeProject}
                        setActiveProject={setActiveProject}
                        activeStyle={activeStyle}
                        setActiveStyle={setActiveStyle}
                        input={input}
                        setInput={setInput}
                        onSend={handleSend}
                        loading={loading || isWarmingUp}
                        selectedModel={selectedModel}
                        onModelChange={setSelectedModel}
                        effortLevel={effortLevel}
                        setEffortLevel={setEffortLevel}
                        thinkingEnabled={thinkingEnabled}
                        setThinkingEnabled={setThinkingEnabled}
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
                        imageUsage={imageUsage}
                      />
                    </div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      className="flex flex-wrap justify-center gap-2 mt-4"
                    >
                      {chatSuggestions.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setInput(item.query); textareaRef.current?.focus(); }}
                          className="flex items-center gap-2 px-3.5 py-2.5 rounded-[12px] bg-[#32302D] hover:bg-[#3A3835] border border-white/5 text-[#d4d4d4] hover:text-white transition-colors text-[13px] font-medium shadow-sm"
                        >
                          <span className="text-[#a3a3a3]">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </motion.div>
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
                        userPlan={userPlan}
                        onRequirePro={() => setShowProModal(true)}
                        activeProject={activeProject}
                        setActiveProject={setActiveProject}
                        activeStyle={activeStyle}
                        setActiveStyle={setActiveStyle}
                        input={input}
                        setInput={setInput}
                        onSend={handleSend}
                        loading={loading || isWarmingUp}
                        selectedModel={selectedModel}
                        onModelChange={setSelectedModel}
                        effortLevel={effortLevel}
                        setEffortLevel={setEffortLevel}
                        thinkingEnabled={thinkingEnabled}
                        setThinkingEnabled={setThinkingEnabled}
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
                        imageUsage={imageUsage}
                      />
                    </div>
                  </div>
                )
              ) : activeNav === 'search' ? (
                <ComingSoonView 
                  title="Global Search" 
                  description="Global search across all your chats, projects, and artifacts is currently being upgraded."
                />
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
              ) : activeNav === 'kali_kal' ? (
                <KaliKalView 
                  threads={threads}
                  messages={messages}
                  input={input}
                  setInput={setInput}
                  handleSend={handleSend}
                  loading={loading}
                  handleCreateThread={handleCreateThread}
                  navigate={navigate}
                  userPlan={userPlan}
                  activeThreadId={activeThreadId || activeThreadIdRef.current || creatingThreadRef.current}
                />
              ) : activeNav === 'cowork' || activeNav === 'code' ? (
                <ComingSoonView 
                  title={activeNav === 'cowork' ? "Cowork Tasks" : "Code Editor"} 
                  description={`The autonomous ${activeNav} environment is being heavily upgraded for the upcoming Pro release.`}
                />
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
                  customInstructions={customInstructions}
                  setCustomInstructions={setCustomInstructions}
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
                                <span className="text-emerald-400 font-bold select-none shrink-0">user@codeva:~/workspace$</span>
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
npm install -g codeva{"\n"}
codeva link --key YOUR_API_KEY</pre>
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

      <SearchModal 
        isOpen={isSearchModalOpen} 
        onClose={() => setIsSearchModalOpen(false)} 
        navigate={navigate} 
      />

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

      {/* Invite Friends Modal */}
      <InviteFriendsModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />

      {/* Help Center panel */}
      <HelpCenterPanel isOpen={helpPanelOpen} onClose={() => setHelpPanelOpen(false)} />

      {/* Update Modal */}
      <AnimatePresence>
        {showUpdateModal && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-[#2a2a2a] border border-[#3E3E3E] rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#37312c] flex items-center justify-center shadow-sm">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#D97757]">
                    <path d="M12 2l1.2 6.8L20 10l-6.8 1.2L12 18l-1.2-6.8L4 10l6.8-1.2L12 2z" fill="currentColor" />
                  </svg>
                </div>
                <button onClick={() => setShowUpdateModal(false)} className="text-[#A3A097] hover:text-[#E8E6E1] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <h3 className="text-xl font-serif text-[#E8E6E1] mb-2">
                {updateDownloaded ? 'Update Ready to Install' : 'Update Available'}
              </h3>
              
              <p className="text-[15px] text-[#A3A097] mb-6 leading-relaxed">
                {updateDownloaded 
                  ? 'The latest version of Codeva has been downloaded. Restart the app to apply the update.' 
                  : updateInfo?.version 
                    ? `A new version of Codeva (${updateInfo.version}) is available. Do you want to download it now?` 
                    : 'A new version of Codeva is available. Do you want to download it now?'}
              </p>

              {updateInfo?.releaseNotes && (
                <div className="mb-6 bg-[#1f1e1c] p-4 rounded-xl border border-white/[0.05] max-h-[160px] overflow-y-auto">
                  <h4 className="text-sm font-semibold text-[#E8E6E1] mb-2">Changelog</h4>
                  <div className="text-[13px] text-[#A3A097] space-y-1 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: typeof updateInfo.releaseNotes === 'string' ? updateInfo.releaseNotes : Array.isArray(updateInfo.releaseNotes) ? updateInfo.releaseNotes.map(n => n.note || n.text || '').join('<br/>') : '' }} />
                </div>
              )}
              
              {updateProgress && !updateDownloaded && (
                <div className="mb-6">
                  <div className="flex justify-between text-[12px] text-[#A3A097] mb-2">
                    <span>Downloading update...</span>
                    <span>{Math.round(updateProgress.percent)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-[#D97757]"
                      initial={{ width: 0 }}
                      animate={{ width: `${updateProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 justify-end">
                {!updateProgress && !updateDownloaded && (
                  <>
                    <button 
                      onClick={() => setShowUpdateModal(false)}
                      className="px-4 py-2 rounded-xl text-[#E8E6E1] hover:bg-white/5 transition-colors text-[14px] font-medium"
                    >
                      Later
                    </button>
                    <button 
                      onClick={() => window.electronAPI.downloadUpdate()}
                      className="px-4 py-2 rounded-xl bg-[#E8E6E1] text-[#1a1917] hover:bg-white transition-colors text-[14px] font-medium"
                    >
                      Download Now
                    </button>
                  </>
                )}
                
                {updateDownloaded && (
                  <button 
                    onClick={() => window.electronAPI.restartToUpdate()}
                    className="px-4 py-2 rounded-xl bg-[#D97757] text-white hover:bg-[#D97757]/90 transition-colors text-[14px] font-medium"
                  >
                    Restart App
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showProModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[#1A1A1A] border border-[#3E3E3E] rounded-3xl max-w-md w-full overflow-hidden shadow-2xl"
          >
            <div className="relative h-48 bg-gradient-to-br from-indigo-600 to-purple-800 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30"></div>
              <Sparkles className="w-20 h-20 text-white opacity-80" />
            </div>
            <div className="p-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Upgrade to Pro</h2>
              <p className="text-[#A3A097] mb-8 leading-relaxed">
                Unlock exclusive access to advanced reasoning models, real-time web search, autonomous council mode, and much more.
              </p>
              <button 
                onClick={() => {
                  setShowProModal(false)
                  navigate('/settings?tab=plan')
                }}
                className="w-full bg-white text-black font-semibold rounded-xl py-3.5 hover:bg-[#E8E6E1] transition-transform active:scale-95 shadow-lg mb-4"
              >
                Upgrade Now
              </button>
              <button 
                onClick={() => setShowProModal(false)}
                className="w-full bg-transparent text-[#A3A097] font-medium rounded-xl py-3 hover:text-white transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  )
}
