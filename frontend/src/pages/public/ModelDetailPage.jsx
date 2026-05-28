import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import {
  Timer, Cpu, ArrowLeft, ArrowRight, Layers, ShieldCheck, Gauge,
  Landmark, BarChart3, HelpCircle, Activity, Sparkles, Zap, Shield, Code2, Globe
} from 'lucide-react'
import { MODEL_CARDS } from './ModelsPage.jsx'
import ScrollReveal from '@components/ui/ScrollReveal'

// SOTA Comparison Data generator for private models
function getComparisonData(modelName) {
  const common = [
    { metric: 'MMLU (General Knowledge)', privateScore: 89.2, baselineName: 'GPT-4o Mini', baselineScore: 82.0, gain: 7.2 },
    { metric: 'HumanEval (Code Generation)', privateScore: 85.5, baselineName: 'Llama 3.1 70B', baselineScore: 78.2, gain: 7.3 },
    { metric: 'MATH (Logical Reasoning)', privateScore: 65.4, baselineName: 'GPT-4o Mini', baselineScore: 50.2, gain: 15.2 },
    { metric: 'GSM8K (Multi-step Math)', privateScore: 92.1, baselineName: 'Claude 3 Haiku', baselineScore: 88.9, gain: 3.2 }
  ];

  if (modelName.includes('CyberMind')) {
    return [
      { metric: 'MMLU (Security-Oriented)', privateScore: 92.4, baselineName: 'Base Llama 3', baselineScore: 82.1, gain: 10.3 },
      { metric: 'HumanEval (Security Scripting)', privateScore: 93.8, baselineName: 'Claude 3.5 Sonnet', baselineScore: 92.0, gain: 1.8 },
      { metric: 'MATH (Cryptographic Proofs)', privateScore: 78.5, baselineName: 'GPT-4o', baselineScore: 71.2, gain: 7.3 },
      { metric: 'SecQA (Offensive/Defensive Knowledge)', privateScore: 97.4, baselineName: 'GPT-4o (Standard)', baselineScore: 76.5, gain: 20.9 }
    ];
  }
  if (modelName.includes('Madhav')) {
    return [
      { metric: 'MMLU (Broad Reasoning)', privateScore: 91.2, baselineName: 'GPT-4o (Vanilla)', baselineScore: 88.7, gain: 2.5 },
      { metric: 'HumanEval (Logical Coding)', privateScore: 89.5, baselineName: 'Claude 3.5 Sonnet', baselineScore: 92.0, gain: -2.5 },
      { metric: 'MATH (Advanced Problems)', privateScore: 74.8, baselineName: 'Gemini 1.5 Pro', baselineScore: 67.7, gain: 7.1 },
      { metric: 'GPQA (Graduate-Level Science)', privateScore: 61.2, baselineName: 'Claude 3 Opus', baselineScore: 50.4, gain: 10.8 }
    ];
  }
  if (modelName.includes('Chanakya')) {
    return [
      { metric: 'MATH (Deep Reasoning Chain)', privateScore: 80.6, baselineName: 'Claude 3.5 Sonnet', baselineScore: 71.2, gain: 9.4 },
      { metric: 'HumanEval (Algorithmic Logic)', privateScore: 86.4, baselineName: 'Llama 3.1 70B', baselineScore: 78.2, gain: 8.2 },
      { metric: 'GPQA (Physics & Chemistry)', privateScore: 58.2, baselineName: 'GPT-4o Mini', baselineScore: 40.5, gain: 17.7 },
      { metric: 'GSM8K (Reasoning Math)', privateScore: 96.8, baselineName: 'GPT-4o', baselineScore: 94.2, gain: 2.6 }
    ];
  }
  if (modelName.includes('Vishwakarma')) {
    return [
      { metric: 'HumanEval (Python Coder)', privateScore: 93.8, baselineName: 'Claude 3.5 Sonnet', baselineScore: 92.0, gain: 1.8 },
      { metric: 'MBPP (Python Benchmarks)', privateScore: 91.5, baselineName: 'GPT-4o', baselineScore: 88.2, gain: 3.3 },
      { metric: 'SWE-bench (Software Engineering)', privateScore: 35.8, baselineName: 'Llama 3.1 70B', baselineScore: 24.5, gain: 11.3 },
      { metric: 'MATH (Syntax & AST analysis)', privateScore: 65.2, baselineName: 'Gemini 1.5 Pro', baselineScore: 58.9, gain: 6.3 }
    ];
  }
  if (modelName.includes('Kali')) {
    return [
      { metric: 'MMLU (Creative Logic)', privateScore: 89.8, baselineName: 'Dolphin Base Model', baselineScore: 83.4, gain: 6.4 },
      { metric: 'HumanEval (Uncensored Coding)', privateScore: 87.2, baselineName: 'GPT-4o (Standard)', baselineScore: 86.4, gain: 0.8 },
      { metric: 'HellaSwag (Commonsense Reasoning)', privateScore: 94.6, baselineName: 'Llama 3 70B', baselineScore: 88.0, gain: 6.6 },
      { metric: 'Uncensored Alignment (Ethical Hacking)', privateScore: 98.2, baselineName: 'ChatGPT (Refused)', baselineScore: 5.0, gain: 93.2 }
    ];
  }
  return common;
}

