/**
 * PlatformWelcome — Kiro Web-style welcome page (EXACT match).
 * Keeps CodeVaa orange accent. Matches Kiro layout precisely.
 */
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@stores/authStore.js'
import { motion } from 'framer-motion'

const MODELS = [
  { id: 'auto', name: 'Auto' },
  { id: 'codeva/ravan', name: 'Ravan' },
  { id: 'codeva/madhav', name: 'Madhav' },
  { id: 'codeva/chanakya', name: 'Chanakya' },
  { id: 'codeva/arjun', name: 'Arjun' },
  { id: 'codeva/bheem', name: 'Bheem' },
  { id: 'codeva/panchayat', name: 'Panchayat' },
]

// Ghost SVG (matching Kiro's white ghost icon)
function GhostIcon({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path d="M32 4C19.85 4 10 13.85 10 26v22c0 2 1 3.5 2.5 3.5 1.5 0 2.5-1.5 2.5-3.5v-4c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5v4c0 2 1 3.5 2.5 3.5s2.5-1.5 2.5-3.5v-4c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5v4c0 2 1 3.5 2.5 3.5s2.5-1.5 2.5-3.5v-4c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5v4c0 2 1 3.5 2.5 3.5s2.5-1.5 2.5-3.5v-4c0-1.5 1-2.5 2.5-2.5S54 43 54 44.5v4c0 2 1 3.5 2.5 3.5S59 50.5 59 48.5V26C54 13.85 44.15 4 32 4z" fill="white"/>
      <circle cx="24" cy="28" r="4" fill="#1a1a2e"/>
      <circle cx="40" cy="28" r="4" fill="#1a1a2e"/>
    </svg>
  )
}

