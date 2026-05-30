import { Link } from 'react-router-dom'
import { ArrowRight, Zap, Shield, Layers } from 'lucide-react'
import ScrollReveal, { ScrollRevealGroup } from '@components/ui/ScrollReveal'
import LogoLoop from '@components/ui/LogoLoop'
import { SiOpenai, SiNvidia, SiCloudflare, SiHuggingface } from 'react-icons/si'

/* ── Provider list using real brand icons and custom styled SVGs ── */
const providerLogos = [
  {
    node: <SiOpenai className="w-8 h-8 transition-transform duration-300" style={{ color: '#10A37F' }} />,
    title: 'OpenAI',
    href: 'https://openai.com'
  },
  {
    node: (
      <svg className="w-8 h-8 transition-transform duration-300" style={{ color: '#F55036' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 5l7 7-7 7" />
        <path d="M4 5l7 7-7 7" opacity="0.4" />
      </svg>
    ),
    title: 'Groq',
    href: 'https://groq.com'
  },
  {
    node: (
      <svg className="w-8 h-8 transition-transform duration-300" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C12 7.5 16.5 12 22 12C16.5 12 12 16.5 12 22C12 16.5 7.5 12 2 12C7.5 12 12 7.5 12 2Z" fill="url(#geminiGradSection)" />
        <defs>
          <linearGradient id="geminiGradSection" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9b5de5" />
            <stop offset="50%" stopColor="#4361ee" />
            <stop offset="100%" stopColor="#4cc9f0" />
          </linearGradient>
        </defs>
      </svg>
    ),
    title: 'Gemini',
    href: 'https://deepmind.google/technologies/gemini'
  },
  {
    node: (
      <svg className="w-8 h-8 transition-transform duration-300" style={{ color: '#FF6B35' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8" cy="8" r="1.5" fill="currentColor" />
        <circle cx="12" cy="8" r="1.5" fill="currentColor" />
        <circle cx="16" cy="8" r="1.5" fill="currentColor" />
        <circle cx="8" cy="12" r="1.5" fill="currentColor" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <circle cx="16" cy="12" r="1.5" fill="currentColor" />
        <circle cx="8" cy="16" r="1.5" fill="currentColor" />
        <circle cx="12" cy="16" r="1.5" fill="currentColor" />
        <circle cx="16" cy="16" r="1.5" fill="currentColor" />
      </svg>
    ),
    title: 'Cerebras',
    href: 'https://cerebras.ai'
  },
  {
    node: <SiCloudflare className="w-8 h-8 transition-transform duration-300" style={{ color: '#F48120' }} />,
    title: 'Cloudflare',
    href: 'https://cloudflare.com'
  },
  {
    node: <SiHuggingface className="w-8 h-8 transition-transform duration-300" style={{ color: '#FFD21E' }} />,
    title: 'HuggingFace',
    href: 'https://huggingface.co'
  },
  {
    node: <SiNvidia className="w-8 h-8 transition-transform duration-300" style={{ color: '#76B900' }} />,
    title: 'NVIDIA',
    href: 'https://nvidia.com'
  },
  {
    node: (
      <svg className="w-8 h-8 transition-transform duration-300" style={{ color: '#A78BFA' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <polygon points="12,2 22,8 22,18 12,24 2,18 2,8" />
        <line x1="12" y1="2" x2="12" y2="13" />
        <line x1="12" y1="13" x2="22" y2="8" />
        <line x1="12" y1="13" x2="2" y2="8" />
      </svg>
    ),
    title: 'Bytez',
    href: 'https://bytez.com'
  }
]

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
  const customRender = (item) => {
    return (
      <div
        className="flex items-center gap-3 px-5 py-3.5 rounded-xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-sm transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.05]"
        style={{ minWidth: '190px' }}
      >
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-white/[0.04]">
          {item.node}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{item.title}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-emerald-400 font-medium">Active</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="section-padding py-24 lg:py-32 border-y border-border-subtle overflow-hidden bg-[#0A0A0F]">
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
            No more switching tabs. Codeva connects to 8+ providers and routes each
            query to the fastest free model with intelligent failover.
          </p>
        </ScrollReveal>

        {/* ── Infinite scrolling LogoLoop ticker ── */}
        <div className="relative mb-14 overflow-hidden">
          <LogoLoop
            logos={providerLogos}
            speed={60}
            direction="left"
            logoHeight={36}
            gap={36}
            pauseOnHover={true}
            scaleOnHover={false}
            fadeOut={true}
            fadeOutColor="#0A0A0F"
            renderItem={customRender}
            ariaLabel="AI model providers loop"
          />
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
    </section>
  )
}
