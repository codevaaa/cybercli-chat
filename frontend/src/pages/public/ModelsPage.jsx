import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Globe, Flame, Cpu, Cloud, Server, Activity, Database,
  ArrowRight, CheckCircle2, Users, Sparkles, ChevronRight,
  ExternalLink, Timer, BookOpen, Layers
} from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'

/* ─── Model data ─── */
const MODEL_CARDS = [
  {
    id: 'gpt-4o-mini',
    name: 'Cyber-Mini',
    provider: 'Cyber Distributed Core',
    providerKey: 'openrouter',
    providerColor: '#8B5CF6',
    providerBg: 'rgba(139,92,246,0.08)',
    providerBorder: 'rgba(139,92,246,0.2)',
    description: 'Cyber\'s efficient multimodal model. Excellent at coding, reasoning, and following complex instructions with a massive context window.',
    capabilities: ['Capable', 'Fast', 'Coding'],
    capColors: { Capable: '#8B5CF6', Fast: '#F59E0B', Coding: '#3B82F6' },
    contextWindow: '128K tokens',
    latency: '~1.2s',
    tier: 'Free',
    categories: ['free', 'fast'],
    status: 'live',
  },
  {
    id: 'llama-3.1-8b-groq',
    name: 'Cyber-Fast',
    provider: 'Cyber Speed Cluster',
    providerKey: 'groq',
    providerColor: '#F97316',
    providerBg: 'rgba(249,115,22,0.08)',
    providerBorder: 'rgba(249,115,22,0.2)',
    description: 'Sub-500ms inference thanks to Cyber\'s custom Speed Cluster architecture. Ideal for tasks where speed is the top priority.',
    capabilities: ['Ultra-fast', 'Efficient', 'Free'],
    capColors: { 'Ultra-fast': '#F97316', Efficient: '#10B981', Free: '#6B7280' },
    contextWindow: '131K tokens',
    latency: '~0.3s',
    tier: 'Free',
    categories: ['free', 'fast'],
    status: 'live',
  },
  {
    id: 'llama-3.1-70b-groq',
    name: 'Cyber-Smart',
    provider: 'Cyber Reasoning Engine',
    providerKey: 'groq',
    providerColor: '#F97316',
    providerBg: 'rgba(249,115,22,0.08)',
    providerBorder: 'rgba(249,115,22,0.2)',
    description: 'The full high-parameter meta reasoning core. Powerful logic processing and code generation at sub-second latency — unmatched in its class.',
    capabilities: ['Reasoning', 'Powerful', 'Fast'],
    capColors: { Reasoning: '#D97757', Powerful: '#EC4899', Fast: '#F59E0B' },
    contextWindow: '131K tokens',
    latency: '~0.7s',
    tier: 'Free',
    categories: ['free', 'fast', 'reasoning'],
    status: 'live',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Cyber-Balanced',
    provider: 'Cyber Distributed Core',
    providerKey: 'gemini',
    providerColor: '#4285F4',
    providerBg: 'rgba(66,133,244,0.08)',
    providerBorder: 'rgba(66,133,244,0.2)',
    description: 'Cyber\'s balanced multimodal model with best-in-class versatility. Supports images, audio, and long documents in a single prompt.',
    capabilities: ['Balanced', 'Multimodal', 'Long Context'],
    capColors: { Balanced: '#4285F4', Multimodal: '#EA4335', 'Long Context': '#34A853' },
    contextWindow: '1M tokens',
    latency: '~0.9s',
    tier: 'Free',
    categories: ['free', 'fast', 'creative'],
    status: 'live',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Cyber-Pro',
    provider: 'Cyber Intelligence Hub',
    providerKey: 'gemini',
    providerColor: '#4285F4',
    providerBg: 'rgba(66,133,244,0.08)',
    providerBorder: 'rgba(66,133,244,0.2)',
    description: 'Cyber\'s most capable model with state-of-the-art performance across reasoning, coding, and creative tasks. Supports up to 1M token context.',
    capabilities: ['Most Capable', 'Reasoning', 'Multimodal'],
    capColors: { 'Most Capable': '#4285F4', Reasoning: '#D97757', Multimodal: '#EA4335' },
    contextWindow: '1M tokens',
    latency: '~1.5s',
    tier: 'Free',
    categories: ['free', 'reasoning', 'creative'],
    status: 'live',
  },
  {
    id: 'llama-3.1-8b-cerebras',
    name: 'Cyber-UltraFast',
    provider: 'Cyber Edge Core',
    providerKey: 'cerebras',
    providerColor: '#EC4899',
    providerBg: 'rgba(236,72,153,0.08)',
    providerBorder: 'rgba(236,72,153,0.2)',
    description: 'Wafer-scale speed delivering over 2,000 tokens/second. Designed for latency-critical and high-throughput operations.',
    capabilities: ['Fastest Inference', 'Edge', 'Free'],
    capColors: { 'Fastest Inference': '#EC4899', Edge: '#F59E0B', Free: '#6B7280' },
    contextWindow: '8K tokens',
    latency: '~0.1s',
    tier: 'Free',
    categories: ['free', 'fast'],
    status: 'live',
  },
  {
    id: 'llama-3.1-8b-cloudflare',
    name: 'Cyber-Edge',
    provider: 'Cyber Geo-Network',
    providerKey: 'cloudflare',
    providerColor: '#F59E0B',
    providerBg: 'rgba(245,158,11,0.08)',
    providerBorder: 'rgba(245,158,11,0.2)',
    description: 'Edge-based inference routed through 300+ global datacenters. Extremely low latency for geographically distributed users worldwide.',
    capabilities: ['Edge Inference', 'Global CDN', 'Free'],
    capColors: { 'Edge Inference': '#F59E0B', 'Global CDN': '#10B981', Free: '#6B7280' },
    contextWindow: '8K tokens',
    latency: '~0.4s',
    tier: 'Free',
    categories: ['free', 'fast'],
    status: 'live',
  },
  {
    id: 'nemotron-70b-nvidia',
    name: 'Cyber-Quantum',
    provider: 'Cyber Quantum Lab',
    providerKey: 'nvidia',
    providerColor: '#76B900',
    providerBg: 'rgba(118,185,0,0.08)',
    providerBorder: 'rgba(118,185,0,0.2)',
    description: 'A research-grade model fine-tuned on synthetic data for superior reasoning and alignment. State-of-the-art on complex math and code logic.',
    capabilities: ['Research-grade', 'Reasoning', 'RLHF'],
    capColors: { 'Research-grade': '#76B900', Reasoning: '#D97757', RLHF: '#F97316' },
    contextWindow: '128K tokens',
    latency: '~1.8s',
    tier: 'Free',
    categories: ['free', 'reasoning'],
    status: 'live',
  },
]

