import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Palette, Mic, Brain, Shield, CreditCard, Key, ChevronRight, Moon, Sun, Monitor, Type, Volume2, VolumeX, Save, Check, Play } from 'lucide-react'
import api from '../../lib/api.js'
import { useTTS } from '../../hooks/useTTS.js'
import { TTS_PROVIDERS } from '../../lib/tts.js'

  const SETTINGS_SECTIONS = [
    {
      id: 'appearance',
      title: 'Appearance',
      icon: Palette,
      items: [
        { label: 'Theme', key: 'theme', options: ['Dark', 'Light', 'System'] },
        { label: 'Accent Color', key: 'accent_color', options: ['Violet', 'Amber', 'Cyan', 'Rose'] },
        { label: 'Density', key: 'density', options: ['Compact', 'Comfortable', 'Spacious'] },
        { label: 'Font', key: 'font', options: ['Inter', 'Geist', 'System'] },
      ],
    },
    {
      id: 'voice',
      title: 'Voice & Audio',
      icon: Mic,
      items: [
        { label: 'TTS Enabled', key: 'tts_enabled', type: 'toggle' },
        { label: 'Default Voice', key: 'default_voice', type: 'select', options: ['ava', 'bella', 'emma', 'adam', 'josh'] },
        { label: 'Speech Speed', key: 'speech_speed', type: 'range', min: 0.25, max: 4.0, step: 0.25 },
        { label: 'Auto-send Voice', key: 'auto_send_voice', type: 'toggle' },
      ],
    },
    {
      id: 'tts',
      title: 'Text-to-Speech',
      icon: Volume2,
      items: [],
    },
    {
      id: 'models',
      title: 'Models & AI',
      icon: Brain,
      items: [
        { label: 'Default Model', key: 'default_model', options: ['auto', 'openrouter/gpt-4o-mini', 'groq/llama-3.1-8b', 'gemini/gemini-2.5-flash'] },
        { label: 'Show Chain of Thought', key: 'show_chain_of_thought', type: 'toggle' },
        { label: 'Show Confidence', key: 'show_confidence', type: 'toggle' },
        { label: 'Council Mode Default', key: 'council_mode_default', type: 'toggle' },
      ],
    },
    {
      id: 'security',
      title: 'Security',
      icon: Shield,
      items: [
        { label: 'Two-Factor Auth', key: 'two_factor_auth', type: 'toggle' },
        { label: 'Login Notifications', key: 'login_notifications', type: 'toggle' },
      ],
    },
  ]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('appearance')
  const [settings, setSettings] = useState({
    theme: 'dark',
    accent_color: 'Violet',
    density: 'Comfortable',
    font: 'Inter',
    tts_enabled: false,
    default_voice: 'ava',
    speech_speed: 1.0,
    auto_send_voice: false,
    default_model: 'auto',
    show_chain_of_thought: true,
    show_confidence: true,
    council_mode_default: false,
    two_factor_auth: false,
    login_notifications: true,
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const {
    currentProvider,
    currentVoice,
    speed,
    pitch,
    geminiApiKey,
    voices,
    providers,
    updateProvider,
    updateVoice,
    updateSpeed,
    updatePitch,
    updateGeminiApiKey,
    speak,
  } = useTTS()

  const [localGeminiKey, setLocalGeminiKey] = useState(geminiApiKey || '')

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
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    
    // Also save to localStorage for persistence
    localStorage.setItem(`setting_${key}`, value)
    
    try {
      await api.patch('/settings', { [key]: value })
    } catch (error) {
      console.error('Failed to update setting on backend:', error)
    }
  }

  const handleSaveTTS = () => {
    updateGeminiApiKey(localGeminiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTestVoice = async () => {
    await speak('This is a test of the text to speech system.')
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
              {activeSection === 'tts' ? (
                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Volume2 className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground-primary">Text-to-Speech</h2>
                      <p className="text-xs text-foreground-muted">Free TTS via Puter.js, Google Gemini, or Browser Native</p>
                    </div>
                  </div>

                  <Link
                    to="/voice-settings"
                    className="flex items-center justify-between w-full p-4 rounded-xl bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-colors mb-6"
                  >
                    <div className="flex items-center gap-3">
                      <Mic className="w-5 h-5 text-accent" />
                      <span className="font-medium text-accent">Open Voice Settings</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-accent" />
                  </Link>

                  <div className="space-y-6">
                    {/* Provider Selection */}
                    <div>
                      <label className="block text-sm font-medium text-foreground-primary mb-2">
                        TTS Provider
                      </label>
                      <select
                        value={currentProvider}
                        onChange={(e) => updateProvider(e.target.value)}
                        className="w-full text-sm text-foreground-primary bg-background-tertiary border border-border-subtle rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                      >
                        {providers.map((provider) => (
                          <option key={provider.id} value={provider.id}>
                            {provider.name} - {provider.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Voice Selection */}
                    <div>
                      <label className="block text-sm font-medium text-foreground-primary mb-2">
                        Voice
                      </label>
                      <select
                        value={currentVoice}
                        onChange={(e) => updateVoice(e.target.value)}
                        className="w-full text-sm text-foreground-primary bg-background-tertiary border border-border-subtle rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                      >
                        {voices.map((voice) => (
                          <option key={voice.id} value={voice.id}>
                            {voice.name} ({voice.gender}, {voice.accent})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Speed */}
                    <div>
                      <label className="block text-sm font-medium text-foreground-primary mb-2">
                        Speed: {speed}x
                      </label>
                      <input
                        type="range"
                        min="0.25"
                        max="4.0"
                        step="0.25"
                        value={speed}
                        onChange={(e) => updateSpeed(parseFloat(e.target.value))}
                        className="w-full accent-accent"
                      />
                      <div className="flex justify-between text-xs text-foreground-muted mt-1">
                        <span>0.25x</span>
                        <span>4.0x</span>
                      </div>
                    </div>

                    {/* Pitch */}
                    <div>
                      <label className="block text-sm font-medium text-foreground-primary mb-2">
                        Pitch: {pitch}
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={pitch}
                        onChange={(e) => updatePitch(parseFloat(e.target.value))}
                        className="w-full accent-accent"
                      />
                      <div className="flex justify-between text-xs text-foreground-muted mt-1">
                        <span>Low</span>
                        <span>High</span>
                      </div>
                    </div>

                    {/* Gemini API Key (only for Gemini provider) */}
                    {currentProvider === 'gemini' && (
                      <div>
                        <label className="block text-sm font-medium text-foreground-primary mb-2">
                          Google Gemini API Key
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={localGeminiKey}
                            onChange={(e) => setLocalGeminiKey(e.target.value)}
                            placeholder="AIza..."
                            className="flex-1 text-sm text-foreground-primary bg-background-tertiary border border-border-subtle rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                          />
                          <button
                            onClick={handleSaveTTS}
                            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-light transition-colors"
                          >
                            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {saved ? 'Saved' : 'Save'}
                          </button>
                        </div>
                        <p className="text-xs text-foreground-muted mt-1">
                          Get your API key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Google AI Studio</a>
                        </p>
                      </div>
                    )}

                    {/* Test Button */}
                    <div className="pt-4 border-t border-border-subtle">
                      <button
                        onClick={handleTestVoice}
                        className="flex items-center gap-2 px-4 py-2.5 bg-background-tertiary text-foreground-primary text-sm font-medium rounded-lg hover:bg-background-secondary transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        Test Voice
                      </button>
                    </div>
                  </div>
                </div>
              ) : loading ? (
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
                          {item.type === 'toggle' ? (
                            <button
                              onClick={() => updateSetting(item.key, !settings[item.key])}
                              className={`w-12 h-6 rounded-full transition-colors ${
                                settings[item.key] ? 'bg-accent' : 'bg-background-tertiary'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                settings[item.key] ? 'translate-x-6' : 'translate-x-0.5'
                              } mt-0.5`} />
                            </button>
                          ) : item.type === 'range' ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={item.min || 0}
                                max={item.max || 100}
                                step={item.step || 1}
                                value={settings[item.key]}
                                onChange={(e) => updateSetting(item.key, parseFloat(e.target.value))}
                                className="w-24 accent-accent"
                              />
                              <span className="text-sm text-foreground-muted w-12 text-right">
                                {typeof settings[item.key] === 'number' ? settings[item.key].toFixed(2) : settings[item.key]}
                              </span>
                            </div>
                          ) : item.options ? (
                            <select
                              value={settings[item.key]}
                              onChange={(e) => updateSetting(item.key, e.target.value)}
                              className="text-sm text-foreground-primary bg-background-tertiary border border-border-subtle rounded px-3 py-1.5 focus:outline-none focus:border-accent"
                            >
                              {item.options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-sm text-foreground-muted">{settings[item.key] || 'Off'}</span>
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
