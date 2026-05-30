import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Eye, EyeOff, ArrowRight, Loader2, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore.js'
import { CodevaMark } from '../../components/ui/CodevaLogo'

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

export default function ResetPasswordPage() {
  const { updatePassword, loading, error, clearError } = useAuthStore()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const passwordStrength = getStrength(password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) return
    clearError()
    const result = await updatePassword(password)
    if (result.success) setDone(true)
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
          <Link to="/" className="flex items-center justify-center hover:opacity-90 transition-opacity">
            <CodevaMark size={56} />
          </Link>
          <h1 className="text-3xl font-semibold text-foreground-primary tracking-tight font-serif mt-6">
            Choose a new password
          </h1>
          <p className="text-sm text-foreground-muted mt-2 text-center">
            {done ? "Password updated successfully" : "Make it strong — and don't reuse old passwords"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-background-elevated border border-border-subtle rounded-2xl p-8 shadow-sm">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-6"
              >
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-green-500/10 border border-green-500/20">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-foreground-secondary">
                    Your password has been reset successfully.
                  </p>
                </div>
                <Link
                  to="/auth/login"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent-dark transition-all shadow-sm"
                >
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </Link>
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

                {password && confirm && password !== confirm && (
                  <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 font-medium">
                    Passwords do not match.
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* New Password */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="reset-new" className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                        New Password
                      </label>
                      {password && (
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
                        id="reset-new"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Min. 8 characters"
                        required
                        className="w-full pl-11 pr-11 py-3 rounded-xl bg-background-tertiary border border-border-subtle text-foreground-primary text-sm focus:outline-none transition-all placeholder:text-foreground-muted"
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
                    {password && (
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

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="reset-confirm" className="block text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        id="reset-confirm"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        onFocus={() => setFocusedField('confirm')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Repeat your new password"
                        required
                        className="w-full pl-11 pr-11 py-3 rounded-xl bg-background-tertiary border border-border-subtle text-foreground-primary text-sm focus:outline-none transition-all placeholder:text-foreground-muted"
                        style={{
                          borderColor: focusedField === 'confirm' ? 'var(--accent)' : 'transparent',
                          boxShadow: focusedField === 'confirm' ? '0 0 0 2px rgba(217,119,87,0.1)' : 'none',
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

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={loading || (!!password && !!confirm && password !== confirm)}
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: loading ? 1 : 0.99 }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed bg-accent hover:bg-accent-dark shadow-sm"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Set new password
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