const PROVIDER_ICONS = {
  openrouter: Zap,
  gemini: Globe,
  groq: Flame,
  cerebras: Cpu,
  cloudflare: Cloud,
  huggingface: Database,
  bytez: Server,
  nvidia: Activity,
}

const FILTERS = [
  { id: 'all', label: 'All Models', icon: Layers },
  { id: 'free', label: 'Free', icon: CheckCircle2 },
  { id: 'fast', label: 'Fast', icon: Zap },
  { id: 'reasoning', label: 'Reasoning', icon: BookOpen },
  { id: 'creative', label: 'Creative', icon: Sparkles },
]

/* ─── Components ─── */
function LiveDot() {
  return (
    <span className="relative flex items-center gap-1.5">
      <span className="absolute w-3 h-3 rounded-full bg-emerald-500/30 animate-ping" />
      <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
      <span className="text-xs text-emerald-400 font-medium">Live</span>
    </span>
  )
}

function CapabilityPill({ label, color }) {
  return (
    <span
      className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
      style={{
        color,
        background: `${color}18`,
        border: `1px solid ${color}30`,
      }}
    >
      {label}
    </span>
  )
}

function ModelCard({ model, index }) {
  const ProviderIcon = PROVIDER_ICONS[model.providerKey] || Server
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-2xl border border-white/[0.06] bg-[#0D0D14] p-5 flex flex-col hover:border-white/[0.12] transition-all duration-300"
      style={{
        '--glow': model.providerBg,
      }}
      whileHover={{
        boxShadow: `0 0 0 1px ${model.providerBorder}, 0 20px 40px rgba(0,0,0,0.4)`,
        y: -4,
        transition: { duration: 0.25 },
      }}
    >
      {/* Top row: provider badge */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{
            color: model.providerColor,
            background: model.providerBg,
            border: `1px solid ${model.providerBorder}`,
          }}
        >
          <ProviderIcon className="w-3 h-3" />
          {model.provider}
        </div>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: model.providerBg }}
        >
          <ProviderIcon className="w-4 h-4" style={{ color: model.providerColor }} />
        </div>
      </div>

      {/* Model name */}
      <h3 className="text-xl font-bold text-white mb-1 group-hover:text-white transition-colors">
        {model.name}
      </h3>

      {/* Description */}
      <p className="text-sm text-[#6B7280] leading-relaxed mb-4 flex-1 line-clamp-2">
        {model.description}
      </p>

      {/* Capability pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {model.capabilities.map(cap => (
          <CapabilityPill key={cap} label={cap} color={model.capColors[cap] || '#9CA3AF'} />
        ))}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 py-3 border-t border-b border-white/[0.04] mb-4 text-xs">
        <div className="flex-1">
          <p className="text-[#4B5563] mb-0.5">Context</p>
          <p className="text-white font-medium">{model.contextWindow}</p>
        </div>
        <div className="flex-1">
          <p className="text-[#4B5563] mb-0.5">Latency</p>
          <div className="flex items-center gap-1">
            <Timer className="w-3 h-3 text-[#6B7280]" />
            <p className="text-white font-medium">{model.latency}</p>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-[#4B5563] mb-0.5">Pricing</p>
          <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            {model.tier}
          </span>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <LiveDot />
        <Link
          to="/chat"
          className="flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 px-3.5 py-2 rounded-lg hover:gap-2.5"
          style={{
            color: model.providerColor,
            background: model.providerBg,
            border: `1px solid ${model.providerBorder}`,
          }}
        >
          Try now
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.div>
  )
}

/* ─── Council Mode Banner ─── */
function CouncilBanner() {
  return (
    <ScrollReveal>
      <div className="relative rounded-2xl overflow-hidden border border-orange-500/20 bg-gradient-to-r from-orange-950/20 via-orange-900/10 to-orange-950/10 p-6 md:p-8 mb-10">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex -space-x-2">
                {['#D97757', '#F97316', '#3B82F6'].map((c, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full border-2 border-[#0A0A0F] flex items-center justify-center"
                    style={{ background: c }}
                  >
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                ))}
              </div>
              <span className="text-xs font-semibold text-orange-400 uppercase tracking-widest">Council Mode</span>
              <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30 font-medium">
                Exclusive
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight">
              Three models, one perfect answer
            </h2>
            <p className="text-sm text-[#9CA3AF] max-w-lg leading-relaxed">
              Council Mode dispatches your query to 3 AI models simultaneously. Each responds independently,
              then a synthesis model distills the best insights into a single, powerful answer. No other platform does this.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Link
              to="/chat"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold transition-all duration-200 hover:shadow-[0_0_20px_rgba(217,119,87,0.4)]"
            >
              <Users className="w-4 h-4" />
              Try Council Mode
            </Link>
            <Link
              to="/docs/council-mode-deep-dive"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-orange-500/25 text-orange-400 hover:bg-orange-500/10 text-sm font-medium transition-all duration-200"
            >
              <BookOpen className="w-4 h-4" />
              Learn more
            </Link>
          </div>
        </div>
      </div>
    </ScrollReveal>
  )
}

/* ─── Main Page ─── */
export default function ModelsPage() {
  const [activeFilter, setActiveFilter] = useState('all')

  const filteredModels = useMemo(() => {
    if (activeFilter === 'all') return MODEL_CARDS
    return MODEL_CARDS.filter(m => m.categories.includes(activeFilter))
  }, [activeFilter])

  return (
    <div className="pt-28 pb-20 bg-[#0A0A0F]">
      {/* Hero */}
      <section className="section-padding mb-10 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-orange-600/6 rounded-full blur-[120px]" />
          <div className="absolute top-0 right-1/4 w-[400px] h-[250px] bg-orange-500/5 rounded-full blur-[100px]" />
        </div>
        <div className="container-custom text-center relative z-10">
          <ScrollReveal>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-400 tracking-widest uppercase mb-5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
              <Cpu className="w-3 h-3" />
              AI Models
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold tracking-tight leading-[1.1] text-white mb-5">
              Every model,{' '}
              <span
                className="bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 bg-clip-text text-transparent"
                style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                one platform
              </span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <p className="text-lg text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed mb-6">
              Access our custom suite of advanced AI models — all free. Our AI gateway automatically
              routes to the best model for your task with intelligent failover.
            </p>
          </ScrollReveal>
          {/* Live status pill */}
          <ScrollReveal delay={0.2}>
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/5">
              <span className="relative flex items-center">
                <span className="absolute w-3 h-3 rounded-full bg-emerald-500/30 animate-ping" />
                <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-sm text-emerald-400 font-medium">All compute clusters operational</span>
              <span className="text-xs text-[#4B5563]">· Updated just now</span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Main section */}
      <section className="section-padding">
        <div className="container-custom">
          {/* Council Banner */}
          <CouncilBanner />

          {/* Filter row */}
          <ScrollReveal>
            <div className="flex flex-wrap items-center gap-2 mb-8">
              {FILTERS.map(f => {
                const Icon = f.icon
                const isActive = activeFilter === f.id
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                    style={{
                      background: isActive ? 'rgba(217,119,87,0.15)' : 'rgba(255,255,255,0.03)',
                      border: isActive ? '1px solid rgba(217,119,87,0.4)' : '1px solid rgba(255,255,255,0.07)',
                      color: isActive ? '#F4A37A' : '#6B7280',
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {f.label}
                    {isActive && (
                      <motion.span
                        layoutId="filter-count"
                        className="text-xs bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded-full"
                      >
                        {filteredModels.length}
                      </motion.span>
                    )}
                  </button>
                )
              })}
            </div>
          </ScrollReveal>

          {/* Model cards grid */}
          <motion.div layout className="grid sm:grid-cols-1 lg:grid-cols-2 gap-5">
            <AnimatePresence mode="popLayout">
              {filteredModels.map((model, i) => (
                <ModelCard key={model.id} model={model} index={i} />
              ))}
            </AnimatePresence>
          </motion.div>

          {filteredModels.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 text-[#4B5563]"
            >
              <Sparkles className="w-10 h-10 mx-auto mb-4 opacity-30" />
              <p>No models match this filter</p>
            </motion.div>
          )}

          {/* Routing Intelligence section */}
          <ScrollReveal delay={0.1}>
            <div className="mt-16 rounded-3xl border border-white/[0.06] bg-[#0D0D14] p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-10 items-center">
                <div>
                  <span className="text-xs font-semibold text-orange-400 tracking-widest uppercase mb-4 block">
                    Intelligent Routing
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
                    The right model for every task, automatically
                  </h2>
                  <p className="text-[#9CA3AF] leading-relaxed mb-6">
                    CyberCli's AI Gateway automatically selects the optimal model based on your query type.
                    Coding → Cyber-Fast for speed. Reasoning → Cyber-Quantum for depth. Creative → Cyber-Balanced for flair.
                    If a computing cluster fails, we instantly failover to the next best.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Speed Routing', 'Auto-Failover', 'Cost Optimization', 'Context Awareness'].map(f => (
                      <span key={f} className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] text-[#9CA3AF] border border-white/[0.06]">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Coding', provider: 'Cyber Speed Cluster', why: 'Sub-500ms responses', color: '#F97316' },
                    { label: 'Reasoning', provider: 'Cyber Quantum Lab', why: 'Research-grade depth', color: '#76B900' },
                    { label: 'Creative', provider: 'Cyber Distributed Core', why: 'Multimodal flair', color: '#4285F4' },
                    { label: 'Research', provider: 'Cyber Intelligence Hub', why: 'Widest model access', color: '#8B5CF6' },
                  ].map(route => (
                    <div
                      key={route.label}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/[0.1] transition-colors"
                    >
                      <p className="text-xs text-[#6B7280] mb-1.5">Task: <span className="text-white">{route.label}</span></p>
                      <p className="text-sm font-semibold" style={{ color: route.color }}>{route.provider}</p>
                      <p className="text-xs text-[#4B5563] mt-1">{route.why}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
