import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Globe, Flame, Cpu, Cloud, Server, Activity, Database,
  ArrowRight, CheckCircle2, Users, Sparkles, ChevronRight,
  ExternalLink, Timer, BookOpen, Layers, ShieldCheck
} from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'

/* ─── Model data ─── */
export const MODEL_CARDS = [
  {
    id: 'puter/claude-opus-4-7',
    name: 'Madhav (Opus)',
    provider: 'Puter Intelligence Network',
    providerKey: 'puter',
    themeColor: '#F59E0B',
    description: 'The supreme intelligence. Unrivalled reasoning, deep analysis, and creative mastery.',
    capabilities: ['Reasoning', 'SOTA', 'Free'],
    contextWindow: 'Unlimited',
    latency: '~1.2s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['reasoning', 'creative', 'free'],
    status: 'live',
  },
  {
    id: 'puter/deepseek/deepseek-r1-0528',
    name: 'Nakul (DeepSeek R1)',
    provider: 'Puter Intelligence Network',
    providerKey: 'puter',
    themeColor: '#E05E36',
    description: 'The skilled strategist. Supreme reasoning depth for complex logic and technical writing.',
    capabilities: ['Reasoning', 'Math', 'Free'],
    contextWindow: 'Unlimited',
    latency: '~1.8s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['reasoning', 'free'],
    status: 'live',
  },
  {
    id: 'puter/gpt-5.5',
    name: 'Bheem (GPT-5.5)',
    provider: 'Puter Intelligence Network',
    providerKey: 'puter',
    themeColor: '#3B82F6',
    description: 'The reliable powerhouse. Versatile and capable for everyday intelligence tasks with high accuracy.',
    capabilities: ['General', 'Fast', 'Free'],
    contextWindow: 'Unlimited',
    latency: '~1.1s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['free', 'fast'],
    status: 'live',
  },
  {
    id: 'puter/perplexity/sonar-deep-research',
    name: 'Vyas (Deep Research)',
    provider: 'Puter Web Intelligence',
    providerKey: 'puter',
    themeColor: '#0D9488',
    description: 'The omniscient researcher. Deeply searches the web to compile definitive answers with citations.',
    capabilities: ['Research', 'Web', 'Free'],
    contextWindow: 'Unlimited',
    latency: '~3.5s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['reasoning', 'free'],
    status: 'live',
  },
  {
    id: 'puter/perplexity/sonar-reasoning-pro',
    name: 'Sanjaya (Sonar Pro)',
    provider: 'Puter Web Intelligence',
    providerKey: 'puter',
    themeColor: '#059669',
    description: 'The visionary observer. Combines real-time web knowledge with deep reasoning loops.',
    capabilities: ['Search', 'Reasoning', 'Free'],
    contextWindow: 'Unlimited',
    latency: '~2.5s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['reasoning', 'free'],
    status: 'live',
  },
  {
    id: 'puter/gpt-image-2',
    name: 'Chitrakar (GPT-Image)',
    provider: 'Puter Vision API',
    providerKey: 'puter',
    themeColor: '#E11D48',
    description: 'The divine painter. Generates stunning, high-quality images directly in your chat.',
    capabilities: ['Image Gen', 'Vision', 'Free'],
    contextWindow: 'N/A',
    latency: '~4.0s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['creative', 'free'],
    status: 'live',
  },
  {
    id: 'puter/meta-llama/llama-3.1-70b',
    name: 'Yudhishthira (Llama)',
    provider: 'Puter OpenWeights',
    providerKey: 'puter',
    themeColor: '#FFD21E',
    description: 'The righteous elder. Open-weights flagship model built for balanced output.',
    capabilities: ['OpenWeights', 'Balanced', 'Free'],
    contextWindow: 'Unlimited',
    latency: '~1.2s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['reasoning', 'free'],
    status: 'live',
  },
  {
    id: 'puter/qwen/qwen2.5-72b-instruct',
    name: 'Vikrama (Qwen)',
    provider: 'Puter OpenWeights',
    providerKey: 'puter',
    themeColor: '#FF6B35',
    description: 'The multilingual emperor. Broad multilingual and cross-cultural intelligence.',
    capabilities: ['Multilingual', 'Global', 'Free'],
    contextWindow: 'Unlimited',
    latency: '~1.4s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['reasoning', 'creative', 'free'],
    status: 'live',
  },
  {
    id: 'puter/openai/gpt-5.3-codex',
    name: 'Vishwakarma (Codex)',
    provider: 'Puter Developer API',
    providerKey: 'puter',
    themeColor: '#ED8936',
    description: 'The divine architect. Trained on millions of code repositories for optimal software development.',
    capabilities: ['Coding', 'Debugging', 'Free'],
    contextWindow: 'Unlimited',
    latency: '~0.9s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['reasoning', 'fast', 'free'],
    status: 'live',
  }
]

