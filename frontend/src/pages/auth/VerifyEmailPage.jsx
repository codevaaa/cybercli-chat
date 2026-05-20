import { Link } from 'react-router-dom'
import { Mail, Zap } from 'lucide-react'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center section-padding pt-24 pb-12">
      <div className="w-full max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(217,119,87,0.3)]">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-foreground-primary mb-2">Verify your email</h1>
        <p className="text-sm text-foreground-muted mb-8">
          We sent a verification link to your email address. Click the link to activate your account.
        </p>

        <div className="card p-8 mb-6">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-lg font-semibold text-foreground-primary mb-2">Check your inbox</h2>
          <p className="text-sm text-foreground-muted">
            Didn&apos;t receive it? Check your spam folder or request a new link.
          </p>
        </div>

        <div className="space-y-3">
          <button className="btn-secondary w-full justify-center">
            Resend Verification Email
          </button>
          <Link to="/auth/login" className="block text-sm text-accent hover:underline">
            Already verified? Log in
          </Link>
        </div>
      </div>
    </div>
  )
}
