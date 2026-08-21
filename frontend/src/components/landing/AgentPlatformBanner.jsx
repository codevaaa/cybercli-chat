/**
 * AgentPlatformBanner — Floating announcement banner for the new Agent Platform.
 * Shows on landing page + product page. Dismissable.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, ArrowRight, Zap } from 'lucide-react'

export default function AgentPlatformBanner() {
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('agent_banner_dismissed') === 'true'
  })

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('agent_banner_dismissed', 'true')
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4, delay: 1 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4"
      >
        <div className="relative bg-gradient-to-r from-[#0A0A0F]/95 to-[#1A1A24]/95 backdrop-blur-xl border border-[var(--accent)]/30 rounded-2xl px-5 py-4 shadow-2xl shadow-[var(--accent)]/10">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 text-[var(--text-muted)] hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={14} />
          </button>

          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#FF6B35] flex items-center justify-center flex-shrink-0">
              <Zap size={18} className="text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent)]/15 px-2 py-0.5 rounded-full">New</span>
                <span className="text-sm font-semibold text-white">CodeVaa Agent Platform</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
                16 autonomous AI agents working in parallel. Decompose any goal, execute across coder/tester/debugger/security agents, get results in seconds. More powerful than Cursor or Antigravity.
              </p>
              <div className="flex items-center gap-3">
                <Link
                  to="/platform/welcome"
                  className="inline-flex items-center gap-1.5 bg-[var(--accent)] text-white text-xs font-medium px-3.5 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Sparkles size={12} />
                  Try Agent Platform
                  <ArrowRight size={11} />
                </Link>
                <Link
                  to="/product"
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                >
                  Learn more →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
