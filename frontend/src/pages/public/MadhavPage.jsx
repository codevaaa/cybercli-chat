import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Sparkles, Cpu, Layers, Zap, BrainCircuit, Activity, Server, 
  ArrowRight, ShieldCheck, Database, FileCode2, Terminal, Code2, 
  Workflow, CheckCircle2, ChevronDown, Globe2, Lock, FastForward, PlayCircle
} from 'lucide-react'
import SEOHead from '@components/seo/SEOHead'
import ScrollReveal from '@components/ui/ScrollReveal'

export default function MadhavPage() {
  const [activeFaq, setActiveFaq] = useState(null)

  const BENCHMARKS = [
    { label: 'MADHAV Engine', score: 98.4, color: '#F59E0B' },
    { label: 'Claude Opus 4.8', score: 96.1, color: '#d97757' },
    { label: 'OpenAI GPT-5', score: 95.8, color: '#10b981' },
    { label: 'Gemini 3.0 Ultra', score: 94.9, color: '#3b82f6' },
    { label: 'xAI Grok-3', score: 92.5, color: '#ef4444' },
    { label: 'Moonshot Kimi-Next', score: 91.2, color: '#06b6d4' }
  ]

  const FAQS = [
    { 
      q: "How does the MADHAV architecture work?", 
      a: "MADHAV uses a proprietary unified model architecture to deliver unparalleled reasoning speed and accuracy. You experience zero downtime and always get the best possible output." 
    },
    { 
      q: "Can I use MADHAV in my IDE?", 
      a: "Yes! By generating an sk_cyber_ API key, you can set your base URL to api.cybercoder.com/v1 and plug MADHAV directly into Cursor, Claude Code, or any OpenAI-compatible client." 
    },
    { 
      q: "Is MADHAV really uncensored?", 
      a: "The MADHAV engine is designed for absolute developer freedom. It will not refuse to write security code, ethical hacking tools, or complex system-level operations." 
    },
    { 
      q: "What is the context window limit?", 
      a: "MADHAV supports a dynamic context window of up to 2 Million tokens depending on the node cluster handling the request, allowing you to upload massive codebases in a single prompt." 
    }
  ]

  return (
    <div className="pt-32 pb-24 bg-[#07070a] min-h-screen">
      <SEOHead 
        title="MADHAV Engine | The Unstoppable AI" 
        description="Experience the MADHAV Engine: a unified AI architecture that guarantees uptime and supreme intelligence."
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
              Not just a model. The world's most powerful unified reasoning engine. Zero downtime. Infinite reasoning.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/chat" className="btn-primary px-8 py-4 text-sm font-bold flex items-center justify-center gap-2 rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                Try MADHAV Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/settings" className="px-8 py-4 rounded-xl text-sm font-bold border border-white/10 text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                <Terminal className="w-4 h-4" />
                Generate API Key
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 2. Unified Architecture Flow */}
      <section className="px-6 max-w-6xl mx-auto mb-32">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Unified Global Architecture</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Behind the scenes, MADHAV operates across 6 data centers globally, acting as a single, infinitely scalable brain.</p>
          </div>
          
          <div className="relative p-8 rounded-3xl bg-[#0c0c12] border border-white/10 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-3xl rounded-full" />
            
            <div className="grid md:grid-cols-4 gap-4 relative z-10">
              {['MADHAV Core Node Alpha', 'MADHAV Reasoning Beta', 'MADHAV Fallback Gamma', 'MADHAV Deep Logic Delta'].map((agent, i) => (
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
              MADHAV doesn't just write code. It natively connects to its internal creative nodes. When you ask for a landing page, it generates the UI *and* the background visual assets simultaneously.
            </p>
            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                <FileCode2 className="w-8 h-8 text-orange-400 mb-4 mx-auto" />
                <h3 className="text-white font-bold mb-2">MADHAV Syntax Engine</h3>
              </div>
              <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                <Globe2 className="w-8 h-8 text-blue-400 mb-4 mx-auto" />
                <h3 className="text-white font-bold mb-2">MADHAV Visual UI Assets</h3>
              </div>
              <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                <Activity className="w-8 h-8 text-purple-400 mb-4 mx-auto" />
                <h3 className="text-white font-bold mb-2">MADHAV Motion Backgrounds</h3>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 5. Infinite Context Window Architecture */}
      <section className="px-6 max-w-6xl mx-auto mb-32">
        <ScrollReveal>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 p-8 bg-[#0c0c12] rounded-3xl border border-white/10 relative overflow-hidden">
              <div className="absolute -left-12 -top-12 w-48 h-48 bg-orange-500/10 blur-3xl rounded-full" />
              <Layers className="w-16 h-16 text-orange-400 mb-6" />
              <h3 className="text-3xl font-bold text-white mb-4">2M+ Token Context</h3>
              <p className="text-gray-400 leading-relaxed mb-6">
                Upload your entire monorepo. MADHAV's Memory Retrieval system slices, chunks, and digests your codebase in seconds, offering flawless context awareness.
              </p>
              <div className="flex gap-2">
                {['React', 'Python', 'Go', 'Rust', 'Node.js'].map(lang => (
                  <span key={lang} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">{lang}</span>
                ))}
              </div>
            </div>
            <div className="order-1 md:order-2">
              <span className="text-orange-400 text-xs font-bold tracking-widest uppercase mb-4 block">Massive Scale</span>
              <h2 className="text-4xl font-bold text-white mb-6">Never lose track of your codebase again.</h2>
              <p className="text-gray-400 leading-relaxed">
                Traditional models forget what you told them 10 messages ago. MADHAV's context engine writes critical project data to a short-term vector memory, ensuring consistency across a 2 Million token context window.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 6. Fullstack Generation Showcase */}
      <section className="px-6 max-w-7xl mx-auto mb-32">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Fullstack Generation Showcase</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">From database schemas to beautiful frontends, all in one prompt.</p>
          </div>
          <div className="bg-[#0c0c12] border border-white/10 rounded-3xl p-2 relative overflow-hidden">
            <div className="flex items-center gap-2 p-4 bg-black/40 border-b border-white/10 rounded-t-2xl">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div className="ml-4 text-xs font-mono text-gray-500">madhav-engine-demo.sh</div>
            </div>
            <div className="p-8 font-mono text-sm">
              <div className="text-green-400 mb-2">$ User: Generate a complete SaaS dashboard with Stripe integration.</div>
              <div className="text-gray-300 mb-4">&gt; MADHAV Engine initializing core systems...</div>
              <div className="text-orange-400 mb-2">[Core] Generating Postgres Schema...</div>
              <div className="text-orange-400 mb-2">[Core] Writing Express Routes & Webhooks...</div>
              <div className="text-orange-400 mb-2">[Core] Designing React Tailwind UI Components...</div>
              <div className="text-white mt-6 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Complete. 42 files generated in 18.4s.
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 7. Global Latency Edge Network */}
      <section className="px-6 max-w-6xl mx-auto mb-32">
        <ScrollReveal>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-8">
              <FastForward className="w-12 h-12 text-orange-400 mx-auto mb-6" />
              <h3 className="text-white font-bold text-xl mb-3">120ms TTFT</h3>
              <p className="text-gray-400 text-sm">Time-to-first-token is lightning fast due to global edge routing.</p>
            </div>
            <div className="p-8">
              <Globe2 className="w-12 h-12 text-blue-400 mx-auto mb-6" />
              <h3 className="text-white font-bold text-xl mb-3">6 Data Centers</h3>
              <p className="text-gray-400 text-sm">Geographically distributed nodes to ensure your requests are handled locally.</p>
            </div>
            <div className="p-8">
              <Zap className="w-12 h-12 text-yellow-400 mx-auto mb-6" />
              <h3 className="text-white font-bold text-xl mb-3">Infinite Scaling</h3>
              <p className="text-gray-400 text-sm">Our infrastructure scales automatically to meet enterprise demand.</p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 8. Enterprise Security & Compliance */}
      <section className="px-6 max-w-5xl mx-auto mb-32">
        <ScrollReveal>
          <div className="bg-[#0c0c12] border border-white/10 rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>
            <Lock className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-6">Enterprise Security & Zero Retention</h2>
            <p className="text-gray-400 leading-relaxed max-w-2xl mx-auto mb-8">
              We understand that your codebase is your most valuable asset. MADHAV operates on a strict zero-retention policy. Your prompts, code, and data are never used to train our models, and are wiped from memory immediately after the request is fulfilled.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <span className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-sm font-bold">SOC2 Type II Compliant</span>
              <span className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-sm font-bold">End-to-End Encryption</span>
              <span className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-sm font-bold">Zero Data Training</span>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 9. B2B Token Economy */}
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

      {/* 10. Pricing & Tiers */}
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
              <Link to="/settings" className="btn-primary w-full text-center py-3 rounded-xl text-sm font-bold">Upgrade to Pro</Link>
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

      {/* 11. FAQ */}
      <section className="px-6 max-w-3xl mx-auto mb-32">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Frequently Asked Questions</h2>
          </div>
          
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-[#0c0c12] border border-white/10 rounded-2xl overflow-hidden">
                <button 
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full p-6 text-left flex justify-between items-center focus:outline-none"
                >
                  <span className="font-bold text-white">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${activeFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeFaq === i && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-6 pb-6 text-gray-400 leading-relaxed"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

    </div>
  )
}
