import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { 
  Brain, Zap, Cpu, Network, Sparkles, ArrowRight, 
  GitMerge, MessagesSquare, Timer, Shield, Globe, 
  Layers, CheckCircle2, GitBranch
} from 'lucide-react'
import CouncilFlowVisualization from '@components/landing/CouncilFlowVisualization'

const FADE_UP = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 1) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  })
}

const SECTION_MODELS = [
  {
    provider: 'Google Gemini',
    model: 'Gemini 2.5 Flash',
    role: 'Creative Strategist',
    emoji: '🧠',
    color: '#4285F4',
    desc: 'Frontier-class model with 1,500 free requests/day. Holistic, innovative thinking for novel approaches.',
    speed: '~2.1s',
    strength: 'Creativity & Strategy',
  },
  {
    provider: 'Mistral AI',
    model: 'Mistral Large',
    role: 'Technical Architect',
    emoji: '⚙️',
    color: '#FF7000',
    desc: 'European AI leader delivering structured, precise, methodical reasoning with step-by-step breakdowns.',
    speed: '~2.8s',
    strength: 'Technical Depth',
  },
  {
    provider: 'Groq',
    model: 'Llama 3.3 70B',
    role: 'Factual Analyst',
    emoji: '⚡',
    color: '#F5415F',
    desc: '300+ tokens/second on custom LPU hardware. Blazing fast factual accuracy with concise outputs.',
    speed: '~1.5s',
    strength: 'Speed & Facts',
  },
  {
    provider: 'OpenRouter',
    model: 'GPT-4o Mini',
    role: 'Comprehensive Expert',
    emoji: '🔬',
    color: '#10A37F',
    desc: 'Deep multidisciplinary analysis via OpenRouter free tier. Considers all angles and trade-offs.',
    speed: '~2.4s',
    strength: 'Nuanced Analysis',
  },
]

const STEPS = [
  {
    num: '01',
    title: 'Your Question Enters',
    desc: 'You type a question in the chat. The Council Engine immediately captures your intent, context, and conversation history.',
    icon: MessagesSquare,
  },
  {
    num: '02',
    title: 'Prompt Router Splits It',
    desc: 'The engine rephrases your single question into 4 specialized prompts — each optimized for a different AI personality and reasoning style.',
    icon: GitBranch,
  },
  {
    num: '03',
    title: '4 Models Fire in Parallel',
    desc: 'Gemini, Mistral, Llama, and GPT-4o Mini all receive their tailored prompts simultaneously across 4 different providers.',
    icon: Network,
  },
  {
    num: '04',
    title: 'Replies Are Collected',
    desc: 'Each model returns its unique perspective. If any model fails or times out, the engine gracefully continues with the remaining responses.',
    icon: Layers,
  },
  {
    num: '05',
    title: 'Synthesizer Merges Everything',
    desc: 'Gemini 2.5 Pro reads all 4 expert analyses, resolves contradictions, eliminates redundancy, and crafts one unified best answer.',
    icon: GitMerge,
  },
  {
    num: '06',
    title: 'One Best Reply Delivered',
    desc: 'You receive a single comprehensive, well-structured response — not 4 separate answers. The whole process takes ~10 seconds.',
    icon: Sparkles,
  },
]

function ScrollReveal({ children, delay = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={FADE_UP}
      custom={delay}
    >
      {children}
    </motion.div>
  )
}

