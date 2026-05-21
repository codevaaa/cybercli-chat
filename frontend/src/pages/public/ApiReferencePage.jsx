import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, ChevronRight, Lock, Zap, Globe, MessageSquare, Settings, List, Plus, Users, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'

const BASE_URL = 'https://api.cybercli.chat'

/* ── Syntax-highlighted JSON ────────────────────────────────── */
function JsonBlock({ json }) {
  const formatted = JSON.stringify(json, null, 2)
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(formatted)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Simple syntax highlighting
  const highlighted = formatted
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) return `<span style="color:#a78bfa">${match}</span>`
        return `<span style="color:#86efac">${match}</span>`
      }
      if (/true|false/.test(match)) return `<span style="color:#fb923c">${match}</span>`
      if (/null/.test(match)) return `<span style="color:#94a3b8">${match}</span>`
      return `<span style="color:#f472b6">${match}</span>`
    })

  return (
    <div className="relative group rounded-xl overflow-hidden border border-[rgba(255,255,255,0.06)] bg-[#0d0d14]">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[rgba(255,255,255,0.03)] border-b border-[rgba(255,255,255,0.05)]">
        <span className="text-[#475569] text-xs font-mono">JSON</span>
        <button onClick={copy}
          className="flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#94a3b8] transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs leading-relaxed font-mono text-[#e2e8f0]">
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  )
}

