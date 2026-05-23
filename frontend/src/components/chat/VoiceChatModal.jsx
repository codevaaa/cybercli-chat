import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, MicOff, VolumeX, ChevronLeft, ChevronRight, Send } from 'lucide-react'

function StarIcon({ size = 16, color = '#D97757' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path
        d="M32 4 L35.5 28.5 L60 32 L35.5 35.5 L32 60 L28.5 35.5 L4 32 L28.5 28.5 Z"
        fill={color}
        opacity="0.9"
      />
      <path
        d="M32 12 L34 30 L52 32 L34 34 L32 52 L30 34 L12 32 L30 30 Z"
        fill="white"
        opacity="0.25"
      />
    </svg>
  )
}

const VOICE_MODELS = [
  { id: 'eleven_ava',   label: 'Ava',    desc: 'Warm & Natural',          color: '#D97757', orbColors: ['#D97757', '#B85D3D', '#F4A261'] },
  { id: 'eleven_nova',  label: 'Nova',   desc: 'Clear & Professional',    color: '#06B6D4', orbColors: ['#06B6D4', '#0EA5E9', '#22D3EE'] },
  { id: 'eleven_luna',  label: 'Luna',   desc: 'Soft & Soothing',         color: '#10B981', orbColors: ['#10B981', '#059669', '#34D399'] },
  { id: 'eleven_orion', label: 'Orion',  desc: 'Deep & Authoritative',    color: '#F59E0B', orbColors: ['#F59E0B', '#D97706', '#FCD34D'] },
  { id: 'eleven_echo',  label: 'Echo',   desc: 'Energetic & Dynamic',     color: '#EF4444', orbColors: ['#EF4444', '#DC2626', '#F87171'] },
  { id: 'gemini_flash', label: 'Gemini', desc: 'AI Native Voice',         color: '#4285F4', orbColors: ['#4285F4', '#1A73E8', '#74AAFF'] },
]

const BAR_COUNT = 36

function WaveformBars({ isActive, color = '#D97757', intensity = 1 }) {
  const barsRef = useRef([])
  if (barsRef.current.length !== BAR_COUNT) {
    barsRef.current = Array.from({ length: BAR_COUNT }, (_, i) => ({
      baseH: 6 + Math.sin(i * 0.5) * 4,
      delay: (i / BAR_COUNT) * 0.8,
      range: Math.random() * 40 * intensity + 12,
      dur: 0.4 + Math.random() * 0.5,
    }))
  }

  return (
    <div className="flex items-center justify-center gap-[2px] h-16 w-full px-4">
      {barsRef.current.map((bar, i) => (
        <motion.div
          key={i}
          className="rounded-full flex-shrink-0"
          style={{ width: 3, backgroundColor: color }}
          animate={isActive ? {
            height: [bar.baseH, bar.baseH + bar.range, bar.baseH + bar.range * 0.3, bar.baseH],
            opacity: [0.5, 1, 0.8, 0.5],
          } : {
            height: bar.baseH,
            opacity: 0.2,
          }}
          transition={isActive ? {
            duration: bar.dur,
            repeat: Infinity,
            delay: bar.delay,
            ease: 'easeInOut',
          } : { duration: 0.4 }}
        />
      ))}
    </div>
  )
}

