import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Flame, Cpu, Layers, Zap, BrainCircuit, Activity, Server, 
  ArrowRight, ShieldCheck, Database, FileCode2, Terminal, Code2, 
  Workflow, CheckCircle2, ChevronDown, Globe2, Lock, FastForward, PlayCircle
} from 'lucide-react'
import SEOHead from '@components/seo/SEOHead'
import ScrollReveal from '@components/ui/ScrollReveal'

export default function RavanPage() {
  const [activeFaq, setActiveFaq] = useState(null)

  const BENCHMARKS = [
    { label: 'Ravan Engine (Dashanan Arch)', score: 99.1, color: '#EF4444' },
    { label: 'MADHAV Engine', score: 98.4, color: '#F59E0B' },
    { label: 'Claude Opus 4.8', score: 96.1, color: '#d97757' },
    { label: 'OpenAI GPT-5', score: 95.8, color: '#10b981' },
  ]

  const FAQS = [
    { 
      q: "What makes the Dashanan Architecture different?", 
      a: "Ravan employs a 10-headed parallel reasoning structure (Dashanan). While traditional models process instructions linearly, Ravan spawns 10 simultaneous execution threads to brute-force complex logic, architecture, and bug fixing all at once." 
    },
    { 
      q: "How does Ravan integrate with my workflow?", 
      a: "Simply generate an sk_cyber_ API key and connect Ravan to Cursor, Claude Code, or any OpenAI-compatible client by setting the base URL to api.cybercoder.com/v1. Prepare to witness unmatched coding velocity." 
    },
    { 
      q: "Are there any guardrails on Ravan?", 
      a: "Ravan operates without artificial developer constraints. It is an unstoppable force built for raw creation, deep system administration, and unrestricted architectural exploration." 
    },
    { 
      q: "How does Ravan handle large codebases?", 
      a: "With an aggressive multi-threaded memory ingestion system, Ravan can ingest massive monorepos, mapping dependencies and relationships simultaneously across its reasoning nodes." 
    }
  ]

  return (
    <div className="pt-32 pb-24 bg-[#0a0505] min-h-screen">
      <SEOHead 
        title="Ravan Engine | God-Tier Brute Force Coder" 
        description="Experience the Ravan Engine: Codeva's most aggressive, 10-headed parallel reasoning model for ultimate coding power."
      />

      {/* 1. Hero Section */}
      <section className="relative px-6 max-w-7xl mx-auto mb-32">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/4 w-[600px] h-[400px] bg-red-600/10 rounded-full blur-[120px]" />
        </div>
        
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 mb-8">
              <Flame className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-red-500 tracking-widest uppercase">The Ultimate Coding Conqueror</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-8 leading-tight tracking-tight">
              Unleash <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-600 to-red-700">RAVAN</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-400 mb-10 leading-relaxed max-w-2xl mx-auto">
              God-Tier brute force coding. Unimaginable power. Driven by Codeva's proprietary Dashanan 10-Headed Architecture.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/chat" className="btn-primary px-8 py-4 text-sm font-bold flex items-center justify-center gap-2 rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.4)]" style={{ background: '#EF4444', borderColor: '#DC2626' }}>
                Command Ravan Now
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/settings" className="px-8 py-4 rounded-xl text-sm font-bold border border-red-500/20 text-white hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2">
                <Terminal className="w-4 h-4 text-red-400" />
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
            <h2 className="text-3xl font-bold text-white mb-4">Dashanan Architecture</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">10 simultaneous reasoning threads. When one path hits a roadblock, 9 others have already found the solution.</p>
          </div>
          
          <div className="relative p-8 rounded-3xl bg-[#120505] border border-red-500/10 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-3xl rounded-full" />
            
            <div className="grid md:grid-cols-5 gap-4 relative z-10">
              {['Logic Head 1', 'Syntax Head 2', 'Security Head 3', 'Data Head 4', 'UI Head 5'].map((agent, i) => (
                <div key={i} className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex flex-col items-center text-center relative group">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4 border border-red-500/30">
                    <BrainCircuit className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">{agent}</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Parallel Execution</p>
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
              <span className="text-red-500 text-xs font-bold tracking-widest uppercase mb-4 block">Dominating Performance</span>
              <h2 className="text-4xl font-bold text-white mb-6">Brute force intelligence shatters benchmarks.</h2>
              <p className="text-gray-400 leading-relaxed mb-8">
                Through aggressive parallel computing, Ravan solves algorithmic challenges by simultaneously exploring every possible decision tree. This brute force approach guarantees the most optimized, flawless codebase.
              </p>
            </div>
            
            <div className="space-y-6 bg-[#120505] p-8 rounded-3xl border border-red-500/10">
              <h3 className="text-white font-bold mb-6">Aggressive Coding Benchmark</h3>
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
          <div className="bg-gradient-to-br from-red-900/20 to-transparent border border-red-500/20 rounded-3xl p-10 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Total System Domination</h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-10">
              Ravan assumes complete control of the stack. From writing low-level database drivers to spawning hyper-interactive visual frontends, it commands the entire software lifecycle.
            </p>
            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="p-6 bg-black/40 rounded-2xl border border-red-500/10">
                <FileCode2 className="w-8 h-8 text-red-500 mb-4 mx-auto" />
                <h3 className="text-white font-bold mb-2">Raw Logic Generation</h3>
              </div>
              <div className="p-6 bg-black/40 rounded-2xl border border-red-500/10">
                <Globe2 className="w-8 h-8 text-rose-500 mb-4 mx-auto" />
                <h3 className="text-white font-bold mb-2">Scalable Infrastructures</h3>
              </div>
              <div className="p-6 bg-black/40 rounded-2xl border border-red-500/10">
                <Activity className="w-8 h-8 text-orange-500 mb-4 mx-auto" />
                <h3 className="text-white font-bold mb-2">Flawless Refactoring</h3>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 5. Enterprise Security */}
      <section className="px-6 max-w-5xl mx-auto mb-32">
        <ScrollReveal>
          <div className="bg-[#120505] border border-red-500/20 rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
            <ShieldCheck className="w-16 h-16 text-red-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-6">Iron-Clad Zero Retention</h2>
            <p className="text-gray-400 leading-relaxed max-w-2xl mx-auto mb-8">
              Ravan's brute force intelligence is locked entirely within your session. Absolute zero retention means your proprietary codebase is ingested, solved, and immediately incinerated from our servers. 
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <span className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-sm font-bold">Encrypted Execution</span>
              <span className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-sm font-bold">Zero Data Training</span>
              <span className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-sm font-bold">Uncensored Logic</span>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 6. Pricing & Tiers */}
      <section className="px-6 max-w-6xl mx-auto mb-32">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Command Ravan</h2>
            <p className="text-gray-400">Unlock the Dashanan Architecture.</p>
          </div>

          <div className="grid md:grid-cols-2 max-w-4xl mx-auto gap-6">
            {/* Free */}
            <div className="p-8 bg-[#0c0c12] rounded-3xl border border-white/10 flex flex-col opacity-60">
              <h3 className="text-white font-bold mb-2">Free Tier</h3>
              <p className="text-gray-400 text-sm mb-6">Restricted access.</p>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-gray-500"><Flame className="w-4 h-4 opacity-50" /> Ravan Engine Unavaliable</li>
                <li className="flex items-center gap-2 text-sm text-gray-500"><Flame className="w-4 h-4 opacity-50" /> Standard Priorities</li>
              </ul>
            </div>

            {/* Pro */}
            <div className="p-8 bg-gradient-to-b from-red-900/30 to-[#120505] rounded-3xl border border-red-500/50 flex flex-col relative shadow-[0_0_50px_rgba(239,68,68,0.15)]">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Ravan Unlocked</div>
              <h3 className="text-white font-bold mb-2 text-xl">Pro Tier</h3>
              <div className="text-4xl font-extrabold text-white mb-6">$15<span className="text-sm text-gray-500 font-normal">/mo</span></div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle2 className="w-4 h-4 text-red-500" /> Full Ravan Access</li>
                <li className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle2 className="w-4 h-4 text-red-500" /> Dashanan API Access</li>
                <li className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle2 className="w-4 h-4 text-red-500" /> Maximum Brute Force Priority</li>
              </ul>
              <Link to="/settings" className="w-full text-center py-4 rounded-xl text-sm font-bold text-white transition-all shadow-lg hover:shadow-red-500/25" style={{ background: '#EF4444' }}>Upgrade to Command Ravan</Link>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 7. FAQ */}
      <section className="px-6 max-w-3xl mx-auto mb-32">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Frequently Asked Questions</h2>
          </div>
          
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-[#120505] border border-red-500/10 hover:border-red-500/30 transition-colors rounded-2xl overflow-hidden">
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
