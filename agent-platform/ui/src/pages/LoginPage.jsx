/**
 * LoginPage — Antigravity-style Welcome/Login screen for CodeVaa.
 *
 * Features:
 *   - Animated CodeVaa logo (Sudarshan Chakra)
 *   - "Welcome to CodeVaa" heading
 *   - "Sign in" card with: Continue with Google, Use business account
 *   - "Having trouble? Let us know" link
 *   - Previous/Next navigation for onboarding flow
 *   - Dark background with subtle gradient animation
 */
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { usePlatformStore } from '../store/platformStore.js'

const BACKEND_URL = 'http://localhost:3000'

export default function LoginPage({ onLogin }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [step, setStep]       = useState(0) // 0 = splash, 1 = sign in

  // Auto-advance from splash to sign-in after 2 seconds
  useEffect(() => {
    if (step === 0) {
      const timer = setTimeout(() => setStep(1), 2000)
      return () => clearTimeout(timer)
    }
  }, [step])

  // Splash screen (loading animation)
  if (step === 0) {
    return (
      <div className="h-screen w-screen bg-[#0A0A0F] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-radial from-accent/20 via-transparent to-transparent blur-3xl animate-pulse-slow" />
        </div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative mb-8"
        >
          <img src="/logo.svg" alt="CodeVaa" className="w-20 h-20 animate-spin-slow" />
        </motion.div>

        {/* Loading dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-1.5 mb-4"
        >
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-white/60"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-sm text-muted"
        >
          Loading CodeVaa
        </motion.p>

        {/* Auto-advance to sign in after 2s */}
      </div>
    )
  }

  // Sign in screen
  return (
    <div className="h-screen w-screen bg-[#0A0A0F] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background subtle glow */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gradient-radial from-accent/10 via-transparent to-transparent blur-3xl" />
      </div>

      {/* Window controls (desktop feel) */}
      <div className="absolute top-0 right-0 p-2 flex gap-2">
        <button className="w-3 h-3 rounded-sm bg-white/10 hover:bg-white/20" />
        <button className="w-3 h-3 rounded-sm bg-white/10 hover:bg-white/20" />
        <button className="w-3 h-3 rounded-sm bg-white/10 hover:bg-white/20" />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center relative z-10"
      >
        {/* Logo */}
        <img src="/logo.svg" alt="CodeVaa" className="w-16 h-16 mb-6" />

        {/* Welcome heading */}
        <h1 className="text-xl font-medium text-white mb-10">Welcome to CodeVaa</h1>

        {/* Sign in card */}
        <div className="w-[340px] bg-[#111118] border border-border rounded-xl p-6 space-y-4">
          <p className="text-center text-sm font-medium text-white mb-4">Sign in</p>

          {/* Continue with Google */}
          <button
            onClick={() => handleGoogleLogin(setLoading, setError, onLogin)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg py-2.5 px-4 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Use business account */}
          <button
            onClick={() => handleGoogleLogin(setLoading, setError, onLogin)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#1E1E2E] hover:bg-[#2a2a3a] text-white/80 border border-border rounded-lg py-2.5 px-4 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Use business account
          </button>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}
        </div>

        {/* Help link */}
        <a
          href="#"
          className="mt-4 text-xs text-muted hover:text-accent transition-colors underline underline-offset-2"
        >
          Having trouble? Let us know
        </a>
      </motion.div>

      {/* Bottom navigation */}
      <div className="absolute bottom-8 flex flex-col items-center gap-3">
        <span className="text-xs text-muted/50">Previous</span>
        <button
          onClick={() => onLogin?.({ skipAuth: true })}
          className="px-8 py-2 bg-[#1E1E2E] hover:bg-[#2a2a3a] border border-border rounded-lg text-sm text-muted hover:text-white transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  )
}

// ─── Google OAuth Handler ──────────────────────────────────────────────────

async function handleGoogleLogin(setLoading, setError, onLogin) {
  setLoading(true)
  setError(null)

  try {
    // For now, skip auth and go directly to the app (since backend handles auth separately)
    // In production, this would redirect to Supabase OAuth
    onLogin?.({ skipAuth: true, user: { email: 'user@codeva.ai', plan: 'pro' } })
  } catch (err) {
    setError(err.message || 'Login failed. Please try again.')
  } finally {
    setLoading(false)
  }
}

// ─── Google Icon SVG ───────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
