import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Tooltip } from '@components/ui/Tooltip'
import { Sparkles, Wrench, Bug, Zap, ArrowRight, Rss, BookOpen, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import SEOHead, { StructuredData } from '@components/seo/SEOHead'
import ScrollReveal from '@components/ui/ScrollReveal'

const BADGE_COLORS = {
  New: 'bg-accent/10 text-accent border-accent/20',
  Improved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Fixed: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Breaking: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

const TYPE_ICONS = {
  New: Sparkles,
  Improved: Zap,
  Fixed: Bug,
}

const VERSION_BADGE_COLORS = {
  '1.4.0': 'bg-accent/10 text-accent border-accent/20',
  '1.3.0': 'bg-accent/10 text-accent border-accent/20',
  '1.2.0': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  '1.1.0': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  '1.0.0': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  '0.9.0': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const ENTRIES = [
  {
    version: '1.4.0',
    date: 'May 30, 2026',
    headline: 'Cowork, Claude-style plans, faster voice, and desktop auto-updates',
    changes: [
      { type: 'New', text: 'Cowork: delegate autonomous tasks that run in the background while you keep chatting — live-streamed, stoppable, retryable' },
      { type: 'New', text: 'Upgrade page with Individual + Team/Enterprise plans, monthly/yearly billing, and real checkout' },
      { type: 'New', text: 'Desktop auto-update flow: in-app download progress, “restart to update”, and a manual check' },
      { type: 'New', text: 'CyberCoder .cyber/ project memory — the CLI now learns and remembers your project across sessions' },
      { type: 'Improved', text: 'Rebuilt product and downloads pages with the new Codeva look' },
      { type: 'Fixed', text: 'Voice: interrupt now instantly stops the assistant (aborts in-flight speech), correct voice gender on fallback' },
    ],
  },
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
    headline: 'Realistic AI Voice Chat with Gemini TTS & Browser Native Fallback',
    changes: [
      { type: 'New', text: 'High-speed Gemini Flash text-to-speech integration' },
      { type: 'New', text: 'Browser native TTS fallback for zero-network environments' },
      { type: 'New', text: 'Voice settings panel: speed, pitch, and volume controls' },
      { type: 'Improved', text: 'Voice playback: lower latency streaming for real-time talk' },
      { type: 'Fixed', text: 'Voice not stopping when navigating away from chat' },
    ],
  },
  {
    version: '1.0.0',
    date: 'April 15, 2026',
    headline: 'Initial launch — 8 AI providers & folder organization',
    changes: [
      { type: 'New', text: 'Proprietary multi-cluster AI gateway containing 8 distributed high-performance computing clusters' },
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
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const vColor = VERSION_BADGE_COLORS[entry.version] || VERSION_BADGE_COLORS['0.9.0']

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="relative pl-10 md:pl-0 md:grid md:grid-cols-[200px_1fr] md:gap-12"
    >
      {/* Left Column: Date & version */}
      <div className="hidden md:flex flex-col items-end pt-1 pr-6 gap-2">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold font-mono border ${vColor}`}>
          v{entry.label || entry.version}
        </span>
        <span className="text-gray-500 text-xs font-medium">{entry.date}</span>
      </div>

      {/* Vertical Timeline Dot */}
      <div className="absolute left-[200px] top-2 w-3.5 h-3.5 rounded-full bg-orange-600 border-[3.5px] border-[#07070a] shadow-[0_0_12px_rgba(217,119,87,0.5)] hidden md:block" style={{ transform: 'translateX(-7px)' }} />

      {/* Mobile headers */}
      <div className="flex items-center gap-3 mb-4 md:hidden">
        <div className="w-2.5 h-2.5 rounded-full bg-orange-600 shadow-[0_0_8px_rgba(217,119,87,0.7)] flex-shrink-0 -ml-[27px]" />
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${vColor}`}>
          v{entry.label || entry.version}
        </span>
        <span className="text-gray-500 text-xs font-medium">{entry.date}</span>
      </div>

      {/* Right Column: Detailed updates */}
      <div className="pb-16 border-l border-white/[0.04] md:border-l-0 pl-6 md:pl-0">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-6">
          {entry.headline}
        </h2>
        <ul className="space-y-4">
          {entry.changes.map((change, ci) => {
            const Icon = TYPE_ICONS[change.type] || Sparkles
            return (
              <motion.li
                key={ci}
                initial={{ opacity: 0, x: -10 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: index * 0.05 + ci * 0.06 + 0.15 }}
                className="flex items-start gap-3.5 group"
              >
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border flex-shrink-0 mt-0.5 uppercase tracking-wider ${BADGE_COLORS[change.type]}`}>
                  <Icon className="w-3 h-3" />
                  {change.type}
                </span>
                <span className="text-gray-400 text-sm leading-relaxed font-medium group-hover:text-gray-350 transition-colors">
                  {change.text}
                </span>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </motion.div>
  )
}

export default function ChangelogPage() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e) => {
    e.preventDefault()
    if (!email) return
    setSubscribed(true)
    setTimeout(() => {
      setSubscribed(false)
      setEmail('')
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-[#07070a] pt-32 pb-24 relative overflow-x-hidden">
      <SEOHead
        title="Changelog — Platform Updates"
        description="Stay up to date with new features, model integrations, improvements, and bug fixes delivered continuously to the Codeva platform."
        keywords="changelog, platform updates, AI updates, Codeva updates"
        path="/changelog"
        structuredData={StructuredData.breadcrumb([
          { name: 'Home', path: '/' },
          { name: 'Changelog', path: '/changelog' }
        ])}
      />
      {/* Background grid */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] pointer-events-none opacity-20"
        style={{ background: 'radial-gradient(ellipse, #D97757 0%, transparent 70%)' }}
      />

      <div className="relative max-w-4xl mx-auto px-6">
        {/* Header section */}
        <motion.div className="text-center mb-24"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-accent text-xs font-semibold mb-6 tracking-wide">
            <Zap className="w-3.5 h-3.5" />
            Product Updates
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Changelog
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Everything new in Codeva — new features, improvements, and bug fixes delivered continuously.
          </p>
          <div className="flex items-center justify-center gap-5 mt-6 text-sm">
            <Tooltip content="Read the official Codeva documentation">
              <Link to="/docs" className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-350 transition-colors font-medium">
                Read the docs <ArrowRight className="w-4 h-4" />
              </Link>
            </Tooltip>
            <span className="text-gray-700">|</span>
            <Tooltip content="Read the Codeva blog">
              <Link to="/blog" className="inline-flex items-center gap-1 text-gray-450 hover:text-gray-300 transition-colors font-medium">
                Read the blog <ArrowRight className="w-4 h-4" />
              </Link>
            </Tooltip>
          </div>
        </motion.div>

        {/* Timeline Grid */}
        <div className="relative mb-24">
          {/* Vertical timeline bar */}
          <div className="hidden md:block absolute left-[200px] top-4 bottom-12 w-[1px] bg-white/[0.04]" />

          <div className="space-y-0">
            {ENTRIES.map((entry, i) => (
              <ChangelogEntry key={entry.version} entry={entry} index={i} />
            ))}
          </div>

          {/* Timeline end dot */}
          <div className="hidden md:block absolute left-[200px] bottom-12 w-2.5 h-2.5 rounded-full bg-white/[0.08] border border-white/[0.05]" style={{ transform: 'translateX(-5px)' }} />
        </div>

        {/* Stay in loop card */}
        <ScrollReveal>
          <div className="border border-white/[0.05] bg-[#0c0c12]/80 backdrop-blur-xl rounded-3xl p-8 md:p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 rounded-full blur-[80px] pointer-events-none" />
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Stay in the loop</h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto mb-8 leading-relaxed">
              Get notified immediately about new features, model upgrades, and platform releases.
            </p>
            <form onSubmit={handleSubscribe} className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 px-4 py-3 rounded-xl bg-black/40 border border-white/[0.06] text-white text-sm placeholder:text-gray-650 focus:outline-none focus:border-orange-500/50 transition-colors"
              />
              <Tooltip content="Subscribe to the Codeva newsletter">
                <button
                  type="submit"
                  disabled={subscribed}
                  className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm transition-all duration-200 hover:shadow-[0_0_20px_rgba(217,119,87,0.4)] flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0"
                >
                  {subscribed ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      Subscribed!
                    </>
                  ) : (
                    <>
                      Start for free
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </Tooltip>
            </form>
          </div>
        </ScrollReveal>
      </div>
    </div>
  )
}
