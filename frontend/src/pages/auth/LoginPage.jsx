import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore.js'
import { CodevaMark } from '../../components/ui/CodevaLogo'
import { supabase } from '../../lib/supabase.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || ''
  const port = searchParams.get('port') || ''

  const { signInWithEmail, signInWithOAuth, loading, error, clearError } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const method = searchParams.get('method') || ''

  useEffect(() => {
    if (method === 'google' && !loading) {
      handleGoogleSignIn()
    }
  }, [method, loading]) // Trigger once on mount if method is google

  const handleGoogleSignIn = async () => {
    clearError()
    try {
      let nextPath = '/chat'
      let callbackQuery = `?next=${encodeURIComponent(nextPath)}`
      
      if (redirect === 'cli' || redirect === 'desktop') {
        callbackQuery = `?redirect=desktop`
      }

      const redirectTo = `${window.location.origin}/auth/callback${callbackQuery}`
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
      })
      if (error) throw error
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Google Sign In error:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    const result = await signInWithEmail(form.email, form.password)
    if (result.success) {
      if (redirect === 'cli') {
        navigate(`/login?redirect=cli&port=${port}`)
      } else if (redirect === 'desktop') {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          window.location.href = `codeva://auth?token=${encodeURIComponent(session.access_token)}`
        }
      } else {
        navigate('/chat')
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background-primary py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300 relative overflow-hidden">
      {/* Subtle organic light/dark glow matching Claude's soft styling */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px] opacity-40 dark:opacity-20" />
      </div>

      <motion.div
        className="w-full max-w-[430px] relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Brand Mark Logo & Serif Heading */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Link to="/" className="flex items-center justify-center hover:opacity-90 transition-opacity">
            <CodevaMark size={44} className="text-accent" />
          </Link>
          <h1 className="text-3xl font-serif font-medium text-foreground-primary tracking-tight mt-5">
            Welcome back
          </h1>
          <p className="text-sm text-foreground-secondary/70 mt-2 font-normal">
            Select your preferred way to continue.
          </p>
        </div>

        {/* Auth Card Container */}
        <div className="w-full bg-background-elevated border border-border-subtle rounded-2xl p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_32px_rgba(0,0,0,0.2)] transition-all duration-300">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-6 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-medium"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Claude Signature: Google SSO Button at the Top */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-background-primary hover:bg-background-secondary border border-border-subtle hover:border-border-medium text-sm font-medium text-foreground-secondary hover:text-foreground-primary transition-all duration-200 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="font-normal">Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-subtle" />
            </div>
            <span className="relative px-3 bg-background-elevated text-[11px] font-medium text-foreground-secondary/40 uppercase tracking-widest">
              or
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-foreground-secondary mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-lg bg-background-primary border border-border-subtle text-foreground-primary text-sm focus:outline-none transition-all placeholder:text-foreground-secondary/30"
                style={{
                  borderColor: focusedField === 'email' ? 'var(--accent)' : 'var(--border-subtle)',
                  boxShadow: focusedField === 'email' ? '0 0 0 2px rgba(217,119,87,0.06)' : 'none',
                }}
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="text-xs font-semibold text-foreground-secondary">
                  Password
                </label>
                <Link
                  to="/auth/forgot-password"
                  className="text-xs text-accent hover:underline font-medium transition-all"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-4 pr-10 py-3 rounded-lg bg-background-primary border border-border-subtle text-foreground-primary text-sm focus:outline-none transition-all placeholder:text-foreground-secondary/30"
                  style={{
                    borderColor: focusedField === 'password' ? 'var(--accent)' : 'var(--border-subtle)',
                    boxShadow: focusedField === 'password' ? '0 0 0 2px rgba(217,119,87,0.06)' : 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground-secondary/40 hover:text-foreground-primary transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-accent hover:bg-accent-dark shadow-[0_2px_4px_rgba(217,119,87,0.1)] hover:shadow-[0_4px_8px_rgba(217,119,87,0.15)] cursor-pointer mt-6"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Switch Links & Magic Link Option below the Card */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-xs text-foreground-secondary/80">
            Don&apos;t have an account?{' '}
            <Link to="/auth/signup" className="text-accent hover:underline font-semibold transition-all">
              Sign up free
            </Link>
          </p>
          <p>
            <Link to="/auth/magic-link" className="text-[11px] text-foreground-secondary/40 hover:text-foreground-secondary hover:underline transition-colors font-medium">
              Use magic link instead →
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
