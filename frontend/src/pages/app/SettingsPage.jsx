import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import {
  X, User, Shield, CreditCard, Zap, Plug, Settings2,
  Moon, Sun, Monitor, ChevronLeft, Check, Bell, Volume2,
  Type, Palette, Save, Camera, AlertCircle, Code2, Copy
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api.js'

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'general',      label: 'General',      icon: Settings2  },
  { id: 'account',      label: 'Account',       icon: User       },
  { id: 'privacy',      label: 'Privacy',       icon: Shield     },
  { id: 'billing',      label: 'Billing',       icon: CreditCard },
  { id: 'capabilities', label: 'Capabilities',  icon: Zap        },
  { id: 'connectors',   label: 'Connectors',    icon: Plug       },
  { id: 'api-keys',     label: 'API Keys',      icon: Code2       },
]

const VOICES = ['Ava', 'Nova', 'Luna', 'Orion', 'Echo']
const FONTS  = ['Inter', 'Instrument Serif', 'JetBrains Mono']

// ─── Utility components ───────────────────────────────────────────────────────

function SectionHeading({ children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-4 pt-2">
      {children}
    </h3>
  )
}

function FieldRow({ label, hint, children }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-border-subtle last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground-primary">{label}</p>
        {hint && <p className="text-xs text-foreground-muted mt-0.5">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-accent' : 'bg-background-tertiary'
      }`}
      style={{ height: '22px', width: '40px' }}
    >
      <motion.div
        className="absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm"
        animate={{ x: checked ? 18 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        style={{ width: '18px', height: '18px' }}
      />
    </button>
  )
}

function ThemePills({ value, onChange }) {
  const opts = [
    { id: 'system', label: 'System', icon: Monitor },
    { id: 'light',  label: 'Light',  icon: Sun     },
    { id: 'dark',   label: 'Dark',   icon: Moon    },
  ]
  return (
    <div className="flex items-center rounded-xl overflow-hidden border border-border-subtle" style={{ background: 'var(--bg-tertiary)' }}>
      {opts.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt.id
              ? 'text-foreground-primary bg-background-elevated shadow-sm'
              : 'text-foreground-muted hover:text-foreground-secondary'
          }`}
        >
          <opt.icon className="w-3.5 h-3.5" />
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function SpeedPills({ value, onChange }) {
  const opts = ['Slow', 'Normal', 'Fast']
  return (
    <div className="flex items-center rounded-xl overflow-hidden border border-border-subtle" style={{ background: 'var(--bg-tertiary)' }}>
      {opts.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt
              ? 'text-foreground-primary bg-background-elevated shadow-sm'
              : 'text-foreground-muted hover:text-foreground-secondary'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function SelectInput({ value, onChange, options, className = '' }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`text-sm text-foreground-primary bg-background-tertiary border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:border-accent transition-colors appearance-none pr-8 ${className}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A7A7A' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
      }}
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  )
}

function TextInput({ value, onChange, placeholder, className = '' }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full text-sm text-foreground-primary bg-background-tertiary border border-border-subtle rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent transition-colors placeholder:text-foreground-muted ${className}`}
    />
  )
}

function TextareaInput({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full text-sm text-foreground-primary bg-background-tertiary border border-border-subtle rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors placeholder:text-foreground-muted resize-none leading-relaxed"
    />
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function AvatarSection({ name }) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'
  return (
    <div className="flex items-center gap-4 py-4 border-b border-border-subtle">
      <div className="relative group">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
          style={{ background: 'rgba(217,119,87,0.15)', color: '#D97757' }}
        >
          {initials}
        </div>
        <button className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className="w-5 h-5 text-white" />
        </button>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground-primary">{name || 'Your Name'}</p>
        <p className="text-xs text-foreground-muted mt-0.5">Click avatar to upload photo</p>
      </div>
    </div>
  )
}

// ─── Tab content panels ───────────────────────────────────────────────────────

function GeneralTab({ settings, onUpdate }) {
  return (
    <div className="space-y-0">
      <SectionHeading>Profile</SectionHeading>

      <AvatarSection name={settings.full_name} />

      <FieldRow label="Full name" hint="Your display name across CyberCli">
        <TextInput
          value={settings.full_name}
          onChange={v => onUpdate('full_name', v)}
          placeholder="Jane Smith"
          className="w-52"
        />
      </FieldRow>

      <FieldRow label="What should CyberCli call you?" hint="Used in responses to feel more personal">
        <TextInput
          value={settings.nickname}
          onChange={v => onUpdate('nickname', v)}
          placeholder="e.g. Jane"
          className="w-52"
        />
      </FieldRow>

      <FieldRow label="Custom instructions" hint="Tell CyberCli how to respond to you by default">
        <div className="w-64">
          <TextareaInput
            value={settings.instructions}
            onChange={v => onUpdate('instructions', v)}
            placeholder="I prefer concise answers. I'm a software engineer working in TypeScript..."
            rows={4}
          />
        </div>
      </FieldRow>

      <SectionHeading>Preferences</SectionHeading>

      <FieldRow label="Appearance" hint="Controls the color scheme of the interface">
        <ThemePills value={settings.theme} onChange={v => onUpdate('theme', v)} />
      </FieldRow>

      <FieldRow label="Chat font" hint="Font used in the message view">
        <SelectInput
          value={settings.chat_font}
          onChange={v => onUpdate('chat_font', v)}
          options={FONTS}
        />
      </FieldRow>

      <FieldRow label="Voice" hint="Default text-to-speech voice">
        <SelectInput
          value={settings.voice}
          onChange={v => onUpdate('voice', v)}
          options={VOICES}
        />
      </FieldRow>

      <FieldRow label="Voice speed">
        <SpeedPills value={settings.voice_speed} onChange={v => onUpdate('voice_speed', v)} />
      </FieldRow>

      <SectionHeading>Notifications</SectionHeading>

      <FieldRow label="Response completions" hint="Notify me when a long response finishes">
        <Toggle checked={settings.notify_completions} onChange={v => onUpdate('notify_completions', v)} />
      </FieldRow>

      <FieldRow label="Dispatch messages" hint="Receive weekly tips and feature highlights">
        <Toggle checked={settings.notify_dispatch} onChange={v => onUpdate('notify_dispatch', v)} />
      </FieldRow>
    </div>
  )
}

function AccountTab({ settings, onUpdate }) {
  return (
    <div>
      <SectionHeading>Account</SectionHeading>
      <FieldRow label="Email address" hint="The email associated with your account">
        <TextInput
          value={settings.email}
          onChange={v => onUpdate('email', v)}
          placeholder="you@example.com"
          className="w-56"
        />
      </FieldRow>
      <FieldRow label="Password" hint="Change your account password">
        <button className="text-sm font-medium text-accent hover:text-accent-light transition-colors">
          Change password →
        </button>
      </FieldRow>
      <FieldRow label="Two-factor authentication" hint="Add an extra layer of security">
        <Toggle checked={settings.two_factor} onChange={v => onUpdate('two_factor', v)} />
      </FieldRow>
      <FieldRow label="Delete account" hint="Permanently remove your account and all data">
        <button className="text-sm font-medium text-red-500 hover:text-red-400 transition-colors">
          Delete account
        </button>
      </FieldRow>
    </div>
  )
}

function PrivacyTab({ settings, onUpdate }) {
  return (
    <div>
      <SectionHeading>Privacy</SectionHeading>
      <FieldRow label="Share usage data" hint="Help improve CyberCli with anonymous usage analytics">
        <Toggle checked={settings.share_usage} onChange={v => onUpdate('share_usage', v)} />
      </FieldRow>
      <FieldRow label="Personalized ads" hint="Allow CyberCli to show relevant promotions">
        <Toggle checked={settings.personalized_ads} onChange={v => onUpdate('personalized_ads', v)} />
      </FieldRow>
      <FieldRow label="Conversation history" hint="Save your chats to improve future responses">
        <Toggle checked={settings.save_history} onChange={v => onUpdate('save_history', v)} />
      </FieldRow>
      <FieldRow label="Export data">
        <button className="text-sm font-medium text-accent hover:text-accent-light transition-colors">
          Download my data
        </button>
      </FieldRow>
    </div>
  )
}

function BillingTab() {
  return (
    <div>
      <SectionHeading>Plan</SectionHeading>
      <div
        className="rounded-2xl border border-border-subtle p-5 mb-6"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-semibold text-foreground-primary">Free Plan</span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(217,119,87,0.15)', color: '#D97757' }}
              >
                CURRENT
              </span>
            </div>
            <p className="text-sm text-foreground-muted">50 messages/hour · Basic models · Gemini Flash TTS</p>
          </div>
          <span className="text-xl font-bold text-foreground-primary">$0</span>
        </div>
      </div>

      <button
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all"
        style={{ background: '#D97757' }}
        onMouseEnter={e => e.currentTarget.style.background = '#E8A590'}
        onMouseLeave={e => e.currentTarget.style.background = '#D97757'}
      >
        <Zap className="w-4 h-4" />
        Upgrade to Pro — $12/mo
      </button>

      <p className="text-xs text-center text-foreground-muted mt-3">
        Upgrade for 500 msg/hr, Council Mode, ElevenLabs voices & more.
      </p>
    </div>
  )
}

function CapabilitiesTab({ settings, onUpdate }) {
  const capabilities = [
    { key: 'code_execution', label: 'Code execution', hint: 'Run code snippets in a sandboxed environment' },
    { key: 'web_search',     label: 'Web search',     hint: 'Allow CyberCli to search the internet' },
    { key: 'image_gen',      label: 'Image generation', hint: 'Generate images from text descriptions' },
    { key: 'council_mode',   label: 'Council Mode',   hint: 'Enable multi-model debate on your queries' },
    { key: 'voice_input',    label: 'Voice input',    hint: 'Use your microphone for voice-to-text' },
    { key: 'memory',         label: 'Memory',         hint: 'Let CyberCli remember facts about you' },
  ]
  return (
    <div>
      <SectionHeading>Capabilities</SectionHeading>
      {capabilities.map(cap => (
        <FieldRow key={cap.key} label={cap.label} hint={cap.hint}>
          <Toggle
            checked={settings[cap.key] ?? false}
            onChange={v => onUpdate(cap.key, v)}
          />
        </FieldRow>
      ))}
    </div>
  )
}

function ConnectorsTab() {
  const connectors = [
    { name: 'OpenRouter',   status: 'connected',    color: '#10B981' },
    { name: 'Groq',         status: 'connected',    color: '#10B981' },
    { name: 'Google Gemini',status: 'connected',    color: '#10B981' },
    { name: 'Cerebras',     status: 'disconnected', color: '#6B7280' },
    { name: 'Cloudflare AI',status: 'disconnected', color: '#6B7280' },
    { name: 'HuggingFace',  status: 'disconnected', color: '#6B7280' },
    { name: 'Bytez',        status: 'disconnected', color: '#6B7280' },
    { name: 'NVIDIA NIM',   status: 'disconnected', color: '#6B7280' },
  ]
  return (
    <div>
      <SectionHeading>AI Connectors</SectionHeading>
      <div className="space-y-2">
        {connectors.map(c => (
          <div
            key={c.name}
            className="flex items-center justify-between px-4 py-3 rounded-xl border border-border-subtle"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
              <span className="text-sm font-medium text-foreground-primary">{c.name}</span>
            </div>
            {c.status === 'connected' ? (
              <span className="text-xs font-medium text-green-500">Connected</span>
            ) : (
              <button className="text-xs font-medium text-accent hover:text-accent-light transition-colors">
                Connect
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function DeveloperTab() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [newKey, setNewKey] = useState(null)
  const [error, setError] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)

  const fetchKeys = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/api-keys')
      setKeys(data)
    } catch (err) {
      setError('Failed to fetch API keys.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!keyName.trim()) return
    setError(null)
    try {
      const { data } = await api.post('/api-keys', { name: keyName.trim() })
      setNewKey(data.key)
      setKeyName('')
      fetchKeys()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create API key.')
    }
  }

  const handleRevoke = async (id) => {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return
    setError(null)
    try {
      await api.delete(`/api-keys/${id}`)
      fetchKeys()
    } catch (err) {
      setError('Failed to revoke API key.')
    }
  }

  const handleCopy = () => {
    if (!newKey) return
    navigator.clipboard.writeText(newKey)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-foreground-muted mb-4 leading-relaxed">
          API keys allow you to integrate CyberCli completions programmatically into your scripts, CLI tools, and development workflows. Keep your keys secret.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm border" style={{ background: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.2)', color: '#FCA5A5' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* New Key Display Box */}
      <AnimatePresence>
        {newKey && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border p-5 relative overflow-hidden mb-4"
            style={{ borderColor: 'rgba(217,119,87,0.25)', background: 'rgba(217,119,87,0.05)' }}
          >
            <div className="relative z-10">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#D97757' }}>
                <Zap className="w-4 h-4" />
                API Key Generated Successfully
              </h4>
              <p className="text-xs text-foreground-muted mb-3">
                Make sure to copy your API key now. You won't be able to see it again!
              </p>
              <div className="flex items-center gap-2 bg-background-tertiary border border-border-subtle rounded-xl p-2.5">
                <code className="text-xs font-mono text-foreground-primary flex-1 break-all select-all">
                  {newKey}
                </code>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors shrink-0"
                  style={{ background: '#D97757' }}
                >
                  {copySuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copySuccess ? 'Copied' : 'Copy'}
                </button>
              </div>
              <button
                onClick={() => setNewKey(null)}
                className="mt-3 text-xs text-foreground-muted hover:text-foreground-secondary underline"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Key Form */}
      <form onSubmit={handleCreate} className="flex gap-2 items-center">
        <TextInput
          value={keyName}
          onChange={setKeyName}
          placeholder="Key name (e.g. Local CLI Daemon)"
          className="flex-1"
        />
        <button
          type="submit"
          disabled={!keyName.trim()}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shrink-0 disabled:opacity-50"
          style={{ background: '#D97757' }}
        >
          Create key
        </button>
      </form>

      {/* Keys List */}
      <div className="space-y-3 mt-6">
        <SectionHeading>Active Keys</SectionHeading>
        {loading ? (
          <p className="text-sm text-foreground-muted">Loading keys...</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-foreground-muted italic">No active API keys found.</p>
        ) : (
          <div className="space-y-2">
            {keys.map(k => (
              <div
                key={k._id}
                className="flex items-center justify-between p-4 rounded-xl border border-border-subtle"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <div>
                  <p className="text-sm font-medium text-foreground-primary">{k.name}</p>
                  <code className="text-xs font-mono text-foreground-muted">{k.key}</code>
                  <p className="text-[10px] text-foreground-muted mt-1">
                    Created {new Date(k.created_at).toLocaleDateString()}
                    {k.last_used_at && ` · Last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(k._id)}
                  className="text-xs font-medium text-red-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main SettingsPage ────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  full_name: '',
  nickname: '',
  email: '',
  instructions: '',
  theme: 'dark',
  chat_font: 'Inter',
  voice: 'Ava',
  voice_speed: 'Normal',
  notify_completions: true,
  notify_dispatch: false,
  two_factor: false,
  share_usage: false,
  personalized_ads: false,
  save_history: true,
  code_execution: true,
  web_search: false,
  image_gen: false,
  council_mode: true,
  voice_input: true,
  memory: false,
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const path = location.pathname
    if (path.endsWith('/api-keys')) {
      setActiveTab('api-keys')
    } else if (path.endsWith('/billing')) {
      setActiveTab('billing')
    } else if (path.endsWith('/security') || path.endsWith('/privacy')) {
      setActiveTab('privacy')
    } else if (path.endsWith('/personas')) {
      setActiveTab('capabilities')
    } else {
      setActiveTab('general')
    }
  }, [location.pathname])

  const handleTabChange = (tabId) => {
    if (tabId === 'general') navigate('/settings')
    else if (tabId === 'api-keys') navigate('/settings/api-keys')
    else if (tabId === 'billing') navigate('/settings/billing')
    else if (tabId === 'privacy') navigate('/settings/security')
    else if (tabId === 'capabilities') navigate('/settings/personas')
    else navigate(`/settings/${tabId}`)
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/settings')
      setSettings(prev => ({ ...prev, ...data }))
    } catch (err) {
      // Use defaults — backend may not be live yet
      const stored = {}
      Object.keys(DEFAULT_SETTINGS).forEach(k => {
        const v = localStorage.getItem(`setting_${k}`)
        if (v !== null) {
          stored[k] = v === 'true' ? true : v === 'false' ? false : v
        }
      })
      setSettings(prev => ({ ...prev, ...stored }))
    }
  }

  const handleUpdate = useCallback(async (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    localStorage.setItem(`setting_${key}`, value)

    setSaving(true)
    setSaved(false)
    try {
      await api.patch('/settings', { [key]: value })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      // Silently fail — changes are saved locally
    } finally {
      setSaving(false)
    }
  }, [])

  const tabContent = {
    general:      <GeneralTab      settings={settings} onUpdate={handleUpdate} />,
    account:      <AccountTab      settings={settings} onUpdate={handleUpdate} />,
    privacy:      <PrivacyTab      settings={settings} onUpdate={handleUpdate} />,
    billing:      <BillingTab />,
    capabilities: <CapabilitiesTab settings={settings} onUpdate={handleUpdate} />,
    connectors:   <ConnectorsTab />,
    'api-keys':   <DeveloperTab />,
  }

  return (
    <div
      className="min-h-screen flex items-start justify-center py-10 px-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Modal card */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-4xl rounded-2xl border border-border-subtle overflow-hidden"
        style={{ background: 'var(--bg-elevated)', minHeight: '600px' }}
      >
        <div className="flex h-full min-h-[600px]">
          {/* Left sidebar nav */}
          <div
            className="w-52 flex-shrink-0 border-r border-border-subtle flex flex-col"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border-subtle">
              <button
                onClick={() => navigate('/chat')}
                className="p-1 rounded-lg text-foreground-muted hover:text-foreground-primary hover:bg-background-tertiary transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-foreground-primary">Settings</span>
            </div>

            {/* Nav items */}
            <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-background-tertiary text-foreground-primary'
                      : 'text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary'
                  }`}
                >
                  <tab.icon className="w-4 h-4 flex-shrink-0" />
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Save status */}
            <div className="p-3 border-t border-border-subtle">
              <AnimatePresence>
                {saved && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-xs text-green-500 font-medium px-2 py-1"
                  >
                    <Check className="w-3 h-3" />
                    Saved
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-8">
              {/* Tab heading */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground-primary">
                  {TABS.find(t => t.id === activeTab)?.label}
                </h2>
                {saving && (
                  <motion.div
                    className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                )}
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm"
                    style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#FCA5A5' }}
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tab content with slide animation */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  {tabContent[activeTab]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
