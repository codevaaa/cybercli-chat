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
  const { session } = useAuthStore()
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const sectionRef = useRef(null)

  const handleMouseMove = (e) => {
    const rect = sectionRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set(e.clientX - rect.left - rect.width / 2)
    mouseY.set(e.clientY - rect.top - rect.height / 2)
  }

  // Animated orb follows mouse
  const orbX = useSpring(useMotionValue(0), { stiffness: 30, damping: 25 })
  const orbY = useSpring(useMotionValue(0), { stiffness: 30, damping: 25 })
  useEffect(() => {
    const unsubX = mouseX.on('change', (v) => orbX.set(v * 0.02))
    const unsubY = mouseY.on('change', (v) => orbY.set(v * 0.02))
    return () => { unsubX(); unsubY() }
  }, [mouseX, mouseY, orbX, orbY])

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center overflow-hidden bg-[#0A0A0F] py-24"
      onMouseMove={handleMouseMove}
    >
      {/* ── Background layers (NO particles) ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Animated gradient orb */}
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] rounded-full blur-[130px]"
          style={{
            background: 'radial-gradient(ellipse, rgba(217,119,87,0.25) 0%, rgba(217,119,87,0.05) 55%, transparent 100%)',
            x: orbX,
            y: orbY,
          }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.6, 0.85, 0.6] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Subtle radial gradient mesh behind text */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 25% 50%, rgba(217,119,87,0.06) 0%, transparent 70%),' +
              'radial-gradient(ellipse 40% 40% at 75% 50%, rgba(217,119,87,0.06) 0%, transparent 70%)',
          }}
        />

        {/* Grid line pattern (CSS only) */}
        <div
          className="absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(217,119,87,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(217,119,87,0.35) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 section-padding pt-20 pb-16 w-full">
        <div className="container-custom">
          {/* Desktop: two-column split | Mobile: stacked */}
          <div className="relative grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* ── Large decorative Sudarshan Chakra watermark (desktop only) ── */}
            <div
              className="hidden lg:block absolute pointer-events-none"
              style={{
                right: '-40px',
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: 0.06,
                zIndex: 1,
              }}
            >
              <CyberCliMark size={360} />
            </div>

            {/* ── LEFT: copy ── */}
            <div>
              {/* Badge pill */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="mb-6"
              >
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/8 border border-accent/15 backdrop-blur-sm">
                  <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
                  <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                    Introducing Council Mode — 3 models debate, 1 synthesis
                  </span>
                </div>
              </motion.div>

              {/* Small animated Sudarshan Chakra above headline */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
                className="mb-4"
              >
                <CyberCliMark size={64} />
              </motion.div>

              {/* Headline */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="mb-6"
              >
                <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold tracking-[-0.03em] leading-[1.08] text-white">
                  <span className="font-serif italic font-normal text-white/50 block">
                    Deliberate with the
                  </span>
                  <span
                    className="block mt-1"
                    style={{
                      background: 'linear-gradient(135deg, #F4A37A 0%, #D97757 40%, #E8A590 80%, #B85D3D 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Council of AI Experts
                  </span>
                </h1>
              </motion.div>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="text-base sm:text-lg text-[#9CA3AF] max-w-xl mb-10 leading-relaxed font-light"
              >
                Access 8+ premier models, stream multi-model consensus debates, branch
                timelines, and experience natural voice responses — all completely free.
              </motion.p>

              {/* CTA buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-wrap gap-4"
              >
                <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/auth/signup"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
                    style={{
                      background: 'linear-gradient(135deg, #D97757 0%, #B85D3D 100%)',
                      boxShadow: '0 8px 28px rgba(217,119,87,0.35)',
                    }}
                  >
                    Start for Free
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    to="/features"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/[0.2] transition-all duration-300"
                  >
                    Explore Features
                  </Link>
                </motion.div>
              </motion.div>
            </div>

            {/* ── RIGHT: Mock chat panel (hidden on mobile) ── */}
            <div className="hidden lg:block">
              <MockChatPanel mouseX={mouseX} mouseY={mouseY} />
            </div>
          </div>

          {/* ── Floating parallax cards (decorative, desktop only) ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="relative h-40 mt-8 hidden md:block lg:hidden"
          >
            {MOCK_MESSAGES.map((card) => (
              <FloatingCard key={card.id} card={card} mouseX={mouseX} mouseY={mouseY} />
            ))}
          </motion.div>

          {/* ── Stats row ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mt-16"
          >
            {STATS.map((stat, i) => (
              <StatCard key={stat.label} stat={stat} delay={i * 150} />
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A0A0F] to-transparent z-10 pointer-events-none" />
    </section>
  )
}
