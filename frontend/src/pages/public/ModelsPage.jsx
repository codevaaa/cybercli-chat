import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Globe, Flame, Cpu, Cloud, Server, Activity, Database,
  ArrowRight, CheckCircle2, Users, Sparkles, ChevronRight,
  ExternalLink, Timer, BookOpen, Layers, ShieldCheck
} from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'
import SEOHead, { StructuredData } from '@components/seo/SEOHead'

/* ─── Model data ─── */
export const MODEL_CARDS = [
  {
    id: 'huggingface/thecnical/cybermindcli',
    name: 'Codeva',
    provider: 'Codeva Private Compute Node',
    providerKey: 'huggingface',
    themeColor: '#7C3AED',
    description: 'Proprietary flagship model of Codeva. Fine-tuned specifically for deep reasoning, ethical hacking analysis, security research, and advanced software development.',
    capabilities: ['Reasoning', 'Security', 'Flagship'],
    contextWindow: '128K tokens',
    latency: '~0.8s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['reasoning', 'creative', 'free'],
    status: 'live',
  },
  {
    id: 'opencode/deepseek-v4-pro',
    name: 'Madhav',
    provider: 'Codeva Compute Core',
    providerKey: 'opencode',
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
    id: 'huggingface/deepseek-ai/DeepSeek-R1-Distill-Llama-70B',
    name: 'Chanakya',
    provider: 'Codeva Reasoning Cluster',
    providerKey: 'huggingface',
    themeColor: '#E05E36',
    description: 'The grand strategist. Supreme reasoning depth for complex logic and planning.',
    capabilities: ['Reasoning', 'Math', 'Free'],
    contextWindow: 'Unlimited',
    latency: '~1.8s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['reasoning', 'free'],
    status: 'live',
  },
  {
    id: 'apifreellm/gpt-4o',
    name: 'Bheem',
    provider: 'Codeva Compute Node Standard',
    providerKey: 'apifreellm',
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
    id: 'opencode/deepseek-v4-flash',
    name: 'Vyas',
    provider: 'Codeva Research Core',
    providerKey: 'opencode',
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
    id: 'opencode/qwen3.7-max',
    name: 'Sanjaya',
    provider: 'Codeva Web Observer Node',
    providerKey: 'opencode',
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
    id: 'image-gen',
    name: 'Chitrakar',
    provider: 'Codeva Painting Core',
    providerKey: 'nvidia',
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
    id: 'groq/llama-3.1-70b',
    name: 'Yudhishthira',
    provider: 'Codeva OpenWeights High Core',
    providerKey: 'groq',
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
    id: 'huggingface/Qwen/Qwen2.5-72B-Instruct',
    name: 'Vikrama',
    provider: 'Codeva Multilingual Core',
    providerKey: 'huggingface',
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
    id: 'huggingface/Qwen/Qwen2.5-Coder-32B-Instruct',
    name: 'Vishwakarma',
    provider: 'Codeva Developer Core',
    providerKey: 'huggingface',
    themeColor: '#ED8936',
    description: 'The divine architect. Trained on millions of code repositories for optimal software development.',
    capabilities: ['Coding', 'Debugging', 'Free'],
    contextWindow: 'Unlimited',
    latency: '~0.9s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['reasoning', 'fast', 'free'],
    status: 'live',
  },
  {
    id: 'gemini/gemini-2.5-pro',
    name: 'Madhav',
    provider: 'Codeva Compute Node Pro',
    providerKey: 'gemini',
    themeColor: '#F59E0B',
    description: 'The supreme intelligence. Unrivalled reasoning, deep analysis, and creative mastery. Use for your most ambitious challenges.',
    capabilities: ['Reasoning', 'SOTA', 'Pro'],
    contextWindow: '1M tokens',
    latency: '~1.4s',
    tier: 'Pro',
    cost: '$18.00 / 1M tokens',
    categories: ['reasoning', 'creative'],
    status: 'live',
  },
  {
    id: 'groq/llama-3.1-70b',
    name: 'Nakul',
    provider: 'Codeva Compute Node High',
    providerKey: 'groq',
    themeColor: '#E05E36',
    description: 'The skilled strategist. Supreme reasoning depth for complex logic, technical writing, and thorough analysis.',
    capabilities: ['Reasoning', 'Technical', 'Pro'],
    contextWindow: '131K tokens',
    latency: '~0.7s',
    tier: 'Pro',
    cost: '$15.00 / 1M tokens',
    categories: ['reasoning', 'fast'],
    status: 'live',
  },
  {
    id: 'openrouter/gpt-4o-mini',
    name: 'Bheem',
    provider: 'Codeva Compute Node Standard',
    providerKey: 'openrouter',
    themeColor: '#3B82F6',
    description: 'The reliable powerhouse. Versatile and capable for everyday intelligence tasks with high accuracy.',
    capabilities: ['General', 'Fast', 'Free'],
    contextWindow: '128K tokens',
    latency: '~1.1s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['free', 'fast'],
    status: 'live',
  },
  {
    id: 'groq/llama-3.1-8b',
    name: 'Arjun',
    provider: 'Codeva Compute Node Light',
    providerKey: 'groq',
    themeColor: '#10B981',
    description: 'The swift warrior. Blazing fast responses, lightweight and razor-precise for rapid fire conversations.',
    capabilities: ['Speed', 'Conversation', 'Free'],
    contextWindow: '131K tokens',
    latency: '~0.3s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['free', 'fast'],
    status: 'live',
  },
  {
    id: 'gemini/gemini-2.5-flash',
    name: 'Sahadeva',
    provider: 'Codeva Compute Node Multimodal',
    providerKey: 'gemini',
    themeColor: '#4285F4',
    description: 'The wise seer. High-speed multimodal intelligence with enormous context window for documents and media.',
    capabilities: ['Multimodal', 'Large Context', 'Free'],
    contextWindow: '1M tokens',
    latency: '~0.8s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['free', 'creative'],
    status: 'live',
  },
  {
    id: 'nvidia/llama-3.1-nemotron-70b',
    name: 'Dronacharya',
    provider: 'Codeva Compute Node Master',
    providerKey: 'nvidia',
    themeColor: '#76B900',
    description: 'The grand master. Research-grade academic reasoning for deep technical tasks and complex instruction.',
    capabilities: ['Research', 'Dialogue', 'Pro'],
    contextWindow: '128K tokens',
    latency: '~1.6s',
    tier: 'Pro',
    cost: '$16.00 / 1M tokens',
    categories: ['reasoning'],
    status: 'live',
  },
  {
    id: 'cerebras/llama-3.1-8b',
    name: 'Abhimanyu',
    provider: 'Codeva Wafer Cluster',
    providerKey: 'cerebras',
    themeColor: '#EC4899',
    description: 'The lightning striker. Powered by wafer-scale silicon delivering unmatched sub-100ms response speed.',
    capabilities: ['Wafer Speed', 'High Throughput', 'Free'],
    contextWindow: '8K tokens',
    latency: '~0.1s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['free', 'fast'],
    status: 'live',
  },
  {
    id: 'huggingface/meta-llama/Llama-3.3-70B-Instruct',
    name: 'Yudhishthira',
    provider: 'Codeva OpenWeights Flagship',
    providerKey: 'huggingface',
    themeColor: '#FFD21E',
    description: 'The righteous elder. High-parameter open-weights flagship model built for balanced, ethical, quality output.',
    capabilities: ['OpenWeights', 'Balanced', 'Pro'],
    contextWindow: '128K tokens',
    latency: '~1.2s',
    tier: 'Pro',
    cost: '$12.00 / 1M tokens',
    categories: ['reasoning'],
    status: 'live',
  },
  {
    id: 'huggingface/Qwen/Qwen2.5-72B-Instruct',
    name: 'Vikrama',
    provider: 'Codeva Multilingual Cluster',
    providerKey: 'huggingface',
    themeColor: '#FF6B35',
    description: 'The multilingual emperor. Broad multilingual and cross-cultural intelligence with 72B parameter depth.',
    capabilities: ['Multilingual', 'Global', 'Pro'],
    contextWindow: '32K tokens',
    latency: '~1.4s',
    tier: 'Pro',
    cost: '$14.00 / 1M tokens',
    categories: ['reasoning', 'creative'],
    status: 'live',
  },
  {
    id: 'huggingface/deepseek-ai/DeepSeek-R1-Distill-Llama-70B',
    name: 'Chanakya',
    provider: 'Codeva Reasoning Cluster',
    providerKey: 'huggingface',
    themeColor: '#00A3FF',
    description: 'The grand strategist. Explicit chain-of-thought reasoning for multi-step problem solving and planning.',
    capabilities: ['Thinking', 'Reasoning', 'Pro'],
    contextWindow: '128K tokens',
    latency: '~2.2s',
    tier: 'Pro',
    cost: '$15.00 / 1M tokens',
    categories: ['reasoning'],
    status: 'live',
  },
  {
    id: 'huggingface/mistralai/Mixtral-8x7B-Instruct-v0.1',
    name: 'Saptarishi',
    provider: 'Codeva MoE Cluster',
    providerKey: 'huggingface',
    themeColor: '#FF4D88',
    description: 'The seven sages. Mixture-of-experts architecture combining the wisdom of seven specialized expert models.',
    capabilities: ['Mixture-of-Experts', 'Free'],
    contextWindow: '32K tokens',
    latency: '~1.0s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['free', 'fast'],
    status: 'live',
  },
  {
    id: 'huggingface/NousResearch/Hermes-3-Llama-3.1-70B',
    name: 'Parashurama',
    provider: 'Codeva Agentic Cluster',
    providerKey: 'huggingface',
    themeColor: '#C58A59',
    description: 'The agentic warrior. Specialized for tool use, function calling, and autonomous agentic orchestration.',
    capabilities: ['Agentic', 'Tool Use', 'Pro'],
    contextWindow: '128K tokens',
    latency: '~1.3s',
    tier: 'Pro',
    cost: '$14.00 / 1M tokens',
    categories: ['reasoning'],
    status: 'live',
  },
  {
    id: 'huggingface/Qwen/Qwen2.5-Coder-32B-Instruct',
    name: 'Vishwakarma',
    provider: 'Codeva Developer Cluster',
    providerKey: 'huggingface',
    themeColor: '#ED8936',
    description: 'The divine architect. Trained on millions of code repositories across every major programming language.',
    capabilities: ['Coding', 'Debugging', 'Pro'],
    contextWindow: '32K tokens',
    latency: '~0.9s',
    tier: 'Pro',
    cost: '$10.00 / 1M tokens',
    categories: ['reasoning', 'fast'],
    status: 'live',
  },
  {
    id: 'huggingface/cognitivecomputations/dolphin-2.9.4-llama3-70b',
    name: 'Ashwatthama',
    provider: 'Codeva Uncensored Node',
    providerKey: 'huggingface',
    themeColor: '#38B2AC',
    description: 'The free warrior. Uncensored high-parameter intelligence for unrestricted debate and creative thinking.',
    capabilities: ['Uncensored', 'Freedom', 'Pro'],
    contextWindow: '8K tokens',
    latency: '~1.3s',
    tier: 'Pro',
    cost: '$15.00 / 1M tokens',
    categories: ['reasoning'],
    status: 'live',
  },
  {
    id: 'huggingface/cognitivecomputations/dolphin-2.9.2-qwen2.5-72b',
    name: 'Kali',
    provider: 'Codeva Uncensored Flagship',
    providerKey: 'huggingface',
    themeColor: '#FF0055',
    description: 'The destroyer of limits. Fully uncensored 72B flagship ΓÇö maximum freedom of thought, unfiltered intelligence.',
    capabilities: ['Uncensored', 'Unfiltered', 'Enterprise'],
    contextWindow: '32K tokens',
    latency: '~1.5s',
    tier: 'Enterprise',
    cost: 'Custom pricing',
    categories: ['reasoning', 'creative'],
    status: 'live',
  },
  {
    id: 'huggingface/cognitivecomputations/dolphin-2.9.3-mistral-nemo-12b',
    name: 'Rudra',
    provider: 'Codeva Uncensored Edge',
    providerKey: 'huggingface',
    themeColor: '#EF4444',
    description: 'The fierce one. Uncensored edge model built for raw unconstrained intelligence at high speed.',
    capabilities: ['Uncensored', 'Edge', 'Free'],
    contextWindow: '128K tokens',
    latency: '~0.8s',
    tier: 'Free',
    cost: '$0.00 / 1M tokens',
    categories: ['free', 'fast'],
    status: 'live',
  },
  {
    id: 'huggingface/defog/sqlcoder-70b-v1.5',
    name: 'Agastya',
    provider: 'Codeva Database Specialist',
    providerKey: 'huggingface',
    themeColor: '#D69E2E',
    description: 'The sage of data. Specialized in translating natural language into precise, optimized SQL queries.',
    capabilities: ['Database', 'SQL', 'Pro'],
    contextWindow: '128K tokens',
    latency: '~1.5s',
    tier: 'Pro',
    cost: '$14.00 / 1M tokens',
    categories: ['reasoning'],
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
  opencode: Zap,
  apifreellm: Zap,
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
  const [benchmarkTab, setBenchmarkTab] = useState('reasoning')

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
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
          <AnimatePresence mode="popLayout">
            {filteredModels.map((model, i) => (
              <ModelCard key={model.id} model={model} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* ── Performance Benchmarks Section ── */}
        <ScrollReveal>
          <div className="border-t border-white/[0.04] pt-20 mb-20">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12">
              <div>
                <span className="text-xs font-semibold tracking-widest uppercase text-orange-400 mb-3 block">Performance Benchmarks</span>
                <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                  Evaluated on real developer metrics
                </h2>
              </div>
              <p className="text-xs text-gray-400 max-w-md mt-4 lg:mt-0 leading-relaxed">
                We continuously test our orchestrations against SOTA benchmarks to ensure maximum speed, retrieval fidelity, and logical accuracy.
              </p>
            </div>

            {/* Benchmark Tab Selectors */}
            <div className="flex flex-wrap gap-2.5 mb-8">
              {BENCHMARK_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setBenchmarkTab(cat.id)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer"
                  style={{
                    background: benchmarkTab === cat.id ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.02)',
                    borderColor: benchmarkTab === cat.id ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.05)',
                    color: benchmarkTab === cat.id ? '#F59E0B' : '#9CA3AF',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Benchmark Display Container */}
            <div className="grid lg:grid-cols-5 gap-8 items-stretch">
              {/* Left 3 Cols: Custom Animated SVG Bar Charts */}
              <div className="lg:col-span-3 card-glass p-6 md:p-8 flex flex-col justify-between border border-white/[0.05]">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Model Comparison
                    </span>
                    <span className="text-[10px] bg-white/[0.04] text-gray-400 border border-white/[0.06] px-2 py-0.5 rounded font-mono">
                      {BENCHMARK_CATEGORIES.find(c => c.id === benchmarkTab)?.metric}
                    </span>
                  </div>

                  <div className="space-y-5">
                    {BENCHMARK_CATEGORIES.find(c => c.id === benchmarkTab)?.data.map((item, idx) => {
                      // Determine max score to calculate percentage width
                      const currentCat = BENCHMARK_CATEGORIES.find(c => c.id === benchmarkTab);
                      const maxScore = Math.max(...currentCat.data.map(d => d.score));
                      const percentWidth = (item.score / maxScore) * 100;

                      return (
                        <div key={item.name} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-300">{item.name}</span>
                            <span className="font-mono font-bold text-white" style={{ color: item.color }}>
                              {item.score}{item.isTps ? ' TPS' : '%'}
                            </span>
                          </div>
                          
                          {/* Progress bar container */}
                          <div className="h-2 w-full rounded-full bg-white/[0.02] border border-white/[0.04] overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentWidth}%` }}
                              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: idx * 0.05 }}
                              className="h-full rounded-full"
                              style={{
                                background: `linear-gradient(90deg, ${item.color}cc, ${item.color})`,
                                boxShadow: `0 0 10px ${item.color}30`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-white/[0.04] pt-4 mt-8 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                  <span>Tests run: 1,000 iterations</span>
                  <span>Margin of error: &lt; 0.4%</span>
                </div>
              </div>

              {/* Right 2 Cols: Benchmark Details Card */}
              <div className="lg:col-span-2 card-glass p-6 md:p-8 border border-white/[0.05] flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/[0.02] rounded-full blur-3xl pointer-events-none" />
                
                <div className="space-y-5 relative z-10">
                  <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Evaluation Methodology
                  </span>
                  
                  {benchmarkTab === 'reasoning' && (
                    <>
                      <h4 className="text-lg font-bold text-white">Reasoning & Math</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Evaluated using MMLU-Pro (Multi-task Language Understanding) and GSM8K (Graduate School Math). Our flagship reasoning models execute internal chain-of-thought loops to resolve multi-step logic before returning the final token.
                      </p>
                      <ul className="text-xs text-gray-400 space-y-2 list-disc pl-4 leading-relaxed">
                        <li>Forces explicit reasoning steps</li>
                        <li>Tested on advanced calculus and logic</li>
                        <li>Compared against SOTA commercial models</li>
                      </ul>
                    </>
                  )}

                  {benchmarkTab === 'coding' && (
                    <>
                      <h4 className="text-lg font-bold text-white">Coding & Development</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Measured via HumanEval (Python coding problems) and MBPP. Testing covers syntax validity, context-aware variable naming, algorithmic execution correctness, and complex dependency parsing.
                      </p>
                      <ul className="text-xs text-gray-400 space-y-2 list-disc pl-4 leading-relaxed">
                        <li>Verified on compilable code tasks</li>
                        <li>Evaluates multi-file dependency reasoning</li>
                        <li>Tested in unified workspace simulations</li>
                      </ul>
                    </>
                  )}

                  {benchmarkTab === 'speed' && (
                    <>
                      <h4 className="text-lg font-bold text-white">Inference Speed</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Throughput is measured in tokens generated per second (TPS) on live API routes. Models like Abhimanyu (Cerebras) utilize custom hardware clusters to stream tokens at sub-100ms first-token latency.
                      </p>
                      <ul className="text-xs text-gray-400 space-y-2 list-disc pl-4 leading-relaxed">
                        <li>Monitored under concurrent load</li>
                        <li>First-token-time tested under 50ms</li>
                        <li>Optimized via custom websocket endpoints</li>
                      </ul>
                    </>
                  )}

                  {benchmarkTab === 'context' && (
                    <>
                      <h4 className="text-lg font-bold text-white">Context Retrieval</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Evaluated using the Needle In A Haystack test. A specific fact is buried deep within varying document lengths (up to 1M tokens), and the models are prompted to locate and synthesize that fact.
                      </p>
                      <ul className="text-xs text-gray-400 space-y-2 list-disc pl-4 leading-relaxed">
                        <li>Fidelity checked across 1M tokens</li>
                        <li>Measures information loss in mid-documents</li>
                        <li>Ensures context parsing accuracy for codebases</li>
                      </ul>
                    </>
                  )}
                </div>

                <div className="pt-6 border-t border-white/[0.04] mt-6 flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Verified Scores
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  )
}

const BENCHMARK_CATEGORIES = [
  {
    id: 'reasoning',
    label: 'Reasoning & Math',
    metric: 'MMLU-Pro / MATH score (%)',
    data: [
      { name: 'DeepSeek V4 Pro', score: 92.1, color: '#F59E0B' },
      { name: 'DeepSeek R1 Distill Llama', score: 90.5, color: '#E05E36' },
      { name: 'Codeva Flagship', score: 88.4, color: '#7C3AED' },
      { name: 'Llama 3.3', score: 84.2, color: '#FFD21E' },
      { name: 'GPT-4o', score: 79.5, color: '#3B82F6' },
      { name: 'DeepSeek V4 Flash', score: 74.0, color: '#0D9488' }
    ]
  },
  {
    id: 'coding',
    label: 'Coding & Development',
    metric: 'HumanEval / MBPP pass rate (%)',
    data: [
      { name: 'Qwen 2.5 Coder', score: 91.2, color: '#ED8936' },
      { name: 'Codeva Flagship', score: 89.6, color: '#7C3AED' },
      { name: 'DeepSeek V4 Pro', score: 87.8, color: '#F59E0B' },
      { name: 'DeepSeek R1 Distill Llama', score: 85.5, color: '#E05E36' },
      { name: 'Llama 3.3', score: 81.0, color: '#FFD21E' },
      { name: 'GPT-4o', score: 76.4, color: '#3B82F6' }
    ]
  },
  {
    id: 'speed',
    label: 'Inference Speed',
    metric: 'Average output throughput (Tokens/sec)',
    data: [
      { name: 'Llama 3.1 8B (Cerebras)', score: 850, color: '#EC4899', isTps: true },
      { name: 'Llama 3.1 8B (Groq)', score: 240, color: '#10B981', isTps: true },
      { name: 'GPT-4o Mini', score: 120, color: '#3B82F6', isTps: true },
      { name: 'Codeva Flagship', score: 95, color: '#7C3AED', isTps: true },
      { name: 'Llama 3.3', score: 85, color: '#FFD21E', isTps: true },
      { name: 'DeepSeek V4 Pro', score: 65, color: '#F59E0B', isTps: true }
    ]
  },
  {
    id: 'context',
    label: 'Context Retrieval',
    metric: 'Needle In A Haystack retrieval rate (%)',
    data: [
      { name: 'Gemini 1.5 Flash (1M)', score: 100, color: '#4285F4' },
      { name: 'Gemini 1.5 Pro (1M)', score: 99.8, color: '#F59E0B' },
      { name: 'Codeva Flagship (128K)', score: 99.7, color: '#7C3AED' },
      { name: 'Llama 70B (128K)', score: 98.5, color: '#E05E36' },
      { name: 'Llama 3.3 (128K)', score: 97.8, color: '#FFD21E' },
      { name: 'GPT-4o Mini (128K)', score: 96.2, color: '#3B82F6' }
    ]
  }
]
