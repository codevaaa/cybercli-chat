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
    id: 'gpt-4o-mini',
    name: 'CyberCli-Core',
    provider: 'OpenAI Core Proxy',
    providerKey: 'openrouter',
    themeColor: '#7C3AED', // Violet (Standard Free/Pro theme)
    description: 'Highly efficient multimodal model. Excellent at everyday tasks, structured formatting, and prompt styling.',
    capabilities: ['General', 'Fast', 'Capable'],
    contextWindow: '128K tokens',
    latency: '~1.1s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['free', 'fast'],
    status: 'live',
  },
  {
    id: 'llama-3.1-8b-groq',
    name: 'CyberCli-Swift',
    provider: 'Groq Speed Cluster',
    providerKey: 'groq',
    themeColor: '#7C3AED', // Violet
    description: 'Sub-500ms speed optimized for conversational continuity and fast automated task dispatching.',
    capabilities: ['Speed', 'Conversation', 'Free'],
    contextWindow: '131K tokens',
    latency: '~0.3s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['free', 'fast'],
    status: 'live',
  },
  {
    id: 'llama-3.1-70b-groq',
    name: 'CyberCli-Prime',
    provider: 'Groq Reasoning Core',
    providerKey: 'groq',
    themeColor: '#D97757', // Terracotta (Pro theme)
    description: 'High-parameter reasoning core. Excellent for logical deductions, complex debugging, and technical writing.',
    capabilities: ['Reasoning', 'Technical', 'Pro'],
    contextWindow: '131K tokens',
    latency: '~0.7s',
    tier: 'Pro',
    cost: '$15.00 / 1M tokens',
    categories: ['reasoning', 'fast'],
    status: 'live',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'CyberCli-Flash',
    provider: 'Google Flash Core',
    providerKey: 'gemini',
    themeColor: '#7C3AED', // Violet
    description: 'Versatile multimodal model with 1M tokens context support. Excellent for multi-hour video and audio input.',
    capabilities: ['Multimodal', 'Large Context', 'Free'],
    contextWindow: '1M tokens',
    latency: '~0.8s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['free', 'creative'],
    status: 'live',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'CyberCli-Pro',
    provider: 'Google Intelligence Hub',
    providerKey: 'gemini',
    themeColor: '#D97757', // Terracotta
    description: 'Google\'s flagship intelligence model. Exceptional complex reasoning, math, and code generation with 1M context.',
    capabilities: ['State-of-the-Art', 'Reasoning', 'Pro'],
    contextWindow: '1M tokens',
    latency: '~1.4s',
    tier: 'Pro',
    cost: '$18.00 / 1M tokens',
    categories: ['reasoning', 'creative'],
    status: 'live',
  },
  {
    id: 'llama-3.1-8b-cerebras',
    name: 'CyberCli-HyperSwift',
    provider: 'Cerebras Wafer Core',
    providerKey: 'cerebras',
    themeColor: '#7C3AED', // Violet
    description: 'Powered by Cerebras CS-3 wafer scale engine. Delivering massive speed over 2,000 tokens/second.',
    capabilities: ['Wafer Speed', 'High Throughput', 'Free'],
    contextWindow: '8K tokens',
    latency: '~0.1s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['free', 'fast'],
    status: 'live',
  },
  {
    id: 'llama-3.1-8b-cloudflare',
    name: 'CyberCli-Edge',
    provider: 'Cloudflare Workers AI',
    providerKey: 'cloudflare',
    themeColor: '#7C3AED', // Violet
    description: 'Edge-based inference routed through 300+ global datacenters. Lowest latency for geographically distributed workflows.',
    capabilities: ['Edge Compute', 'Distributed', 'Free'],
    contextWindow: '8K tokens',
    latency: '~0.35s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['free', 'fast'],
    status: 'live',
  },
  {
    id: 'nemotron-70b-nvidia',
    name: 'CyberCli-Nemotron',
    provider: 'NVIDIA AI Foundation',
    providerKey: 'nvidia',
    themeColor: '#D97757', // Terracotta
    description: 'NVIDIA research-grade model, fine-tuned for ultimate dialogue performance, math reasoning, and complex instructions.',
    capabilities: ['Research', 'Dialogue', 'Pro'],
    contextWindow: '128K tokens',
    latency: '~1.6s',
    tier: 'Pro',
    cost: '$16.00 / 1M tokens',
    categories: ['reasoning'],
    status: 'live',
  },
  {
    id: 'huggingface/NousResearch/Hermes-3-Llama-3.1-8B',
    name: 'CyberCli-Hermes-8B',
    provider: 'Nous Research Core',
    providerKey: 'huggingface',
    themeColor: '#7C3AED', // Violet
    description: 'Uncensored model fine-tuned for general-purpose conversation, deep roleplay, and agentic workflows.',
    capabilities: ['Uncensored', 'Agentic', 'Free'],
    contextWindow: '128K tokens',
    latency: '~0.8s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['free', 'fast'],
    status: 'live',
  },
  {
    id: 'huggingface/cognitivecomputations/dolphin-2.9.4-llama3-70b',
    name: 'CyberCli-DolphinLlama',
    provider: 'Dolphin Cognitive Cluster',
    providerKey: 'huggingface',
    themeColor: '#D97757', // Terracotta
    description: 'Fully uncensored Llama 3 70B variant. Exceptional logic, creative writing, and prompt injection testing.',
    capabilities: ['Uncensored', 'Reasoning', 'Pro'],
    contextWindow: '8K tokens',
    latency: '~1.3s',
    tier: 'Pro',
    cost: '$15.00 / 1M tokens',
    categories: ['reasoning'],
    status: 'live',
  },
  {
    id: 'huggingface/cognitivecomputations/dolphin-2.9.2-qwen2.5-72b',
    name: 'CyberCli-DolphinQwen',
    provider: 'Dolphin Cognitive Cluster',
    providerKey: 'huggingface',
    themeColor: '#F59E0B', // Gold/Yellow (Enterprise)
    description: 'Uncensored Qwen 2.5 72B flagship. Combines deep multilingual support with dolphin\'s freedom of logic.',
    capabilities: ['Uncensored', 'Multilingual', 'Enterprise'],
    contextWindow: '32K tokens',
    latency: '~1.5s',
    tier: 'Enterprise',
    cost: 'Custom pricing',
    categories: ['reasoning', 'creative'],
    status: 'live',
  },
  {
    id: 'huggingface/Qwen/Qwen2.5-Coder-32B-Instruct',
    name: 'CyberCli-QwenCoder',
    provider: 'Qwen Coder Lab',
    providerKey: 'huggingface',
    themeColor: '#D97757', // Terracotta
    description: 'State-of-the-art open-source coding engine. Fine-tuned on massive multi-language code repos.',
    capabilities: ['Coding', 'Debugging', 'Pro'],
    contextWindow: '32K tokens',
    latency: '~1.0s',
    tier: 'Pro',
    cost: '$10.00 / 1M tokens',
    categories: ['reasoning', 'fast'],
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
  nvidia: Activity,
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
    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'

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
              background: isEnt ? 'linear-gradient(135deg, #F59E0B, #D97757)' : isPro ? 'linear-gradient(135deg, #D97757, #B85D3D)' : 'linear-gradient(135deg, #7C3AED, #6D28D9)',
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
                {['#7C3AED', '#D97757', '#F59E0B'].map((c, i) => (
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
          <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-purple-600/5 rounded-full blur-[120px]" />
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
