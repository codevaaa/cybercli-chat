import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Lock, Globe, MessageSquare, Settings, List, Users, BookOpen, Terminal, Sparkles, Code, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import ScrollReveal from '@components/ui/ScrollReveal'

const BASE_URL = 'https://api.cybercli.chat'

const SECTIONS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'auth', label: 'Authentication' },
  { id: 'chat-completions', label: 'Chat Completions' },
  { id: 'council-mode', label: 'Council Mode' },
  { id: 'list-models', label: 'List Models' },
  { id: 'account-usage', label: 'Account & Usage' },
]

const LANGUAGES = [
  { id: 'curl', label: 'cURL' },
  { id: 'javascript', label: 'Node.js' },
  { id: 'python', label: 'Python' }
]

const ENDPOINTS_DATA = {
  'chat-completions': {
    method: 'POST',
    path: '/api/v1/chat/:id/messages',
    desc: 'Send a prompt to the model and retrieve responses. Supports streaming via Server-Sent Events (SSE) for real-time output.',
    params: [
      { name: 'content', type: 'string', required: true, desc: 'The user message to send to the assistant.' },
      { name: 'model', type: 'string', required: false, default: 'groq/llama-3.1-8b', desc: 'ID of the model to use. See Models page for all options.' },
      { name: 'stream', type: 'boolean', required: false, default: 'true', desc: 'Whether to stream responses back in real-time.' }
    ],
    code: {
      curl: `curl -X POST "${BASE_URL}/api/v1/chat/thr_01HX/messages" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Hello! Explain quantum computing.",
    "model": "groq/llama-3.1-8b",
    "stream": true
  }'`,
      javascript: `import { CyberCli } from '@cybercli/sdk';

const cyber = new CyberCli({ apiKey: 'YOUR_API_KEY' });

const stream = await cyber.chat.messages.create({
  threadId: 'thr_01HX',
  content: 'Hello! Explain quantum computing.',
  model: 'groq/llama-3.1-8b',
  stream: true
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}`,
      python: `from cybercli import CyberCli

client = CyberCli(api_key="YOUR_API_KEY")

stream = client.chat.messages.create(
    thread_id="thr_01HX",
    content="Hello! Explain quantum computing.",
    model="groq/llama-3.1-8b",
    stream=True
)

for chunk in stream:
    print(chunk.content, end="", flush=True)`
    },
    response: {
      event: 'message',
      data: {
        delta: 'Quantum computing is a type of computing...',
        finish_reason: null
      }
    }
  },
  'council-mode': {
    method: 'POST',
    path: '/api/v1/completions/council',
    desc: 'Query multiple expert models simultaneously and retrieve a single synthesized consensus answer.',
    params: [
      { name: 'content', type: 'string', required: true, desc: 'The prompt to submit to the debating council.' },
      { name: 'models', type: 'array', required: false, default: '["openrouter/gpt-4o-mini", "groq/llama-3.1-8b", "gemini/gemini-2.5-flash"]', desc: 'List of model IDs to participate in the council debate.' },
      { name: 'synthesize', type: 'boolean', required: false, default: 'true', desc: 'If true, compiles responses into a final consensus.' }
    ],
    code: {
      curl: `curl -X POST "${BASE_URL}/api/v1/completions/council" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Should I use SQL or NoSQL?",
    "models": ["groq/llama-3.1-70b", "gemini/gemini-2.5-pro"],
    "synthesize": true
  }'`,
      javascript: `const response = await fetch('${BASE_URL}/api/v1/completions/council', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'Should I use SQL or NoSQL?',
    models: ['groq/llama-3.1-70b', 'gemini/gemini-2.5-pro'],
    synthesize: true
  })
});
const data = await response.json();
console.log(data.synthesis);`,
      python: `import requests

res = requests.post(
    "${BASE_URL}/api/v1/completions/council",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json={
        "content": "Should I use SQL or NoSQL?",
        "models": ["groq/llama-3.1-70b", "gemini/gemini-2.5-pro"],
        "synthesize": True
    }
)
print(res.json()["synthesis"])`
    },
    response: {
      individual: [
        { model: 'groq/llama-3.1-70b', content: 'SQL is best for transactional systems...' },
        { model: 'gemini/gemini-2.5-pro', content: 'NoSQL fits horizontal scaling needs...' }
      ],
      synthesis: 'For robust relational integrity, SQL is preferred. For scale, NoSQL...',
      consensus_score: 0.92
    }
  },
  'list-models': {
    method: 'GET',
    path: '/api/v1/models',
    desc: 'Retrieve metadata for all supported AI models in the unified gateway, including tier and context details.',
    params: [],
    code: {
      curl: `curl "${BASE_URL}/api/v1/models" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      javascript: `const response = await fetch('${BASE_URL}/api/v1/models', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});
const { models } = await response.json();
console.log(models);`,
      python: `import requests

res = requests.get(
    "${BASE_URL}/api/v1/models",
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
print(res.json()["models"])`
    },
    response: {
      models: [
        { id: 'groq/llama-3.1-8b', name: 'CyberCli-Swift', context: 131072, tier: 'Free' },
        { id: 'gemini/gemini-2.5-pro', name: 'CyberCli-Pro', context: 1048576, tier: 'Pro' }
      ]
    }
  }
}

export default function ApiReferencePage() {
  const [activeTab, setActiveTab] = useState('curl')
  const [activeSection, setActiveSection] = useState('welcome')
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedResponse, setCopiedResponse] = useState(false)

  const sectionRefs = {
    welcome: useRef(null),
    auth: useRef(null),
    'chat-completions': useRef(null),
    'council-mode': useRef(null),
    'list-models': useRef(null),
    'account-usage': useRef(null),
  }

  const handleScrollTo = (id) => {
    setActiveSection(id)
    sectionRefs[id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200
      for (const section of SECTIONS) {
        const el = sectionRefs[section.id]?.current
        if (el) {
          const top = el.offsetTop
          const height = el.offsetHeight
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleCopyText = (text, type) => {
    navigator.clipboard.writeText(text)
    if (type === 'code') {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } else {
      setCopiedResponse(true)
      setTimeout(() => setCopiedResponse(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-gray-300 font-sans antialiased overflow-x-hidden">
      {/* Background design */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `radial-gradient(ellipse at 50% -20%, #7C3AED 0%, transparent 60%),
                            linear-gradient(#fff 1px, transparent 1px),
                            linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 40px 40px, 40px 40px'
        }}
      />
      
      {/* Page Header */}
      <header className="relative pt-32 pb-16 border-b border-white/[0.04] bg-[#0A0A0F]/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <ScrollReveal>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400 text-xs font-semibold mb-4 tracking-wide">
              <Terminal className="w-3.5 h-3.5" />
              The Gateway
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
              API Reference
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
              Programmatic access to the CyberCli multi-provider AI orchestrator, enabling custom tool calls, parallel debate, and low-latency LLM gateway endpoints.
            </p>
          </ScrollReveal>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row gap-8 py-10 relative">
        
        {/* Sticky Sidebar Left */}
        <aside className="w-full lg:w-60 flex-shrink-0 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] overflow-y-auto pr-2 pb-6 border-b lg:border-b-0 lg:border-r border-white/[0.05]">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-3 mb-3">Endpoints</h3>
          <nav className="space-y-1">
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                onClick={() => handleScrollTo(sec.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm font-medium transition-all group ${
                  activeSection === sec.id
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    : 'text-gray-400 hover:bg-white/[0.03] hover:text-white border border-transparent'
                }`}
              >
                <span>{sec.label}</span>
                <ChevronRight className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${activeSection === sec.id ? 'opacity-100 text-orange-400' : 'text-gray-500'}`} />
              </button>
            ))}
          </nav>
        </aside>

        {/* 2-Column Split Pane Content */}
        <main className="flex-1 space-y-24 pb-20">
          
          {/* Welcome section */}
          <section ref={sectionRefs.welcome} className="scroll-mt-28 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-2xl font-bold text-white tracking-tight">Introduction</h2>
              <p className="text-sm leading-relaxed text-gray-400">
                The CyberCli API allows you to integrate state-of-the-art language processing, code synthesis, and multi-model consensus checks straight into your applications.
              </p>
              <p className="text-sm leading-relaxed text-gray-400">
                All requests must be sent securely via HTTPS. Formats are standard JSON, and responses utilize standard HTTP return codes. If you have questions, join our developer Discord.
              </p>
            </div>
            <div className="lg:col-span-5 border border-white/[0.05] bg-[#0c0c12]/80 backdrop-blur rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Terminal className="w-4 h-4 text-orange-400" />
                <span>Base Environment URL</span>
              </div>
              <code className="block text-xs font-mono p-3 rounded-xl bg-black/40 border border-white/[0.04] text-orange-400 break-all select-all">
                {BASE_URL}
              </code>
            </div>
          </section>

          {/* Authentication section */}
          <section ref={sectionRefs.auth} className="scroll-mt-28 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-2xl font-bold text-white tracking-tight">Authentication</h2>
              <p className="text-sm leading-relaxed text-gray-400">
                All protected endpoints require a Bearer token inside the HTTP `Authorization` header.
              </p>
              <p className="text-sm leading-relaxed text-gray-400">
                You can generate API keys directly inside the chat user dashboard under the API Keys settings panel. Keep your API keys confidential and do not share them in public repositories.
              </p>
              
              {/* Table of Headers */}
              <div className="overflow-hidden border border-white/[0.05] rounded-xl mt-4">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/[0.05] text-gray-500 font-semibold uppercase tracking-wider">
                      <th className="px-4 py-2.5">Header Name</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    <tr>
                      <td className="px-4 py-3 font-mono text-orange-400 font-semibold">Authorization</td>
                      <td className="px-4 py-3 text-gray-400">string</td>
                      <td className="px-4 py-3 text-gray-400">Bearer token format (e.g. `Bearer sk_cyber_...`)</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono text-gray-400">Content-Type</td>
                      <td className="px-4 py-3 text-gray-400">string</td>
                      <td className="px-4 py-3 text-gray-400">Must be set to `application/json`</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="lg:col-span-5 border border-white/[0.05] bg-[#0c0c12]/80 backdrop-blur rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Lock className="w-4 h-4 text-orange-400" />
                <span>Example Header Authorization</span>
              </div>
              <pre className="p-3.5 rounded-xl bg-black/40 border border-white/[0.04] text-xs font-mono text-gray-300 overflow-x-auto leading-relaxed select-all">
                Authorization: Bearer sk_cyber_7c3aed...
              </pre>
            </div>
          </section>

          {/* Endpoints Sections */}
          {['chat-completions', 'council-mode', 'list-models'].map((epKey) => {
            const ep = ENDPOINTS_DATA[epKey]
            const isPost = ep.method === 'POST'
            const methodColor = isPost 
              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'

            return (
              <section key={epKey} ref={sectionRefs[epKey]} className="scroll-mt-28 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start border-t border-white/[0.04] pt-12">
                
                {/* Left Column: Docs & Params */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold font-mono border ${methodColor}`}>
                      {ep.method}
                    </span>
                    <code className="text-white text-sm font-semibold font-mono bg-white/[0.03] px-2 py-1 rounded-md border border-white/[0.04]">
                      {ep.path}
                    </code>
                  </div>
                  
                  <p className="text-sm leading-relaxed text-gray-400">
                    {ep.desc}
                  </p>

                  {ep.params.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Request Parameters</h4>
                      <div className="overflow-hidden border border-white/[0.05] rounded-xl">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-white/[0.02] border-b border-white/[0.05] text-gray-500 font-semibold uppercase tracking-wider">
                              <th className="px-4 py-2.5">Field</th>
                              <th className="px-4 py-2.5">Type</th>
                              <th className="px-4 py-2.5">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            {ep.params.map(p => (
                              <tr key={p.name}>
                                <td className="px-4 py-3 font-mono font-semibold text-gray-200">
                                  {p.name} {p.required && <span className="text-rose-400">*</span>}
                                </td>
                                <td className="px-4 py-3 font-mono text-gray-500 text-[11px]">{p.type}</td>
                                <td className="px-4 py-3 text-gray-400 leading-normal">
                                  {p.desc}
                                  {p.default && <div className="text-[10px] text-gray-600 mt-0.5">Default: {p.default}</div>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Code Snippet Card */}
                <div className="lg:col-span-5 space-y-5">
                  
                  {/* Snippet Card */}
                  <div className="border border-white/[0.06] bg-[#0d0d12]/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05] bg-white/[0.02]">
                      <div className="flex items-center gap-1.5">
                        {LANGUAGES.map((lang) => (
                          <button
                            key={lang.id}
                            onClick={() => setActiveTab(lang.id)}
                            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                              activeTab === lang.id
                                ? 'bg-orange-500/10 text-orange-400'
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                          >
                            {lang.label}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handleCopyText(ep.code[activeTab], 'code')}
                        className="text-gray-500 hover:text-white transition-colors p-1"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <pre className="p-4 text-xs font-mono text-orange-200 overflow-x-auto leading-relaxed select-all max-h-[280px]">
                      {ep.code[activeTab]}
                    </pre>
                  </div>

                  {/* Response Card */}
                  <div className="border border-white/[0.06] bg-[#09090c]/90 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.01]">
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Example Response</span>
                      <button
                        onClick={() => handleCopyText(JSON.stringify(ep.response, null, 2), 'response')}
                        className="text-gray-500 hover:text-white transition-colors p-1"
                      >
                        {copiedResponse ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-gray-400 overflow-x-auto leading-relaxed max-h-[220px]">
                      {JSON.stringify(ep.response, null, 2)}
                    </pre>
                  </div>

                </div>
              </section>
            )
          })}

          {/* Account and Usage section */}
          <section ref={sectionRefs['account-usage']} className="scroll-mt-28 border-t border-white/[0.04] pt-12 space-y-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold text-white tracking-tight">Account & Usage Policy</h2>
              <p className="text-sm leading-relaxed text-gray-400 mt-2">
                All developer accounts are bound by standard rate limits. High-frequency users or enterprise callers can contact sales to configure customized SLA guarantees, high-bandwidth compute nodes, and specialized dedicated channels.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { plan: 'Free', limit: '50 req / hour', latency: 'Standard speed', desc: 'Ideal for basic testing.' },
                { plan: 'Pro', limit: '500 req / hour', latency: 'Priority queueing', desc: 'Perfect for power-users.' },
                { plan: 'Developer', limit: '1500 req / hour', latency: 'Dedicated queueing', desc: 'Custom key integrations.' }
              ].map(plan => (
                <div key={plan.plan} className="border border-white/[0.04] bg-white/[0.01] rounded-2xl p-5 hover:border-white/[0.08] transition-colors">
                  <div className="text-sm font-bold text-white mb-1">{plan.plan}</div>
                  <div className="text-xs text-orange-400 font-semibold mb-2">{plan.limit}</div>
                  <div className="text-[11px] text-gray-400 font-medium mb-1">{plan.latency}</div>
                  <div className="text-[10px] text-gray-600 leading-normal">{plan.desc}</div>
                </div>
              ))}
            </div>
          </section>

        </main>
      </div>
    </div>
  )
}