// Animated orb like ChatGPT voice mode
function VoiceOrb({ status, color, orbColors }) {
  const isListening = status === 'listening'
  const isSpeaking = status === 'speaking'
  const isProcessing = status === 'processing'
  const isActive = isListening || isSpeaking

  const [c1, c2, c3] = isSpeaking
    ? ['#FF7043', '#FF5722', '#FF8A65']
    : isListening
      ? ['#FFFFFF', '#E0E0FF', '#CCCCFF']
      : orbColors

  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      {/* Outer pulse rings */}
      {isActive && [1, 2, 3].map(ring => (
        <motion.div
          key={ring}
          className="absolute rounded-full"
          style={{ border: `1px solid ${c1}30` }}
          animate={{
            width: [200, 200 + ring * 40],
            height: [200, 200 + ring * 40],
            opacity: [0.4, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: ring * 0.5,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Main orb */}
      <motion.div
        className="rounded-full flex items-center justify-center overflow-hidden relative"
        style={{ width: 200, height: 200 }}
        animate={isActive ? {
          scale: [1, 1.04, 0.98, 1.02, 1],
        } : { scale: 1 }}
        transition={isActive ? {
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        } : { duration: 0.5 }}
      >
        {/* Base gradient */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 40% 35%, ${c1}CC 0%, ${c2}99 40%, ${c3}66 70%, transparent 100%)`,
          }}
        />

        {/* Shimmer blob 1 */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 120,
            height: 120,
            background: `radial-gradient(circle, ${c1}88 0%, transparent 70%)`,
            filter: 'blur(20px)',
          }}
          animate={isActive ? {
            x: [-20, 20, -10, 15, -20],
            y: [-15, 10, -20, 5, -15],
          } : { x: 0, y: 0 }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Shimmer blob 2 */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 80,
            height: 80,
            background: `radial-gradient(circle, ${c3}66 0%, transparent 70%)`,
            filter: 'blur(16px)',
          }}
          animate={isActive ? {
            x: [20, -25, 15, -10, 20],
            y: [10, -20, 15, -10, 10],
          } : { x: 0, y: 0 }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.8,
          }}
        />

        {/* Glass highlight */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: '60%',
            height: '40%',
            top: '12%',
            left: '15%',
            background: 'radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.35) 0%, transparent 70%)',
            filter: 'blur(4px)',
          }}
        />

        {/* Processing spinner */}
        {isProcessing && !isActive && (
          <motion.div
            className="absolute rounded-full border-2 border-t-transparent"
            style={{ width: 40, height: 40, borderColor: `${c1} transparent transparent transparent` }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </motion.div>
    </div>
  )
}

// ── Browser Web Speech TTS (Primary) ──────────────────────────────────────────
function browserSpeak(text, onEnd) {
  if (!window.speechSynthesis) return false
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 1.0
  utt.pitch = 1.0
  utt.volume = 1.0
  if (onEnd) utt.onend = onEnd
  window.speechSynthesis.speak(utt)
  return true
}

function browserStop() {
  if (window.speechSynthesis) window.speechSynthesis.cancel()
}

export default function VoiceChatModal({
  isOpen,
  onClose,
  onSendMessage,
  isPlaying,
  isProcessing,
  speak: externalSpeak,
  stop: externalStop,
  updateProvider,
  updateVoice
}) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [voiceIndex, setVoiceIndex] = useState(0)
  const [status, setStatus] = useState('idle') // idle | listening | processing | speaking
  const [countdown, setCountdown] = useState(null)
  const [localPlaying, setLocalPlaying] = useState(false)

  const recognitionRef = useRef(null)
  const finalTranscriptRef = useRef('')
  const silenceTimerRef = useRef(null)
  const wasListeningRef = useRef(false)
  const countdownRef = useRef(null)

  const selectedVoice = VOICE_MODELS[voiceIndex] || VOICE_MODELS[0]
  const effectivePlaying = isPlaying || localPlaying

  // Sync voice model selection to parent
  useEffect(() => {
    const model = VOICE_MODELS[voiceIndex]
    if (!model) return
    const provider = model.id.startsWith('gemini') ? 'gemini' : 'puter'
    const voice = model.label.toLowerCase()
    if (updateProvider) updateProvider(provider)
    if (updateVoice) updateVoice(voice)
  }, [voiceIndex])

  // Save/load voice from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('voice_modal_index')
    if (saved !== null) {
      const idx = parseInt(saved, 10)
      if (!isNaN(idx) && idx >= 0 && idx < VOICE_MODELS.length) setVoiceIndex(idx)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('voice_modal_index', String(voiceIndex))
  }, [voiceIndex])

  // Update status
  useEffect(() => {
    setStatus(
      effectivePlaying ? 'speaking' :
      isListening ? 'listening' :
      isProcessing ? 'processing' :
      'idle'
    )
  }, [isListening, isProcessing, effectivePlaying])

  // Auto-pause mic during speech and resume after
  useEffect(() => {
    if (effectivePlaying) {
      wasListeningRef.current = isListening
      if (recognitionRef.current && isListening) {
        try { recognitionRef.current.stop() } catch {}
      }
      clearTimeout(silenceTimerRef.current)
      clearInterval(countdownRef.current)
      setCountdown(null)
    } else if (wasListeningRef.current && recognitionRef.current) {
      setTimeout(() => {
        finalTranscriptRef.current = ''
        setTranscript('')
        try { recognitionRef.current.start() } catch {}
        setIsListening(true)
      }, 350)
    }
  }, [effectivePlaying])

  const startSilenceTimer = useCallback(() => {
    clearTimeout(silenceTimerRef.current)
    clearInterval(countdownRef.current)
    setCountdown(1.5)
    let remaining = 1.5
    countdownRef.current = setInterval(() => {
      remaining -= 0.1
      setCountdown(Math.max(0, remaining))
    }, 100)
    silenceTimerRef.current = setTimeout(() => {
      clearInterval(countdownRef.current)
      setCountdown(null)
      if (finalTranscriptRef.current.trim()) {
        const text = finalTranscriptRef.current.trim()
        onSendMessage(text)
        finalTranscriptRef.current = ''
        setTranscript('')
        setIsListening(false)
        wasListeningRef.current = false
        try { recognitionRef.current?.stop() } catch {}
      }
    }, 1500)
  }, [onSendMessage])

  const initRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return null
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += t
          startSilenceTimer()
        } else {
          interim += t
          clearTimeout(silenceTimerRef.current)
          clearInterval(countdownRef.current)
          setCountdown(null)
        }
      }
      setTranscript((finalTranscriptRef.current + interim).trim())
    }
    rec.onerror = () => {
      setIsListening(false)
      clearTimeout(silenceTimerRef.current)
      clearInterval(countdownRef.current)
      setCountdown(null)
    }
    rec.onend = () => {
      if (wasListeningRef.current && !effectivePlaying) {
        try { rec.start() } catch {}
      } else {
        setIsListening(false)
      }
    }
    return rec
  }, [startSilenceTimer, effectivePlaying])

  useEffect(() => {
    recognitionRef.current = initRecognition()
    return () => {
      recognitionRef.current?.stop()
      clearTimeout(silenceTimerRef.current)
      clearInterval(countdownRef.current)
      browserStop()
    }
  }, [])

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported. Please use Chrome or Edge.')
      return
    }
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
      wasListeningRef.current = false
      clearTimeout(silenceTimerRef.current)
      clearInterval(countdownRef.current)
      setCountdown(null)
    } else {
      finalTranscriptRef.current = ''
      setTranscript('')
      wasListeningRef.current = true
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (e) {
        recognitionRef.current = initRecognition()
        if (recognitionRef.current) {
          recognitionRef.current.start()
          setIsListening(true)
        }
      }
    }
  }

  const handleInterrupt = () => {
    browserStop()
    if (externalStop) externalStop()
    setLocalPlaying(false)
    clearTimeout(silenceTimerRef.current)
    clearInterval(countdownRef.current)
    setCountdown(null)
  }

  const handleSend = () => {
    if (transcript.trim()) {
      clearTimeout(silenceTimerRef.current)
      clearInterval(countdownRef.current)
      setCountdown(null)
      onSendMessage(transcript)
      setTranscript('')
      finalTranscriptRef.current = ''
      setIsListening(false)
      wasListeningRef.current = false
      recognitionRef.current?.stop()
    }
  }

  const prevVoice = () => setVoiceIndex(i => (i - 1 + VOICE_MODELS.length) % VOICE_MODELS.length)
  const nextVoice = () => setVoiceIndex(i => (i + 1) % VOICE_MODELS.length)

  const prevModel = VOICE_MODELS[(voiceIndex - 1 + VOICE_MODELS.length) % VOICE_MODELS.length]
  const nextModel = VOICE_MODELS[(voiceIndex + 1) % VOICE_MODELS.length]

  const statusLabel = {
    idle: 'Tap mic to speak',
    listening: countdown !== null ? `Sending in ${countdown.toFixed(1)}s…` : 'Listening…',
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
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex flex-col items-center"
          style={{ background: '#0a0a0f' }}
        >
          {/* Subtle ambient bg glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${selectedVoice.color}12 0%, transparent 70%)`,
            }}
          />

          {/* Top bar */}
          <div className="w-full flex items-center justify-between px-6 pt-6 pb-2 flex-shrink-0 relative z-10">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#D97757]/15 flex items-center justify-center border border-[#D97757]/20">
                <StarIcon size={18} color="#D97757" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white/80">CyberCli</span>
                <div className="text-[10px] text-white/30 font-medium tracking-wider">by CyberMindCLI</div>
              </div>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main content — centered */}
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md px-6 gap-8 relative z-10">

            {/* Animated orb */}
            <VoiceOrb
              status={status}
              color={selectedVoice.color}
              orbColors={selectedVoice.orbColors}
            />

            {/* Voice name + description */}
            <AnimatePresence mode="wait">
              <motion.div
                key={voiceIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                <h2 className="text-2xl font-bold text-white">{selectedVoice.label}</h2>
                <p className="text-sm text-white/40 mt-1">{selectedVoice.desc}</p>
              </motion.div>
            </AnimatePresence>

            {/* Horizontal voice carousel */}
            <div className="flex items-center gap-4 w-full justify-center">
              <button
                onClick={prevVoice}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-6">
                <span className="text-sm text-white/25 font-medium w-16 text-right">{prevModel.label}</span>
                <div className="flex flex-col items-center">
                  <span
                    className="text-base font-bold"
                    style={{ color: selectedVoice.color }}
                  >
                    {selectedVoice.label}
                  </span>
                  <div className="flex gap-1 mt-1.5">
                    {VOICE_MODELS.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setVoiceIndex(i)}
                        className="rounded-full transition-all"
                        style={{
                          width: i === voiceIndex ? 14 : 5,
                          height: 5,
                          background: i === voiceIndex ? selectedVoice.color : 'rgba(255,255,255,0.15)',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-sm text-white/25 font-medium w-16 text-left">{nextModel.label}</span>
              </div>

              <button
                onClick={nextVoice}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Waveform */}
            <WaveformBars
              isActive={status === 'listening' || status === 'speaking'}
              color={status === 'speaking' ? '#D97757' : selectedVoice.color}
              intensity={status === 'speaking' ? 0.6 : 1.0}
            />

            {/* Status text + transcript */}
            <div className="text-center min-h-[48px]">
              <AnimatePresence mode="wait">
                <motion.p
                  key={status + String(countdown !== null)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="text-sm font-medium"
                  style={{
                    color: status === 'speaking' ? '#D97757'
                      : status === 'listening' ? selectedVoice.color
                      : 'rgba(255,255,255,0.5)'
                  }}
                >
                  {statusLabel}
                </motion.p>
              </AnimatePresence>
              {transcript && (
                <p className="mt-1.5 text-xs text-white/30 max-w-xs leading-relaxed">
                  &ldquo;{transcript}&rdquo;
                </p>
              )}
              {countdown !== null && (
                <div className="mt-2 mx-auto w-32 h-0.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: selectedVoice.color }}
                    initial={{ width: '100%' }}
                    animate={{ width: `${(countdown / 1.5) * 100}%` }}
                    transition={{ duration: 0.1, ease: 'linear' }}
                  />
                </div>
              )}
            </div>

            {/* Mic button */}
            <div className="flex flex-col items-center gap-4">
              <motion.button
                onClick={status === 'speaking' ? handleInterrupt : toggleListening}
                className="relative w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: isListening
                    ? `radial-gradient(circle, ${selectedVoice.color}30, ${selectedVoice.color}10)`
                    : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${isListening ? selectedVoice.color : 'rgba(255,255,255,0.10)'}`,
                  boxShadow: isListening ? `0 0 40px ${selectedVoice.color}35` : 'none',
                }}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.07 }}
              >
                {isListening && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ border: `2px solid ${selectedVoice.color}` }}
                    animate={{ scale: [1, 1.45], opacity: [0.5, 0] }}
                    transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
                {isListening
                  ? <MicOff className="w-8 h-8 text-white" />
                  : status === 'speaking'
                    ? <VolumeX className="w-8 h-8 text-white" />
                    : <Mic className="w-8 h-8 text-white/60" />
                }
              </motion.button>

              {/* Manual send */}
              <AnimatePresence>
                {transcript && !isListening && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.85, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: 8 }}
                    transition={{ duration: 0.2 }}
                    onClick={handleSend}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white"
                    style={{
                      background: selectedVoice.color,
                      boxShadow: `0 4px 24px ${selectedVoice.color}40`,
                    }}
                  >
                    <Send className="w-4 h-4" />
                    Send Message
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer */}
          <div className="pb-8 relative z-10">
            <p className="text-[10px] text-white/20 text-center uppercase tracking-widest font-semibold">
              CyberCli Secure Voice Channel
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
