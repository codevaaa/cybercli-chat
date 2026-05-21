import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Eye, EyeOff, ArrowRight, Zap, Shield, Sparkles, Cpu, Loader2, Check } from 'lucide-react'
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
            Choose a<br />
            <span style={{ background: 'linear-gradient(135deg, #7C3AED, #D97757)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              strong password.
            </span>
          </h2>
          <p className="text-[#94a3b8] text-base leading-relaxed">
            Keep your CyberCli account safe with a secure, unique password.
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

function getStrength(pw) {
  if (!pw) return { level: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { level: 1, label: 'Weak', color: '#ef4444' }
  if (score <= 3) return { level: 2, label: 'Medium', color: '#f59e0b' }
  return { level: 3, label: 'Strong', color: '#22c55e' }
}

function PasswordField({ id, label, value, onChange, placeholder, showStrength = false }) {
  const [focused, setFocused] = useState(false)
  const [show, setShow] = useState(false)
  const strength = getStrength(value)

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[#cbd5e1] mb-2">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b] pointer-events-none" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder || 'Min. 8 characters'}
          required
          className="w-full pl-11 pr-11 py-3 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white text-sm focus:outline-none transition-colors placeholder:text-[#475569]"
          style={{ borderColor: focused ? '#7C3AED' : undefined }}
        />
        <button type="button" onClick={() => setShow(!show)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#94a3b8] transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <motion.div className="absolute bottom-0 left-0 h-[2px] rounded-full"
          style={{ background: 'linear-gradient(90deg, #7C3AED, #D97757)' }}
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: focused ? 1 : 0 }}
          transition={{ duration: 0.25 }}
        />
      </div>
      {showStrength && value && (
        <div className="mt-2">
          <div className="flex gap-1 mb-1">
            {[1, 2, 3].map(l => (
              <motion.div key={l} className="h-1 flex-1 rounded-full"
                animate={{ backgroundColor: l <= strength.level ? strength.color : '#1e293b' }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
          <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
        </div>
      )}
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

export default function ResetPasswordPage() {
  const { updatePassword, loading, error, clearError } = useAuthStore()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) return
    clearError()
    const result = await updatePassword(password)
    if (result.success) setDone(true)
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
            {done ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <motion.div className="absolute inset-0 rounded-full border-2 border-[#22c55e]"
                    initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: 'backOut' }}
                  />
                  <div className="absolute inset-0 rounded-full bg-[rgba(34,197,94,0.1)] flex items-center justify-center">
                    <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                    >
                      <Check className="w-10 h-10 text-green-400" />
                    </motion.div>
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-white mb-3">Password updated!</h1>
                <p className="text-[#64748b] text-sm mb-8">
                  Your password has been reset successfully. You can now sign in with your new password.
                </p>
                <Link to="/auth/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #D97757)' }}
                >
                  Sign in <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-white mb-2">Choose a new password</h1>
                  <p className="text-[#64748b] text-sm">Make it strong — and don't reuse old passwords.</p>
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

                {password && confirm && password !== confirm && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400"
                  >
                    Passwords do not match.
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <PasswordField id="reset-new" label="New password" value={password}
                    onChange={(e) => setPassword(e.target.value)} showStrength
                  />
                  <PasswordField id="reset-confirm" label="Confirm new password" value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat your new password"
                  />
                  <ShimmerButton type="submit" disabled={loading || (!!password && !!confirm && password !== confirm)}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {loading ? 'Updating…' : 'Set new password'}
                  </ShimmerButton>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
