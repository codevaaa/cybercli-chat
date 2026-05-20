import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, MicOff, Volume2, VolumeX, ChevronDown, Check, Sparkles } from 'lucide-react'
import { useTTS } from '../../hooks/useTTS.js'

const VOICE_MODELS = [
  { id: 'eleven_ava', label: 'Ava', desc: 'Warm & Natural', provider: 'elevenlabs', gender: 'female', color: '#D97757' },
  { id: 'eleven_nova', label: 'Nova', desc: 'Clear & Professional', provider: 'elevenlabs', gender: 'female', color: '#7C3AED' },
  { id: 'eleven_luna', label: 'Luna', desc: 'Soft & Soothing', provider: 'elevenlabs', gender: 'female', color: '#06B6D4' },
  { id: 'eleven_orion', label: 'Orion', desc: 'Deep & Authoritative', provider: 'elevenlabs', gender: 'male', color: '#10B981' },
  { id: 'eleven_echo', label: 'Echo', desc: 'Energetic & Dynamic', provider: 'elevenlabs', gender: 'male', color: '#F59E0B' },
  { id: 'gemini_flash', label: 'Gemini', desc: 'AI Native Voice', provider: 'gemini', gender: 'neutral', color: '#4285F4' },
]

const BAR_COUNT = 40

function WaveformBars({ isActive, color = '#D97757', intensity = 1 }) {
  const bars = Array.from({ length: BAR_COUNT })
  return (
    <div className="flex items-center justify-center gap-[3px] h-24">
      {bars.map((_, i) => {
        const delay = (i / BAR_COUNT) * 0.6
        const baseH = 6 + Math.sin(i * 0.4) * 4
        const activeH = isActive ? 8 + Math.abs(Math.sin(i * 0.8 + Date.now() * 0.001)) * 50 * intensity : baseH
        return (
          <motion.div
            key={i}
            className="rounded-full flex-shrink-0"
            style={{ width: 3, backgroundColor: color, opacity: isActive ? 0.85 : 0.25 }}
            animate={isActive ? {
              height: [baseH, baseH + Math.random() * 50 * intensity + 10, baseH],
              opacity: [0.6, 1, 0.6],
            } : { height: baseH, opacity: 0.25 }}
            transition={isActive ? {
              duration: 0.5 + Math.random() * 0.5,
              repeat: Infinity,
              delay,
              ease: 'easeInOut',
            } : { duration: 0.4 }}
          />
        )
      })}
    </div>
  )
}

