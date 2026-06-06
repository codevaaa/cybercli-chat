import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore.js'
import { CodevaMark } from '../../components/ui/CodevaLogo'
import { Tooltip } from '../../components/ui/Tooltip.jsx'

export default function MagicLinkPage() {
  const { signInWithMagicLink, loading, error, clearError } = useAuthStore()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    const result = await signInWithMagicLink(email)
    if (result.success) setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/5 rounded-full blur-[100px] opacity-70" />
      </div>

      <motion.div
        className="w-full max-w-[440px] relative z-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Brand Mark Logo */}
        <div className="flex flex-col items-center mb-8">
          <Tooltip content="Return to Home" position="top">
            <Link to="/" className="flex items-center justify-center hover:opacity-90 transition-opacity">
              <CodevaMark size={56} />
            </Link>
          </Tooltip>
          <h1 className="text-3xl font-semibold text-foreground-primary tracking-tight font-serif mt-6">
            Magic Link Sign In
          </h1>
          <p className="text-sm text-foreground-muted mt-2 text-center">
            {sent ? "Check your inbox for a secure login link" : "No password needed. We'll send you a secure link"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-background-elevated border border-border-subtle rounded-2xl p-8 shadow-sm">
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-6"
              >
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-accent/10 border border-accent/20">
                  <Mail className="w-8 h-8 text-accent animate-bounce" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-foreground-secondary">
                    We sent a secure login link to
                  </p>
                  <p className="text-sm font-semibold text-accent">{email}</p>
                </div>
                <p className="text-xs text-foreground-muted leading-relaxed">
                  Click the link in your email to sign in instantly.<br />
                  No password required. Link expires in 10 minutes.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setSent(false)}
                    className="w-full py-2.5 rounded-xl border border-border-subtle text-foreground-secondary text-sm hover:border-accent hover:text-accent transition-all font-medium"
                  >
                    Use a different email
                  </button>
                  <Link
                    to="/auth/login"
                    className="text-xs text-foreground-muted hover:text-foreground-secondary transition-colors font-medium"
                  >
                    Back to password sign in
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-medium"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email Field */}
                  <div>
                    <label htmlFor="magic-email" className="block text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        id="magic-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="you@example.com"
                        required
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-background-tertiary border border-border-subtle text-foreground-primary text-sm focus:outline-none transition-all placeholder:text-foreground-muted"
                        style={{
                          borderColor: focusedField === 'email' ? 'var(--accent)' : 'transparent',
                          boxShadow: focusedField === 'email' ? '0 0 0 2px rgba(217,119,87,0.1)' : 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: loading ? 1 : 0.99 }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed bg-accent hover:bg-accent-dark shadow-sm"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Send magic link
                        <Sparkles className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Switch Link */}
        <div className="text-center mt-6">
          <p className="text-sm text-foreground-secondary">
            Prefer a password?{' '}
            <Link to="/auth/login" className="text-accent hover:text-accent-dark font-semibold transition-colors">
              Sign in with password
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