export default function CouncilModePage() {
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll()
  const heroOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0])
  const heroY = useTransform(scrollYProgress, [0, 0.08], [0, -40])

  return (
    <div ref={containerRef} className="bg-[#0a0a0f] text-white min-h-screen overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-28">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#D97757]/10 rounded-full blur-[120px] opacity-40" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#7C3AED]/10 rounded-full blur-[100px] opacity-30" />
        </div>

        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="relative z-10 container-custom max-w-5xl mx-auto text-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-[#D97757] mb-8"
          >
            <Brain className="w-4 h-4" />
            <span>Multi-Model Ensemble Intelligence</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-semibold tracking-tight leading-[1.1] mb-6"
          >
            Council Mode
            <span className="block text-[#D97757]">Panchayat</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="text-lg sm:text-xl text-[#a3a3a3] max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Four expert AI minds analyze your question from different angles, then synthesize 
            one definitive answer. Not side-by-side comparisons — one best reply.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#D97757] hover:bg-[#e08f75] text-white font-medium rounded-lg transition-colors"
            >
              Try Council Mode
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-lg transition-colors"
            >
              See How It Works
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
          >
            {[
              { label: 'AI Models', value: '4', icon: Cpu },
              { label: 'Providers', value: '4', icon: Globe },
              { label: 'Avg Response', value: '~10s', icon: Timer },
              { label: 'Free Tier', value: '100%', icon: Shield },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <stat.icon className="w-5 h-5 text-[#D97757] mx-auto mb-2" />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-[#888888] mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── ANIMATED FLOW VISUALIZATION ── */}
      <section id="how-it-works" className="py-20 lg:py-28 relative">
        <div className="container-custom max-w-6xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
                How Council Mode Works
              </h2>
              <p className="text-[#a3a3a3] text-lg max-w-2xl mx-auto">
                A 6-step pipeline that transforms your question into a synthesized expert answer — all in ~10 seconds.
              </p>
            </div>
          </ScrollReveal>

          <CouncilFlowVisualization />
        </div>
      </section>

      {/* ── DETAILED STEPS ── */}
      <section className="py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="container-custom max-w-5xl mx-auto px-4">
          <div className="space-y-24">
            {STEPS.map((step, idx) => (
              <ScrollReveal key={step.num} delay={0.1}>
                <div className={`flex flex-col lg:flex-row gap-8 lg:gap-16 items-start ${idx % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-5xl font-bold text-[#D97757]/30">{step.num}</span>
                      <step.icon className="w-6 h-6 text-[#D97757]" />
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-semibold mb-4">{step.title}</h3>
                    <p className="text-[#a3a3a3] text-lg leading-relaxed">{step.desc}</p>
                  </div>
                  <div className="flex-1 w-full lg:w-auto">
                    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-6 lg:p-8">
                      {idx === 0 && (
                        <div className="space-y-3">
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-[#15151a] border border-white/[0.06]">
                            <div className="w-7 h-7 rounded-full bg-[#D97757]/20 flex items-center justify-center text-xs font-bold text-[#D97757]">U</div>
                            <p className="text-sm text-[#e5e5e5]">How do I secure my web application against XSS and CSRF attacks?</p>
                          </div>
                        </div>
                      )}
                      {idx === 1 && (
                        <div className="space-y-2">
                          {['Creative Strategist asks: "What innovative defense strategies exist for modern web apps?"',
                            'Technical Architect asks: "What are the step-by-step implementation details for XSS/CSRF mitigation?"',
                            'Factual Analyst asks: "What are the most common XSS/CSRF vulnerabilities and their fixes?"',
                            'Comprehensive Expert asks: "What is the complete landscape of web application security against injection attacks?"'
                          ].map((q, i) => (
                            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-[#15151a] border border-white/[0.06]">
                              <GitBranch className="w-4 h-4 text-[#D97757] mt-0.5 shrink-0" />
                              <p className="text-xs text-[#a3a3a3]">{q}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {idx === 2 && (
                        <div className="grid grid-cols-2 gap-3">
                          {SECTION_MODELS.map((m, i) => (
                            <div key={i} className="p-3 rounded-lg bg-[#15151a] border border-white/[0.06] text-center">
                              <div className="text-2xl mb-1">{m.emoji}</div>
                              <div className="text-xs font-semibold text-white">{m.model}</div>
                              <div className="text-[10px] text-[#888888]">{m.provider}</div>
                              <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px]">
                                <Zap className="w-3 h-3" /> Active
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {idx === 3 && (
                        <div className="space-y-2">
                          {SECTION_MODELS.map((m, i) => (
                            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-[#15151a] border border-white/[0.06]">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{m.emoji}</span>
                                <span className="text-xs font-medium text-white">{m.model}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                <span className="text-[10px] text-green-400">{m.speed}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {idx === 4 && (
                        <div className="p-4 rounded-lg bg-[#15151a] border border-[#D97757]/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Brain className="w-5 h-5 text-[#D97757]" />
                            <span className="text-sm font-semibold text-[#D97757]">Gemini 2.5 Pro — Synthesis Engine</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-[#888888]">
                              <CheckCircle2 className="w-3 h-3 text-green-400" /> Merge overlapping insights
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[#888888]">
                              <CheckCircle2 className="w-3 h-3 text-green-400" /> Resolve contradictions
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[#888888]">
                              <CheckCircle2 className="w-3 h-3 text-green-400" /> Eliminate redundancy
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[#888888]">
                              <CheckCircle2 className="w-3 h-3 text-green-400" /> One coherent voice
                            </div>
                          </div>
                        </div>
                      )}
                      {idx === 5 && (
                        <div className="p-4 rounded-lg bg-[#15151a] border border-white/[0.06]">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-5 h-5 text-[#D97757]" />
                            <span className="text-sm font-semibold text-white">Final Synthesized Answer</span>
                          </div>
                          <p className="text-xs text-[#a3a3a3] leading-relaxed">
                            To secure your web app against XSS and CSRF, implement Content Security Policy (CSP) headers, 
                            use parameterized queries to prevent SQL injection, validate all user input on both client and 
                            server sides, employ CSRF tokens for state-changing operations, and use modern frameworks 
                            like React or Vue that automatically escape content...
                          </p>
                          <div className="mt-3 flex items-center gap-2 text-[10px] text-[#888888]">
                            <Timer className="w-3 h-3" />
                            Generated in 9.4s from 4 expert analyses
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE 4 MODELS ── */}
      <section className="py-20 lg:py-28 border-t border-white/[0.06] bg-white/[0.01]">
        <div className="container-custom max-w-6xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
                The Four Council Members
              </h2>
              <p className="text-[#a3a3a3] text-lg max-w-2xl mx-auto">
                Each model brings a unique specialty. Together, they cover every dimension of intelligence.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SECTION_MODELS.map((model, idx) => (
              <ScrollReveal key={model.model} delay={idx * 0.1}>
                <div className="group relative p-6 lg:p-8 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/20 transition-all duration-300 hover:bg-white/[0.05]">
                  <div 
                    className="absolute top-0 left-0 w-full h-1 rounded-t-2xl opacity-60 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: model.color }}
                  />
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-3xl">{model.emoji}</span>
                      <h3 className="text-xl font-semibold mt-2">{model.model}</h3>
                      <p className="text-sm text-[#888888]">{model.provider} — {model.role}</p>
                    </div>
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${model.color}15` }}
                    >
                      <Cpu className="w-5 h-5" style={{ color: model.color }} />
                    </div>
                  </div>
                  <p className="text-[#a3a3a3] text-sm leading-relaxed mb-4">{model.desc}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 text-[#888888]">
                      <Timer className="w-3 h-3" /> {model.speed}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 text-[#888888]">
                      <Shield className="w-3 h-3" /> {model.strength}
                    </span>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="container-custom max-w-3xl mx-auto px-4 text-center">
          <ScrollReveal>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-6">
              Ready to experience
              <span className="text-[#D97757]"> Council Mode?</span>
            </h2>
            <p className="text-lg text-[#a3a3a3] mb-8 max-w-xl mx-auto">
              Select <strong className="text-white">Panchayat</strong> from the model selector in chat. 
              No extra setup. No extra cost. Just one best answer.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/chat"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#D97757] hover:bg-[#e08f75] text-white font-semibold rounded-xl transition-colors text-lg"
              >
                Open Chat
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/features"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-colors text-lg"
              >
                Explore All Features
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
