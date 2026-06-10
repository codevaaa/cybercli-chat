import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Lock, Terminal, ChevronRight, Zap, Code2, Globe2, Sparkles, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import ScrollReveal from '@components/ui/ScrollReveal'
import SEOHead from '@components/seo/SEOHead'

const BASE_URL = 'https://api.codeva.chat'

const SECTIONS = [
  { id: 'welcome', label: 'Welcome', icon: Sparkles },
  { id: 'auth', label: 'Authentication', icon: Lock },
  { id: 'chat-completions', label: 'Chat Completions', icon: Zap },
  { id: 'council-mode', label: 'Council Mode', icon: BookOpen },
  { id: 'list-models', label: 'List Models', icon: Globe2 },
  { id: 'account-usage', label: 'Account & Usage', icon: Terminal },
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
      javascript: `import { Codeva } from '@codeva/sdk';

const cyber = new Codeva({ apiKey: 'YOUR_API_KEY' });

const stream = await cyber.chat.messages.create({
  threadId: 'thr_01HX',
  content: 'Hello! Explain quantum computing.',
  model: 'groq/llama-3.1-8b',
  stream: true
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}`,
      python: `from codeva import Codeva

client = Codeva(api_key="YOUR_API_KEY")

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
      { name: 'models', type: 'array', required: false, default: '["openrouter/gpt-4o-mini", "groq/llama-3.1-8b"]', desc: 'List of model IDs to participate.' },
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
        { id: 'groq/llama-3.1-8b', name: 'Codeva-Swift', context: 131072, tier: 'Free' },
        { id: 'gemini/gemini-2.5-pro', name: 'Codeva-Pro', context: 1048576, tier: 'Pro' }
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
      const scrollPos = window.scrollY + 250
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
    window.addEventListener('scroll', handleScroll, { passive: true })
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
    <div className="min-h-screen bg-background-primary text-foreground-primary font-sans antialiased selection:bg-accent/20 selection:text-accent">
      <SEOHead 
        title="API Reference | Codeva" 
        description="Integrate the world's most advanced AI models directly into your applications with the Codeva API."
      />
      
      {/* Background design */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-accent/5 rounded-full blur-[150px] opacity-40 mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] opacity-20 mix-blend-screen" />
      </div>
      
      {/* Page Header */}
      <header className="relative pt-32 pb-12 border-b border-border-subtle bg-background-elevated/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col items-start">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-xs font-semibold mb-4 tracking-wide shadow-[0_0_15px_rgba(217,119,87,0.1)]">
              <Code2 className="w-4 h-4" />
              Developer API
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.05}>
            <h1 className="text-4xl md:text-5xl font-serif font-medium text-foreground-primary mb-4 tracking-tight">
              API Reference
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="text-foreground-secondary/80 max-w-2xl text-sm md:text-base leading-relaxed">
              Integrate Codeva's unified reasoning engine into your stack. Build powerful applications with streaming chat completions and automated council debates.
            </p>
          </ScrollReveal>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col lg:flex-row gap-12 py-12 relative z-10">
        
        {/* Sticky Sidebar Left */}
        <aside className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-80 lg:h-[calc(100vh-22rem)] overflow-y-auto pr-4 pb-6 hidden lg:block custom-scrollbar">
          <div className="space-y-1 relative">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-border-subtle" />
            
            {SECTIONS.map((sec) => {
              const isActive = activeSection === sec.id
              const Icon = sec.icon
              return (
                <button
                  key={sec.id}
                  onClick={() => handleScrollTo(sec.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-left text-sm font-medium transition-all group relative overflow-hidden ${
                    isActive
                      ? 'text-accent bg-accent/5'
                      : 'text-foreground-secondary hover:text-foreground-primary hover:bg-background-secondary/50'
                  }`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent rounded-r-full"
                    />
                  )}
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-accent' : 'text-foreground-secondary/50 group-hover:text-foreground-secondary'}`} />
                    <span>{sec.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {/* 2-Column Split Pane Content */}
        <main className="flex-1 space-y-32 pb-32">
          
          {/* Welcome section */}
          <section ref={sectionRefs.welcome} className="scroll-mt-80 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-6 space-y-5">
              <h2 className="text-3xl font-serif font-medium text-foreground-primary tracking-tight">Introduction</h2>
              <div className="space-y-4 text-sm leading-relaxed text-foreground-secondary/80">
                <p>
                  The Codeva API provides seamless access to the world's most capable models through a single, unified gateway. Drop our endpoints into your app to enable advanced multi-agent orchestration.
                </p>
                <p>
                  We follow REST semantics. All requests and responses are formatted as standard JSON, making integration trivial from any programming language.
                </p>
              </div>
            </div>
            <div className="lg:col-span-6">
              <div className="border border-border-subtle bg-background-secondary/40 backdrop-blur-xl rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 text-foreground-primary font-medium text-sm mb-4">
                  <Terminal className="w-4 h-4 text-accent" />
                  <span>Base URL</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-background-primary border border-border-subtle shadow-inner">
                  <code className="text-sm font-mono text-accent select-all">
                    {BASE_URL}
                  </code>
                  <button onClick={() => handleCopyText(BASE_URL, 'code')} className="p-1.5 rounded-md text-foreground-secondary/50 hover:text-foreground-primary hover:bg-background-secondary transition-all">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Authentication section */}
          <section ref={sectionRefs.auth} className="scroll-mt-80 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-6 space-y-5">
              <h2 className="text-3xl font-serif font-medium text-foreground-primary tracking-tight">Authentication</h2>
              <div className="space-y-4 text-sm leading-relaxed text-foreground-secondary/80">
                <p>
                  Authenticate your requests by providing your secret API key in the `Authorization` header as a Bearer token. 
                </p>
                <p>
                  To obtain a key, navigate to the API Keys section within your Codeva Dashboard. Treat these keys as highly sensitive secrets—never commit them to public version control.
                </p>
              </div>
            </div>
            
            <div className="lg:col-span-6">
              <div className="border border-border-subtle bg-background-secondary/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border-subtle bg-background-elevated/20">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-foreground-primary">Authorization Header</span>
                </div>
                <pre className="p-5 bg-background-primary text-sm font-mono text-foreground-secondary overflow-x-auto leading-relaxed select-all">
                  <span className="text-accent">Authorization</span>: Bearer <span className="text-emerald-400">sk_codeva_...</span>
                </pre>
              </div>
            </div>
          </section>

          {/* Endpoints Sections */}
          {['chat-completions', 'council-mode', 'list-models'].map((epKey) => {
            const ep = ENDPOINTS_DATA[epKey]
            const isPost = ep.method === 'POST'
            const methodColor = isPost 
              ? 'bg-accent/10 text-accent border-accent/20' 
              : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'

            return (
              <section key={epKey} ref={sectionRefs[epKey]} className="scroll-mt-80 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start pt-10 border-t border-border-subtle/50">
                
                {/* Left Column: Docs & Params */}
                <div className="lg:col-span-5 space-y-6">
                  <div>
                    <h3 className="text-2xl font-serif font-medium text-foreground-primary mb-4 capitalize">
                      {epKey.replace('-', ' ')}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${methodColor}`}>
                        {ep.method}
                      </span>
                      <code className="text-foreground-secondary text-sm font-mono tracking-tight">
                        {ep.path}
                      </code>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground-secondary/80">
                      {ep.desc}
                    </p>
                  </div>

                  {ep.params.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-semibold text-foreground-secondary uppercase tracking-widest">Parameters</h4>
                      <div className="border border-border-subtle rounded-xl overflow-hidden bg-background-secondary/20">
                        <table className="w-full text-left border-collapse">
                          <tbody className="divide-y divide-border-subtle text-sm">
                            {ep.params.map(p => (
                              <tr key={p.name} className="hover:bg-background-secondary/40 transition-colors">
                                <td className="p-4 align-top w-1/3 border-r border-border-subtle/50">
                                  <div className="font-mono font-medium text-foreground-primary">{p.name}</div>
                                  <div className="text-xs text-foreground-secondary/60 mt-1">{p.type}</div>
                                  {p.required && <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mt-2">Required</div>}
                                </td>
                                <td className="p-4 align-top text-foreground-secondary/80 leading-relaxed">
                                  {p.desc}
                                  {p.default && (
                                    <div className="mt-3">
                                      <span className="text-xs text-foreground-secondary/50 uppercase tracking-widest font-semibold mr-2">Default:</span>
                                      <code className="px-1.5 py-0.5 rounded text-[11px] bg-background-elevated border border-border-subtle text-foreground-primary font-mono">{p.default}</code>
                                    </div>
                                  )}
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
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Request Snippet Card */}
                  <div className="border border-border-subtle bg-[#111111] shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-2xl overflow-hidden group">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] bg-white/[0.02]">
                      <div className="flex items-center gap-1">
                        {LANGUAGES.map((lang) => (
                          <button
                            key={lang.id}
                            onClick={() => setActiveTab(lang.id)}
                            className={`text-[11px] px-3 py-1.5 rounded-md font-medium transition-all uppercase tracking-wider ${
                              activeTab === lang.id
                                ? 'bg-white/10 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                          >
                            {lang.label}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handleCopyText(ep.code[activeTab], 'code')}
                        className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-md hover:bg-white/5 opacity-0 group-hover:opacity-100"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <pre className="p-5 text-sm font-mono text-[#D4D4D4] overflow-x-auto leading-[1.6] select-all max-h-[400px] custom-scrollbar">
                      {ep.code[activeTab]}
                    </pre>
                  </div>

                  {/* Response Snippet Card */}
                  <div className="border border-border-subtle bg-[#0A0A0A] rounded-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 px-4 py-2 flex items-center justify-end w-full bg-gradient-to-b from-[#0A0A0A] to-transparent">
                      <span className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-widest absolute left-4 top-3">Response</span>
                      <button
                        onClick={() => handleCopyText(JSON.stringify(ep.response, null, 2), 'response')}
                        className="text-gray-600 hover:text-gray-300 transition-colors p-1 rounded hover:bg-white/5 opacity-0 group-hover:opacity-100"
                      >
                        {copiedResponse ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <pre className="p-5 pt-10 text-sm font-mono text-emerald-500/80 overflow-x-auto leading-relaxed max-h-[300px] custom-scrollbar">
                      {JSON.stringify(ep.response, null, 2)}
                    </pre>
                  </div>

                </div>
              </section>
            )
          })}

          {/* Account and Usage section */}
          <section ref={sectionRefs['account-usage']} className="scroll-mt-80 pt-10 border-t border-border-subtle/50 space-y-8">
            <div className="max-w-2xl space-y-4">
              <h2 className="text-3xl font-serif font-medium text-foreground-primary tracking-tight">Account & Limits</h2>
              <p className="text-sm leading-relaxed text-foreground-secondary/80">
                To maintain high availability across our unified gateway, rate limits are strictly enforced at the API key level. Reach out to enterprise support if you need dedicated high-throughput pipelines.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { plan: 'Free Tier', limit: '50 RPM', desc: 'Standard queueing. Ideal for testing and side projects.' },
                { plan: 'Pro Tier', limit: '500 RPM', desc: 'Priority routing. Fit for individual power users.' },
                { plan: 'Enterprise', limit: 'Custom', desc: 'Dedicated capacity and guaranteed SLAs.' }
              ].map(plan => (
                <div key={plan.plan} className="border border-border-subtle bg-background-elevated/40 backdrop-blur-sm rounded-2xl p-6 hover:shadow-lg hover:border-accent/30 transition-all duration-300">
                  <div className="text-base font-semibold text-foreground-primary mb-2">{plan.plan}</div>
                  <div className="inline-block px-2.5 py-1 rounded bg-accent/10 text-accent text-xs font-bold font-mono mb-4 border border-accent/20">{plan.limit}</div>
                  <div className="text-sm text-foreground-secondary/80 leading-relaxed">{plan.desc}</div>
                </div>
              ))}
            </div>
          </section>

        </main>
      </div>
    </div>
  )
}
