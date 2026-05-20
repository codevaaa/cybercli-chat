import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { ArrowRight, Sparkles, Zap, Cpu, Mic, Send, Play } from 'lucide-react'
import ParticleBackground from './ParticleBackground'
import { useAuthStore } from '../../stores/authStore'

// Animated counter hook
function useCounter(target, duration = 2000, delay = 0) {
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

function FloatingCard({ card, mouseX, mouseY }) {
  const x = useSpring(useMotionValue(0), { stiffness: 50, damping: 20 })
  const y = useSpring(useMotionValue(0), { stiffness: 50, damping: 20 })

  useEffect(() => {
    const unsubX = mouseX.on('change', (val) => x.set(val * 0.05 * (card.id % 2 === 0 ? 1 : -1)))
    const unsubY = mouseY.on('change', (val) => y.set(val * 0.04 * (card.id % 2 === 0 ? -1 : 1)))
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
            ? 'border-violet-500/30 bg-violet-900/20 shadow-[0_0_20px_rgba(124,58,237,0.15)]'
            : card.role === 'ai'
            ? 'border-white/[0.08] bg-[#0D0D14]/80 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
            : 'border-accent/30 bg-accent/10'
        }`}
      >
        {card.model && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${card.council ? 'bg-violet-400' : 'bg-emerald-400'}`} />
            <span className={`text-[10px] font-medium ${card.council ? 'text-violet-400' : 'text-emerald-400'}`}>
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

const STATS = [
  { suffix: '+', value: 8, label: 'AI Providers', icon: Cpu },
  { suffix: 'K+', value: 200, label: 'Free Models', icon: Sparkles },
  { suffix: '%', value: 100, label: 'Free to Start', icon: Zap },
  { suffix: '', value: 5, label: 'Unique Voices', icon: Mic },
]

export default function HeroSection() {
  const [prompt, setPrompt] = useState('')
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

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!prompt.trim()) return
    sessionStorage.setItem('pending_prompt', prompt.trim())
    navigate('/chat')
  }

  // Animated orb
  const orbX = useSpring(useMotionValue(0), { stiffness: 30, damping: 25 })
  const orbY = useSpring(useMotionValue(0), { stiffness: 30, damping: 25 })

  useEffect(() => {
    const unsubX = mouseX.on('change', v => orbX.set(v * 0.02))
    const unsubY = mouseY.on('change', v => orbY.set(v * 0.02))
    return () => { unsubX(); unsubY() }
  }, [mouseX, mouseY, orbX, orbY])

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0A0A0F] py-24"
      onMouseMove={handleMouseMove}
    >
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#0A0A0F]/95 to-[#0A0A0F]" />
        <ParticleBackground />
        {/* Animated gradient orb */}
        <motion.div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-[120px] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, rgba(217,119,87,0.08) 50%, transparent 100%)',
            x: orbX,
            y: orbY,
          }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.6, 0.8, 0.6],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(rgba(217,119,87,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(217,119,87,0.3) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      <div className="relative z-10 section-padding pt-20 pb-16 w-full">
        <div className="container-custom max-w-4xl mx-auto text-center">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6 flex flex-col items-center justify-center gap-3"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/8 border border-accent/15 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                Introducing Council Mode — 3 models debate, 1 synthesis
              </span>
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6"
          >
            <h1 className="text-[clamp(2.5rem,5.5vw,5rem)] font-extrabold tracking-[-0.03em] leading-[1.08] text-white">
              <span className="font-serif italic font-normal text-white/50 block">Deliberate with the</span>
              <span
                className="block mt-0.5 bg-gradient-to-r from-orange-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent"
                style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
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
            className="text-base sm:text-lg text-[#9CA3AF] max-w-xl mx-auto mb-10 leading-relaxed font-light"
          >
            Access 8+ premier models, stream multi-model consensus debates, branch timelines,
            and experience ElevenLabs natural voice responses in a unified platform.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center justify-center gap-4 mb-10"
          >
            <motion.a
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-900/30 transition-all duration-300"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              Start for Free
              <ArrowRight className="w-4 h-4" />
            </motion.a>
            <motion.button
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/[0.2] transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/features')}
            >
              <Play className="w-4 h-4 text-accent" />
              Watch Demo
            </motion.button>
          </motion.div>

          {/* Floating preview cards (decorative) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="relative h-48 mb-8 hidden md:block"
          >
            {MOCK_MESSAGES.map(card => (
              <FloatingCard key={card.id} card={card} mouseX={mouseX} mouseY={mouseY} />
            ))}
          </motion.div>

          {/* Chat input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl mx-auto mb-14 w-full px-2"
          >
            <form
              onSubmit={handleSubmit}
              className="relative bg-[#0D0D14] border border-white/[0.08] rounded-2xl p-2.5 shadow-[0_0_40px_rgba(0,0,0,0.4)] focus-within:border-violet-500/40 transition-all duration-300"
            >
              <div className="flex items-end gap-2.5">
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                  placeholder="Ask the Council to debug code, analyze a vulnerability, or resolve a debate..."
                  rows={2}
                  className="flex-1 bg-transparent text-white text-sm sm:text-base resize-none py-2 px-2 focus:outline-none min-h-[50px] max-h-32 placeholder-gray-600"
                />
                <motion.button
                  type="submit"
                  disabled={!prompt.trim()}
                  className="p-3 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
            </form>
            <div className="flex justify-center items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs text-[#4B5563]">Try:</span>
              {['Analyze this CVE', 'Compare React & Vue routing', 'Explain zero-trust'].map(s => (
                <button
                  key={s}
                  onClick={() => setPrompt(s)}
                  className="text-xs text-accent hover:underline bg-accent/5 px-2 py-0.5 rounded-md border border-accent/10 hover:bg-accent/10 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {STATS.map((stat, i) => {
              const { count, ref } = useCounter(stat.value, 1800, i * 150)
              return (
                <div
                  key={stat.label}
                  ref={ref}
                  className="bg-white/[0.02] border border-white/[0.06] p-5 rounded-2xl text-center hover:border-white/[0.12] transition-all duration-300 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/8 flex items-center justify-center mx-auto mb-3 group-hover:bg-accent/12 transition-colors">
                    <stat.icon className="w-5 h-5 text-accent" />
                  </div>
                  <div className="text-xl font-bold text-white mb-0.5">
                    {count}{stat.suffix}
                  </div>
                  <div className="text-xs text-[#6B7280]">{stat.label}</div>
                </div>
              )
            })}
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A0A0F] to-transparent z-10 pointer-events-none" />
    </section>
  )
}
