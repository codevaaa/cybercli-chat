/**
 * PlatformSettings — Kiro Web-style Account/Settings page.
 *
 * Sections:
 *   - Install CodeVaa (Download button + CLI install command)
 *   - Account info (email, signed in with Google)
 *   - Estimated Usage (credits bar)
 *   - Choose your Plan (pricing cards)
 *   - Help & Documentation
 *   - Billing Support
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@stores/authStore.js'
import api from '@lib/api.js'

const PLANS = [
  { name: 'CodeVaa Free',  desc: 'For light usage',           price: 0,   credits: 50,    current: true,  features: ['Agent hooks', 'Model context protocol (MCP)', 'Agent steering'] },
  { name: 'CodeVaa Pro',   desc: 'For individual developers', price: 20,  credits: 1000,  features: ['Premium models', 'Overage credits', 'Higher usage limits'] },
  { name: 'CodeVaa Pro+',  desc: 'For daily usage',           price: 40,  credits: 2000,  features: ['Premium models', 'Overage credits', 'Higher usage limits'] },
  { name: 'CodeVaa Max',   desc: 'For advanced usage',        price: 100, credits: 5000,  features: ['Premium models', 'Overage credits', 'Higher usage limits'] },
  { name: 'CodeVaa Power', desc: 'For heavy agentic workloads', price: 200, credits: 10000, features: ['Premium models', 'Overage credits', 'Higher usage limits'] },
]

export default function PlatformSettings() {
  const { user, signOut } = useAuthStore()
  const [showHelp, setShowHelp]       = useState(false)
  const [showBilling, setShowBilling] = useState(false)

  const plan         = user?.user_metadata?.plan || 'free'
  const creditsUsed  = 50
  const creditsTotal = 50
  const usagePercent = Math.min(100, (creditsUsed / creditsTotal) * 100)

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex">
      {/* Left sidebar */}
      <aside className="w-[260px] border-r border-[var(--border-subtle)] flex flex-col">
        <div className="px-4 py-4 flex items-center gap-2">
          <img src="/favicon.svg" alt="CodeVaa" className="w-6 h-6" />
          <span className="font-bold text-sm text-[var(--text-primary)]">CODEVAA</span>
          <span className="text-[10px] text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded">preview</span>
        </div>

        {/* Settings nav */}
        <div className="px-4 mt-2">
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">SETTINGS</div>
          <button className="w-full text-left px-3 py-1.5 rounded-lg text-sm bg-[var(--accent)]/15 text-[var(--accent)] font-medium">
            Account
          </button>
        </div>

        <div className="px-4 mt-6">
          <button className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-1.5 transition-colors">Automations</button>
        </div>

        <div className="px-4 mt-4">
          <Link to="/platform" className="flex items-center gap-2 text-sm text-[var(--text-primary)] hover:text-[var(--accent)] py-1.5 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New session
          </Link>
        </div>

        <div className="px-4 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Sessions</span>
            <button className="text-xs text-[var(--accent)] hover:underline">Show all</button>
          </div>
        </div>

        {/* User */}
        <div className="mt-auto px-4 py-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold">
              {(user?.email || 'U')[0].toUpperCase()}
            </div>
            <span className="text-xs text-[var(--text-secondary)] truncate">{user?.email}</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[700px] mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6 text-sm">
            <span className="text-[var(--text-muted)]">Settings</span>
            <span className="text-[var(--text-muted)]">/</span>
            <span className="text-[var(--text-primary)] font-medium">Account</span>
          </div>

          {/* ── Install CodeVaa ── */}
          <section className="bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-xl p-6 mb-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Install CodeVaa
            </h2>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              Install CodeVaa IDE using <a href="/downloads" className="text-[var(--accent)] hover:underline">IDE Installation Instructions</a> ↗
            </p>
            <a href="/downloads/windows" className="inline-flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity mb-4">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download for Windows
            </a>
            <p className="text-xs text-[var(--text-muted)] mb-2">
              Install CodeVaa CLI in your terminal using <a href="#" className="text-[var(--accent)] hover:underline">CLI Installation Instructions</a> ↗
            </p>
            <div className="inline-flex items-center gap-2 bg-[var(--bg-tertiary)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--accent)]">
              curl -fsSL https://cli.codeva.ai/install | bash
              <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>
            {/* Ghost mascot */}
            <div className="absolute right-8 top-6 opacity-20">
              <img src="/favicon.svg" alt="" className="w-20 h-20" />
            </div>
          </section>

          {/* ── Account Info ── */}
          <section className="bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold">
                {(user?.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{user?.email || 'user@codeva.ai'}</p>
                <p className="text-xs text-[var(--text-muted)]">Signed in with Google | <a href="#" className="text-[var(--accent)] hover:underline">UserID</a> ↗</p>
              </div>
            </div>

            {/* Estimated Usage */}
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Estimated Usage <span className="text-[var(--text-muted)] font-normal text-xs">resets on 09/01</span></h3>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--text-muted)]">Total credits used this month: {creditsUsed}</span>
              <span className="text-xs text-[var(--text-primary)]">CodeVaa {plan === 'free' ? 'Free' : 'Pro'}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-2">Credits <span className="float-right">{creditsUsed} used / {creditsTotal} covered in plan</span></p>
            {/* Progress bar */}
            <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden mb-1">
              <div className="h-full bg-gradient-to-r from-[var(--success)] to-[var(--accent)] rounded-full transition-all" style={{ width: `${usagePercent}%` }} />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] text-right">{usagePercent.toFixed(0)}%</p>
          </section>

          {/* ── Choose your Plan ── */}
          <section className="mb-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">Choose your CodeVaa Plan</h2>

            {/* Included in all plans */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2 text-xs text-[var(--text-muted)]">Included in all plans</div>
              <div className="flex items-center gap-3 bg-[var(--bg-tertiary)] rounded-lg px-4 py-2 mb-3">
                <img src="/favicon.svg" alt="" className="w-5 h-5" />
                <span className="text-xs text-[var(--accent)]">✦ Agent hooks</span>
                <span className="text-xs text-[var(--accent)]">✦ Model context protocol (MCP)</span>
                <span className="text-xs text-[var(--accent)]">✦ Agent steering</span>
              </div>

              {/* Free plan */}
              <div className="flex items-center justify-between py-3 border-b border-[var(--border-subtle)]">
                <div>
                  <span className="text-sm font-medium text-[var(--accent)]">CodeVaa Free</span>
                  <span className="text-xs text-[var(--text-muted)] ml-2">For light usage</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-[var(--text-primary)]">$0 <span className="text-xs font-normal text-[var(--text-muted)]">per month</span></span>
                  <span className="text-xs text-[var(--text-muted)]">50 credits per month</span>
                  {plan === 'free' && <span className="text-xs border border-[var(--border-medium)] rounded px-2 py-0.5 text-[var(--text-secondary)]">Current plan</span>}
                </div>
              </div>
            </div>

            {/* Paid plans */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2 text-xs text-[var(--text-muted)]">Included in all paid plans</div>
              <div className="flex items-center gap-3 bg-[var(--bg-tertiary)] rounded-lg px-4 py-2 mb-3">
                <img src="/favicon.svg" alt="" className="w-5 h-5" />
                <span className="text-xs text-[var(--accent)]">✦ Premium models</span>
                <span className="text-xs text-[var(--accent)]">✦ Overage credits</span>
                <span className="text-xs text-[var(--accent)]">✦ Higher usage limits</span>
              </div>

              {PLANS.slice(1).map(p => (
                <div key={p.name} className="flex items-center justify-between py-3 border-b border-[var(--border-subtle)] last:border-0">
                  <div>
                    <span className="text-sm font-medium text-[var(--accent)]">{p.name}</span>
                    <span className="text-xs text-[var(--text-muted)] ml-2">{p.desc}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-[var(--text-primary)]">${p.price} <span className="text-xs font-normal text-[var(--text-muted)]">per month</span></span>
                    <span className="text-xs text-[var(--text-muted)]">{p.credits.toLocaleString()} credits per month</span>
                    <button className="bg-[var(--accent)] text-white text-xs px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                      Upgrade
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-[var(--text-muted)] mt-3 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              For any of the paid plans, turn on overages to extend your usage. Need even more usage? Upgrade your plan at any time.
            </p>
          </section>

          {/* ── Help & Documentation ── */}
          <section className="mb-4">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="w-full flex items-center justify-between py-3 px-4 bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Help & Documentation
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showHelp ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </section>

          {/* ── Billing Support ── */}
          <section className="mb-8">
            <button
              onClick={() => setShowBilling(!showBilling)}
              className="w-full flex items-center justify-between py-3 px-4 bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                Billing Support
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showBilling ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </section>

          {/* ── Provide Feedback ── */}
          <section className="mb-8">
            <FeedbackForm user={user} />
          </section>

          {/* Footer */}
          <footer className="flex items-center justify-between py-4 border-t border-[var(--border-subtle)]">
            <img src="/favicon.svg" alt="" className="w-4 h-4 opacity-40" />
            <div className="flex gap-3 text-[10px] text-[var(--text-muted)]">
              <a href="/terms-of-service" className="hover:text-[var(--text-secondary)]">Site Terms</a>
              <a href="/privacy-policy" className="hover:text-[var(--text-secondary)]">Privacy Policy</a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}

// ── Feedback Form Component ─────────────────────────────────────────────────
function FeedbackForm({ user }) {
  const [type, setType]           = useState('bug')
  const [description, setDesc]    = useState('')
  const [steps, setSteps]         = useState('')
  const [attachLogs, setLogs]     = useState(true)
  const [submitting, setSubmit]   = useState(false)
  const [submitted, setDone]      = useState(false)
  const [error, setError]         = useState(null)

  const handleSubmit = async () => {
    if (!description.trim()) { setError('Description is required'); return }
    setSubmit(true)
    setError(null)
    try {
      await api.post('/platform/feedback', { type, description: description.trim(), steps: steps.trim(), attachLogs })
      setDone(true)
      setDesc('')
      setSteps('')
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to submit')
    } finally {
      setSubmit(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--success)]/30 rounded-xl p-6 text-center">
        <p className="text-[var(--success)] font-medium mb-1">Thank you for your feedback!</p>
        <p className="text-xs text-[var(--text-muted)]">We'll review it and get back to you if needed.</p>
        <button onClick={() => setDone(false)} className="mt-3 text-xs text-[var(--accent)] hover:underline">Submit another</button>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-xl p-6">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Provide Feedback</h3>

      {/* Type selector */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {[
          { id: 'bug', label: 'Bug Report' },
          { id: 'feature', label: 'Feature Request' },
          { id: 'auth', label: 'Auth & Billing' },
          { id: 'general', label: 'General' },
        ].map(opt => (
          <label key={opt.id} className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="fb-type" checked={type === opt.id} onChange={() => setType(opt.id)}
              className="w-3 h-3 accent-[var(--accent)]" />
            <span className="text-xs text-[var(--text-secondary)]">{opt.label}</span>
          </label>
        ))}
      </div>

      {/* Description */}
      <textarea
        value={description}
        onChange={e => setDesc(e.target.value)}
        placeholder="Describe the issue or suggestion..."
        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]/50 h-24 resize-none mb-3"
      />

      {/* Steps (for bugs) */}
      {type === 'bug' && (
        <textarea
          value={steps}
          onChange={e => setSteps(e.target.value)}
          placeholder="Steps to reproduce..."
          className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]/50 h-20 resize-none mb-3"
        />
      )}

      {/* Options */}
      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <input type="checkbox" checked={attachLogs} onChange={e => setLogs(e.target.checked)} className="w-3 h-3 accent-[var(--accent)] rounded" />
        <span className="text-xs text-[var(--accent)]">Attach CodeVaa logs</span>
      </label>

      {error && <p className="text-xs text-[var(--error)] mb-3">{error}</p>}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !description.trim()}
        className="bg-[var(--accent)] text-white text-xs font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting...' : 'Submit Feedback'}
      </button>

      <p className="text-[10px] text-[var(--text-muted)] mt-3">
        Feedback is sent as {user?.email || 'anonymous'}
      </p>
    </div>
  )
}
