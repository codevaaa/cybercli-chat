import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, RefreshCw, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { CyberCliMark } from '../../components/ui/CyberCliLogo'

export default function VerifyEmailPage() {
  const [resent, setResent] = useState(false)
  const [resending, setResending] = useState(false)

  const handleResend = async () => {
    setResending(true)
    await new Promise(r => setTimeout(r, 1200))
    setResending(false)
    setResent(true)
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
            <CyberCliMark size={56} />
          </Link>
          <h1 className="text-3xl font-semibold text-foreground-primary tracking-tight font-serif mt-6">
            Verify your email
          </h1>
          <p className="text-sm text-foreground-muted mt-2 text-center">
            We sent a verification link to your email address.
          </p>
        </div>

        {/* Card */}
        <div className="bg-background-elevated border border-border-subtle rounded-2xl p-8 shadow-sm">
          <div className="text-center space-y-6">
            {/* Animated mail icon */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-accent/10 border border-accent/20">
              <Mail className="w-8 h-8 text-accent animate-pulse" />
            </div>

            <p className="text-sm text-foreground-secondary leading-relaxed">
              Click the link inside the verification email to activate your account and start using CyberCli.
            </p>

            {/* Instructions list */}
            <div className="rounded-xl border border-border-subtle bg-background-tertiary p-5 text-left space-y-3.5">
              <p className="text-[10px] text-foreground-muted font-bold uppercase tracking-wider">Next steps:</p>
              <ul className="space-y-2.5">
                {[
                  'Open your email inbox',
                  'Find the email from CyberCli',
                  'Click the "Verify my email" button',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-xs text-foreground-secondary leading-relaxed">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resend actions */}
            <div className="space-y-3 pt-2">
              {resent ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-semibold text-center flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Verification email resent!
                </motion.div>
              ) : (
                <motion.button
                  onClick={handleResend}
                  disabled={resending}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent-dark transition-all disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                  {resending ? 'Resending...' : 'Resend verification email'}
                </motion.button>
              )}

              <Link
                to="/auth/login"
                className="w-full flex items-center justify-center py-3 rounded-xl border border-border-subtle text-foreground-secondary text-sm hover:border-accent hover:text-accent font-semibold transition-all"
              >
                Already verified? Sign in
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-foreground-muted mt-6">
          Can't find it? Check your spam or promotions folder.
        </p>
      </motion.div>
    </div>
  )
}

