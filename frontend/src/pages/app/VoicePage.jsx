import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mic, MicOff, Volume2, Settings, Play, Pause, User, Zap, ArrowRight } from 'lucide-react'
import { Tooltip } from '../../components/ui/Tooltip.jsx'
import tts from '../../lib/tts.js'

const VOICES = [
  { id: 'gemini_female',   name: 'Saraswati', gender: 'Female', provider: 'Gemini TTS', description: 'Warm, empathetic divine feminine voice (Aoede)', lang: 'EN, HI, ES, FR' },
  { id: 'gemini_female_2', name: 'Lakshmi',   gender: 'Female', provider: 'Gemini TTS', description: 'Firm, precise, nurturing voice (Kore)',          lang: 'EN, HI, DE, FR' },
  { id: 'gemini_male_1',   name: 'Madhav',    gender: 'Male',   provider: 'Gemini TTS', description: 'Deep, authoritative, divine voice (Charon)',     lang: 'EN, HI, ES' },
]

export default function VoicePage() {
  const navigate = useNavigate()
  const [selectedVoice, setSelectedVoice] = useState('gemini_flash')
  const [speed, setSpeed] = useState(1.0)
  const [previewPlaying, setPreviewPlaying] = useState(false)

  const activeVoice = VOICES.find(v => v.id === selectedVoice)

  const handleSpeedChange = (e) => {
    const val = parseFloat(e.target.value)
    setSpeed(val)
    tts.setSpeed(val)
  }

  const handlePreview = async () => {
    if (previewPlaying) {
      tts.stop()
      setPreviewPlaying(false)
      return
    }
    setPreviewPlaying(true)
    tts.setProvider('gemini')
    tts.setVoice(activeVoice.id)
    
    try {
      await tts.speak(`Hello, my name is ${activeVoice.name}. ${activeVoice.description}.`)
    } finally {
      setPreviewPlaying(false)
    }
  }

  return (
    <div className="min-h-screen pt-20 pb-12 bg-background-primary">
      <div className="section-padding">
        <div className="container-custom max-w-4xl">
          <Tooltip content="Return to Chat" position="right">
            <Link to="/chat" className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground-primary transition-colors mb-8">
              <ArrowLeft className="w-4 h-4" />
              Back to chat
            </Link>
          </Tooltip>

          <h1 className="text-h2 mb-2">Voice Chat</h1>
          <p className="text-foreground-muted mb-8">Hold Spacebar to talk. The AI listens, thinks, and responds automatically.</p>

          <div className="grid lg:grid-cols-[1fr_320px] gap-8">
            <div>
              <div className="card p-8 mb-6 min-h-[320px] flex flex-col items-center justify-center relative">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-accent/10 transition-all hover:bg-accent/20 cursor-pointer`}
                     onClick={() => navigate('/voice-chat')}>
                  <Mic className="w-10 h-10 text-accent animate-pulse" />
                </div>
                <p className="text-lg font-medium text-foreground-primary mb-2">
                  Ready to talk?
                </p>
                <p className="text-sm text-foreground-muted mb-6 text-center">
                  Configure your preferred voice settings here, then enter the full-screen voice chat mode.
                </p>

                <button
                  onClick={() => navigate('/voice-chat')}
                  className="w-full max-w-[240px] h-14 rounded-xl flex items-center justify-center gap-2 font-bold bg-accent text-white hover:bg-accent-light transition-all hover:shadow-[0_0_20px_rgba(217,119,87,0.3)]"
                >
                  <Mic className="w-5 h-5" />
                  Start Voice Chat
                  <ArrowRight className="w-4 h-4 ml-1" />
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
                      onChange={handleSpeedChange}
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
                  <button onClick={handlePreview} className="btn-secondary w-full mt-4 text-sm py-2.5">
                    {previewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {previewPlaying ? 'Stop Preview' : 'Preview Voice'}
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
