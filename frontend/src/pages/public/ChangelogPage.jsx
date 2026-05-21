import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Sparkles, Wrench, Bug, Zap, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const BADGE_COLORS = {
  New: 'bg-[rgba(124,58,237,0.15)] text-[#a78bfa] border-[rgba(124,58,237,0.3)]',
  Improved: 'bg-[rgba(34,197,94,0.1)] text-[#4ade80] border-[rgba(34,197,94,0.25)]',
  Fixed: 'bg-[rgba(251,191,36,0.1)] text-[#fbbf24] border-[rgba(251,191,36,0.25)]',
  Breaking: 'bg-[rgba(239,68,68,0.1)] text-[#f87171] border-[rgba(239,68,68,0.25)]',
}

const TYPE_ICONS = {
  New: Sparkles,
  Improved: Zap,
  Fixed: Bug,
}

const VERSION_BADGE_COLORS = {
  '1.3.0': 'bg-[rgba(124,58,237,0.2)] text-[#a78bfa] border-[rgba(124,58,237,0.4)]',
  '1.2.0': 'bg-[rgba(217,119,87,0.15)] text-[#fb923c] border-[rgba(217,119,87,0.35)]',
  '1.1.0': 'bg-[rgba(34,197,94,0.1)] text-[#4ade80] border-[rgba(34,197,94,0.25)]',
  '1.0.0': 'bg-[rgba(251,191,36,0.1)] text-[#fbbf24] border-[rgba(251,191,36,0.25)]',
  '0.9.0': 'bg-[rgba(148,163,184,0.1)] text-[#94a3b8] border-[rgba(148,163,184,0.2)]',
}

const ENTRIES = [
  {
    version: '1.3.0',
    date: 'May 21, 2026',
    headline: 'Claude-style chat interface, voice waveform & Lenis scroll',
    changes: [
      { type: 'New', text: 'Claude-style streaming chat interface with threaded conversation history' },
      { type: 'New', text: 'Voice waveform modal with real-time audio visualization' },
      { type: 'New', text: 'Lenis smooth scroll integrated across all public pages' },
      { type: 'Improved', text: 'Message rendering performance — 40% faster on long threads' },
      { type: 'Improved', text: 'Mobile sidebar: swipe-to-close gesture support' },
      { type: 'Fixed', text: 'SSE stream truncation on slow connections' },
    ],
  },
  {
    version: '1.2.0',
    date: 'May 10, 2026',
    headline: 'Council Mode synthesis engine & conversation branching',
    changes: [
      { type: 'New', text: 'Council Mode: synthesize responses from multiple AI models simultaneously' },
      { type: 'New', text: 'Conversation branching — fork any message into a parallel thread' },
      { type: 'New', text: 'Fork API endpoint: POST /api/v1/chat/:id/fork' },
      { type: 'Improved', text: 'Provider routing: automatic fallback when primary model is unavailable' },
      { type: 'Fixed', text: 'Race condition in concurrent council mode requests' },
    ],
  },
  {
    version: '1.1.0',
    date: 'April 28, 2026',
    headline: 'ElevenLabs TTS via Puter.js & 5 voice models',
    changes: [
      { type: 'New', text: 'ElevenLabs text-to-speech via Puter.js (unlimited, client-side)' },
      { type: 'New', text: '5 voice models: Aria, Brian, Callum, Charlotte, Daniel' },
      { type: 'New', text: 'Voice settings panel: speed, pitch, stability controls' },
      { type: 'Improved', text: 'Voice playback: buffer-based streaming for lower latency' },
      { type: 'Fixed', text: 'Voice not stopping when navigating away from chat' },
    ],
  },
  {
    version: '1.0.0',
    date: 'April 15, 2026',
    headline: 'Initial launch — 8 AI providers & folder organization',
    changes: [
      { type: 'New', text: '8 AI providers: OpenRouter, Groq, Gemini, Cerebras, Cloudflare, HuggingFace, Bytez, NVIDIA' },
      { type: 'New', text: 'Basic chat with streaming responses and markdown rendering' },
      { type: 'New', text: 'Folder organization for conversation history' },
      { type: 'New', text: 'Supabase auth with JWT and Row Level Security' },
      { type: 'New', text: 'MongoDB Atlas for chat and message persistence' },
    ],
  },
  {
    version: '0.9.0',
    label: '0.9.0 Beta',
    date: 'April 1, 2026',
    headline: 'Beta launch — public pages, auth system & design system',
    changes: [
      { type: 'New', text: 'Full public marketing website: Home, Features, Models, Pricing, Contact, About' },
      { type: 'New', text: 'Auth system: Signup, Login, Forgot Password, Magic Link, Email Verify' },
      { type: 'New', text: 'Design system: dark theme with violet accent, Inter typography' },
      { type: 'Improved', text: 'TailwindCSS v4 configuration with custom design tokens' },
      { type: 'Fixed', text: 'Hydration issues on public pages with Framer Motion' },
    ],
  },
]