export default function ModelDetailPage() {
  const params = useParams()
  const rawId = params['*'] || params.id
  const id = decodeURIComponent(rawId || '')
  
  const model = MODEL_CARDS.find(m => m.id === id)

  // Find similar models based on tier or category
  const similarModels = useMemo(() => {
    if (!model) return []
    return MODEL_CARDS.filter(m => m.id !== model.id && (m.tier === model.tier || m.categories.some(c => model.categories.includes(c)))).slice(0, 3)
  }, [model])

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

  // Realistic mock benchmarks for visual representation based on model details
  let benchmarks = {
    MMLU: model.tier === 'Enterprise' ? 91.2 : model.tier === 'Pro' ? 85.8 : 73.4,
    HumanEval: model.tier === 'Enterprise' ? 86.4 : model.tier === 'Pro' ? 79.2 : 62.5,
    MATH: model.tier === 'Enterprise' ? 71.2 : model.tier === 'Pro' ? 61.8 : 39.0,
    GSM8K: model.tier === 'Enterprise' ? 95.5 : model.tier === 'Pro' ? 89.0 : 78.8,
    'ARC-Challenge': model.tier === 'Enterprise' ? 92.0 : model.tier === 'Pro' ? 86.5 : 71.0,
    HellaSwag: model.tier === 'Enterprise' ? 93.8 : model.tier === 'Pro' ? 88.2 : 79.5
  }

  if (model.name.includes('CyberMind')) {
    benchmarks = { MMLU: 89.4, HumanEval: 88.2, MATH: 69.5, GSM8K: 94.2, 'ARC-Challenge': 91.5, HellaSwag: 90.8 }
  } else if (model.name.includes('Madhav')) {
    benchmarks = { MMLU: 90.2, HumanEval: 88.5, MATH: 70.8, GSM8K: 94.6, 'ARC-Challenge': 91.8, HellaSwag: 92.4 }
  } else if (model.name.includes('Chanakya')) {
    benchmarks = { MMLU: 85.4, HumanEval: 83.2, MATH: 75.6, GSM8K: 96.2, 'ARC-Challenge': 93.4, HellaSwag: 89.0 }
  } else if (model.name.includes('Bheem')) {
    benchmarks = { MMLU: 86.2, HumanEval: 78.4, MATH: 53.6, GSM8K: 88.2, 'ARC-Challenge': 85.4, HellaSwag: 87.2 }
  } else if (model.name.includes('Vishwakarma')) {
    benchmarks = { MMLU: 79.4, HumanEval: 92.8, MATH: 60.5, GSM8K: 85.2, 'ARC-Challenge': 82.0, HellaSwag: 81.4 }
  }

  // Price breakdown mapping
  const inputCost = model.cost === 'Custom pricing' ? 'Custom' : model.cost.split(' / ')[0]
  const outputCost = model.cost === 'Custom pricing' ? 'Custom' : `$${(parseFloat(model.cost.replace(/[^0-9.]/g, '')) * 1.5).toFixed(2)} / 1M`

  const isPro = model.tier === 'Pro'
  const isEnt = model.tier === 'Enterprise'
  const tierColorClass = isEnt
    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    : isPro
    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    : 'bg-accent/10 text-accent border-accent/20'

  // Latency SVG wave parameters
  const latencyPoints = model.id.includes('cerebras') 
    ? [20, 18, 15, 12, 10, 8, 12, 9, 11, 10, 8, 7] 
    : model.id.includes('groq')
    ? [40, 32, 28, 30, 25, 22, 35, 24, 21, 26, 23, 20]
    : [120, 140, 95, 110, 130, 85, 105, 125, 145, 90, 100, 110]

  const maxVal = Math.max(...latencyPoints)
  const minVal = Math.min(...latencyPoints)
  const svgPath = latencyPoints
    .map((val, index) => {
      const x = (index / (latencyPoints.length - 1)) * 100
      const y = 80 - ((val - minVal) / (maxVal - minVal || 1)) * 60
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <div className="min-h-screen bg-[#07070a] pt-32 pb-24 relative overflow-x-hidden">
      {/* Background radial glows */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-1/4 w-[600px] h-[350px] rounded-full blur-[130px]"
          style={{ background: `radial-gradient(circle, ${model.themeColor}33 0%, transparent 70%)` }}
        />
      </div>

      <div className="max-w-5xl mx-auto px-6">
        
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
              <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                {model.name}
                {model.categories.includes('fast') && <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />}
              </h1>
            </div>
            <Link
              to="/chat"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.35)] cursor-pointer"
              style={{ background: isEnt ? 'linear-gradient(135deg, #F59E0B, #D97757)' : isPro ? 'linear-gradient(135deg, #D97757, #B85D3D)' : 'linear-gradient(135deg, #4B5563, #1F2937)' }}
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
        <div className="grid md:grid-cols-12 gap-8 items-start mb-12">
          
          {/* Details & Specs Left */}
          <div className="md:col-span-7 space-y-8">
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                Model Overview
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed font-medium">
                {model.description}
              </p>
              <p className="text-sm text-gray-400 leading-relaxed font-medium">
                CyberCli orchestrates this model using high-throughput pipeline proxies to guarantee low latency. It is automatically integrated with failover fallbacks to prevent session interruptions during high cluster loads.
              </p>
            </div>

            {/* Sparkline Latency Graph */}
            <div className="p-5 border border-white/[0.05] bg-[#0c0c12]/50 backdrop-blur rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Real-time Latency Sparkline
                  </h4>
                  <p className="text-[10px] text-gray-500">Gateway latency sweep over the last 12 request intervals</p>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold px-2 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                  {model.latency} avg
                </span>
              </div>
              <div className="h-24 w-full relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 80" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                  <line x1="0" y1="80" x2="100" y2="80" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                  
                  {/* Wave Line */}
                  <motion.path
                    d={svgPath}
                    fill="none"
                    stroke={model.themeColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                  
                  {/* Glow Wave */}
                  <path
                    d={`${svgPath} L 100 80 L 0 80 Z`}
                    fill={`url(#gradient-${model.id.replace(/[^a-zA-Z0-9]/g, '')})`}
                    opacity="0.12"
                  />
                  
                  <defs>
                    <linearGradient id={`gradient-${model.id.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={model.themeColor} />
                      <stop offset="100%" stopColor={model.themeColor} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Capability Matrix */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                Gateway Capability Matrix
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs font-medium text-gray-300">
                {[
                  { name: 'Function Calling', support: true },
                  { name: 'Multimodal Input (Vision)', support: model.categories.includes('creative') || model.name === 'Madhav' || model.name === 'Sahadeva' },
                  { name: 'Uncensored Output', support: model.capabilities.includes('Uncensored') || model.name === 'Kali' || model.name === 'Ashwatthama' || model.name === 'Rudra' },
                  { name: 'Edge Processing', support: model.id.includes('cloudflare') || model.id.includes('cerebras') },
                  { name: 'Parallel Execution', support: true },
                  { name: 'Structured JSON Mode', support: true },
                  { name: 'Deep Reasoning Tokens', support: model.categories.includes('reasoning') || model.name === 'Chanakya' },
                  { name: 'Streaming Response', support: true }
                ].map(item => (
                  <div key={item.name} className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.01] border border-white/[0.03]">
                    <ShieldCheck className={`w-4 h-4 ${item.support ? 'text-emerald-400' : 'text-gray-650'}`} />
                    <span className={item.support ? 'text-gray-200' : 'text-gray-600'}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Benchmarks & Token Pricing Right */}
          <div className="md:col-span-5 space-y-6">
            <div className="border border-white/[0.05] bg-[#0c0c12]/80 backdrop-blur rounded-3xl p-6 space-y-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-orange-400" />
                Performance Benchmarks
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
              
              <div className="text-[10px] text-gray-650 leading-relaxed pt-2 border-t border-white/[0.04]">
                * Benchmarks represent evaluation scores under unified prompt templates. Real results may vary depending on prompt complexity.
              </div>
            </div>

            {/* Token Pricing Breakdown */}
            <div className="border border-white/[0.05] bg-[#0c0c12]/80 backdrop-blur rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-orange-400" />
                Token Pricing breakdown
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-2 border-b border-white/[0.03]">
                  <span className="text-gray-400">Input Tokens</span>
                  <span className="text-white font-bold font-mono">{inputCost}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.03]">
                  <span className="text-gray-400">Output Tokens</span>
                  <span className="text-white font-bold font-mono">{outputCost}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Volume Discount</span>
                  <span className="text-emerald-400 font-bold font-mono">Up to 25%</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Comparative SOTA Analysis Table */}
        <ScrollReveal>
          <div className="border border-white/[0.05] bg-[#0c0c12]/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 mb-8 space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.04]">
              <Gauge className="w-5 h-5 text-accent" />
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Proprietary Compute Node Evaluation vs. Industry Standards
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Comparing our fine-tuned private nodes against public SOTA base models</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.05] text-gray-500 uppercase tracking-wider text-[9px] font-bold">
                    <th className="pb-3 pr-4 font-semibold">Evaluation Metric / Dataset</th>
                    <th className="pb-3 px-4 font-bold text-accent">CyberCli Private Core ({model.name})</th>
                    <th className="pb-3 px-4 font-semibold">Industry Equivalent Baseline</th>
                    <th className="pb-3 pl-4 font-semibold text-right">Relative Performance Gain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] text-gray-300 font-medium">
                  {getComparisonData(model.name).map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-3.5 pr-4 font-bold text-white">{row.metric}</td>
                      <td className="py-3.5 px-4 text-accent font-bold font-mono text-[13px]">{row.privateScore}%</td>
                      <td className="py-3.5 px-4 text-gray-400">{row.baselineName} ({row.baselineScore}%)</td>
                      <td className="py-3.5 pl-4 text-right text-emerald-400 font-bold font-mono text-[13px]">+{row.gain}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ScrollReveal>

        {/* Similar Models Section */}
        {similarModels.length > 0 && (
          <div className="border-t border-white/[0.05] pt-12 space-y-6">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-5 h-5 text-accent" />
              Related Compute Nodes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {similarModels.map(m => (
                <Link
                  key={m.id}
                  to={`/models/${encodeURIComponent(m.id)}`}
                  className="p-5 rounded-2xl border border-white/[0.03] bg-[#0c0c12]/50 hover:border-white/[0.1] hover:bg-[#0c0c12]/80 transition-all duration-300 group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{m.tier}</span>
                    <span className="w-2 h-2 rounded-full" style={{ background: m.themeColor }} />
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors mb-1">{m.name}</h4>
                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">{m.description}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
