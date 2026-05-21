import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowRight, Zap, Shield, Sparkles, Cpu, Loader2, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore.js'

const FEATURES = [
  { icon: Sparkles, text: '8+ AI providers in one unified interface' },
  { icon: Shield, text: 'Enterprise-grade security & privacy' },
  { icon: Cpu, text: 'Council Mode — multi-model synthesis' },
]

function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between relative overflow-hidden bg-[#0A0A0F] w-[45%] min-h-screen p-12 flex-shrink-0">
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)' }}
      />
      <div className="relative z-10">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7C3AED] flex items-center justify-center shadow-[0_0_24px_rgba(124,58,237,0.5)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">CyberCli</span>
        </Link>
      </div>

      <div className="relative z-10 flex flex-col gap-6">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Passwordless.<br />
            <span style={{ background: 'linear-gradient(135deg, #7C3AED, #D97757)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Effortless access.
            </span>
          </h2>
          <p className="text-[#94a3b8] text-base leading-relaxed">
            One click from your inbox. No password to remember, no friction.
          </p>
        </motion.div>
        <div className="flex flex-col gap-4">
          {FEATURES.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.12 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-[rgba(124,58,237,0.15)] border border-[rgba(124,58,237,0.25)] flex items-center justify-center flex-shrink-0">
                <f.icon className="w-4 h-4 text-[#a78bfa]" />
              </div>
              <span className="text-[#cbd5e1] text-sm">{f.text}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="relative z-10 text-[#475569] text-xs"
      >
        © 2026 CyberCli. The future of AI interaction.
      </motion.p>
    </div>
  )
}

function AnimatedInput({ icon: Icon, label, type, value, onChange, placeholder, required, id }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[#cbd5e1] mb-2">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b] pointer-events-none" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          required={required}
          className="w-full pl-11 pr-4 py-3 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white text-sm focus:outline-none transition-colors placeholder:text-[#475569]"
          style={{ borderColor: focused ? '#7C3AED' : undefined }}
        />
        <motion.div className="absolute bottom-0 left-0 h-[2px] rounded-full"
          style={{ background: 'linear-gradient(90deg, #7C3AED, #D97757)' }}
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: focused ? 1 : 0 }}
          transition={{ duration: 0.25 }}
        />
      </div>
    </div>
  )
}

function ShimmerButton({ children, disabled, type = 'button' }) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.015 }}
      whileTap={{ scale: disabled ? 1 : 0.985 }}
      className="relative overflow-hidden w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #D97757 100%)' }}
    >
      <motion.div
        className="absolute inset-0 opacity-0"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)' }}
        animate={{ opacity: [0, 1, 0], x: ['-100%', '100%', '200%'] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
      />
      {children}
    </motion.button>
  )
}

export default function MagicLinkPage() {
  const { signInWithMagicLink, loading, error, clearError } = useAuthStore()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    const result = await signInWithMagicLink(email)
    if (result.success) setSent(true)
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0F]">
      <BrandPanel />

      <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <motion.div className="w-full max-w-md"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link to="/" className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">CyberCli</span>
          </Link>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                {/* Animated mail icon with pulse rings */}
                <div className="relative w-28 h-28 mx-auto mb-8 flex items-center justify-center">
                  <motion.div className="absolute w-28 h-28 rounded-full border border-[#7C3AED]/30"
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                  />
                  <motion.div className="absolute w-20 h-20 rounded-full border border-[#7C3AED]/50"
                    animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
                  />
                  <div className="w-16 h-16 rounded-2xl bg-[rgba(124,58,237,0.15)] border border-[rgba(124,58,237,0.3)] flex items-center justify-center">
                    <motion.div
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Mail className="w-8 h-8 text-[#a78bfa]" />
                    </motion.div>
                  </div>
                </div>

                <h1 className="text-2xl font-bold text-white mb-3">Magic link sent!</h1>
                <p className="text-[#64748b] text-sm mb-2">We sent a secure login link to</p>
                <p className="text-[#a78bfa] text-sm font-medium mb-4">{email}</p>
                <p className="text-[#475569] text-xs mb-8 leading-relaxed">
                  Click the link in your email to sign in instantly.<br />
                  No password required. Link expires in 10 minutes.
                </p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => setSent(false)}
                    className="w-full py-3 rounded-lg border border-[rgba(255,255,255,0.08)] text-[#94a3b8] text-sm hover:border-[#7C3AED] hover:text-white transition-all"
                  >
                    Use a different email
                  </button>
                  <Link to="/auth/login" className="text-center text-xs text-[#475569] hover:text-[#7C3AED] transition-colors">
                    Back to password sign in
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-xl bg-[rgba(124,58,237,0.15)] border border-[rgba(124,58,237,0.25)] flex items-center justify-center mb-5">
                    <Mail className="w-6 h-6 text-[#a78bfa]" />
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-2">Magic link sign in</h1>
                  <p className="text-[#64748b] text-sm">No password needed. We'll email you a secure, one-click login link.</p>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="mb-5 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <AnimatedInput id="magic-email" icon={Mail} label="Email address" type="email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com" required
                  />
                  <ShimmerButton type="submit" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {loading ? 'Sending magic link…' : 'Send magic link'}
                  </ShimmerButton>
                </form>

                <p className="text-center text-sm text-[#475569] mt-8">
                  Prefer a password?{' '}
                  <Link to="/auth/login" className="text-[#7C3AED] hover:text-[#a78bfa] font-medium transition-colors">
                    Sign in with password
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
