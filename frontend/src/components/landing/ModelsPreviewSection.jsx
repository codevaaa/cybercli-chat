import { Link } from 'react-router-dom'
import { ArrowRight, Zap, Shield, Layers } from 'lucide-react'
import ScrollReveal, { ScrollRevealGroup } from '@components/ui/ScrollReveal'

/* ── Provider animated SVG logos ── */
function ProviderLogo({ name, color }) {
  if (name === 'OpenAI') {
    return (
      <svg className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 9c-1.5-2-4-2-4 0 0 1.5 1.5 3 4 3" />
        <path d="M15 12c2-1.5 2-4 0-4-1.5 0-3 1.5-3 4" />
        <path d="M12 15c1.5 2 4 2 4 0 0-1.5-1.5-3-4-3" />
        <path d="M9 12c-2 1.5-2 4 0 4 1.5 0 3-1.5 3-4" />
        <path d="M10 10c-2-1.5-4 0-3 2 1 1.5 2 1.5 3 0" />
        <path d="M14 14c2 1.5 4 0 3-2-1-1.5-2-1.5-3 0" />
      </svg>
    )
  }
  if (name === 'Groq') {
    return (
      <svg className="w-5 h-5 hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 5l7 7-7 7" />
        <path d="M4 5l7 7-7 7" opacity="0.4" />
      </svg>
    )
  }
  if (name === 'Gemini') {
    return (
      <svg className="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C12 7.5 16.5 12 22 12C16.5 12 12 16.5 12 22C12 16.5 7.5 12 2 12C7.5 12 12 7.5 12 2Z" fill="url(#geminiGrad)" />
        <defs>
          <linearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9b5de5" />
            <stop offset="50%" stopColor="#4361ee" />
            <stop offset="100%" stopColor="#4cc9f0" />
          </linearGradient>
        </defs>
      </svg>
    )
  }
  if (name === 'Cerebras') {
    return (
      <svg className="w-5 h-5 hover:scale-105 transition-transform" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8" cy="8" r="1.2" fill={color} />
        <circle cx="12" cy="8" r="1.2" fill={color} />
        <circle cx="16" cy="8" r="1.2" fill={color} />
        <circle cx="8" cy="12" r="1.2" fill={color} />
        <circle cx="12" cy="12" r="1.2" fill={color} />
        <circle cx="16" cy="12" r="1.2" fill={color} />
        <circle cx="8" cy="16" r="1.2" fill={color} />
        <circle cx="12" cy="16" r="1.2" fill={color} />
        <circle cx="16" cy="16" r="1.2" fill={color} />
      </svg>
    )
  }
  if (name === 'Cloudflare') {
    return (
      <svg className="w-5 h-5 hover:-translate-y-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42-1.5-1.5-3.5-3.5-4.5-2.5-1.2-5.5-.3-6.5 2.2C4 8.7 3 10.3 3 12.2A4.8 4.8 0 0 0 7.8 17" />
        <path d="M12 14.5a3 3 0 0 1 3-3" opacity="0.5" />
      </svg>
    )
  }
  if (name === 'HuggingFace') {
    return (
      <svg className="w-5 h-5 hover:rotate-12 transition-transform" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="#FFD21E" />
        <circle cx="8.5" cy="10" r="1.5" fill="#000" />
        <circle cx="15.5" cy="10" r="1.5" fill="#000" />
        <path d="M8 14.5s2.5 3 4 3 4-3 4-3" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5 13c.5-1 1.5-1.5 2.5-1m9.5 1c.5-1 1.5-1.5 2.5-1" stroke="#000" strokeWidth="1" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'NVIDIA') {
    return (
      <svg className="w-5 h-5 hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <path d="M3 12c0-5 4-9 9-9s9 4 9 9-4 9-9 9" />
        <path d="M7 12c0-2.8 2.2-5 5-5s5 2.2 5 5-2.2 5-5 5" />
        <path d="M10.5 12c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5" fill={color} />
      </svg>
    )
  }
  if (name === 'Bytez') {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round">
        <polygon points="12,2 22,8 22,18 12,24 2,18 2,8" />
        <line x1="12" y1="2" x2="12" y2="13" />
        <line x1="12" y1="13" x2="22" y2="8" />
        <line x1="12" y1="13" x2="2" y2="8" />
      </svg>
    )
  }
  return null
}