function ChangelogEntry({ entry, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const vColor = VERSION_BADGE_COLORS[entry.version] || VERSION_BADGE_COLORS['0.9.0']

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="relative pl-8 md:pl-0 md:grid md:grid-cols-[200px_1fr] md:gap-12"
    >
      {/* Left: date + version */}
      <div className="hidden md:flex flex-col items-end pt-1 pr-4 gap-3 flex-shrink-0">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${vColor}`}>
          v{entry.label || entry.version}
        </span>
        <span className="text-[#475569] text-xs text-right">{entry.date}</span>
      </div>

      {/* Timeline dot */}
      <div className="hidden md:block absolute left-[200px] top-2 w-3 h-3 rounded-full bg-[#7C3AED] border-2 border-[#0A0A0F] shadow-[0_0_10px_rgba(124,58,237,0.6)]" style={{ transform: 'translateX(-6px)' }} />

      {/* Mobile header */}
      <div className="flex items-center gap-3 mb-4 md:hidden">
        <div className="w-2 h-2 rounded-full bg-[#7C3AED] shadow-[0_0_8px_rgba(124,58,237,0.7)] flex-shrink-0 -ml-5" />
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${vColor}`}>
          v{entry.label || entry.version}
        </span>
        <span className="text-[#475569] text-xs">{entry.date}</span>
      </div>

      {/* Right: content */}
      <div className="pb-16">
        <h2 className="text-xl font-bold text-white mb-5">{entry.headline}</h2>
        <ul className="space-y-3">
          {entry.changes.map((change, ci) => {
            const Icon = TYPE_ICONS[change.type] || Sparkles
            return (
              <motion.li key={ci}
                initial={{ opacity: 0, x: -10 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: index * 0.05 + ci * 0.06 + 0.2 }}
                className="flex items-start gap-3"
              >
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0 mt-0.5 ${BADGE_COLORS[change.type]}`}>
                  <Icon className="w-2.5 h-2.5" />
                  {change.type}
                </span>
                <span className="text-[#94a3b8] text-sm leading-relaxed">{change.text}</span>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </motion.div>
  )
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] pt-28 pb-24">
      {/* Background grid */}
      <div className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%)' }}
      />

      <div className="relative max-w-5xl mx-auto px-6">
        {/* Header */}
        <motion.div className="text-center mb-20"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.08)] text-[#a78bfa] text-xs font-medium mb-6">
            <Zap className="w-3 h-3" />
            Product Updates
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-5 tracking-tight">
            Changelog
          </h1>
          <p className="text-[#64748b] text-lg max-w-2xl mx-auto">
            Everything new in CyberCli — new features, improvements, and bug fixes delivered continuously.
          </p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Link to="/docs"
              className="inline-flex items-center gap-2 text-sm text-[#7C3AED] hover:text-[#a78bfa] transition-colors"
            >
              Read the docs <ArrowRight className="w-4 h-4" />
            </Link>
            <span className="text-[#1e293b]">|</span>
            <Link to="/blog"
              className="inline-flex items-center gap-2 text-sm text-[#475569] hover:text-[#94a3b8] transition-colors"
            >
              Read the blog <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="hidden md:block absolute left-[200px] top-0 bottom-0 w-px bg-[rgba(255,255,255,0.06)]" />

          <div className="space-y-0">
            {ENTRIES.map((entry, i) => (
              <ChangelogEntry key={entry.version} entry={entry} index={i} />
            ))}
          </div>

          {/* Timeline end dot */}
          <div className="hidden md:block absolute left-[200px] bottom-12 w-2 h-2 rounded-full bg-[#1e293b] border border-[rgba(255,255,255,0.1)]" style={{ transform: 'translateX(-5px)' }} />
        </div>

        {/* CTA */}
        <motion.div
          className="mt-8 text-center p-10 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <h3 className="text-2xl font-bold text-white mb-3">Stay in the loop</h3>
          <p className="text-[#64748b] text-sm mb-6">Get notified about new features and updates.</p>
          <Link to="/auth/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #D97757)' }}
          >
            Start for free <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