function VoiceModelSelector({ selectedVoice, onSelect }) {
  const [open, setOpen] = useState(false)
  const selected = VOICE_MODELS.find(v => v.id === selectedVoice) || VOICE_MODELS[0]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-sm font-medium text-white/80"
      >
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selected.color }} />
        {selected.label}
        <span className="text-white/40 text-xs">{selected.desc}</span>
        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-full mb-2 left-0 w-72 bg-[#1E1E24] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50"
          >
            <div className="p-2">
              <p className="text-xs text-white/30 uppercase tracking-wider font-medium px-3 py-2">Select Voice</p>
              {VOICE_MODELS.map(voice => (
                <button
                  key={voice.id}
                  onClick={() => { onSelect(voice.id); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: `${voice.color}22`, border: `1px solid ${voice.color}44` }}>
                    {voice.label[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{voice.label}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${voice.color}22`, color: voice.color }}>
                        {voice.provider === 'elevenlabs' ? 'ElevenLabs' : 'Gemini'}
                      </span>
                    </div>
                    <p className="text-xs text-white/40">{voice.desc}</p>
                  </div>
                  {voice.id === selectedVoice && (
                    <Check className="w-4 h-4 flex-shrink-0" style={{ color: voice.color }} />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function VoiceChatModal({ isOpen, onClose, onSendMessage }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('eleven_ava')
  const [status, setStatus] = useState('idle') // idle | listening | processing | speaking
  const recognitionRef = useRef(null)
  const finalTranscriptRef = useRef('')
  const { speak, stop, isPlaying } = useTTS()

  const selectedVoiceModel = VOICE_MODELS.find(v => v.id === selectedVoice) || VOICE_MODELS[0]

  const initRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return null
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) { final += t; finalTranscriptRef.current += t }
        else interim += t
      }
      setTranscript((finalTranscriptRef.current + interim).trim())
    }
    rec.onerror = () => setIsListening(false)
    rec.onend = () => { if (isListening) rec.start() }
    return rec
  }, [isListening])

  useEffect(() => {
    recognitionRef.current = initRecognition()
    return () => { recognitionRef.current?.stop() }
  }, [])

  useEffect(() => {
    setStatus(isListening ? 'listening' : isPlaying ? 'speaking' : 'idle')
  }, [isListening, isPlaying])

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported. Please use Chrome or Edge.')
      return
    }
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      finalTranscriptRef.current = ''
      setTranscript('')
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const handleSend = () => {
    if (transcript.trim()) {
      onSendMessage(transcript)
      setTranscript('')
      finalTranscriptRef.current = ''
      setIsListening(false)
      recognitionRef.current?.stop()
    }
  }

  const handleInterrupt = () => {
    stop()
    setIsListening(false)
    recognitionRef.current?.stop()
  }

  const statusLabel = {
    idle: 'Tap the mic to speak',
    listening: 'Listening…',
    processing: 'Thinking…',
    speaking: 'Speaking — tap to interrupt',
  }[status]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="voice-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: 'radial-gradient(ellipse at center, #1a1420 0%, #0D0D12 100%)' }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Brand */}
          <div className="absolute top-6 left-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#D97757]/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#D97757]" />
            </div>
            <span className="text-sm font-semibold text-white/60">CyberCli Voice</span>
          </div>

          {/* Main Content */}
          <div className="flex flex-col items-center gap-8 w-full max-w-lg px-6">
            {/* Waveform */}
            <div className="w-full">
              <WaveformBars
                isActive={status === 'listening' || status === 'speaking'}
                color={status === 'speaking' ? '#7C3AED' : selectedVoiceModel.color}
                intensity={status === 'speaking' ? 0.7 : 1}
              />
            </div>

            {/* Status */}
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="text-center"
            >
              <p className="text-lg font-medium text-white/80">{statusLabel}</p>
              {transcript && (
                <p className="mt-2 text-sm text-white/40 max-w-md leading-relaxed">
                  &ldquo;{transcript}&rdquo;
                </p>
              )}
            </motion.div>

            {/* Mic Button */}
            <div className="flex flex-col items-center gap-4">
              <motion.button
                onClick={status === 'speaking' ? handleInterrupt : toggleListening}
                className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: isListening
                    ? `radial-gradient(circle, ${selectedVoiceModel.color}33, ${selectedVoiceModel.color}11)`
                    : 'rgba(255,255,255,0.06)',
                  border: `2px solid ${isListening ? selectedVoiceModel.color : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: isListening ? `0 0 40px ${selectedVoiceModel.color}40` : 'none',
                }}
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.05 }}
              >
                {/* Pulse ring when listening */}
                {isListening && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ border: `2px solid ${selectedVoiceModel.color}` }}
                    animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
                {isListening
                  ? <MicOff className="w-8 h-8 text-white" />
                  : status === 'speaking'
                    ? <VolumeX className="w-8 h-8 text-white" />
                    : <Mic className="w-8 h-8 text-white/70" />
                }
              </motion.button>

              {/* Send button */}
              <AnimatePresence>
                {transcript && !isListening && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    transition={{ duration: 0.2 }}
                    onClick={handleSend}
                    className="px-6 py-2.5 rounded-full text-sm font-medium text-white transition-all"
                    style={{ background: selectedVoiceModel.color, boxShadow: `0 4px 20px ${selectedVoiceModel.color}40` }}
                  >
                    Send Message →
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Voice Selector */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs text-white/30 uppercase tracking-wider">Voice Model</p>
              <VoiceModelSelector selectedVoice={selectedVoice} onSelect={setSelectedVoice} />
            </div>

            {/* Footer note */}
            <p className="text-xs text-white/20 text-center">
              Powered by ElevenLabs via Puter · Gemini Flash TTS · Web Speech API
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
