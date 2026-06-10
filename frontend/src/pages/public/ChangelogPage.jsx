import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Tooltip } from '@components/ui/Tooltip'
import { Sparkles, Bug, Zap, ArrowRight, Check, History } from 'lucide-react'
import { Link } from 'react-router-dom'
import SEOHead, { StructuredData } from '@components/seo/SEOHead'
import ScrollReveal from '@components/ui/ScrollReveal'

const BADGE_COLORS = {
  New: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  Improved: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Fixed: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Breaking: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

const TYPE_ICONS = {
  New: Sparkles,
  Improved: Zap,
  Fixed: Bug,
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

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="relative pl-8 md:pl-0 md:grid md:grid-cols-[220px_1fr] md:gap-16 group"
    >
      {/* Left Column: Date & version */}
      <div className="hidden md:flex flex-col items-end pt-1 pr-6 gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold font-mono border bg-background-elevated border-border-subtle text-foreground-primary shadow-sm">
          v{entry.label || entry.version}
        </span>
        <span className="text-foreground-secondary/70 text-xs font-medium tracking-wide">{entry.date}</span>
      </div>

      {/* Vertical Timeline Dot */}
      <div className="absolute left-[220px] top-3 w-3 h-3 rounded-full bg-accent border-[3px] border-background-primary shadow-[0_0_10px_rgba(217,119,87,0.4)] hidden md:block" style={{ transform: 'translateX(-6px)' }} />

      {/* Mobile headers */}
      <div className="flex items-center gap-4 mb-5 md:hidden">
        <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_8px_rgba(217,119,87,0.6)] flex-shrink-0 -ml-[37px]" />
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono border bg-background-elevated border-border-subtle text-foreground-primary">
          v{entry.label || entry.version}
        </span>
        <span className="text-foreground-secondary/70 text-xs font-medium">{entry.date}</span>
      </div>

      {/* Right Column: Detailed updates */}
      <div className="pb-20 border-l border-border-subtle/40 md:border-l-0 pl-8 md:pl-0">
        <h2 className="text-2xl md:text-3xl font-serif font-medium text-foreground-primary tracking-tight mb-8 leading-snug">
          {entry.headline}
        </h2>
        <ul className="space-y-5">
          {entry.changes.map((change, ci) => {
            const Icon = TYPE_ICONS[change.type] || Sparkles
            return (
              <motion.li
                key={ci}
                initial={{ opacity: 0, x: -10 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: index * 0.05 + ci * 0.06 + 0.15 }}
                className="flex items-start gap-4 hover:bg-background-elevated/30 p-2 -ml-2 rounded-xl transition-colors"
              >
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border flex-shrink-0 mt-0.5 uppercase tracking-wider shadow-sm ${BADGE_COLORS[change.type]}`}>
                  <Icon className="w-3 h-3" />
                  {change.type}
                </span>
                <span className="text-foreground-secondary/90 text-sm leading-[1.6] font-medium pt-0.5">
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
    <div className="min-h-screen bg-background-primary pt-32 pb-24 relative overflow-x-hidden selection:bg-accent/20 selection:text-accent">
      <SEOHead
        title="Changelog | Codeva"
        description="Stay up to date with new features, model integrations, improvements, and bug fixes delivered continuously to the Codeva platform."
        keywords="changelog, platform updates, AI updates, Codeva updates"
        path="/changelog"
        structuredData={StructuredData.breadcrumb([
          { name: 'Home', path: '/' },
          { name: 'Changelog', path: '/changelog' }
        ])}
      />
      {/* Background aesthetics */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-accent/5 rounded-full blur-[120px] opacity-40 mix-blend-screen" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6">
        {/* Header section */}
        <motion.div className="text-center mb-24 lg:mb-32"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-subtle bg-background-elevated/50 text-foreground-secondary text-xs font-semibold mb-6 tracking-wide shadow-sm">
            <History className="w-3.5 h-3.5 text-accent" />
            Platform Updates
          </div>
          <h1 className="text-5xl md:text-6xl font-serif font-medium tracking-tight text-foreground-primary mb-6">
            Changelog
          </h1>
          <p className="text-foreground-secondary/80 max-w-xl mx-auto text-base md:text-lg leading-relaxed">
            Everything new in Codeva — continuous delivery of cutting-edge models, features, and fixes.
          </p>
          <div className="flex items-center justify-center gap-6 mt-8 text-sm">
            <Tooltip content="Read the official Codeva documentation">
              <Link to="/docs" className="inline-flex items-center gap-1.5 text-accent hover:text-accent/80 transition-colors font-medium">
                Read the docs <ArrowRight className="w-4 h-4" />
              </Link>
            </Tooltip>
            <span className="text-border-medium">|</span>
            <Tooltip content="Read the Codeva blog">
              <Link to="/blog" className="inline-flex items-center gap-1.5 text-foreground-secondary hover:text-foreground-primary transition-colors font-medium">
                Read the blog <ArrowRight className="w-4 h-4" />
              </Link>
            </Tooltip>
          </div>
        </motion.div>

        {/* Timeline Grid */}
        <div className="relative mb-32">
          {/* Vertical timeline bar */}
          <div className="hidden md:block absolute left-[220px] top-6 bottom-16 w-px bg-border-subtle/50" />

          <div className="space-y-0 relative z-10">
            {ENTRIES.map((entry, i) => (
              <ChangelogEntry key={entry.version} entry={entry} index={i} />
            ))}
          </div>

          {/* Timeline end dot */}
          <div className="hidden md:block absolute left-[220px] bottom-16 w-2.5 h-2.5 rounded-full bg-background-elevated border border-border-medium" style={{ transform: 'translateX(-4px)' }} />
        </div>

        {/* Stay in loop card */}
        <ScrollReveal>
          <div className="border border-border-subtle bg-background-elevated/40 backdrop-blur-xl rounded-3xl p-10 md:p-14 text-center relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
            <h3 className="text-3xl font-serif font-medium text-foreground-primary mb-3 tracking-tight">Stay in the loop</h3>
            <p className="text-foreground-secondary/70 text-base max-w-md mx-auto mb-10 leading-relaxed">
              Get notified immediately about new features, model upgrades, and platform releases.
            </p>
            <form onSubmit={handleSubscribe} className="max-w-md mx-auto flex flex-col sm:flex-row gap-3 relative z-10">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 px-4 py-3.5 rounded-xl bg-background-primary border border-border-subtle text-foreground-primary text-sm placeholder:text-foreground-secondary/40 focus:outline-none focus:border-accent/50 transition-all shadow-inner"
              />
              <Tooltip content="Subscribe to the Codeva newsletter">
                <button
                  type="submit"
                  disabled={subscribed}
                  className="px-8 py-3.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold text-sm transition-all duration-200 hover:shadow-[0_0_20px_rgba(217,119,87,0.3)] flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
                >
                  {subscribed ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      Subscribed
                    </>
                  ) : (
                    <>
                      Subscribe
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
