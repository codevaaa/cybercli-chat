import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, User, Calendar, Zap, Check, Loader2, Pencil } from 'lucide-react'
import { useAuthStore } from '@stores/authStore.js'
import api from '../../lib/api.js'

function initialsFrom(name = '', email = '') {
  const source = (name || email || 'U').trim()
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

export default function ProfilePage() {
  const { user } = useAuthStore()
  const updateName = useAuthStore((s) => s.updateName)

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    joinDate: '-',
    plan: 'Free',
    messagesSent: 0,
    threadsCreated: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Populate from the authenticated user.
  useEffect(() => {
    if (!user) return
    const name = user.user_metadata?.name || user.email?.split('@')[0] || 'User'
    setProfile((p) => ({
      ...p,
      name,
      email: user.email || '',
      joinDate: user.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : '-',
      plan: user.user_metadata?.plan_tier || 'Free',
    }))
    setDraftName(name)
  }, [user])

  // Fetch real stats from the backend.
  useEffect(() => {
    let active = true
    setStatsLoading(true)
    api
      .get('/auth/me/stats')
      .then(({ data }) => {
        if (!active) return
        setProfile((p) => ({
          ...p,
          messagesSent: data.messagesSent ?? 0,
          threadsCreated: data.threadsCreated ?? 0,
          plan: (data.plan && data.plan[0].toUpperCase() + data.plan.slice(1)) || p.plan,
        }))
      })
      .catch(() => {/* keep zeros on failure */})
      .finally(() => { if (active) setStatsLoading(false) })
    return () => { active = false }
  }, [])

  const handleSaveName = async () => {
    const next = draftName.trim()
    if (!next || next === profile.name) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      const res = await updateName?.(next)
      if (res?.success !== false) {
        setProfile((p) => ({ ...p, name: next }))
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  const initials = initialsFrom(profile.name, profile.email)

  return (
    <div className="min-h-screen pt-20 pb-12 bg-background-primary">
      <div className="section-padding">
        <div className="container-custom max-w-2xl">
          <Link to="/chat" className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground-primary transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to chat
          </Link>

          <div className="card p-8 mb-6">
            <div className="flex items-center gap-6 mb-8">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-accent">{initials}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-foreground-primary truncate">{profile.name || '—'}</h1>
                <p className="text-sm text-foreground-muted truncate">{profile.email || '—'}</p>
                <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
                  <Zap className="w-3 h-3" />
                  {profile.plan} Plan
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <StatCard label="Messages" value={profile.messagesSent} loading={statsLoading} />
              <StatCard label="Threads" value={profile.threadsCreated} loading={statsLoading} />
              <StatCard label="Providers" value={8} loading={false} />
            </div>

            <div className="space-y-4">
              {/* Display name (editable) */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-background-tertiary">
                <User className="w-5 h-5 text-foreground-muted" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground-primary flex items-center gap-2">
                    Display Name
                    {saved && <span className="text-emerald-400 inline-flex items-center gap-1 text-xs"><Check className="w-3 h-3" /> Saved</span>}
                  </p>
                  {editing ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        autoFocus
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditing(false) }}
                        maxLength={60}
                        className="flex-1 bg-background-primary text-sm text-foreground-primary border border-border-subtle rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent"
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={saving}
                        className="px-3 py-1.5 bg-accent hover:bg-accent-light text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Save
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-foreground-muted">{profile.name || '—'}</p>
                  )}
                </div>
                {!editing && (
                  <button
                    onClick={() => { setDraftName(profile.name); setEditing(true) }}
                    className="p-1.5 text-foreground-muted hover:text-accent hover:bg-white/5 rounded-lg transition-colors"
                    title="Edit display name"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-background-tertiary">
                <Mail className="w-5 h-5 text-foreground-muted" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground-primary">Email</p>
                  <p className="text-xs text-foreground-muted truncate">{profile.email || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-background-tertiary">
                <Calendar className="w-5 h-5 text-foreground-muted" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground-primary">Joined</p>
                  <p className="text-xs text-foreground-muted">{profile.joinDate}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/settings" className="text-xs px-4 py-2 rounded-xl border border-border-subtle text-foreground-secondary hover:text-foreground-primary hover:border-accent/40 transition-colors">
                Account settings
              </Link>
              <Link to="/settings/billing" className="text-xs px-4 py-2 rounded-xl border border-border-subtle text-foreground-secondary hover:text-foreground-primary hover:border-accent/40 transition-colors">
                Billing &amp; plan
              </Link>
              <Link to="/usage" className="text-xs px-4 py-2 rounded-xl border border-border-subtle text-foreground-secondary hover:text-foreground-primary hover:border-accent/40 transition-colors">
                Usage stats
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, loading }) {
  return (
    <div className="text-center p-4 rounded-xl bg-background-tertiary">
      <div className="text-2xl font-bold text-foreground-primary h-8 flex items-center justify-center">
        {loading ? <Loader2 className="w-4 h-4 animate-spin text-foreground-muted" /> : value.toLocaleString()}
      </div>
      <div className="text-xs text-foreground-muted mt-1">{label}</div>
    </div>
  )
}
