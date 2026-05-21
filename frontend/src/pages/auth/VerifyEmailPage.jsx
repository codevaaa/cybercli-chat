import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Zap, Shield, Sparkles, Cpu, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'

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
            Almost there.<br />
            <span style={{ background: 'linear-gradient(135deg, #7C3AED, #D97757)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Check your inbox.
            </span>
          </h2>
          <p className="text-[#94a3b8] text-base leading-relaxed">
            One tap to verify your email and unlock the full CyberCli experience.
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
    <div className="flex min-h-screen bg-[#0A0A0F]">
      <BrandPanel />

      <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <motion.div className="w-full max-w-md text-center"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link to="/" className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">CyberCli</span>
          </Link>

          {/* Animated email icon */}
          <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
            {/* Outer pulse ring */}
            <motion.div className="absolute w-32 h-32 rounded-full border border-[#7C3AED]/20"
              animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.div className="absolute w-24 h-24 rounded-full border border-[#7C3AED]/30"
              animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
            />
            {/* Icon container */}
            <div className="relative w-20 h-20 rounded-2xl bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.2)] flex items-center justify-center">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Mail className="w-9 h-9 text-[#a78bfa]" />
              </motion.div>
              {/* Small sparkle */}
              <motion.div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D97757] flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-2 h-2 text-white" />
              </motion.div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-3">Verify your email</h1>
          <p className="text-[#64748b] text-sm mb-2 leading-relaxed">
            We sent a verification link to your email address.
          </p>
          <p className="text-[#475569] text-sm mb-10">
            Click the link to activate your CyberCli account.
          </p>

          {/* Instructions card */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-6 text-left mb-8">
            <p className="text-xs text-[#475569] font-semibold uppercase tracking-wider mb-4">What to do</p>
            <ol className="space-y-3">
              {[
                'Open your email inbox',
                'Find the email from CyberCli',
                'Click "Verify my email" button',
                'You\'ll be signed in automatically',
              ].map((step, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[rgba(124,58,237,0.2)] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#a78bfa] text-xs font-bold">{i + 1}</span>
                  </div>
                  <span className="text-[#94a3b8] text-sm">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-3">
            {resent ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="w-full py-3 rounded-lg bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] text-green-400 text-sm font-medium text-center"
              >
                ✓ Verification email resent!
              </motion.div>
            ) : (
              <motion.button
                onClick={handleResend}
                disabled={resending}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                className="relative overflow-hidden w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #D97757)' }}
              >
                {resending
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Resending…</>
                  : <><RefreshCw className="w-4 h-4" /> Resend verification email</>
                }
              </motion.button>
            )}

            <Link to="/auth/login"
              className="block w-full py-3 rounded-lg border border-[rgba(255,255,255,0.08)] text-[#94a3b8] text-sm hover:border-[#7C3AED] hover:text-white transition-all text-center"
            >
              Already verified? Sign in
            </Link>
          </div>

          <p className="text-xs text-[#475569] mt-6">
            Can't find it? Check your spam folder.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
