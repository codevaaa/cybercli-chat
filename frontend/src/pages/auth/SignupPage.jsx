import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore.js'
import { CyberCliMark } from '../../components/ui/CyberCliLogo'

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

export default function SignupPage() {
  const navigate = useNavigate()
  const { signUpWithEmail, signInWithOAuth, loading, error, clearError } = useAuthStore()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [agree, setAgree] = useState(false)
  const [localError, setLocalError] = useState(null)

  const passwordStrength = getStrength(form.password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    setLocalError(null)

    if (form.password.length < 8) {
      setLocalError('Password must be at least 8 characters long')
      return
    }

    if (form.password !== form.confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    if (!agree) {
      setLocalError('You must agree to the Terms of Service and Privacy Policy')
      return
    }

    const result = await signUpWithEmail(form.email, form.password, form.fullName)
    if (result.success) {
      // Directs to verification or success screen depending on Supabase configuration
      navigate('/auth/verify-email')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/5 rounded-full blur-[100px] opacity-70" />
      </div>

      <motion.div
        className="w-full max-w-[460px] relative z-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Brand Mark Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex items-center justify-center hover:opacity-90 transition-opacity">
            <CyberCliMark size={40} />
          </Link>
          <h1 className="text-3xl font-semibold text-foreground-primary tracking-tight font-serif mt-6">
            Create your account
          </h1>
          <p className="text-sm text-foreground-muted mt-2">
            Start chatting with the world&apos;s most advanced models
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-background-elevated border border-border-subtle rounded-2xl p-8 shadow-sm">
          <AnimatePresence>
            {(error || localError) && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-medium"
              >
                {localError || error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4.5">
            {/* Full Name Field */}
            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="John Doe"
                  required
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-background-tertiary border border-border-subtle text-foreground-primary text-sm focus:outline-none transition-all placeholder:text-foreground-muted"
                  style={{
                    borderColor: focusedField === 'fullName' ? 'var(--accent)' : 'transparent',
                    boxShadow: focusedField === 'fullName' ? '0 0 0 2px rgba(217,119,87,0.1)' : 'none',
                  }}
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-background-tertiary border border-border-subtle text-foreground-primary text-sm focus:outline-none transition-all placeholder:text-foreground-muted"
                  style={{
                    borderColor: focusedField === 'email' ? 'var(--accent)' : 'transparent',
                    boxShadow: focusedField === 'email' ? '0 0 0 2px rgba(217,119,87,0.1)' : 'none',
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                  Password
                </label>
                {form.password && (
                  <span className="text-[10px] font-bold uppercase" style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Min. 8 characters"
                  required
                  className="w-full pl-11 pr-11 py-2.5 rounded-xl bg-background-tertiary border border-border-subtle text-foreground-primary text-sm focus:outline-none transition-all placeholder:text-foreground-muted"
                  style={{
                    borderColor: focusedField === 'password' ? 'var(--accent)' : 'transparent',
                    boxShadow: focusedField === 'password' ? '0 0 0 2px rgba(217,119,87,0.1)' : 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength indicator line */}
              {form.password && (
                <div className="w-full h-1 bg-background-tertiary rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${(passwordStrength.level / 3) * 100}%`,
                      backgroundColor: passwordStrength.color,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Repeat your password"
                  required
                  className="w-full pl-11 pr-11 py-2.5 rounded-xl bg-background-tertiary border border-border-subtle text-foreground-primary text-sm focus:outline-none transition-all placeholder:text-foreground-muted"
                  style={{
                    borderColor: focusedField === 'confirmPassword' ? 'var(--accent)' : 'transparent',
                    boxShadow: focusedField === 'confirmPassword' ? '0 0 0 2px rgba(217,119,87,0.1)' : 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground-secondary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Terms & Privacy checkbox */}
            <div className="flex items-start gap-3 mt-3">
              <input
                id="agree-checkbox"
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border-subtle text-accent focus:ring-accent bg-background-tertiary"
              />
              <label htmlFor="agree-checkbox" className="text-xs text-foreground-secondary leading-relaxed">
                I agree to the{' '}
                <Link to="/legal/terms" className="text-accent hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/legal/privacy" className="text-accent hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.99 }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed bg-accent hover:bg-accent-dark shadow-sm mt-3"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-subtle" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider font-semibold">
              <span className="px-3 bg-background-elevated text-foreground-muted">Or continue with</span>
            </div>
          </div>

          {/* Google SSO Signup */}
          <button
            type="button"
            disabled
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-background-tertiary border border-border-subtle text-sm font-medium text-foreground-secondary cursor-not-allowed opacity-60 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-semibold tracking-wide uppercase">
              Soon
            </span>
          </button>
        </div>

        {/* Bottom Switch Links */}
        <div className="text-center mt-6">
          <p className="text-sm text-foreground-secondary">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-accent hover:text-accent-dark font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