/* ── Provider data ── */
const PROVIDERS = [
  { name: 'OpenAI',       initial: 'OA', color: '#10A37F', bg: 'rgba(16,163,127,0.15)' },
  { name: 'Groq',         initial: 'GQ', color: '#F55036', bg: 'rgba(245,80,54,0.15)'  },
  { name: 'Gemini',       initial: 'GM', color: '#4285F4', bg: 'rgba(66,133,244,0.15)' },
  { name: 'Cerebras',     initial: 'CB', color: '#FF6B35', bg: 'rgba(255,107,53,0.15)' },
  { name: 'Cloudflare',   initial: 'CF', color: '#F48120', bg: 'rgba(244,129,32,0.15)' },
  { name: 'HuggingFace',  initial: 'HF', color: '#FFD21E', bg: 'rgba(255,210,30,0.15)' },
  { name: 'NVIDIA',       initial: 'NV', color: '#76B900', bg: 'rgba(118,185,0,0.15)'  },
  { name: 'Bytez',        initial: 'BZ', color: '#A78BFA', bg: 'rgba(167,139,250,0.15)'},
]

/* Duplicate for seamless infinite loop */
const TICKER_ITEMS = [...PROVIDERS, ...PROVIDERS]

/* ── Feature highlights below the ticker ── */
const HIGHLIGHTS = [
  {
    icon: Zap,
    title: 'Blazing Speed',
    description: 'Sub-second responses on Groq & Cerebras — faster than any single-provider app.',
    color: '#F59E0B',
  },
  {
    icon: Shield,
    title: 'Reliability',
    description: 'Auto failover across 8 providers. If one goes down, another picks up instantly.',
    color: '#10B981',
  },
  {
    icon: Layers,
    title: 'Maximum Choice',
    description: 'Hundreds of open-source & proprietary models, always free, always expanding.',
    color: '#D97757',
  },
]

export default function ModelsPreviewSection() {
  return (
    <section className="section-padding py-24 lg:py-32 border-y border-border-subtle overflow-hidden">
      <div className="container-custom">
        {/* ── Header ── */}
        <ScrollReveal direction="up" delay={0} className="text-center mb-14">
          <span className="inline-block text-xs font-semibold text-accent tracking-[0.2em] uppercase mb-4 px-4 py-1.5 rounded-full bg-accent/5 border border-accent/10">
            Model Aggregation
          </span>
          <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-bold tracking-tight leading-[1.1] mb-5 text-white">
            Powered by the world's{' '}
            <span className="text-gradient-accent">best models</span>
          </h2>
          <p className="text-base sm:text-lg text-[#9CA3AF] max-w-xl mx-auto leading-relaxed">
            No more switching tabs. CyberCli connects to 8+ providers and routes each
            query to the fastest free model with intelligent failover.
          </p>
        </ScrollReveal>

        {/* ── Infinite scrolling ticker ── */}
        <div className="relative mb-14 overflow-hidden">
          {/* Fade masks */}
          <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to right, #0A0A0F, transparent)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to left, #0A0A0F, transparent)' }} />

          {/* Ticker track */}
          <div
            className="flex gap-4"
            style={{
              animation: 'ticker-scroll 28s linear infinite',
              width: 'max-content',
            }}
          >
            {TICKER_ITEMS.map((provider, idx) => (
              <div
                key={`${provider.name}-${idx}`}
                className="flex-shrink-0 flex items-center gap-3 px-5 py-3.5 rounded-xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-sm"
                style={{ minWidth: '170px' }}
              >
                {/* Logo initial circle */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: provider.bg }}
                >
                  <ProviderLogo name={provider.name} color={provider.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{provider.name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-medium">Active</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3 highlight cards ── */}
        <ScrollRevealGroup
          direction="up"
          stagger={0.1}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10"
        >
          {HIGHLIGHTS.map((h) => {
            const Icon = h.icon
            return (
              <div key={h.title} className="card-glass p-6 flex gap-4 items-start">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${h.color}18` }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ color: h.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">{h.title}</h3>
                  <p className="text-xs text-[#9CA3AF] leading-relaxed">{h.description}</p>
                </div>
              </div>
            )
          })}
        </ScrollRevealGroup>

        {/* ── View all models link ── */}
        <ScrollReveal direction="up" delay={0.3} className="text-center">
          <Link
            to="/models"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-white transition-colors duration-200 group"
          >
            View all models
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </ScrollReveal>
      </div>

      {/* Inline keyframe for the ticker — injected via style tag */}
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  )
}
