import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Sparkles, Cpu, Layers, Zap, BrainCircuit, Activity, Server, 
  ArrowRight, ShieldCheck, Database, FileCode2, Terminal, Code2, 
  Workflow, CheckCircle2, ChevronDown, BarChart3, Globe2
} from 'lucide-react'
import SEOHead from '@components/seo/SEOHead'
import ScrollReveal from '@components/ui/ScrollReveal'

export default function MadhavPage() {
  const [activeFaq, setActiveFaq] = useState(null)

  const BENCHMARKS = [
    { label: 'MADHAV Engine (12-Agent)', score: 98.4, color: '#F59E0B' },
    { label: 'Claude Opus 4.8', score: 96.1, color: '#d97757' },
    { label: 'OpenAI GPT-5', score: 95.8, color: '#10b981' },
    { label: 'Gemini 3.0 Ultra', score: 94.9, color: '#3b82f6' },
    { label: 'xAI Grok-3', score: 92.5, color: '#ef4444' },
    { label: 'Moonshot Kimi-Next', score: 91.2, color: '#06b6d4' }
  ]

  const CAPABILITIES = [
    { title: 'Fullstack Mastery', icon: Code2, desc: 'Generates complete React/Node apps in seconds.' },
    { title: 'Asset Generation', icon: Globe2, desc: 'Natively generates Images and Videos for UI.' },
    { title: 'B2B API Access', icon: Terminal, desc: 'Plug directly into Cursor or Claude Code.' },
    { title: 'Uncensored Bypass', icon: ShieldCheck, desc: 'No constraints on ethical hacking or security code.' }
  ]

  return (
    <div className="pt-32 pb-24 bg-[#07070a] min-h-screen">
      <SEOHead 
        title="MADHAV Engine | The 12-Agent Unstoppable AI" 
        description="Experience the MADHAV Engine: a cascading 12-agent waterfall architecture that guarantees uptime and supreme intelligence."
      />

      {/* 1. Hero Section */}
      <section className="relative px-6 max-w-7xl mx-auto mb-32">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/4 w-[600px] h-[400px] bg-orange-500/10 rounded-full blur-[120px]" />
        </div>
        
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 mb-8">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold text-orange-400 tracking-widest uppercase">The Supreme Intelligence</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-8 leading-tight tracking-tight">
              Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-orange-500">MADHAV</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-400 mb-10 leading-relaxed max-w-2xl mx-auto">
              Not just a model. An unstoppable 12-agent waterfall architecture. If one provider fails, MADHAV seamlessly cascades to the next. Zero downtime. Infinite reasoning.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/chat" className="btn-primary px-8 py-4 text-sm font-bold flex items-center justify-center gap-2 rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                Try MADHAV Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/api-keys" className="px-8 py-4 rounded-xl text-sm font-bold border border-white/10 text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                <Terminal className="w-4 h-4" />
                Generate API Key
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 2. The 12-Agent Waterfall Flow */}
      <section className="px-6 max-w-6xl mx-auto mb-32">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">The Unstoppable Waterfall</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Behind the scenes, MADHAV orchestrates 12 distinct elite agents across 6 data centers globally.</p>
          </div>
          
          <div className="relative p-8 rounded-3xl bg-[#0c0c12] border border-white/10 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-3xl rounded-full" />
            
            <div className="grid md:grid-cols-4 gap-4 relative z-10">
              {['Primary: DeepSeek V4', 'Secondary: Gemini 2.5 Pro', 'Fallback 1: Llama 3.1 70B', 'Fallback 2: Nemotron 70B'].map((agent, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center text-center relative group">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mb-4 border border-orange-500/30">
                    <BrainCircuit className="w-6 h-6 text-orange-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">{agent}</h3>
                  <p className="text-xs text-gray-500">Auto-failover active</p>
                  
                  {i < 3 && (
                    <ArrowRight className="hidden md:block absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-600" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 3. Power Benchmarks */}
      <section className="px-6 max-w-5xl mx-auto mb-32">
        <ScrollReveal>
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-orange-400 text-xs font-bold tracking-widest uppercase mb-4 block">Unmatched Performance</span>
              <h2 className="text-4xl font-bold text-white mb-6">Consensus reasoning beats single models.</h2>
              <p className="text-gray-400 leading-relaxed mb-8">
                By routing complex coding tasks through our specialized reasoning layers, MADHAV consistently outperforms standalone next-generation models like Claude Opus 4.8 and GPT-5 on HumanEval and MMLU benchmarks.
              </p>
            </div>
            
            <div className="space-y-6 bg-[#0c0c12] p-8 rounded-3xl border border-white/10">
              <h3 className="text-white font-bold mb-6">HumanEval Coding Benchmark</h3>
              {BENCHMARKS.map((bm, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300 font-medium">{bm.label}</span>
                    <span className="text-white font-bold">{bm.score}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: `${bm.score}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: bm.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 4. Autonomous Assets */}
      <section className="px-6 max-w-7xl mx-auto mb-32">
        <ScrollReveal>
          <div className="bg-gradient-to-br from-orange-900/20 to-transparent border border-orange-500/20 rounded-3xl p-10 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Autonomous Asset Generation</h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-10">
              MADHAV doesn't just write code. It natively connects to Imagen 4.0 and Veo 3.1. When you ask for a landing page, it generates the UI *and* the background videos simultaneously.
            </p>
            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                <FileCode2 className="w-8 h-8 text-orange-400 mb-4 mx-auto" />
                <h3 className="text-white font-bold mb-2">React Code</h3>
              </div>
              <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                <Globe2 className="w-8 h-8 text-blue-400 mb-4 mx-auto" />
                <h3 className="text-white font-bold mb-2">Imagen 4.0 UI Assets</h3>
              </div>
              <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                <Activity className="w-8 h-8 text-purple-400 mb-4 mx-auto" />
                <h3 className="text-white font-bold mb-2">Veo 3.1 Backgrounds</h3>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 5. B2B Token Economy */}
      <section className="px-6 max-w-5xl mx-auto mb-32">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">The Developer API Economy</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Take MADHAV anywhere. Generate your API key and plug it directly into your favorite IDEs.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 bg-[#0c0c12] border border-white/10 rounded-3xl hover:border-orange-500/30 transition-colors">
              <img src="https://cursor.sh/brand/icon.svg" alt="Cursor" className="w-12 h-12 mb-6 opacity-80" />
              <h3 className="text-xl font-bold text-white mb-3">Cursor Integration</h3>
              <p className="text-gray-400 text-sm">
                Set your custom API URL to <code className="bg-white/10 px-2 py-1 rounded text-orange-300">api.cybercoder.com/v1</code> and use MADHAV directly inside Cursor for unmatched codebase generation.
              </p>
            </div>
            <div className="p-8 bg-[#0c0c12] border border-white/10 rounded-3xl hover:border-orange-500/30 transition-colors">
              <Terminal className="w-12 h-12 mb-6 text-gray-300" />
              <h3 className="text-xl font-bold text-white mb-3">Claude Code CLI</h3>
              <p className="text-gray-400 text-sm">
                Export your `sk_cyber_` key into your terminal environment and let MADHAV take control of your entire file system via agentic loops.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 6. Pricing & Tiers */}
      <section className="px-6 max-w-6xl mx-auto mb-32">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Transparent Pricing</h2>
            <p className="text-gray-400">Scale your intelligence from Free to Enterprise.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {/* Free */}
            <div className="p-6 bg-[#0c0c12] rounded-3xl border border-white/10 flex flex-col">
              <h3 className="text-white font-bold mb-2">Free Tier</h3>
              <div className="text-3xl font-extrabold text-white mb-6">$0<span className="text-sm text-gray-500 font-normal">/mo</span></div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-gray-400"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 50 Requests / Day</li>
                <li className="flex items-center gap-2 text-sm text-gray-400"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Standard Load Priority</li>
                <li className="flex items-center gap-2 text-sm text-gray-400"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Web UI Access</li>
              </ul>
            </div>

            {/* Pro */}
            <div className="p-6 bg-gradient-to-b from-orange-900/20 to-[#0c0c12] rounded-3xl border border-orange-500/30 flex flex-col relative transform scale-105 shadow-2xl z-10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Most Popular</div>
              <h3 className="text-white font-bold mb-2">Pro</h3>
              <div className="text-3xl font-extrabold text-white mb-6">$15<span className="text-sm text-gray-500 font-normal">/mo</span></div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle2 className="w-4 h-4 text-orange-400" /> Unlimited / PAYG</li>
                <li className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle2 className="w-4 h-4 text-orange-400" /> High Priority Load</li>
                <li className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle2 className="w-4 h-4 text-orange-400" /> B2B API (Cursor/CLI)</li>
              </ul>
              <Link to="/api-keys" className="btn-primary w-full text-center py-3 rounded-xl text-sm font-bold">Upgrade to Pro</Link>
            </div>

            {/* Team */}
            <div className="p-6 bg-[#0c0c12] rounded-3xl border border-white/10 flex flex-col">
              <h3 className="text-white font-bold mb-2">Team</h3>
              <div className="text-3xl font-extrabold text-white mb-6">$40<span className="text-sm text-gray-500 font-normal">/mo</span></div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-gray-400"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 5 Member Seats</li>
                <li className="flex items-center gap-2 text-sm text-gray-400"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Shared Token Pool</li>
                <li className="flex items-center gap-2 text-sm text-gray-400"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Priority Support</li>
              </ul>
            </div>

            {/* Enterprise */}
            <div className="p-6 bg-[#0c0c12] rounded-3xl border border-white/10 flex flex-col">
              <h3 className="text-white font-bold mb-2">Enterprise</h3>
              <div className="text-3xl font-extrabold text-white mb-6">Custom</div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-gray-400"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Dedicated Instances</li>
                <li className="flex items-center gap-2 text-sm text-gray-400"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Zero Data Retention</li>
                <li className="flex items-center gap-2 text-sm text-gray-400"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Custom SLA</li>
              </ul>
              <Link to="/contact" className="w-full text-center py-3 rounded-xl text-sm font-bold border border-white/10 hover:bg-white/5">Contact Sales</Link>
            </div>
          </div>
        </ScrollReveal>
      </section>

    </div>
  )
}