const PROVIDER_ICONS = {
  openrouter: Zap,
  gemini: Globe,
  groq: Flame,
  cerebras: Cpu,
  cloudflare: Cloud,
  huggingface: Database,
  nvidia: Activity,
  puter: Zap,
}

const FILTERS = [
  { id: 'all', label: 'All Models', icon: Layers },
  { id: 'free', label: 'Free Tiers', icon: CheckCircle2 },
  { id: 'fast', label: 'Fast Inference', icon: Zap },
  { id: 'reasoning', label: 'Reasoning Cores', icon: BookOpen },
]

function LiveDot() {
  return (
    <span className="relative flex items-center gap-1.5">
      <span className="absolute w-3 h-3 rounded-full bg-emerald-500/30 animate-ping" />
      <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
      <span className="text-xs text-emerald-400 font-medium">Active</span>
    </span>
  )
}

function ModelCard({ model, index }) {
  const ProviderIcon = PROVIDER_ICONS[model.providerKey] || Server

  // Set style based on tier
  const isPro = model.tier === 'Pro'
  const isEnt = model.tier === 'Enterprise'
  const tierColorClass = isEnt
    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    : isPro
    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    : 'bg-accent/10 text-accent border-accent/20'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-2xl border border-white/[0.05] bg-[#0c0c12]/80 backdrop-blur-sm p-6 flex flex-col hover:border-white/[0.12] transition-all duration-300"
      whileHover={{
        boxShadow: `0 0 30px -10px ${model.themeColor}33, inset 0 0 0 1px ${model.themeColor}30`,
        y: -4,
        transition: { duration: 0.25 }
      }}
    >
      {/* Top Row: Provider & Tier */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
          <ProviderIcon className="w-3.5 h-3.5 text-gray-500" />
          <span>{model.provider}</span>
        </div>
        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${tierColorClass}`}>
          {model.tier}
        </span>
      </div>

      {/* Model Name */}
      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-white transition-colors">
        {model.name}
      </h3>

      {/* Description */}
      <p className="text-xs text-gray-450 leading-relaxed mb-5 flex-1 line-clamp-3">
        {model.description}
      </p>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {model.capabilities.map(cap => (
          <span
            key={cap}
            className="text-[10px] font-bold px-2 py-0.5 rounded-md border text-gray-400 uppercase tracking-wide"
            style={{
              borderColor: 'rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            {cap}
          </span>
        ))}
      </div>

      {/* Stats Table */}
      <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-white/[0.04] mb-5 text-[11px]">
        <div>
          <p className="text-gray-500 mb-0.5 font-medium uppercase text-[9px] tracking-wider">Context</p>
          <p className="text-gray-300 font-bold">{model.contextWindow}</p>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5 font-medium uppercase text-[9px] tracking-wider">Latency</p>
          <div className="flex items-center gap-1">
            <Timer className="w-3 h-3 text-gray-500" />
            <p className="text-gray-300 font-bold">{model.latency}</p>
          </div>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5 font-medium uppercase text-[9px] tracking-wider">Rate</p>
          <p className="text-orange-400 font-bold truncate">{model.cost.split(' / ')[0]}</p>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="flex items-center justify-between gap-3">
        <LiveDot />
        <div className="flex gap-2">
          <Link
            to={`/models/${model.id}`}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.03] transition-colors"
          >
            Details
          </Link>
          <Link
            to="/chat"
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl text-white transition-all hover:shadow-[0_0_15px_rgba(124,58,237,0.3)]"
              style={{
                background: isEnt ? 'linear-gradient(135deg, #F59E0B, #D97757)' : isPro ? 'linear-gradient(135deg, #D97757, #B85D3D)' : 'linear-gradient(135deg, #4B5563, #1F2937)',
              }}
          >
            Try Now
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

function CouncilBanner() {
  return (
    <ScrollReveal>
      <div className="relative rounded-3xl overflow-hidden border border-orange-500/20 bg-gradient-to-r from-orange-950/20 via-orange-900/10 to-orange-950/10 p-6 md:p-8 mb-12">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex -space-x-2">
                {['#E05E36', '#D97757', '#F59E0B'].map((c, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full border border-[#07070a] flex items-center justify-center"
                    style={{ background: c }}
                  >
                    <Sparkles className="w-2.5 h-2.5 text-white" />
                  </div>
                ))}
              </div>
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Council Mode</span>
              <span className="text-[9px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30 font-bold uppercase tracking-wider">
                Consensus API
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2 leading-tight">
              Ensemble AI completes the puzzle
            </h2>
            <p className="text-xs text-gray-400 max-w-xl leading-relaxed">
              Council Mode streams your query to 3 AI models in parallel, logs their thoughts, and dispatches a synthesis model to compile an aligned response. Enable it via settings or choose the model direct from your chat console.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Link
              to="/chat"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all duration-200 hover:shadow-[0_0_20px_rgba(217,119,87,0.4)]"
            >
              <Users className="w-4 h-4" />
              Try Council Mode
            </Link>
            <Link
              to="/docs/council-mode-deep-dive"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-orange-500/20 text-orange-400 hover:bg-orange-500/10 text-xs font-semibold transition-all duration-200"
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

export default function ModelsPage() {
  const [activeFilter, setActiveFilter] = useState('all')

  const filteredModels = useMemo(() => {
    if (activeFilter === 'all') return MODEL_CARDS
    return MODEL_CARDS.filter(m => m.categories.includes(activeFilter))
  }, [activeFilter])

  return (
    <div className="pt-32 pb-20 bg-[#07070a]">
      {/* Hero */}
      <section className="relative mb-12">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-accent/5 rounded-full blur-[120px]" />
          <div className="absolute top-0 right-1/4 w-[400px] h-[250px] bg-orange-500/5 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <ScrollReveal>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 tracking-widest uppercase mb-5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
              <Cpu className="w-3.5 h-3.5" />
              Orchestrated AI Models
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-5 leading-tight">
              Unified compute gateway,{' '}
              <span className="bg-gradient-to-r from-orange-400 to-orange-550 bg-clip-text text-transparent">
                zero complexity
              </span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <p className="text-sm md:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed mb-6">
              Browse our unified API gateway. Some models are completely Free to use daily, while others require a Pro or Enterprise subscription tier.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/5">
              <span className="relative flex items-center">
                <span className="absolute w-3 h-3 rounded-full bg-emerald-500/30 animate-ping" />
                <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">All compute clusters operational</span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Main Grid */}
      <section className="max-w-7xl mx-auto px-6">
        {/* Council Banner */}
        <CouncilBanner />

        {/* Filters */}
        <ScrollReveal>
          <div className="flex flex-wrap items-center gap-2.5 mb-10">
            {FILTERS.map(f => {
              const Icon = f.icon
              const isActive = activeFilter === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer"
                  style={{
                    background: isActive ? 'rgba(217,119,87,0.1)' : 'rgba(255,255,255,0.02)',
                    border: isActive ? '1px solid rgba(217,119,87,0.3)' : '1px solid rgba(255,255,255,0.05)',
                    color: isActive ? '#F4A37A' : '#9CA3AF',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{f.label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="filter-count"
                      className="text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded-full font-bold ml-1"
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
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredModels.map((model, i) => (
              <ModelCard key={model.id} model={model} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>
      </section>
    </div>
  )
}
