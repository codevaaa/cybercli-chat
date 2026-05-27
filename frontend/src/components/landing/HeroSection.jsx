import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { ArrowRight, Sparkles, Cpu, Mic, Zap, ExternalLink } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { CyberCliMark } from '../../components/ui/CyberCliLogo'

/* ─── Animated counter hook ─────────────────────────────────── */
function useCounter(target, duration = 1800, delay = 0) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true) },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    const timer = setTimeout(() => {
      const startTime = Date.now()
      const tick = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setCount(Math.floor(eased * target))
        if (progress < 1) requestAnimationFrame(tick)
        else setCount(target)
      }
      requestAnimationFrame(tick)
    }, delay)
    return () => clearTimeout(timer)
  }, [started, target, duration, delay])

  return { count, ref }
}

/* ─── Mock chat messages ────────────────────────────────────── */
const MOCK_MESSAGES = [
  {
    id: 1,
    role: 'user',
    content: 'Explain zero-trust architecture',
    x: -20,
    y: -30,
    scale: 0.95,
  },
  {
    id: 2,
    role: 'ai',
    model: 'Groq • LLaMA-3',
    content: 'Zero-trust operates on "never trust, always verify" — every request is authenticated regardless of network origin...',
    x: 30,
    y: 20,
    scale: 1,
  },
  {
    id: 3,
    role: 'ai',
    model: 'Council Mode',
    content: '3 models debated. Consensus: Start with identity, then network segmentation.',
    x: -15,
    y: 60,
    scale: 0.9,
    council: true,
  },
]

