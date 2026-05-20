import { motion } from 'framer-motion'
import { Server, Activity, Zap, Globe, Cpu, Database, Cloud, Flame } from 'lucide-react'
import { MODELS } from '@lib/constants'
import ScrollReveal from '@components/ui/ScrollReveal'

const PROVIDER_CONFIG = {
  openrouter: {
    icon: Zap,
    color: '#8B5CF6',
    glow: 'rgba(139,92,246,0.25)',
    border: 'rgba(139,92,246,0.3)',
    bg: 'rgba(139,92,246,0.08)',
    desc: 'Unified API gateway to hundreds of models from every major lab.',
  },
  gemini: {
    icon: Globe,
    color: '#4285F4',
    glow: 'rgba(66,133,244,0.25)',
    border: 'rgba(66,133,244,0.3)',
    bg: 'rgba(66,133,244,0.08)',
    desc: 'Google\'s multimodal frontier models with vision and long context.',
  },
  groq: {
    icon: Flame,
    color: '#F97316',
    glow: 'rgba(249,115,22,0.25)',
    border: 'rgba(249,115,22,0.3)',
    bg: 'rgba(249,115,22,0.08)',
    desc: 'Ultra-low latency inference. Sub-500ms responses at scale.',
  },
  cerebras: {
    icon: Cpu,
    color: '#EC4899',
    glow: 'rgba(236,72,153,0.25)',
    border: 'rgba(236,72,153,0.3)',
    bg: 'rgba(236,72,153,0.08)',
    desc: 'Wafer-scale deep reasoning with 120-token/s inference speed.',
  },
  cloudflare: {
    icon: Cloud,
    color: '#F59E0B',
    glow: 'rgba(245,158,11,0.25)',
    border: 'rgba(245,158,11,0.3)',
    bg: 'rgba(245,158,11,0.08)',
    desc: 'Edge-deployed AI across 300+ global data centers.',
  },
  huggingface: {
    icon: Database,
    color: '#FCD34D',
    glow: 'rgba(252,211,77,0.25)',
    border: 'rgba(252,211,77,0.3)',
    bg: 'rgba(252,211,77,0.08)',
    desc: 'The world\'s largest open-source model repository.',
  },
  bytez: {
    icon: Server,
    color: '#34D399',
    glow: 'rgba(52,211,153,0.25)',
    border: 'rgba(52,211,153,0.3)',
    bg: 'rgba(52,211,153,0.08)',
    desc: '220K+ specialized models including niche research models.',
  },
  nvidia: {
    icon: Activity,
    color: '#76B900',
    glow: 'rgba(118,185,0,0.25)',
    border: 'rgba(118,185,0,0.3)',
    bg: 'rgba(118,185,0,0.08)',
    desc: 'NVIDIA NIM microservices for GPU-accelerated inference.',
  },
}

export default function ModelsPage() {
  return (
    <div className="pt-28 pb-20 bg-[#0A0A0F]">
      {/* Hero */}
      <section className="section-padding mb-16 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-[500px] h-[300px] bg-orange-500/8 rounded-full blur-[100px]" />
        </div>
        <div className="container-custom text-center relative z-10">
          <ScrollReveal>
            <span className="inline-block text-xs font-semibold text-accent tracking-widest uppercase mb-5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
              AI Providers
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold tracking-tight leading-[1.1] text-white mb-5">
              Every model,{' '}
              <span
                className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent"
                style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                one platform
              </span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <p className="text-lg text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
              Access 200,000+ AI models from 8+ providers. We automatically route to the best free model
              with intelligent failover.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Live Status Banner */}
      <section className="section-padding mb-12">
        <div className="container-custom">
          <ScrollReveal>
            <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-4 h-4 rounded-full bg-emerald-500/30 animate-ping" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-sm font-medium text-emerald-400">Live System Status</span>
                <span className="text-sm text-[#6B7280]">— All 8 providers operational</span>
              </div>
              <span className="text-xs text-[#6B7280]">Updated 2 min ago</span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Provider Cards */}
      <section className="section-padding mb-16">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {MODELS.map((model, i) => {
              const config = PROVIDER_CONFIG[model.id] || { icon: Server, color: '#9CA3AF', glow: 'rgba(156,163,175,0.2)', border: 'rgba(156,163,175,0.2)', bg: 'rgba(156,163,175,0.05)', desc: '' }
              const Icon = config.icon
              return (
                <ScrollReveal key={model.id} delay={i * 0.08}>
                  <motion.div
                    className="group relative p-6 rounded-2xl border border-white/[0.06] bg-[#0D0D14] h-full"
                    whileHover={{
                      borderColor: config.border,
                      boxShadow: `0 0 40px ${config.glow}`,
                      y: -4,
                      transition: { duration: 0.3 },
                    }}
                  >
                    {/* Provider icon */}
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: config.bg, border: `1px solid ${config.border}` }}
                    >
                      <Icon className="w-7 h-7" style={{ color: config.color }} />
                    </div>

                    <h3 className="text-base font-semibold text-white mb-1">{model.name}</h3>
                    <p className="text-sm text-[#6B7280] mb-1">{model.models} models</p>
                    {config.desc && (
                      <p className="text-xs text-[#4B5563] leading-relaxed mb-4">{config.desc}</p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                      <div className="text-xs text-[#6B7280]">
                        <span className="text-white font-medium">Latency:</span> {model.latency}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                          style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}
                        />
                        Active
                      </div>
                    </div>
                  </motion.div>
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* Routing Intelligence */}
      <section className="section-padding">
        <div className="container-custom">
          <ScrollReveal>
            <div className="rounded-3xl border border-white/[0.06] bg-[#0D0D14] p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-10 items-center">
                <div>
                  <span className="text-xs font-semibold text-accent tracking-widest uppercase mb-4 block">Intelligent Routing</span>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
                    The right model for every task, automatically
                  </h2>
                  <p className="text-[#9CA3AF] leading-relaxed mb-6">
                    CyberCli's AI Gateway automatically selects the optimal model for your query type.
                    Coding tasks route to Groq for speed. Reasoning tasks go to Cerebras for depth.
                    Creative tasks use Gemini for flair. If one provider fails, we instantly failover.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {['Speed Routing', 'Auto-Failover', 'Cost Optimization', 'Context Awareness'].map(f => (
                      <span key={f} className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] text-[#9CA3AF] border border-white/[0.06]">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Coding', provider: 'Groq', why: 'Sub-500ms responses' },
                    { label: 'Reasoning', provider: 'Cerebras', why: 'Deep chain-of-thought' },
                    { label: 'Creative', provider: 'Gemini', why: 'Multimodal flair' },
                    { label: 'Research', provider: 'OpenRouter', why: 'Widest model access' },
                  ].map(route => (
                    <div key={route.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <p className="text-xs text-[#6B7280] mb-1">Task: {route.label}</p>
                      <p className="text-sm font-semibold text-white">{route.provider}</p>
                      <p className="text-xs text-[#4B5563] mt-0.5">{route.why}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
