import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Code2, Terminal, Cpu, Database, Blocks, BookOpen,
  ArrowRight, CheckCircle2, Play, Sparkles, Key, FileCode
} from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'
import SEOHead from '@components/seo/SEOHead'

export default function DevelopersPage() {
  return (
    <div className="pt-32 pb-24 bg-[#07070a] text-gray-300 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-accent/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[300px] bg-orange-900/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto mb-20">
          <ScrollReveal>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 tracking-widest uppercase mb-6 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
              <Code2 className="w-3.5 h-3.5" />
              Codeva Developer Portal
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
              The best AI engine for{' '}
              <span className="bg-gradient-to-r from-orange-400 to-orange-550 bg-clip-text text-transparent">
                modern developers
              </span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <p className="text-sm md:text-base text-gray-400 leading-relaxed mb-8">
              Build, debug, and scale with a unified API gateway connecting you to 8+ top compute clusters. Hiding the complexity, maximizing the performance.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/chat"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all duration-200 hover:shadow-[0_0_20px_rgba(217,119,87,0.4)]"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/api-reference"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-xs font-semibold hover:bg-white/[0.06] transition-all"
              >
                <Terminal className="w-4 h-4 text-orange-400" />
                Read API Reference
              </Link>
            </div>
          </ScrollReveal>
        </section>

        {/* Stats Row */}
        <ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24 border-t border-b border-white/[0.05] py-10 text-center bg-white/[0.01] backdrop-blur-sm rounded-2xl px-6">
            <div>
              <p className="text-3xl md:text-4xl font-extrabold text-white mb-1 font-mono">64.5%</p>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Average Code Gen Accuracy</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-extrabold text-white mb-1 font-mono">80x</p>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Speed Up via Wafer Clusters</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-extrabold text-white mb-1 font-mono">98%</p>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Developer Satisfaction</p>
            </div>
          </div>
        </ScrollReveal>

        {/* Code Editor Preview Section */}
        <section className="grid lg:grid-cols-12 gap-12 items-center mb-24">
          <div className="lg:col-span-5 space-y-6">
            <ScrollReveal>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
                Write code with Codeva, at lightning speed
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.08}>
              <p className="text-sm text-gray-400 leading-relaxed font-medium">
                Our code-specialized model clusters (like Vishwakarma) understand complex library patterns, security mitigations, and performance pitfalls. Integrate seamlessly inside the web IDE with a collapsible file preview and live terminal terminal daemon.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.15}>
              <ul className="space-y-3.5 text-xs text-gray-300 font-semibold">
                {[
                  'Automatic syntax validation & error correction',
                  'Support for 40+ programming languages',
                  'Terminal script automation via secure daemon connection',
                  'One-click git diff reviews and git branch commits'
                ].map(item => (
                  <li key={item} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          </div>

          <div className="lg:col-span-7">
            <ScrollReveal>
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-[#0c0c12]/90 shadow-2xl p-4 font-mono text-xs">
                {/* Header Dots */}
                <div className="flex items-center gap-1.5 mb-4 pb-3 border-b border-white/[0.04]">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  <span className="text-[10px] text-gray-600 ml-2">codeva_quickstart.py</span>
                </div>
                {/* Code Body */}
                <pre className="text-left text-[11px] leading-relaxed text-gray-300 overflow-x-auto whitespace-pre pr-2">
                  <span className="text-accent">import</span> codeva{"\n"}
                  {"\n"}
                  <span className="text-gray-550"># Initialize the unified compute engine</span>{"\n"}
                  client = codeva.Client(api_key=<span className="text-emerald-400">"cc_sec_key_..."</span>){"\n"}
                  {"\n"}
                  <span className="text-gray-550"># Dispatch structured coding agent using Vishwakarma</span>{"\n"}
                  response = client.completions.create(
                      model=<span className="text-emerald-400">"vishwakarma"</span>,
                      prompt=<span className="text-emerald-400">"Create a secure JWT authentication middleware in Node.js"</span>
                  ){"\n"}
                  {"\n"}
                  print(response.code_blocks[<span className="text-orange-400">0</span>].content)
                </pre>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Use Codeva Across Your Stack */}
        <section className="mb-24 text-center">
          <ScrollReveal>
            <h2 className="text-2xl font-bold text-white mb-4">Integrate with your local stack</h2>
            <p className="text-xs text-gray-500 max-w-md mx-auto mb-10">Codeva interfaces with local development daemons, giving the AI ability to safely run tests and preview UI.</p>
          </ScrollReveal>

          <ScrollReveal>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { name: 'Terminal Automation', icon: Terminal, desc: 'Execute tests, run linters' },
                { name: 'Workspace Daemon', icon: Blocks, desc: 'Sync directories securely' },
                { name: 'Compute Clusters', icon: Cpu, desc: 'Distributed fallback network' },
                { name: 'Secure DB Sync', icon: Database, desc: 'Encrypted schema correlation' }
              ].map(item => {
                const Icon = item.icon
                return (
                  <div key={item.name} className="p-5 rounded-2xl border border-white/[0.04] bg-white/[0.01] hover:border-white/[0.1] hover:bg-white/[0.02] transition-all text-center">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-5 h-5 text-orange-400" />
                    </div>
                    <h3 className="text-xs font-bold text-white mb-1">{item.name}</h3>
                    <p className="text-[10px] text-gray-500 leading-normal">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </ScrollReveal>
        </section>

        {/* Build products with API Platform card */}
        <ScrollReveal>
          <div className="relative rounded-3xl overflow-hidden border border-emerald-500/20 bg-gradient-to-r from-emerald-950/20 via-emerald-900/10 to-emerald-950/10 p-8 mb-24">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2 block">Enterprise API Platform</span>
                <h2 className="text-2xl font-bold text-white mb-3">
                  Build products on top of Codeva API
                </h2>
                <p className="text-xs text-gray-400 max-w-xl leading-relaxed mb-6 font-medium">
                  We supply standardized JSON and event-streaming endpoints, built for massive concurrency, load balancing, and rate limiting compliance. Use the keys generated inside your developer console to deploy products.
                </p>
                <div className="flex gap-3">
                  <Link
                    to="/api-reference"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-505 text-white text-xs font-bold transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                  >
                    <Key className="w-4 h-4" />
                    Generate API Keys
                  </Link>
                </div>
              </div>
              <div className="w-full md:w-80 flex-shrink-0 bg-black/40 border border-white/[0.05] rounded-2xl p-4 font-mono text-[10px] text-left">
                <span className="text-gray-600">// Headers</span>{"\n"}
                Authorization: Bearer <span className="text-emerald-400">"cc_sec_key_..."</span>{"\n"}
                {"\n"}
                <span className="text-gray-600">// Payload</span>{"\n"}
                {"{"}{"\n"}
                &nbsp;&nbsp;<span className="text-orange-400">"model"</span>: <span className="text-emerald-400">"arjun"</span>,{"\n"}
                &nbsp;&nbsp;<span className="text-orange-400">"stream"</span>: <span className="text-emerald-400">true</span>,{"\n"}
                &nbsp;&nbsp;<span className="text-orange-400">"messages"</span>: [{"{"}<span className="text-orange-400">"role"</span>: <span className="text-emerald-400">"user"</span>, <span className="text-orange-400">"content"</span>: <span className="text-emerald-400">"Ping"</span>{"}"}]{"\n"}
                {"}"}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Resources Grid */}
        <section className="mb-12">
          <ScrollReveal>
            <h2 className="text-xl font-bold text-white mb-8 text-center uppercase tracking-wider">Resources</h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { title: 'API Documentation', desc: 'Thorough SDK guidelines, headers reference, and completions schema.', link: '/docs', icon: BookOpen },
              { title: 'API Endpoint list', desc: 'Detailed view of the unified auth, chat, model, and settings endpoints.', link: '/api-reference', icon: FileCode },
              { title: 'Changelog Timeline', desc: 'Detailed release logs of newly deployed model clusters and features.', link: '/changelog', icon: Terminal },
              { title: 'GitHub Repository', desc: 'Explore the frontend client web app source code and contribute.', link: 'https://github.com', icon: Code2 }
            ].map(item => {
              const Icon = item.icon
              return (
                <div key={item.title} className="p-5 border border-white/[0.04] bg-[#0c0c12]/50 hover:border-white/[0.08] hover:bg-[#0c0c12]/80 transition-all rounded-2xl flex flex-col justify-between group">
                  <div>
                    <Icon className="w-5 h-5 text-gray-500 mb-3 group-hover:text-orange-400 transition-colors" />
                    <h3 className="text-xs font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-[11px] text-gray-400 leading-normal mb-4 font-medium">{item.desc}</p>
                  </div>
                  {item.link.startsWith('http') ? (
                    <a href={item.link} target="_blank" rel="noreferrer" className="text-[10px] text-orange-400 font-bold hover:text-orange-300 transition-colors inline-flex items-center gap-1">
                      Visit site
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  ) : (
                    <Link to={item.link} className="text-[10px] text-orange-400 font-bold hover:text-orange-300 transition-colors inline-flex items-center gap-1">
                      Learn more
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