/* ─── Floating parallax card ────────────────────────────────── */
function FloatingCard({ card, mouseX, mouseY }) {
  const x = useSpring(useMotionValue(0), { stiffness: 50, damping: 20 })
  const y = useSpring(useMotionValue(0), { stiffness: 50, damping: 20 })

  useEffect(() => {
    const unsubX = mouseX.on('change', (val) =>
      x.set(val * 0.05 * (card.id % 2 === 0 ? 1 : -1))
    )
    const unsubY = mouseY.on('change', (val) =>
      y.set(val * 0.04 * (card.id % 2 === 0 ? -1 : 1))
    )
    return () => { unsubX(); unsubY() }
  }, [mouseX, mouseY, card.id, x, y])

  return (
    <motion.div
      className="absolute select-none pointer-events-none"
      style={{
        left: `calc(50% + ${card.x}px)`,
        top: `calc(50% + ${card.y}px)`,
        x,
        y,
        scale: card.scale,
        zIndex: card.id,
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: card.scale }}
      transition={{ duration: 0.8, delay: 0.5 + card.id * 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className={`rounded-xl border p-3 backdrop-blur-sm max-w-[220px] text-xs ${
          card.council
            ? 'border-orange-500/30 bg-orange-950/20 shadow-[0_0_20px_rgba(217,119,87,0.15)]'
            : card.role === 'ai'
            ? 'border-white/[0.08] bg-[#0D0D14]/80 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
            : 'border-accent/30 bg-accent/10'
        }`}
      >
        {card.model && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${card.council ? 'bg-orange-400' : 'bg-emerald-400'}`} />
            <span className={`text-[10px] font-medium ${card.council ? 'text-orange-400' : 'text-emerald-400'}`}>
              {card.model}
            </span>
          </div>
        )}
        <p className={`leading-relaxed ${card.role === 'user' ? 'text-accent font-medium' : 'text-[#9CA3AF]'}`}>
          {card.content}
        </p>
      </div>
    </motion.div>
  )
}

/* ─── Typing animation for the mock chat panel ──────────────── */
function TypingDots() {
  return (
    <div className="flex gap-1 items-center py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-orange-400"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  )
}

/* Chat panel mock messages */
const PANEL_MESSAGES = [
  { role: 'user', text: 'Analyse the CVE-2024-3094 backdoor' },
  { role: 'ai', model: 'Groq • Llama-3', text: 'The XZ Utils backdoor (CVE-2024-3094) was a supply-chain attack targeting liblzma, affecting systemd-linked SSH daemons on select Linux distributions...' },
  { role: 'council', model: 'Council Mode', text: '3 models debated. Consensus: Immediate patch + audit your liblzma dependency chain.' },
]

function MockChatPanel({ mouseX, mouseY }) {
  const panelX = useSpring(useMotionValue(0), { stiffness: 35, damping: 22 })
  const panelY = useSpring(useMotionValue(0), { stiffness: 35, damping: 22 })

  useEffect(() => {
    const unsubX = mouseX.on('change', (v) => panelX.set(v * 0.015))
    const unsubY = mouseY.on('change', (v) => panelY.set(v * 0.01))
    return () => { unsubX(); unsubY() }
  }, [mouseX, mouseY, panelX, panelY])

  return (
    <motion.div
      className="relative w-full max-w-md mx-auto lg:mx-0"
      style={{ x: panelX, y: panelY }}
      initial={{ opacity: 0, x: 40, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.85, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Glow behind panel */}
      <div
        className="absolute -inset-6 rounded-3xl blur-[60px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(217,119,87,0.22) 0%, rgba(217,119,87,0.08) 60%, transparent 100%)' }}
      />

      {/* Card */}
      <div className="relative bg-[#0D0D14] border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-[11px] text-[#4B5563] flex-1 text-center font-medium tracking-wide">
            Council Chat
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-[#374151]" />
        </div>

        {/* Messages */}
        <div className="p-4 space-y-3">
          {PANEL_MESSAGES.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 + i * 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {msg.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-accent/15 border border-accent/20 rounded-xl rounded-tr-sm px-3 py-2 text-xs text-accent font-medium">
                    {msg.text}
                  </div>
                </div>
              ) : msg.role === 'council' ? (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-950/60 border border-orange-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[8px] font-bold text-orange-400">3×</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      <span className="text-[10px] font-semibold text-orange-400">{msg.model}</span>
                    </div>
                    <div className="bg-orange-950/20 border border-orange-500/20 rounded-xl rounded-tl-sm px-3 py-2 text-xs text-orange-200">
                      {msg.text}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[8px] font-bold text-emerald-400">AI</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] font-semibold text-emerald-400">{msg.model}</span>
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl rounded-tl-sm px-3 py-2 text-xs text-[#9CA3AF] leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {/* Typing indicator */}
          <motion.div
            className="flex gap-2 items-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.1 }}
          >
            <div className="w-6 h-6 rounded-full bg-[#1a1a2e] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] font-bold text-[#6B7280]">AI</span>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl rounded-tl-sm px-3 py-2">
              <TypingDots />
            </div>
          </motion.div>
        </div>

        {/* Input bar */}
        <div className="mx-4 mb-4 flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5">
          <span className="text-xs text-[#374151] flex-1">Ask the Council...</span>
          <div className="w-6 h-6 rounded-lg bg-orange-600/80 flex items-center justify-center">
            <ArrowRight className="w-3 h-3 text-white" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Stats data ────────────────────────────────────────────── */
const STATS = [
  { suffix: '+',  value: 8,   label: '8+ Providers',    icon: Cpu },
  { suffix: 'K+', value: 200, label: '200K+ Models',    icon: Sparkles },
  { suffix: '%',  value: 100, label: '100% Free',       icon: Zap },
  { suffix: '',   value: 5,   label: '5 Voices',        icon: Mic },
]

/* ─── StatCard — uses hook inside its own component to avoid Rules-of-Hooks violation ── */
function StatCard({ stat, delay }) {
  const { count, ref } = useCounter(stat.value, 1800, delay)
  const Icon = stat.icon
  return (
    <div
      ref={ref}
      className="bg-white/[0.02] border border-white/[0.06] p-5 rounded-2xl text-center hover:border-white/[0.12] transition-all duration-300 group"
    >
      <div className="w-10 h-10 rounded-xl bg-accent/8 flex items-center justify-center mx-auto mb-3 group-hover:bg-accent/12 transition-colors">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <div className="text-xl font-bold text-white mb-0.5">
        {count}{stat.suffix}
      </div>
      <div className="text-xs text-[#6B7280]">{stat.label}</div>
    </div>
  )
}

/* ─── Main HeroSection ──────────────────────────────────────── */
export default function HeroSection() {
  const navigate = useNavigate()
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const sectionRef = useRef(null)

  const handleMouseMove = (e) => {
    const rect = sectionRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set(e.clientX - rect.left - rect.width / 2)
    mouseY.set(e.clientY - rect.top - rect.height / 2)
  }

  const orbX = useSpring(useMotionValue(0), { stiffness: 20, damping: 20 })
  const orbY = useSpring(useMotionValue(0), { stiffness: 20, damping: 20 })
  
  useEffect(() => {
    const unsubX = mouseX.on('change', (v) => orbX.set(v * 0.03))
    const unsubY = mouseY.on('change', (v) => orbY.set(v * 0.03))
    return () => { unsubX(); unsubY() }
  }, [mouseX, mouseY, orbX, orbY])

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background-primary pt-32 pb-24"
      onMouseMove={handleMouseMove}
    >
      {/* ── Immersive Background ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Dynamic mesh gradient orb */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] opacity-40 mix-blend-screen"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, rgba(217,119,87,0.2) 40%, transparent 70%)',
            x: orbX,
            y: orbY,
          }}
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(var(--foreground-primary) 1px, transparent 1px), linear-gradient(90deg, var(--foreground-primary) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)'
          }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 w-full container-custom flex flex-col items-center text-center">
        
        {/* Top Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 backdrop-blur-md shadow-[0_0_30px_rgba(217,119,87,0.15)] cursor-pointer hover:bg-accent/15 transition-all"
        >
          <Sparkles className="w-4 h-4 text-accent animate-pulse" />
          <span className="text-sm font-semibold text-accent tracking-wide">
            Next-Gen AI Workspace
          </span>
          <ArrowRight className="w-4 h-4 text-accent/70" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-[clamp(3rem,8vw,6rem)] font-extrabold tracking-tight leading-[1.05] max-w-5xl text-foreground-primary mb-6"
        >
          The intelligent <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-[#F4A37A] to-accent bg-[length:200%_auto] animate-gradient-x">
            supercomputer
          </span>
          {' '}for your mind.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg md:text-xl text-foreground-muted max-w-2xl mb-12 font-medium leading-relaxed"
        >
          CyberCli brings 200K+ elite AI models into a single, unified interface. Experience ultra-fast streaming, Council Mode debates, and stunning aesthetics.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center gap-4 mb-20"
        >
          <Link
            to="/auth/signup"
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-white bg-accent overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(217,119,87,0.4)]"
          >
            <span className="relative z-10 text-lg">Launch CyberCli</span>
            <ArrowRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />
          </Link>
          
          <Link
            to="/features"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-foreground-primary bg-background-secondary border border-border-subtle hover:bg-background-tertiary hover:border-border-medium transition-all"
          >
            Explore Capabilities
          </Link>
        </motion.div>

        {/* Centerpiece Showcase Panel */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-4xl relative"
        >
          {/* Glass panel wrapper */}
          <div className="relative rounded-3xl border border-white/10 bg-background-primary/40 backdrop-blur-3xl overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border-subtle bg-background-secondary/50">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="mx-auto flex items-center gap-2 px-3 py-1 bg-background-primary rounded-md border border-border-subtle">
                <Sparkles className="w-3 h-3 text-accent" />
                <span className="text-xs font-medium text-foreground-secondary">cybercli.ai / workspace</span>
              </div>
            </div>
            
            {/* Mock content inside the glass pane */}
            <div className="p-8 text-left space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-accent" />
                </div>
                <div className="pt-2">
                  <p className="text-foreground-primary font-medium">Design a resilient microservices architecture for a global SaaS.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-background-secondary border border-border-subtle flex items-center justify-center shrink-0 shadow-inner">
                  <CyberCliMark size={20} />
                </div>
                <div className="bg-background-secondary border border-border-subtle rounded-2xl rounded-tl-sm p-5 w-full">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-accent">Council Mode</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-background-tertiary text-foreground-muted">GPT-4o + Claude 3.5 Sonnet + Gemini 1.5 Pro</span>
                  </div>
                  <p className="text-foreground-secondary leading-relaxed mb-4">
                    Based on our multi-model consensus, here is a highly resilient, globally distributed microservices architecture tailored for high availability and low latency:
                  </p>
                  <div className="space-y-3">
                    <div className="h-2 bg-background-tertiary rounded-full w-3/4 animate-pulse" />
                    <div className="h-2 bg-background-tertiary rounded-full w-5/6 animate-pulse" />
                    <div className="h-2 bg-background-tertiary rounded-full w-2/3 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Accents around panel */}
          <motion.div
            style={{ x: orbX, y: orbY }}
            className="absolute -right-12 -top-12 z-20"
          >
            <div className="p-4 rounded-2xl bg-background-secondary/80 backdrop-blur-xl border border-border-subtle shadow-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground-primary">Ultra-fast</p>
                <p className="text-xs text-foreground-muted">~200ms TTFT</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            style={{ x: useSpring(useMotionValue(0), { stiffness: 15, damping: 25 }), y: useSpring(useMotionValue(0), { stiffness: 15, damping: 25 }) }}
            className="absolute -left-12 bottom-12 z-20"
          >
            <div className="p-4 rounded-2xl bg-background-secondary/80 backdrop-blur-xl border border-border-subtle shadow-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground-primary">200K+ Models</p>
                <p className="text-xs text-foreground-muted">Via OpenRouter</p>
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>
      
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background-primary to-transparent z-10 pointer-events-none" />
    </section>
  )
}