export default function PlatformWelcome() {
  const navigate   = useNavigate()
  const { user }   = useAuthStore()
  const [input, setInput]       = useState('')
  const [model, setModel]       = useState('auto')
  const [autonomous, setAutonomous] = useState(false)
  const [buildWithSpec, setBuildWithSpec] = useState(false)
  const [showModels, setShowModels] = useState(false)
  const inputRef = useRef(null)

  const plan = user?.user_metadata?.plan || 'free'

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!input.trim()) return
    navigate(`/platform?goal=${encodeURIComponent(input.trim())}&model=${model}&autonomous=${autonomous}`)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d14] flex">
      {/* ═══ LEFT SIDEBAR ═══ */}
      <aside className="w-[260px] border-r border-white/[0.06] flex flex-col px-4 py-5">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <img src="/favicon.svg" alt="CodeVaa" className="w-6 h-6" />
          <span className="font-bold text-white text-sm tracking-wide">CODEVAA</span>
          <span className="text-[10px] text-[#D97757] bg-[#D97757]/10 px-1.5 py-0.5 rounded font-medium">preview</span>
          {/* Panel toggle icon */}
          <button className="ml-auto w-6 h-6 rounded border border-white/10 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
          </button>
        </div>

        {/* Automations */}
        <button className="text-sm text-white/60 hover:text-white text-left py-1.5 mb-6 transition-colors">
          Automations
        </button>

        {/* New session */}
        <button
          onClick={() => { setInput(''); inputRef.current?.focus() }}
          className="flex items-center gap-2 text-sm text-white py-2 hover:text-[#D97757] transition-colors mb-6"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New session
        </button>

        {/* Sessions */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/60">Sessions</span>
          <button className="text-xs text-[#D97757] hover:underline">Show all</button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User footer */}
        <div className="pt-4 border-t border-white/[0.06]">
          <button
            onClick={() => navigate('/platform/settings')}
            className="w-full flex items-center gap-2 group"
          >
            <div className="w-7 h-7 rounded-full bg-[#D97757] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(user?.email || 'A')[0].toUpperCase()}
            </div>
            <span className="text-xs text-white/70 truncate flex-1 text-left group-hover:text-white transition-colors">
              {user?.email || 'user@codeva.ai'}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 flex flex-col">
        {/* Center content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-[620px] flex flex-col items-center"
          >
            {/* Ghost Icon (large, white, matching Kiro) */}
            <div className="mb-5">
              <GhostIcon size={56} />
            </div>

            {/* Heading (orange accent like our brand) */}
            <h1 className="text-2xl font-medium text-[#D97757] mb-8">
              What can I help you with?
            </h1>

            {/* ── Upgrade Card (between icon and input, like Kiro) ── */}
            {plan === 'free' && (
              <div className="w-full mb-4 bg-[#16161f] border border-white/[0.08] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#1e1e2e] flex items-center justify-center flex-shrink-0">
                    <img src="/favicon.svg" alt="" className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Upgrade to unlock CodeVaa Web</p>
                    <p className="text-xs text-white/50">CodeVaa Web is available on Pro, Pro+, and Power plans. Upgrade your subscription to start using CodeVaa Web.</p>
                  </div>
                </div>
                <a href="/pricing" className="text-xs text-white/60 hover:text-[#D97757] whitespace-nowrap flex items-center gap-1 transition-colors ml-4 flex-shrink-0">
                  Upgrade plan
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </a>
              </div>
            )}

            {/* Subscription note */}
            {plan === 'free' && (
              <p className="text-xs text-white/40 mb-5 flex items-center gap-1.5">
                Subscription required for CodeVaa
                <a href="/pricing" className="text-[#D97757] hover:underline flex items-center gap-0.5">
                  Upgrade plan
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
                ✦
              </p>
            )}

            {/* ── Chat Input Box (Kiro exact layout) ── */}
            <form onSubmit={handleSubmit} className="w-full">
              <div className="w-full bg-[#16161f] border border-white/[0.1] rounded-2xl focus-within:border-[#D97757]/40 transition-colors">
                {/* Text input */}
                <div className="px-4 pt-4 pb-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question or describe a task..."
                    className="w-full bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
                  />
                </div>

                {/* Bottom toolbar — LEFT: Build with spec | RIGHT: Auto + Autonomous + Send */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06]">
                  {/* LEFT side */}
                  <div className="flex items-center gap-3">
                    {/* Build with spec (bold, with icon, like Kiro) */}
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/50"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      <span className="text-xs font-semibold text-white/80">Build with spec</span>
                    </label>
                  </div>

                  {/* RIGHT side — Model + Autonomous + Send */}
                  <div className="flex items-center gap-3">
                    {/* Model selector */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowModels(!showModels)}
                        className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors"
                      >
                        {MODELS.find(m => m.id === model)?.name || 'Auto'}
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      {showModels && (
                        <div className="absolute bottom-full right-0 mb-2 w-40 bg-[#1a1a24] border border-white/10 rounded-lg shadow-2xl py-1 z-50">
                          {MODELS.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => { setModel(m.id); setShowModels(false) }}
                              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors ${model === m.id ? 'text-[#D97757]' : 'text-white/70'}`}
                            >
                              {m.name} {model === m.id && '✓'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Autonomous toggle (with gear icon like Kiro) */}
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/50"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09"/></svg>
                      <span className="text-xs text-white/60">Autonomous</span>
                      <button
                        type="button"
                        onClick={() => setAutonomous(!autonomous)}
                        className={`w-9 h-[18px] rounded-full transition-colors relative ${autonomous ? 'bg-[#D97757]' : 'bg-white/10'}`}
                      >
                        <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[2px] transition-transform shadow-sm ${autonomous ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                      </button>
                    </label>

                    {/* Send button (circle, like Kiro) */}
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${input.trim() ? 'bg-[#D97757] text-white hover:opacity-90' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Select repository (pen icon + git fork icon, like Kiro) ── */}
              <div className="mt-3 flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <button type="button" className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
                  Select repository
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <footer className="flex items-center justify-between px-6 py-4 border-t border-white/[0.04]">
          {/* Animated CodeVaa logo (bottom-left) */}
          <div className="flex items-center gap-1.5">
            <img src="/favicon.svg" alt="CodeVaa" className="w-5 h-5 animate-spin" style={{ animationDuration: '12s' }} />
          </div>

          {/* Legal links (bottom-right) */}
          <div className="flex items-center gap-4 text-[10px] text-white/30">
            <a href="/terms-of-service" className="hover:text-white/60 transition-colors">Site Terms</a>
            <a href="#" className="hover:text-white/60 transition-colors">License</a>
            <a href="#" className="hover:text-white/60 transition-colors">Responsible AI Policy</a>
            <a href="#" className="hover:text-white/60 transition-colors">Legal</a>
            <a href="/privacy-policy" className="hover:text-white/60 transition-colors">Privacy Policy</a>
            <a href="/cookie-policy" className="hover:text-white/60 transition-colors">Cookie Preferences</a>
          </div>
        </footer>
      </main>
    </div>
  )
}
