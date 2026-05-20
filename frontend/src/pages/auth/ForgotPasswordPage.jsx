import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowRight, Zap, Check } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore.js'

export default function ForgotPasswordPage() {
  const { resetPassword, loading, error, clearError } = useAuthStore()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    const result = await resetPassword(email)
    if (result.success) {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center section-padding pt-24 pb-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground-primary mb-2">Reset your password</h1>
          <p className="text-sm text-foreground-muted">We will send you a link to reset your password.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        {sent ? (
          <div className="card p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-success" />
            </div>
            <h2 className="text-lg font-semibold text-foreground-primary mb-2">Check your email</h2>
            <p className="text-sm text-foreground-muted mb-6">We sent a password reset link to {email}</p>
            <Link to="/auth/login" className="btn-secondary w-full justify-center">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground-primary mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-lg bg-background-secondary border border-border-subtle text-foreground-primary text-sm focus:outline-none focus:border-accent transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5">
              {loading ? 'Sending...' : 'Send Reset Link'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <p className="text-center text-sm text-foreground-muted mt-6">
          Remember your password?{' '}
          <Link to="/auth/login" className="text-accent hover:underline font-medium">Log in</Link>
        </p>
      </div>
    </div>
  )
}
