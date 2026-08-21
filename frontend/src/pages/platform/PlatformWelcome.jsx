/**
 * PlatformWelcome — Kiro Web-style welcome/onboarding page for new users.
 *
 * Shows:
 *   - CodeVaa ghost/logo icon
 *   - "What can I help you with?" heading
 *   - Upgrade banner (if free plan)
 *   - Chat input with:
 *     - "Ask a question or describe a task..." placeholder
 *     - "Build with spec" toggle
 *     - Model selector (Auto dropdown)
 *     - Autonomous toggle
 *     - "Select repository" link
 *   - Footer (Site Terms, License, Privacy, etc.)
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
    // Navigate to main platform page with goal as query param
    navigate(`/platform?goal=${encodeURIComponent(input.trim())}&model=${model}&autonomous=${autonomous}`)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="CodeVaa" className="w-7 h-7" />
          <span className="font-bold text-[var(--text-primary)] text-sm">CODEVAA</span>
          <span className="text-xs text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded ml-1">preview</span>
        </div>
        <button className="w-7 h-7 rounded-md border border-[var(--border-medium)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
        </button>
      </header>

      {/* Left sidebar */}
      <div className="flex flex-1">
        <aside className="w-[260px] border-r border-[var(--border-subtle)] flex flex-col px-4 py-4">
          <button className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-left py-2 transition-colors">
            Automations
          </button>

          <div className="mt-6">
            <button
              onClick={() => { setInput(''); inputRef.current?.focus() }}
              className="flex items-center gap-2 text-sm text-[var(--text-primary)] py-2 hover:text-[var(--accent)] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New session
            </button>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Sessions</span>
              <button className="text-xs text-[var(--accent)] hover:underline">Show all</button>
            </div>
          </div>

          {/* Bottom — user */}
          <div className="mt-auto pt-4 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold">
                {(user?.email || 'U')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-[var(--text-primary)] truncate">{user?.email || 'user@codeva.ai'}</div>
                <div className="text-[10px] text-[var(--text-muted)]">CodeVaa {plan === 'free' ? 'Free' : 'Pro'}</div>
              </div>
              <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </button>
            </div>
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-[640px] flex flex-col items-center"
          >
            {/* Ghost/Logo icon */}
            <div className="mb-6">
              <img src="/favicon.svg" alt="" className="w-14 h-14 opacity-80" />
            </div>

            {/* Heading */}
            <h1 className="text-2xl font-medium text-[var(--accent)] mb-8">
              What can I help you with?
            </h1>

            {/* Upgrade banner (free plan only) */}
            {plan === 'free' && (
              <div className="w-full mb-6 bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/20 flex items-center justify-center">
                    <img src="/favicon.svg" alt="" className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Upgrade to unlock CodeVaa Pro</p>
                    <p className="text-xs text-[var(--text-muted)]">CodeVaa Pro is available on Pro, Pro+, and Power plans. Upgrade your subscription to start using all features.</p>
                  </div>
                </div>
                <a href="/pricing" className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] whitespace-nowrap flex items-center gap-1 transition-colors">
                  Upgrade plan
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </a>
              </div>
            )}

            {/* Subscription required note */}
            {plan === 'free' && (
              <p className="text-xs text-[var(--text-muted)] mb-4 flex items-center gap-1">
                Subscription required for CodeVaa
                <a href="/pricing" className="text-[var(--accent)] hover:underline flex items-center gap-0.5">
                  Upgrade plan
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </p>
            )}

            {/* Chat input box */}
            <form onSubmit={handleSubmit} className="w-full">
              <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-2xl overflow-hidden focus-within:border-[var(--accent)]/50 transition-colors">
                {/* Text input */}
                <div className="px-4 pt-3 pb-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question or describe a task..."
                    className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                  />
                </div>

                {/* Bottom toolbar */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center gap-4">
                    {/* Build with spec toggle */}
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={buildWithSpec}
                        onChange={e => setBuildWithSpec(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-[var(--border-medium)] accent-[var(--accent)]"
                      />
                      <span className="text-xs text-[var(--text-secondary)]">Build with spec</span>
                    </label>

                    {/* Model selector */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowModels(!showModels)}
                        className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        {MODELS.find(m => m.id === model)?.name || 'Auto'}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      {showModels && (
                        <div className="absolute bottom-full left-0 mb-2 w-40 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-lg shadow-xl py-1 z-50">
                          {MODELS.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => { setModel(m.id); setShowModels(false) }}
                              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--accent)]/10 transition-colors ${model === m.id ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}
                            >
                              {m.name} {model === m.id && '✓'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Autonomous toggle */}
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                      <span className="text-xs text-[var(--text-secondary)]">Autonomous</span>
                      <button
                        type="button"
                        onClick={() => setAutonomous(!autonomous)}
                        className={`w-8 h-4 rounded-full transition-colors relative ${autonomous ? 'bg-[var(--accent)]' : 'bg-[var(--border-medium)]'}`}
                      >
                        <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${autonomous ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </button>
                    </label>
                  </div>

                  {/* Send button */}
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${input.trim() ? 'bg-[var(--accent)] text-white hover:opacity-90' : 'bg-[var(--border-medium)] text-[var(--text-muted)] cursor-not-allowed'}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                  </button>
                </div>
              </div>

              {/* Select repository link */}
              <div className="mt-3 flex items-center gap-2">
                <button type="button" className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Select repository
                </button>
              </div>
            </form>
          </motion.div>
        </main>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-6 py-3 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-1">
          <img src="/favicon.svg" alt="" className="w-4 h-4 opacity-50" />
        </div>
        <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
          <a href="/terms-of-service" className="hover:text-[var(--text-secondary)]">Site Terms</a>
          <a href="#" className="hover:text-[var(--text-secondary)]">License</a>
          <a href="#" className="hover:text-[var(--text-secondary)]">Responsible AI Policy</a>
          <a href="#" className="hover:text-[var(--text-secondary)]">Legal</a>
          <a href="/privacy-policy" className="hover:text-[var(--text-secondary)]">Privacy Policy</a>
          <a href="/cookie-policy" className="hover:text-[var(--text-secondary)]">Cookie Preferences</a>
        </div>
      </footer>
    </div>
  )
}
