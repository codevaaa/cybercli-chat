import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Cpu, Users, ShieldCheck, ArrowRight, Play, Blocks, Sparkles,
  Bot, Network, Settings2, BarChart3, HelpCircle
} from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'

export default function AiAgentsPage() {
  return (
    <div className="pt-32 pb-24 bg-[#07070a] text-gray-300 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[600px] h-[350px] bg-purple-900/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[300px] bg-emerald-950/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto mb-20">
          <ScrollReveal>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 tracking-widest uppercase mb-6 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Bot className="w-3.5 h-3.5" />
              CyberCli Agentic Platform
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
              Make AI agents your{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                unfair advantage
              </span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <p className="text-sm md:text-base text-gray-400 leading-relaxed mb-8">
              Deploy custom autonomous agents designed to automate complex, multi-step actions, code compilation, database syncs, and geographic edge execution.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/chat"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all duration-200 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
              >
                Launch Agent Workspace
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/docs/custom-agents"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-xs font-semibold hover:bg-white/[0.06] transition-all"
              >
                Read Agent Docs
              </Link>
            </div>
          </ScrollReveal>
        </section>

        {/* Stats Row */}
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-24 border-t border-b border-white/[0.05] py-10 text-center bg-white/[0.01] backdrop-blur-sm rounded-2xl px-6">
            <div>
              <p className="text-3xl md:text-4xl font-extrabold text-white mb-1 font-mono">50.6%</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Reduction in Dev Overhead</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-extrabold text-white mb-1 font-mono">4.6M</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Agent Executions Run</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-extrabold text-white mb-1 font-mono">4x</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Faster Task Completion</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-extrabold text-white mb-1 font-mono">20+</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Tool Integrations Supported</p>
            </div>
          </div>
        </ScrollReveal>

        {/* Powerful, collaborative, and safe section */}
        <section className="mb-24">
          <ScrollReveal>
            <div className="text-center max-w-xl mx-auto mb-16">
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight mb-4">
                Powerful, collaborative, and safe AI agents
              </h2>
              <p className="text-xs text-gray-500">
                Deploying agents requires deep guardrails. CyberCli enforces strict validation limits and permission prompts for any local workspace modifications.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Autonomous Execution',
                desc: 'Agents plan and execute multi-step scripts, verify compiler output, and self-correct on failures.',
                icon: Bot
              },
              {
                title: 'Workspace Collaboration',
                desc: 'Through local daemon connection, agents edit files, preview changes, and run git staging pipelines.',
                icon: Network
              },
              {
                title: 'Safe Sandboxing',
                desc: 'Strict authorization prompt guards protect critical files from unsanctioned code execution.',
                icon: ShieldCheck
              }
            ].map((item, idx) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="p-6 rounded-2xl border border-white/[0.04] bg-[#0c0c12]/60 hover:border-white/[0.08] transition-all">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-gray-450 leading-relaxed font-medium">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Code + Chat UI Demo section */}
        <section className="grid lg:grid-cols-12 gap-12 items-center mb-24">
          <div className="lg:col-span-6 space-y-6">
            <ScrollReveal>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
                Build AI agents with the CyberCli API
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.08}>
              <p className="text-sm text-gray-450 leading-relaxed font-medium">
                Create customizable agent workflows that link multiple model checkpoints together. Build loop-based developers, data scrapers, or security checkers that report directly back to your channel.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.15}>
              <div className="space-y-4">
                {[
                  { name: 'Define System Guardrails', desc: 'Control API limits and access paths.' },
                  { name: 'Declare Function Tools', desc: 'Expose local scripts, APIs, or database handlers.' },
                  { name: 'Trigger Loop Auditing', desc: 'View thoughts, execution state, and output streams.' }
                ].map(item => (
                  <div key={item.name} className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 flex-shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.name}</h4>
                      <p className="text-[11px] text-gray-500 leading-normal font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>

          <div className="lg:col-span-6">
            <ScrollReveal>
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-[#0c0c12]/90 shadow-2xl p-4 font-mono text-xs">
                {/* Header */}
                <div className="flex items-center gap-1.5 mb-4 pb-3 border-b border-white/[0.04]">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-sans font-bold">Agent CLI Log</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping ml-auto" />
                </div>
                {/* Code body */}
                <pre className="text-left text-[11px] leading-relaxed text-gray-300 overflow-x-auto whitespace-pre pr-2">
                  <span className="text-emerald-400">user@agent:~$</span> cybercli run agent --config dev.json{"\n"}
                  {"\n"}
                  <span className="text-gray-550">[1] PLANNING STAGE</span>{"\n"}
                  Thinking: Analyze file `src/index.js` for imports.{"\n"}
                  {"\n"}
                  <span className="text-gray-550">[2] TOOL CALLING</span>{"\n"}
                  Running command: `npm run lint`{"\n"}
                  Status: <span className="text-emerald-400">SUCCESS</span> (0 errors found){"\n"}
                  {"\n"}
                  <span className="text-gray-550">[3] COMPLETED</span>{"\n"}
                  Final Output: Replaced imports and staged changes.
                </pre>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Testimonials section */}
        <section className="mb-24">
          <ScrollReveal>
            <h2 className="text-xl font-bold text-white mb-10 text-center uppercase tracking-wider">Loved by security teams</h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                quote: 'CyberCli agents completely automated our static code analysis sweeps. The zero-leak gateway and sandbox authorization prompts ensure our keys are never exposed.',
                author: 'Alex K.',
                role: 'Lead Security Analyst'
              },
              {
                quote: 'Building custom autonomous developer agents with the CyberCli platform has cut down our QA regression times. It acts like a senior coder running checks in the background.',
                author: 'Sarah M.',
                role: 'Head of Engineering'
              }
            ].map((t, idx) => (
              <div key={idx} className="p-6 rounded-2xl border border-white/[0.04] bg-[#0c0c12]/40 backdrop-blur-sm relative">
                <p className="text-xs text-gray-450 leading-relaxed mb-4 italic font-medium">"{t.quote}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 uppercase">
                    {t.author.slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{t.author}</h4>
                    <p className="text-[10px] text-gray-650">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Resources Grid */}
        <section className="mb-12">
          <ScrollReveal>
            <h2 className="text-xl font-bold text-white mb-8 text-center uppercase tracking-wider">Resources</h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Custom Agent Setup', desc: 'Step-by-step setup guides for defining custom system instructions and tools.', link: '/docs/custom-agents' },
              { title: 'API Integration Reference', desc: 'Thorough list of the completion structure, webhooks, and agent sync endpoints.', link: '/api-reference' },
              { title: 'Workspace Daemon Client', desc: 'Install and config documentation for linking local folders to agent workspace.', link: '/docs/workspace-daemon' }
            ].map(item => (
              <div key={item.title} className="p-5 border border-white/[0.04] bg-[#0c0c12]/50 hover:border-white/[0.08] hover:bg-[#0c0c12]/80 transition-all rounded-2xl flex flex-col justify-between group">
                <div>
                  <Bot className="w-5 h-5 text-gray-500 mb-3 group-hover:text-emerald-400 transition-colors" />
                  <h3 className="text-xs font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-[11px] text-gray-400 leading-normal mb-4 font-medium">{item.desc}</p>
                </div>
                <Link to={item.link} className="text-[10px] text-emerald-400 font-bold hover:text-emerald-300 transition-colors inline-flex items-center gap-1">
                  Read guide
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
