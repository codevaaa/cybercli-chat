import { Link } from 'react-router-dom'
import { ArrowRight, Zap, Shield, Layers } from 'lucide-react'
import ScrollReveal, { ScrollRevealGroup } from '@components/ui/ScrollReveal'

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
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                  style={{ background: provider.bg, color: provider.color }}
                >
                  {provider.initial}
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