/* ── Method badge ───────────────────────────────────────────── */
function MethodBadge({ method }) {
  const colors = {
    GET: 'bg-[rgba(34,197,94,0.1)] text-[#4ade80] border-[rgba(34,197,94,0.25)]',
    POST: 'bg-[rgba(124,58,237,0.15)] text-[#a78bfa] border-[rgba(124,58,237,0.3)]',
    PUT: 'bg-[rgba(251,191,36,0.1)] text-[#fbbf24] border-[rgba(251,191,36,0.25)]',
    DELETE: 'bg-[rgba(239,68,68,0.1)] text-[#f87171] border-[rgba(239,68,68,0.25)]',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold border font-mono ${colors[method] || colors.GET}`}>
      {method}
    </span>
  )
}

/* ── Endpoint data ──────────────────────────────────────────── */
const GROUPS = [
  {
    id: 'auth',
    label: 'Authentication',
    icon: Lock,
    endpoints: [
      {
        id: 'auth-signup',
        method: 'POST',
        path: '/api/v1/auth/signup',
        description: 'Create a new user account. Returns a JWT access token and sets a refresh cookie.',
        request: {
          email: 'user@example.com',
          password: 'mysecurepassword123',
          name: 'Jane Doe',
        },
        response: {
          user: { id: 'usr_01HXQFK2...', email: 'user@example.com', name: 'Jane Doe' },
          access_token: 'eyJhbGci...',
          token_type: 'Bearer',
        },
        notes: 'Password must be at least 8 characters. Email must be unique.',
      },
      {
        id: 'auth-login',
        method: 'POST',
        path: '/api/v1/auth/login',
        description: 'Sign in with email and password. Returns a JWT access token.',
        request: {
          email: 'user@example.com',
          password: 'mysecurepassword123',
        },
        response: {
          user: { id: 'usr_01HXQFK2...', email: 'user@example.com', name: 'Jane Doe' },
          access_token: 'eyJhbGci...',
          expires_in: 3600,
        },
        notes: 'Rate limited to 10 requests per minute per IP.',
      },
    ],
  },
  {
    id: 'chat',
    label: 'Chat Threads',
    icon: MessageSquare,
    endpoints: [
      {
        id: 'chat-list',
        method: 'GET',
        path: '/api/v1/chat',
        description: 'List all conversation threads for the authenticated user.',
        request: null,
        response: {
          threads: [
            { id: 'thr_01ABC...', title: 'My first chat', created_at: '2026-05-21T10:00:00Z', message_count: 12 },
          ],
          total: 1,
          page: 1,
        },
        notes: 'Results paginated — use ?page=N&limit=20 query params.',
      },
      {
        id: 'chat-create',
        method: 'POST',
        path: '/api/v1/chat',
        description: 'Create a new conversation thread.',
        request: {
          title: 'New chat',
          model: 'gpt-4o',
        },
        response: {
          id: 'thr_01ABC...',
          title: 'New chat',
          model: 'gpt-4o',
          created_at: '2026-05-21T10:00:00Z',
        },
        notes: 'Omit title to auto-generate from first message.',
      },
      {
        id: 'chat-message',
        method: 'POST',
        path: '/api/v1/chat/:id/messages',
        description: 'Send a message and stream the AI response via Server-Sent Events (SSE).',
        request: {
          content: 'Explain quantum computing in simple terms.',
          model: 'gpt-4o',
          stream: true,
        },
        response: {
          _note: 'SSE stream — one chunk per event',
          event: 'message',
          data: '{ "delta": "Quantum", "finish_reason": null }',
        },
        notes: 'Set Accept: text/event-stream header. Each data event contains a delta string.',
      },
    ],
  },
  {
    id: 'completions',
    label: 'Completions',
    icon: Users,
    endpoints: [
      {
        id: 'council',
        method: 'POST',
        path: '/api/v1/completions/council',
        description: 'Council Mode — query multiple models simultaneously and receive a synthesized response.',
        request: {
          content: 'What is the best programming language for AI?',
          models: ['gpt-4o', 'claude-3-5-sonnet', 'gemini-2.0-flash'],
          synthesize: true,
        },
        response: {
          individual: [
            { model: 'gpt-4o', content: 'Python is the most...' },
            { model: 'claude-3-5-sonnet', content: 'Python excels due to...' },
          ],
          synthesis: 'All models agree that Python is the dominant language...',
          consensus_score: 0.87,
        },
        notes: 'Council Mode is available on Pro and Enterprise plans. Streams each model in parallel.',
      },
    ],
  },
  {
    id: 'models',
    label: 'Models',
    icon: List,
    endpoints: [
      {
        id: 'models-list',
        method: 'GET',
        path: '/api/v1/models',
        description: 'Returns all available AI models and their metadata.',
        request: null,
        response: {
          models: [
            { id: 'gpt-4o', provider: 'openrouter', context: 128000, available: true },
            { id: 'claude-3-5-sonnet', provider: 'openrouter', context: 200000, available: true },
            { id: 'gemini-2.0-flash', provider: 'gemini', context: 1000000, available: true },
          ],
        },
        notes: 'No authentication required for this endpoint.',
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    endpoints: [
      {
        id: 'settings-get',
        method: 'GET',
        path: '/api/v1/settings',
        description: 'Retrieve all user settings and preferences.',
        request: null,
        response: {
          theme: 'dark',
          default_model: 'gpt-4o',
          tts_enabled: true,
          tts_voice: 'aria',
          council_mode: false,
          stream: true,
        },
        notes: 'Returns merged defaults + user overrides.',
      },
    ],
  },
]

/* ── Endpoint block ─────────────────────────────────────────── */
function EndpointBlock({ ep }) {
  return (
    <div id={ep.id} className="mb-14 scroll-mt-24">
      <div className="flex items-center gap-3 mb-3">
        <MethodBadge method={ep.method} />
        <code className="text-[#e2e8f0] text-sm font-mono">{ep.path}</code>
      </div>
      <p className="text-[#64748b] text-sm leading-relaxed mb-5">{ep.description}</p>

      {ep.notes && (
        <div className="mb-5 p-3.5 rounded-lg bg-[rgba(124,58,237,0.06)] border border-[rgba(124,58,237,0.2)] text-xs text-[#94a3b8]">
          <span className="text-[#a78bfa] font-medium">Note:</span> {ep.notes}
        </div>
      )}

      <div className="space-y-4">
        {ep.request && (
          <div>
            <p className="text-xs text-[#475569] font-semibold uppercase tracking-wider mb-2">Request body</p>
            <JsonBlock json={ep.request} />
          </div>
        )}
        <div>
          <p className="text-xs text-[#475569] font-semibold uppercase tracking-wider mb-2">Response</p>
          <JsonBlock json={ep.response} />
        </div>
      </div>
    </div>
  )
}

/* ── Main page ──────────────────────────────────────────────── */
export default function ApiReferencePage() {
  const [activeGroup, setActiveGroup] = useState('auth')
  const contentRef = useRef(null)

  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveGroup(id.split('-')[0] === 'auth' ? 'auth' : id.split('-')[0])
  }

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const gid = GROUPS.find(g => g.endpoints.some(e => e.id === entry.target.id))?.id
            if (gid) setActiveGroup(gid)
          }
        })
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )
    document.querySelectorAll('[data-endpoint]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-[#0A0A0F] pt-20">
      {/* Header */}
      <motion.div className="border-b border-[rgba(255,255,255,0.06)] px-6 py-12 text-center"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.08)] text-[#a78bfa] text-xs font-medium mb-5">
          <BookOpen className="w-3 h-3" /> API Reference v1
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">API Reference</h1>
        <p className="text-[#64748b] text-base mb-4">
          Programmatic access to CyberCli's AI gateway and chat infrastructure.
        </p>
        <code className="text-xs font-mono px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[#a78bfa]">
          Base URL: {BASE_URL}
        </code>
      </motion.div>

      <div className="flex max-w-[1400px] mx-auto">
        {/* Sticky sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto py-8 px-4 border-r border-[rgba(255,255,255,0.05)]">
          {/* Auth note */}
          <div className="mb-6 p-3 rounded-lg bg-[rgba(124,58,237,0.08)] border border-[rgba(124,58,237,0.2)]">
            <div className="flex items-center gap-2 text-[#a78bfa] text-xs font-semibold mb-1">
              <Lock className="w-3 h-3" /> Authentication
            </div>
            <p className="text-[#64748b] text-[11px] leading-relaxed">
              Include <code className="text-[#86efac]">Authorization: Bearer {'<token>'}</code> on protected endpoints.
            </p>
          </div>

          <nav className="space-y-1">
            {GROUPS.map(group => (
              <div key={group.id} className="mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wider">
                  <group.icon className="w-3.5 h-3.5" />
                  {group.label}
                </div>
                {group.endpoints.map(ep => (
                  <button
                    key={ep.id}
                    onClick={() => scrollTo(ep.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-all ${
                      activeGroup === group.id
                        ? 'bg-[rgba(124,58,237,0.1)] text-[#e2e8f0]'
                        : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[rgba(255,255,255,0.03)]'
                    }`}
                  >
                    <MethodBadge method={ep.method} />
                    <span className="font-mono truncate">{ep.path.replace('/api/v1', '')}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main ref={contentRef} className="flex-1 min-w-0 px-6 lg:px-12 py-12">
          {/* Auth note */}
          <motion.div
            className="mb-12 p-5 rounded-xl border border-[rgba(124,58,237,0.25)] bg-[rgba(124,58,237,0.06)]"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 text-[#a78bfa] font-semibold mb-2">
              <Lock className="w-4 h-4" /> Authentication
            </div>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-3">
              Protected endpoints require a Bearer token in the Authorization header. Obtain your token from the <Link to="/auth/login" className="text-[#a78bfa] hover:underline">login endpoint</Link> or the <Link to="/settings" className="text-[#a78bfa] hover:underline">API Keys</Link> settings page.
            </p>
            <div className="rounded-lg bg-[#0d0d14] border border-[rgba(255,255,255,0.06)] p-4">
              <code className="text-xs text-[#e2e8f0] font-mono">
                Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
              </code>
            </div>
          </motion.div>

          {GROUPS.map((group, gi) => (
            <motion.section key={group.id} id={group.id}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: gi * 0.05 }}
              className="mb-16"
            >
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-[rgba(255,255,255,0.06)]">
                <div className="w-8 h-8 rounded-lg bg-[rgba(124,58,237,0.15)] border border-[rgba(124,58,237,0.25)] flex items-center justify-center">
                  <group.icon className="w-4 h-4 text-[#a78bfa]" />
                </div>
                <h2 className="text-xl font-bold text-white">{group.label}</h2>
              </div>
              {group.endpoints.map(ep => (
                <div key={ep.id} id={ep.id} data-endpoint>
                  <EndpointBlock ep={ep} />
                </div>
              ))}
            </motion.section>
          ))}

          {/* Rate limits section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mt-4 p-8 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]"
          >
            <h3 className="text-lg font-bold text-white mb-4">Rate Limits</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.06)]">
                    <th className="text-left py-2 pr-8 text-[#475569] font-medium text-xs uppercase tracking-wider">Plan</th>
                    <th className="text-left py-2 pr-8 text-[#475569] font-medium text-xs uppercase tracking-wider">Requests / hour</th>
                    <th className="text-left py-2 text-[#475569] font-medium text-xs uppercase tracking-wider">Council Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                  {[
                    { plan: 'Free', rpm: '50', council: '—' },
                    { plan: 'Pro', rpm: '500', council: '✓' },
                    { plan: 'Enterprise', rpm: 'Unlimited', council: '✓' },
                  ].map(row => (
                    <tr key={row.plan}>
                      <td className="py-3 pr-8 text-[#94a3b8]">{row.plan}</td>
                      <td className="py-3 pr-8 text-[#e2e8f0] font-mono">{row.rpm}</td>
                      <td className="py-3 text-[#4ade80]">{row.council}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>
        </main>
      </div>
    </div>
  )
}
