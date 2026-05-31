import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, BookOpen, Terminal, Code2, Mic, Layers, Mail, MessageSquare, ChevronDown, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import SEOHead from '@components/seo/SEOHead'

/**
 * /help — Help Center page. Searchable FAQ + quick links to docs, extension
 * guide, CLI guide, and contact. Matches Claude's help center style.
 */

const CATEGORIES = [
  {
    title: 'Getting Started',
    icon: BookOpen,
    items: [
      { q: 'How do I create an account?', a: 'Go to /auth/signup and sign up with email or Google. No credit card required.' },
      { q: 'How do I get an API key?', a: 'Sign in → go to /api-keys → create a key. Use it in the CLI (cm login --key …) or VS Code extension.' },
      { q: 'What models are available for free?', a: 'Over 30 models across Groq, Gemini, Cerebras, HuggingFace, and more. Free tier gets 50 messages/hour with fast + balanced models.' },
    ],
  },
  {
    title: 'CyberCoder CLI',
    icon: Terminal,
    items: [
      { q: 'How do I install the CLI?', a: 'Run: npm install -g @codeva_chat/cli@latest. Then cm /init to set up your project.' },
      { q: 'What can the CLI do?', a: 'Read/write files, run commands, search code, web research, sub-agents, Council Mode, checkpoints (/rewind), hooks, MCP servers, and 26 bundled skills.' },
      { q: 'How do I use Ollama cloud models?', a: 'Run: cm --model ollama/kimi-k2.5:cloud. Or set it as default: cm /update-config. Cloud models (kimi-k2.5, glm-5, minimax-m2.7, qwen3.5, gemma4:31b) run without local GPU.' },
    ],
  },
  {
    title: 'VS Code Extension',
    icon: Code2,
    items: [
      { q: 'How do I install the extension?', a: 'Download cybercoder.vsix from /downloads or the Marketplace. Install via Extensions → "…" → Install from VSIX.' },
      { q: 'How do I connect a provider?', a: 'Open CyberCoder → login screen → "Anthropic / OpenAI / Ollama" → paste your key. Groq (free) and Gemini (free) are also supported.' },
      { q: 'What can the extension do?', a: 'It\'s a full agent: reads/writes files, runs terminal commands, searches code, shows diffs, and has modes (Ask/Edit/Plan/Auto/Bypass). Not just a chatbot.' },
      { q: 'Why does it say "Failed to create API key"?', a: 'This happens when the backend can\'t verify your session. Solution: use the BYOK path (Anthropic/OpenAI/Groq/Gemini/Ollama) which talks directly to the provider — no backend needed.' },
    ],
  },
  {
    title: 'Voice & TTS',
    icon: Mic,
    items: [
      { q: 'How does voice chat work?', a: 'Click the Voice nav item in chat. Pick a voice agent (Aoede/Charon/Puck). Speak — it listens, processes, and replies aloud. Interrupt anytime by speaking.' },
      { q: 'Why does the voice sound male when I picked female?', a: 'This was a bug (fixed in v1.4.0). The browser fallback now correctly picks a gender-matching voice.' },
    ],
  },
  {
    title: 'Billing & Plans',
    icon: Layers,
    items: [
      { q: 'Is the free plan really free?', a: 'Yes. 50 messages/hour, 30+ models, voice, image gen, web search, CLI — all free, no credit card.' },
      { q: 'How do I upgrade?', a: 'Go to /upgrade. Pro ($15/mo) unlocks reasoning models, Council Mode, 500 msg/hr. Max ($90/mo) adds premium models and 2000 msg/hr.' },
      { q: 'Can I cancel anytime?', a: 'Yes. Settings → Billing → Manage. You keep access until the end of the billing cycle.' },
    ],
  },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/[0.05]">
      <button onClick={() => setOpen(!open)} className="w-full py-4 flex items-center justify-between text-left group">
        <span className="text-sm text-[#f5f4ef] group-hover:text-[#C96442] transition-colors">{q}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="pb-4 text-sm text-gray-400 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function HelpPage() {
  const [search, setSearch] = useState('')
  const q = search.toLowerCase()
  const filtered = q
    ? CATEGORIES.map((c) => ({ ...c, items: c.items.filter((i) => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)) })).filter((c) => c.items.length)
    : CATEGORIES

  return (
    <div className="min-h-screen bg-[#1a1a18] pt-32 pb-20 px-6">
      <SEOHead title="Help Center — Codeva & CyberCoder" path="/help" />
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-serif font-normal text-[#f5f4ef] text-center mb-3" style={{ fontFamily: "'Instrument Serif', serif" }}>Help Center</h1>
        <p className="text-center text-sm text-gray-400 mb-8">Find answers about Codeva, CyberCoder CLI, the VS Code extension, and billing.</p>

        {/* Search */}
        <div className="relative mb-10 max-w-md mx-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search help articles…"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#211f1c] border border-white/[0.08] text-sm text-[#f5f4ef] placeholder:text-gray-500 focus:outline-none focus:border-[#C96442]"
          />
        </div>

        {/* Categories */}
        <div className="space-y-10">
          {filtered.map((cat) => {
            const Icon = cat.icon
            return (
              <div key={cat.title}>
                <div className="flex items-center gap-2.5 mb-4">
                  <Icon className="w-5 h-5 text-[#C96442]" />
                  <h2 className="text-lg font-semibold text-[#f5f4ef]">{cat.title}</h2>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-[#211f1c] px-5">
                  {cat.items.map((item) => <FaqItem key={item.q} q={item.q} a={item.a} />)}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-center text-gray-500 py-8">No results for "{search}". Try a different search or <Link to="/contact" className="text-[#C96442] hover:underline">contact support</Link>.</p>
          )}
        </div>

        {/* Quick links */}
        <div className="mt-12 grid sm:grid-cols-3 gap-4">
          <Link to="/docs" className="p-5 rounded-2xl border border-white/[0.06] bg-[#211f1c] hover:border-[#C96442]/30 transition-colors group">
            <BookOpen className="w-5 h-5 text-[#C96442] mb-3" />
            <h3 className="text-sm font-semibold text-[#f5f4ef] mb-1">Documentation</h3>
            <p className="text-xs text-gray-400">Full guides and API reference</p>
          </Link>
          <Link to="/contact" className="p-5 rounded-2xl border border-white/[0.06] bg-[#211f1c] hover:border-[#C96442]/30 transition-colors group">
            <Mail className="w-5 h-5 text-[#C96442] mb-3" />
            <h3 className="text-sm font-semibold text-[#f5f4ef] mb-1">Contact Support</h3>
            <p className="text-xs text-gray-400">Email us for help</p>
          </Link>
          <a href="https://github.com/codevaaa/cybercoder/issues" target="_blank" rel="noopener noreferrer" className="p-5 rounded-2xl border border-white/[0.06] bg-[#211f1c] hover:border-[#C96442]/30 transition-colors group">
            <MessageSquare className="w-5 h-5 text-[#C96442] mb-3" />
            <h3 className="text-sm font-semibold text-[#f5f4ef] mb-1 flex items-center gap-1">Report a Bug <ExternalLink className="w-3 h-3" /></h3>
            <p className="text-xs text-gray-400">GitHub Issues</p>
          </a>
        </div>
      </div>
    </div>
  )
}
