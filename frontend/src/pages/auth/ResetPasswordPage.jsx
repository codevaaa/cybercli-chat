import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, ArrowRight, Zap, Check } from 'lucide-react'
import { useAuthStore } from '../stores/authStore.js'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { updatePassword, loading, error, clearError } = useAuthStore()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) return
    clearError()
    const result = await updatePassword(password)
    if (result.success) {
      setDone(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center section-padding pt-24 pb-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground-primary mb-2">Create new password</h1>
          <p className="text-sm text-foreground-muted">Enter your new password below.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        {done ? (
          <div className="card p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-success" />
            </div>
            <h2 className="text-lg font-semibold text-foreground-primary mb-2">Password updated</h2>
            <p className="text-sm text-foreground-muted mb-6">Your password has been reset successfully.</p>
            <Link to="/auth/login" className="btn-primary w-full justify-center">
              Log in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground-primary mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-lg bg-background-secondary border border-border-subtle text-foreground-primary text-sm focus:outline-none focus:border-accent transition-colors"
                  placeholder="Min. 12 characters"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-primary mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-lg bg-background-secondary border border-border-subtle text-foreground-primary text-sm focus:outline-none focus:border-accent transition-colors"
                  placeholder="Confirm new password"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5">
              {loading ? 'Updating...' : 'Reset Password'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
