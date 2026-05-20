import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Palette, Mic, Brain, Shield, CreditCard, Key, ChevronRight, Moon, Sun, Monitor, Type, Volume2, Gauge } from 'lucide-react'
import api from '../../lib/api.js'

const SETTINGS_SECTIONS = [
  {
    id: 'appearance',
    title: 'Appearance',
    icon: Palette,
    items: [
      { label: 'Theme', value: 'Dark', options: ['Dark', 'Light', 'System'] },
      { label: 'Accent Color', value: 'Violet', options: ['Violet', 'Amber', 'Cyan', 'Rose'] },
      { label: 'Density', value: 'Comfortable', options: ['Compact', 'Comfortable', 'Spacious'] },
      { label: 'Font', value: 'Inter', options: ['Inter', 'Geist', 'System'] },
    ],
  },
  {
    id: 'voice',
    title: 'Voice & Audio',
    icon: Mic,
    items: [
      { label: 'TTS Enabled', value: 'On' },
      { label: 'Default Voice', value: 'Ava (Gemini)' },
      { label: 'Speech Speed', value: '1.0x' },
      { label: 'Auto-send Voice', value: 'Off' },
    ],
  },
  {
    id: 'models',
    title: 'Models & AI',
    icon: Brain,
    items: [
      { label: 'Default Model', value: 'Auto-select' },
      { label: 'Show Chain of Thought', value: 'On' },
      { label: 'Show Confidence', value: 'On' },
      { label: 'Council Mode Default', value: 'Off' },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    icon: Shield,
    items: [
      { label: 'Two-Factor Auth', value: 'Off' },
      { label: 'Active Sessions', value: '3 devices' },
      { label: 'Login Notifications', value: 'On' },
    ],
  },
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('appearance')
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/settings')
      setSettings(data)
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (key, value) => {
    try {
      await api.patch('/settings', { [key]: value })
      setSettings(prev => ({ ...prev, [key]: value }))
    } catch (error) {
      console.error('Failed to update setting:', error)
    }
  }

  const activeSettings = SETTINGS_SECTIONS.find(s => s.id === activeSection)

  return (
    <div className="min-h-screen pt-20 pb-12 bg-background-primary">
      <div className="section-padding">
        <div className="container-custom max-w-5xl">
          <div className="flex items-center gap-3 mb-8">
            <Link to="/chat" className="text-sm text-foreground-muted hover:text-foreground-primary transition-colors">
              &larr; Back to chat
            </Link>
          </div>

          <h1 className="text-h2 mb-8">Settings</h1>

          <div className="grid lg:grid-cols-[280px_1fr] gap-8">
            <nav className="space-y-1">
              {SETTINGS_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === section.id
                      ? 'bg-accent/10 text-accent'
                      : 'text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary'
                  }`}
                >
                  <section.icon className="w-4 h-4" />
                  {section.title}
                </button>
              ))}
              <div className="border-t border-border-subtle my-2" />
              <Link to="/settings/billing" className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary transition-colors">
                <CreditCard className="w-4 h-4" />
                Billing
              </Link>
              <Link to="/settings/api-keys" className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary transition-colors">
                <Key className="w-4 h-4" />
                API Keys
              </Link>
            </nav>

            <div>
              {loading ? (
                <div className="card p-6 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : activeSettings && (
                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <activeSettings.icon className="w-5 h-5 text-accent" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground-primary">{activeSettings.title}</h2>
                  </div>

                  <div className="space-y-6">
                    {activeSettings.items.map((item) => (
                      <div key={item.label} className="flex items-center justify-between py-3 border-b border-border-subtle last:border-0">
                        <div>
                          <p className="text-sm font-medium text-foreground-primary">{item.label}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.options ? (
                            <select
                              value={settings?.[item.label.toLowerCase().replace(' ', '_')] || item.value}
                              onChange={(e) => updateSetting(item.label.toLowerCase().replace(' ', '_'), e.target.value)}
                              className="text-sm text-foreground-primary bg-background-tertiary border border-border-subtle rounded px-3 py-1.5 focus:outline-none focus:border-accent"
                            >
                              {item.options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <>
                              <span className="text-sm text-foreground-muted">{settings?.[item.label.toLowerCase().replace(' ', '_')] || item.value}</span>
                              <ChevronRight className="w-4 h-4 text-foreground-muted" />
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
