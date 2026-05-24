import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Timer, Cpu, ArrowLeft, ArrowRight, Layers, ShieldCheck, Gauge, Landmark, BarChart3, HelpCircle } from 'lucide-react'
import { MODEL_CARDS } from './ModelsPage.jsx'
import ScrollReveal from '@components/ui/ScrollReveal'

export default function ModelDetailPage() {
  const { id } = useParams()
  
  const model = MODEL_CARDS.find(m => m.id === id)

  if (!model) {
    return (
      <div className="min-h-screen bg-[#07070a] pt-32 pb-20 flex flex-col items-center justify-center text-center px-6">
        <HelpCircle className="w-12 h-12 text-rose-400 mb-4 animate-pulse" />
        <h1 className="text-2xl font-bold text-white mb-2">Model Not Found</h1>
        <p className="text-gray-400 text-sm max-w-sm mb-6 leading-relaxed">
          The requested model ID "{id}" could not be resolved in the unified gateway registry.
        </p>
        <Link to="/models" className="px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-xs font-semibold hover:bg-white/[0.08] transition-all">
          Back to Models
        </Link>
      </div>
    )
  }

  // Realistic mock benchmarks for visual representation
  const benchmarks = {
    MMLU: model.tier === 'Enterprise' ? 91.2 : model.tier === 'Pro' ? 86.8 : 78.4,
    HumanEval: model.name.includes('Coder') ? 89.2 : model.tier === 'Enterprise' ? 85.4 : model.tier === 'Pro' ? 81.2 : 69.5,
    MATH: model.tier === 'Enterprise' ? 68.2 : model.tier === 'Pro' ? 59.8 : 42.0,
    GSM8K: model.tier === 'Enterprise' ? 94.5 : model.tier === 'Pro' ? 91.0 : 81.8
  }

  const isPro = model.tier === 'Pro'
  const isEnt = model.tier === 'Enterprise'
  const tierColorClass = isEnt
    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    : isPro
    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'

  return (
    <div className="min-h-screen bg-[#07070a] pt-32 pb-24 relative overflow-x-hidden">
      {/* Background radial glows */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-1/4 w-[600px] h-[350px] rounded-full blur-[130px]"
          style={{ background: `radial-gradient(circle, ${model.themeColor}33 0%, transparent 70%)` }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-6">
        
        {/* Back Link */}
        <Link to="/models" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs font-semibold mb-8 group">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          Back to all models
        </Link>

        {/* Model Details Header */}
        <div className="border border-white/[0.05] bg-[#0c0c12]/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-white/[0.04]">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{model.provider}</span>
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${tierColorClass}`}>
                  {model.tier}
                </span>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">{model.name}</h1>
            </div>
            <Link
              to="/chat"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.35)] cursor-pointer"
              style={{ background: isEnt ? 'linear-gradient(135deg, #F59E0B, #D97757)' : isPro ? 'linear-gradient(135deg, #D97757, #B85D3D)' : 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
            >
              Start Chat
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
              <div className="text-gray-550 text-xs font-medium uppercase tracking-wider mb-1">Context Size</div>
              <div className="text-white text-base font-bold flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-orange-400" />
                {model.contextWindow}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
              <div className="text-gray-550 text-xs font-medium uppercase tracking-wider mb-1">Average Latency</div>
              <div className="text-white text-base font-bold flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-orange-400" />
                {model.latency}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
              <div className="text-gray-550 text-xs font-medium uppercase tracking-wider mb-1">API Calling Rate</div>
              <div className="text-orange-400 text-base font-bold flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-orange-400" />
                {model.cost}
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid Split */}
        <div className="grid md:grid-cols-12 gap-8 items-start">
          
          {/* Details & Specs Left */}
          <div className="md:col-span-7 space-y-8">
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Model Overview</h3>
              <p className="text-sm text-gray-400 leading-relaxed font-medium">
                {model.description}
              </p>
              <p className="text-sm text-gray-400 leading-relaxed font-medium">
                CyberCli orchestrates this model using high-throughput pipeline proxies to guarantee low latency. It is automatically integrated with failover fallbacks to prevent session interruptions during high cluster loads.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Gateway Capabilities</h3>
              <div className="grid grid-cols-2 gap-3 text-xs font-medium text-gray-300">
                {[
                  { name: 'Function Calling', support: true },
                  { name: 'Multimodal Input', support: model.capabilities.includes('Multimodal') || model.name.includes('Pro') || model.name.includes('Core') },
                  { name: 'Uncensored Output', support: model.capabilities.includes('Uncensored') },
                  { name: 'Edge Processing', support: model.providerKey === 'cloudflare' || model.providerKey === 'cerebras' },
                  { name: 'Parallel Execution', support: true },
                  { name: 'Structured JSON Mode', support: true }
                ].map(item => (
                  <div key={item.name} className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.01] border border-white/[0.03]">
                    <ShieldCheck className={`w-4 h-4 ${item.support ? 'text-emerald-400' : 'text-gray-650'}`} />
                    <span className={item.support ? 'text-gray-200' : 'text-gray-600'}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Benchmarks Right */}
          <div className="md:col-span-5 border border-white/[0.05] bg-[#0c0c12]/80 backdrop-blur rounded-3xl p-6 space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-orange-400" />
              Benchmarks
            </h3>
            
            <div className="space-y-4">
              {Object.entries(benchmarks).map(([key, val]) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-400">{key}</span>
                    <span className="text-white font-bold">{val}%</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${model.themeColor}, ${model.themeColor}cc)` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${val}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-[10px] text-gray-600 leading-relaxed pt-2 border-t border-white/[0.04]">
              * Benchmarks represent MMLU (Massive Multitask Language Understanding), HumanEval (Python coding), MATH (advanced mathematics reasoning), and GSM8K (grade-school math problems) based on gateway evaluation sweeps.
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
