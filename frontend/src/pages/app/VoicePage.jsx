import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mic, MicOff, Volume2, Settings, Play, Pause, User, Zap } from 'lucide-react'

const VOICES = [
  { id: 'ava', name: 'Ava', gender: 'Female', provider: 'Gemini Flash TTS', description: 'Warm, empathetic, conversational', lang: 'EN, HI, ES' },
  { id: 'nova', name: 'Nova', gender: 'Female', provider: 'ElevenLabs (Puter)', description: 'Professional, articulate, news-anchor', lang: 'EN, FR, DE' },
  { id: 'luna', name: 'Luna', gender: 'Female', provider: 'ElevenLabs (Puter)', description: 'Playful, creative, youthful', lang: 'EN, JP, KO' },
  { id: 'orion', name: 'Orion', gender: 'Male', provider: 'Gemini Flash TTS', description: 'Deep, authoritative, mentor-like', lang: 'EN, HI, ES' },
  { id: 'echo', name: 'Echo', gender: 'Male', provider: 'ElevenLabs (Puter)', description: 'Calm, analytical, precise', lang: 'EN, DE, FR' },
]

export default function VoicePage() {
  const [selectedVoice, setSelectedVoice] = useState('ava')
  const [isRecording, setIsRecording] = useState(false)
  const [speed, setSpeed] = useState(1.0)

  const activeVoice = VOICES.find(v => v.id === selectedVoice)

  return (
    <div className="min-h-screen pt-20 pb-12 bg-background-primary">
      <div className="section-padding">
        <div className="container-custom max-w-4xl">
          <Link to="/chat" className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground-primary transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to chat
          </Link>

          <h1 className="text-h2 mb-2">Voice Chat</h1>
          <p className="text-foreground-muted mb-8">Hold Spacebar to talk. The AI listens, thinks, and responds automatically.</p>

          <div className="grid lg:grid-cols-[1fr_320px] gap-8">
            <div>
              <div className="card p-8 mb-6 min-h-[320px] flex flex-col items-center justify-center relative">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all ${
                  isRecording ? 'bg-accent/20 animate-pulse' : 'bg-accent/10'
                }`}>
                  {isRecording ? (
                    <Mic className="w-10 h-10 text-accent" />
                  ) : (
                    <MicOff className="w-10 h-10 text-foreground-muted" />
                  )}
                </div>
                <p className="text-lg font-medium text-foreground-primary mb-2">
                  {isRecording ? 'Listening...' : 'Hold Spacebar to talk'}
                </p>
                <p className="text-sm text-foreground-muted">
                  {isRecording ? 'Release to send' : 'Or click the button below'}
                </p>

                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className={`mt-6 w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? 'bg-error text-white'
                      : 'bg-accent text-white hover:bg-accent-light'
                  }`}
                >
                  {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
              </div>

              <div className="card p-6">
                <h3 className="text-base font-semibold text-foreground-primary mb-4">Voice Settings</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-foreground-secondary">Speech Speed</label>
                      <span className="text-sm text-foreground-muted">{speed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={speed}
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                      className="w-full accent-accent"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-foreground-secondary">Auto-send after speech</label>
                    <div className="w-10 h-6 rounded-full bg-accent relative cursor-pointer">
                      <div className="absolute right-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-foreground-secondary">Allow interruption</label>
                    <div className="w-10 h-6 rounded-full bg-accent relative cursor-pointer">
                      <div className="absolute right-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-4">Voice Agents</h3>
              <div className="space-y-3">
                {VOICES.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      selectedVoice === voice.id
                        ? 'bg-accent/10 border border-accent/30'
                        : 'bg-background-secondary border border-border-subtle hover:border-border-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedVoice === voice.id ? 'bg-accent/20' : 'bg-background-tertiary'
                      }`}>
                        <User className={`w-5 h-5 ${selectedVoice === voice.id ? 'text-accent' : 'text-foreground-muted'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground-primary">{voice.name}</span>
                          <span className="text-xs text-foreground-muted">{voice.gender}</span>
                        </div>
                        <p className="text-xs text-foreground-muted">{voice.provider}</p>
                      </div>
                      {selectedVoice === voice.id && <Zap className="w-4 h-4 text-accent" />}
                    </div>
                  </button>
                ))}
              </div>

              {activeVoice && (
                <div className="card p-4 mt-4">
                  <p className="text-sm text-foreground-secondary mb-2">{activeVoice.description}</p>
                  <p className="text-xs text-foreground-muted">Languages: {activeVoice.lang}</p>
                  <button className="btn-secondary w-full mt-4 text-sm py-2.5">
                    <Play className="w-4 h-4" />
                    Preview Voice
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
