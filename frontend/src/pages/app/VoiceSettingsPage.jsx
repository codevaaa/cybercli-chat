import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Settings, Volume2, Mic, Zap, Check } from 'lucide-react'
import { useTTS } from '../../hooks/useTTS.js'

export default function VoiceSettingsPage() {
  const {
    voiceSettings,
    updateVoiceSettings,
    getAvailableProviders,
    getAvailableVoices,
  } = useTTS()

  const [selectedProvider, setSelectedProvider] = useState(voiceSettings.provider)
  const [selectedVoice, setSelectedVoice] = useState(voiceSettings.voice)
  const [speed, setSpeed] = useState(voiceSettings.speed)
  const [pitch, setPitch] = useState(voiceSettings.pitch)
  const [testText, setTestText] = useState('Hello, this is a test of the voice settings.')
  const [isTesting, setIsTesting] = useState(false)

  const providers = getAvailableProviders()
  const voices = getAvailableVoices(selectedProvider)

  const handleProviderChange = (providerId) => {
    setSelectedProvider(providerId)
    updateVoiceSettings({ provider: providerId })
  }

  const handleVoiceChange = (voiceId) => {
    setSelectedVoice(voiceId)
    updateVoiceSettings({ voice: voiceId })
  }

  const handleSpeedChange = (value) => {
    setSpeed(value)
    updateVoiceSettings({ speed: value })
  }

  const handlePitchChange = (value) => {
    setPitch(value)
    updateVoiceSettings({ pitch: value })
  }

  const handleTestVoice = async () => {
    setIsTesting(true)
    const { speak } = useTTS()
    await speak(testText)
    setIsTesting(false)
  }

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background-secondary/80 backdrop-blur-lg border-b border-border-subtle">
        <div className="container-custom px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/settings" className="p-2 rounded-lg hover:bg-background-tertiary transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground-primary" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shadow-[0_0_15px_rgba(217,119,87,0.2)]">
                <Volume2 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground-primary">Voice Settings</h1>
                <p className="text-sm text-foreground-muted">Configure text-to-speech options</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container-custom px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Provider Selection */}
          <section className="bg-background-secondary rounded-2xl border border-border-subtle p-6">
            <h2 className="text-lg font-semibold text-foreground-primary mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              Voice Provider
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleProviderChange(provider.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedProvider === provider.id
                      ? 'bg-accent/10 border-accent text-accent'
                      : 'bg-background-tertiary border-border-subtle hover:border-accent/30 text-foreground-primary'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium">{provider.name}</span>
                    {selectedProvider === provider.id && (
                      <Check className="w-4 h-4" />
                    )}
                  </div>
                  <p className="text-xs text-foreground-muted">{provider.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Voice Selection */}
          <section className="bg-background-secondary rounded-2xl border border-border-subtle p-6">
            <h2 className="text-lg font-semibold text-foreground-primary mb-4 flex items-center gap-2">
              <Mic className="w-5 h-5 text-accent" />
              Voice
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {voices.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => handleVoiceChange(voice.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedVoice === voice.id
                      ? 'bg-accent/10 border-accent text-accent'
                      : 'bg-background-tertiary border-border-subtle hover:border-accent/30 text-foreground-primary'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-sm">{voice.name}</span>
                    {selectedVoice === voice.id && (
                      <Check className="w-4 h-4" />
                    )}
                  </div>
                  {voice.lang && (
                    <p className="text-xs text-foreground-muted">{voice.lang}</p>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Speed Control */}
          <section className="bg-background-secondary rounded-2xl border border-border-subtle p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground-primary">Speed</h2>
              <span className="text-sm text-accent font-medium">{speed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speed}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-background-tertiary rounded-lg appearance-none cursor-pointer accent-accent"
            />
            <div className="flex justify-between text-xs text-foreground-muted mt-2">
              <span>0.5x (Slow)</span>
              <span>1x (Normal)</span>
              <span>2x (Fast)</span>
            </div>
          </section>

          {/* Pitch Control */}
          <section className="bg-background-secondary rounded-2xl border border-border-subtle p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground-primary">Pitch</h2>
              <span className="text-sm text-accent font-medium">{pitch.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={pitch}
              onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-background-tertiary rounded-lg appearance-none cursor-pointer accent-accent"
            />
            <div className="flex justify-between text-xs text-foreground-muted mt-2">
              <span>0.5x (Low)</span>
              <span>1x (Normal)</span>
              <span>2x (High)</span>
            </div>
          </section>

          {/* Test Voice */}
          <section className="bg-background-secondary rounded-2xl border border-border-subtle p-6">
            <h2 className="text-lg font-semibold text-foreground-primary mb-4 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-accent" />
              Test Voice
            </h2>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Enter text to test..."
              rows={3}
              className="w-full bg-background-tertiary border border-border-subtle rounded-xl px-4 py-3 text-foreground-primary placeholder-foreground-muted/50 resize-none focus:outline-none focus:border-accent/50 transition-colors mb-4"
            />
            <button
              onClick={handleTestVoice}
              disabled={isTesting || !testText.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-white hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isTesting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Volume2 className="w-5 h-5" />
                  Test Voice
                </>
              )}
            </button>
          </section>
        </div>
      </main>
    </div>
  )
}
