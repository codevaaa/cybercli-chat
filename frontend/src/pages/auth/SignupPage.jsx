import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Zap, Shield, Sparkles, Cpu, Loader2, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore.js'

/* ── Shared brand features ──────────────────────────────────── */
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
      <div className="absolute bottom-[-10%] right-[-20%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(217,119,87,0.12) 0%, transparent 70%)' }}
      />

      <div className="relative z-10">
        <Link to="/" className="flex items-center gap-3 mb-2">
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
            Start for free.<br />
            <span style={{ background: 'linear-gradient(135deg, #7C3AED, #D97757)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Scale infinitely.
            </span>
          </h2>
          <p className="text-[#94a3b8] text-base leading-relaxed">
            Join 50,000+ users already unlocking the full potential of frontier AI.
          </p>
        </motion.div>
        <div className="flex flex-col gap-4 mt-2">
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

/* ── Password strength logic ────────────────────────────────── */
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

/* ── Animated input ─────────────────────────────────────────── */
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

function PasswordWithStrength({ value, onChange, label, id, showStrength = false }) {
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
          placeholder="Min. 8 characters"
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
              <motion.div key={l}
                className="h-1 flex-1 rounded-full"
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

function PasswordConfirm({ value, onChange, matchValue, id }) {
  const [focused, setFocused] = useState(false)
  const [show, setShow] = useState(false)
  const matches = value && value === matchValue

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[#cbd5e1] mb-2">Confirm password</label>
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b] pointer-events-none" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Repeat your password"
          required
          className="w-full pl-11 pr-11 py-3 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white text-sm focus:outline-none transition-colors placeholder:text-[#475569]"
          style={{ borderColor: focused ? '#7C3AED' : undefined }}
        />
        {matches ? (
          <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
        ) : (
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#94a3b8] transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
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

function ShimmerButton({ children, disabled, type = 'button', onClick }) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
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

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

/* ── SignupPage ──────────────────────────────────────────────── */
export default function SignupPage() {
  const navigate = useNavigate()
  const { signUpWithEmail, signInWithOAuth, loading, error, clearError } = useAuthStore()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [agreed, setAgreed] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) return
    clearError()
    const result = await signUpWithEmail(form.email, form.password, form.name)
    if (result.success) {
      if (result.needsVerification) setNeedsVerification(true)
      else navigate('/chat')
    }
  }

  if (needsVerification) {
    return (
      <div className="flex min-h-screen bg-[#0A0A0F] items-center justify-center p-8">
        <motion.div className="w-full max-w-md text-center"
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-20 h-20 rounded-full bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] flex items-center justify-center mx-auto mb-6">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
              <Check className="w-10 h-10 text-green-400" />
            </motion.div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Check your email</h1>
          <p className="text-[#64748b] text-sm mb-8">
            We sent a verification link to <span className="text-[#a78bfa]">{form.email}</span>. Click it to activate your account.
          </p>
          <Link to="/auth/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #D97757)' }}
          >
            Go to login <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0F]">
      <BrandPanel />

      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 overflow-y-auto">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link to="/" className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">CyberCli</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
            <p className="text-[#64748b] text-sm">Start chatting with the world's most powerful AI models.</p>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatedInput id="signup-name" icon={User} label="Full name" type="text"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="John Doe" required
            />
            <AnimatedInput id="signup-email" icon={Mail} label="Email" type="email"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com" required
            />
            <PasswordWithStrength id="signup-password" label="Password"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              showStrength
            />
            <PasswordConfirm id="signup-confirm"
              value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              matchValue={form.password}
            />

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer group mt-2">
              <div className="relative mt-0.5">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                  className="sr-only" required
                />
                <div className={`w-4 h-4 rounded border transition-all ${agreed ? 'bg-[#7C3AED] border-[#7C3AED]' : 'border-[rgba(255,255,255,0.15)] bg-transparent'}`}>
                  {agreed && <Check className="w-3 h-3 text-white absolute top-0.5 left-0.5" />}
                </div>
              </div>
              <span className="text-xs text-[#64748b] leading-relaxed">
                I agree to the{' '}
                <Link to="/terms-of-service" className="text-[#7C3AED] hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy-policy" className="text-[#7C3AED] hover:underline">Privacy Policy</Link>
              </span>
            </label>

            <ShimmerButton type="submit" disabled={loading || !agreed}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? 'Creating account…' : 'Create account'}
            </ShimmerButton>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(255,255,255,0.07)]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-[#0A0A0F] text-[#475569]">or continue with</span>
            </div>
          </div>

          <button type="button" disabled
            className="w-full flex items-center justify-center gap-3 py-3 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-sm font-medium text-[#94a3b8] cursor-not-allowed opacity-60"
          >
            <GoogleIcon />
            Continue with Google
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[rgba(124,58,237,0.2)] text-[#a78bfa] font-semibold tracking-wide">
              Soon
            </span>
          </button>

          <p className="text-center text-sm text-[#475569] mt-8">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-[#7C3AED] hover:text-[#a78bfa] font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
