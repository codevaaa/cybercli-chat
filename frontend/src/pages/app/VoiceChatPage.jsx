import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Settings, Volume2, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTTS } from '../../hooks/useTTS.js'
import { API_BASE } from '../../lib/api.js'
import { motion, AnimatePresence } from 'framer-motion'
import { Tooltip } from '../../components/ui/Tooltip.jsx'

const VOICE_MODELS = [
  { id: 'gemini_flash',  label: 'Sahadeva (Gemini Flash)', desc: 'AI Native Voice — Fast & Friendly', color: '#4285F4', orbColors: ['#4285F4', '#1A73E8', '#74AAFF'] },
  { id: 'gemini_pro',    label: 'Sahadeva Pro (Gemini Pro)', desc: 'Advanced AI Voice — Analytical', color: '#8B5CF6', orbColors: ['#8B5CF6', '#6D28D9', '#DDD6FE'] },
  { id: 'mistral_large', label: 'Vayu (Mistral Large)', desc: 'Technical & Expressive Advisor',    color: '#D97757', orbColors: ['#D97757', '#B85D3D', '#F4A261'] },
]

const VOICE_BRAINS = {
  gemini_flash: {
    model: 'gemini/gemini-2.5-flash',
    prompt: 'You are Sahadeva, a warm, friendly conversational AI voice assistant. Keep responses brief and natural (max 1-2 short sentences). Never use markdown, lists, asterisks, or code blocks — your text will be spoken aloud.',
  },
  gemini_pro: {
    model: 'gemini/gemini-2.5-pro',
    prompt: 'You are Sahadeva Pro, an advanced analytical voice assistant. Keep responses precise and concise (max 1-2 sentences). Never use markdown or lists. Speak clearly and professionally.',
  },
  mistral_large: {
    model: 'mistral/mistral-large-latest',
    prompt: 'You are Vayu, a technical and wise strategic advisor. Keep responses thoughtful and short (max 1-2 sentences). Never use markdown formatting. Speak with confidence and authority.',
  },
}

const BAR_COUNT = 32

function WaveformBars({ isActive, color = '#D97757', intensity = 1 }) {
  const barsRef = useRef([])
  if (barsRef.current.length !== BAR_COUNT) {
    barsRef.current = Array.from({ length: BAR_COUNT }, (_, i) => ({
      baseH: 6 + Math.sin(i * 0.5) * 4,
      delay: (i / BAR_COUNT) * 0.8,
      range: Math.random() * 32 * intensity + 10,
      dur: 0.4 + Math.random() * 0.5,
    }))
  }
  return (
    <div className="flex items-center justify-center gap-[4px] h-12 w-full px-4">
      {barsRef.current.map((bar, i) => (
        <motion.div
          key={i}
          className="rounded-full flex-shrink-0"
          style={{ width: 3, backgroundColor: color }}
          animate={isActive ? {
            height: [bar.baseH, bar.baseH + bar.range, bar.baseH + bar.range * 0.3, bar.baseH],
            opacity: [0.5, 1, 0.8, 0.5],
          } : { height: bar.baseH, opacity: 0.2 }}
          transition={isActive ? {
            duration: bar.dur, repeat: Infinity, delay: bar.delay, ease: 'easeInOut',
          } : { duration: 0.4 }}
        />
      ))}
    </div>
  )
}

function VoiceSphere({ isActive, orbColors }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      {isActive && [1, 2, 3].map(ring => (
        <motion.div
          key={ring}
          className="absolute rounded-full pointer-events-none"
          style={{ border: `1px solid ${orbColors[0]}20` }}
          animate={{ width: [200, 200 + ring * 35], height: [200, 200 + ring * 35], opacity: [0.4, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: ring * 0.5, ease: 'easeOut' }}
        />
      ))}
      <motion.div
        className="rounded-full flex items-center justify-center overflow-hidden relative shadow-2xl"
        style={{ width: 200, height: 200, boxShadow: isActive ? `0 0 40px ${orbColors[0]}40` : 'none' }}
        animate={isActive ? { scale: [1, 1.03, 0.97, 1.02, 1] } : { scale: 1 }}
        transition={isActive ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.5 }}
      >
        <div className="absolute inset-0 rounded-full" style={{
          background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${orbColors[2] || '#b3e5fc'} 30%, ${orbColors[1]} 75%, ${orbColors[0]} 100%)`,
        }} />
        <motion.div
          className="absolute rounded-full opacity-60 mix-blend-overlay filter blur-xl"
          style={{ width: '140%', height: '140%', background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 60%)' }}
          animate={isActive ? { x: [-30, 20, -10, 15, -30], y: [-25, 10, -20, 5, -25] } : { x: -10, y: -10 }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 rounded-full mix-blend-color opacity-30" style={{ backgroundColor: orbColors[0] }} />
        <div className="absolute rounded-full pointer-events-none" style={{
          width: '70%', height: '40%', top: '8%', left: '15%',
          background: 'radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.4) 0%, transparent 75%)',
          filter: 'blur(3px)',
        }} />
      </motion.div>
    </div>
  )
}

export default function VoiceChatPage() {
  const [step, setStep] = useState('select')
  const [voiceIndex, setVoiceIndex] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [lastReply, setLastReply] = useState('')
  const [countdown, setCountdown] = useState(null)
  const [statusMsg, setStatusMsg] = useState('Listening…')
  const [error, setError] = useState(null)

  const { speak, stop, isPlaying, isLoading: ttsLoading, updateProvider, updateVoice } = useTTS()

  const selectedVoice = VOICE_MODELS[voiceIndex] || VOICE_MODELS[0]
  const prevVoice = VOICE_MODELS[(voiceIndex - 1 + VOICE_MODELS.length) % VOICE_MODELS.length]
  const nextVoice = VOICE_MODELS[(voiceIndex + 1) % VOICE_MODELS.length]

  // ── Stable refs — never change, closures always see fresh values ──────────
  const recognitionRef = useRef(null)
  const isListeningRef = useRef(false)
  const isPlayingRef = useRef(false)
  const isProcessingRef = useRef(false)
  const stepRef = useRef('select')
  const voiceIndexRef = useRef(0)
  const finalTranscriptRef = useRef('')
  const silenceTimerRef = useRef(null)
  const countdownRef = useRef(null)
  const abortControllerRef = useRef(null)
  const messagesRef = useRef([]) // conversation history (no setState needed for AI calls)

  // Keep refs in sync
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { isProcessingRef.current = isProcessing }, [isProcessing])
  useEffect(() => { isListeningRef.current = isListening }, [isListening])
  useEffect(() => { stepRef.current = step }, [step])
  useEffect(() => { voiceIndexRef.current = voiceIndex }, [voiceIndex])

  // ── Load saved voice index ───────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('voice_page_index')
    if (saved !== null) {
      const idx = parseInt(saved, 10)
      if (!isNaN(idx) && idx >= 0 && idx < VOICE_MODELS.length) setVoiceIndex(idx)
    }
  }, [])

  // ── Sync voice choice to TTS hook when session becomes active ────────────
  useEffect(() => {
    if (step === 'active') {
      updateProvider('gemini')
      updateVoice(selectedVoice.id)
    }
  }, [step, voiceIndex]) // eslint-disable-line

  // ── Core: send text to AI and stream back sentence-by-sentence ───────────
  const sendToAI = useCallback(async (text) => {
    if (!text.trim() || isProcessingRef.current) return
    const userText = text.trim()
    setIsProcessing(true)
    isProcessingRef.current = true
    setStatusMsg('Thinking…')
    setError(null)

    // Stop any ongoing recognition while AI thinks
    try { recognitionRef.current?.stop() } catch {}

    const voiceId = VOICE_MODELS[voiceIndexRef.current]?.id || 'gemini_flash'
    const brain = VOICE_BRAINS[voiceId] || VOICE_BRAINS.gemini_flash

    // Add user turn to history
    messagesRef.current = [...messagesRef.current, { role: 'user', content: userText }]

    const token = localStorage.getItem('sb-access-token')
    abortControllerRef.current = new AbortController()

    let fullReply = ''
    let spokenUpTo = 0

    const speakNextSentence = (text, flush = false) => {
      const segment = text.slice(spokenUpTo)
      const re = /[.!?]+(?:\s|$)/g
      let match
      let lastEnd = 0
      while ((match = re.exec(segment)) !== null) {
        const sentence = segment.slice(lastEnd, match.index + match[0].length).trim()
        if (sentence.length > 2) speak(sentence)
        lastEnd = match.index + match[0].length
      }
      if (flush && segment.slice(lastEnd).trim().length > 2) {
        speak(segment.slice(lastEnd).trim())
        lastEnd = segment.length
      }
      spokenUpTo += lastEnd
    }

    try {
      const res = await fetch(`${API_BASE}/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: brain.prompt, _skip_inject: true },
            ...messagesRef.current.map(m => ({ role: m.role, content: m.content })),
          ],
          model: brain.model,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`)
        throw new Error(`API error ${res.status}: ${errText}`)
      }

      setStatusMsg('Speaking…')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw)
            if (parsed.type === 'token' && parsed.content) {
              fullReply += parsed.content
              speakNextSentence(fullReply)
            }
          } catch {}
        }
      }

      // Flush any remaining text
      speakNextSentence(fullReply, true)

      // Save assistant turn to history
      messagesRef.current = [...messagesRef.current, { role: 'assistant', content: fullReply }]
      setLastReply(fullReply)
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('VoicePage AI error:', err)
      setError(err.message)
      const errMsg = 'I encountered an error. Please try again.'
      speak(errMsg)
    } finally {
      setIsProcessing(false)
      isProcessingRef.current = false
    }
  }, [speak]) // speak is stable from useTTS

  // ── Recognition lifecycle — created ONCE per session ─────────────────────
  const startRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setError('Speech recognition not supported. Use Chrome or Edge.')
      return
    }

    // If already running, don't create a new one
    if (recognitionRef.current && isListeningRef.current) return

    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    // Language detection
    const savedLang = localStorage.getItem('user_language') || 'EN'
    const langMap = { EN: 'en-US', HI: 'hi-IN', FR: 'fr-FR', DE: 'de-DE', ID: 'id-ID', ES: 'es-ES', IT: 'it-IT', JA: 'ja-JP', KO: 'ko-KR', PT: 'pt-BR', UR: 'ur-PK' }
    let lang = langMap[savedLang.toUpperCase()] || 'en-US'
    // Auto-detect Indian English users
    if (savedLang.toUpperCase() === 'EN') {
      const navLang = (navigator.language || '').toLowerCase()
      if (navLang.startsWith('hi') || navLang.startsWith('ur')) {
        lang = 'hi-IN'
      } else if (navLang.includes('in') || navLang.includes('-in')) {
        lang = 'en-IN'
      }
    }
    rec.lang = lang

    rec.onstart = () => {
      setIsListening(true)
      isListeningRef.current = true
      setStatusMsg('Listening…')
    }

    rec.onresult = (event) => {
      // If AI is speaking, interrupt it
      if (isPlayingRef.current) {
        stop()
        clearTimeout(silenceTimerRef.current)
        clearInterval(countdownRef.current)
        setCountdown(null)
      }

      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += t
          // Start silence countdown
          clearTimeout(silenceTimerRef.current)
          clearInterval(countdownRef.current)
          let remaining = 0.8
          setCountdown(remaining)
          countdownRef.current = setInterval(() => {
            remaining -= 0.1
            setCountdown(Math.max(0, remaining))
          }, 100)
          silenceTimerRef.current = setTimeout(() => {
            clearInterval(countdownRef.current)
            setCountdown(null)
            const toSend = finalTranscriptRef.current.trim()
            if (toSend) {
              finalTranscriptRef.current = ''
              setTranscript('')
              sendToAI(toSend)
            }
          }, 800)
        } else {
          interim += t
          // Cancel countdown while still speaking
          clearTimeout(silenceTimerRef.current)
          clearInterval(countdownRef.current)
          setCountdown(null)
        }
      }
      setTranscript((finalTranscriptRef.current + interim).trim())
    }

    rec.onerror = (e) => {
      console.warn('Speech recognition error:', e.error)
      isListeningRef.current = false
      setIsListening(false)
      // Auto-restart on recoverable errors
      if (e.error === 'no-speech' || e.error === 'audio-capture') {
        setTimeout(() => {
          if (stepRef.current === 'active' && !isProcessingRef.current && !isPlayingRef.current) {
            startRecognitionSafe()
          }
        }, 500)
      }
    }

    rec.onend = () => {
      isListeningRef.current = false
      setIsListening(false)
      // Auto-restart if session still active and AI not speaking/thinking
      if (stepRef.current === 'active' && !isProcessingRef.current && !isPlayingRef.current) {
        setTimeout(() => {
          if (stepRef.current === 'active' && !isProcessingRef.current && !isPlayingRef.current) {
            startRecognitionSafe()
          }
        }, 200)
      }
    }

    recognitionRef.current = rec
    try {
      rec.start()
    } catch (err) {
      console.warn('Recognition start error:', err)
    }
  }, [sendToAI, stop]) // eslint-disable-line

  // Safe wrapper that doesn't create a new instance if already running
  const startRecognitionSafe = useCallback(() => {
    if (isListeningRef.current) return
    if (isProcessingRef.current || isPlayingRef.current) return
    startRecognition()
  }, [startRecognition])

  // Restart mic after AI finishes speaking
  useEffect(() => {
    if (step === 'active' && !isPlaying && !ttsLoading && !isProcessing && !isListening) {
      const t = setTimeout(() => startRecognitionSafe(), 300)
      return () => clearTimeout(t)
    }
  }, [isPlaying, ttsLoading, isProcessing, isListening, step, startRecognitionSafe])

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop() } catch {}
      clearTimeout(silenceTimerRef.current)
      clearInterval(countdownRef.current)
      abortControllerRef.current?.abort()
      stop()
    }
  }, []) // eslint-disable-line

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handlePrev = () => {
    const idx = (voiceIndex - 1 + VOICE_MODELS.length) % VOICE_MODELS.length
    setVoiceIndex(idx)
    localStorage.setItem('voice_page_index', String(idx))
  }

  const handleNext = () => {
    const idx = (voiceIndex + 1) % VOICE_MODELS.length
    setVoiceIndex(idx)
    localStorage.setItem('voice_page_index', String(idx))
  }

  const handleStartSession = async () => {
    setError(null)
    // Request mic permission explicitly before entering active step
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Microphone access denied. Please allow mic access and try again.')
      return
    }
    messagesRef.current = []
    setLastReply('')
    setTranscript('')
    finalTranscriptRef.current = ''
    setStep('active')
    // Start recognition after short delay to let UI transition settle
    setTimeout(() => startRecognition(), 400)
  }

  const handleEndSession = () => {
    abortControllerRef.current?.abort()
    stop()
    try { recognitionRef.current?.stop() } catch {}
    clearTimeout(silenceTimerRef.current)
    clearInterval(countdownRef.current)
    setStep('select')
    setIsListening(false)
    isListeningRef.current = false
    setIsProcessing(false)
    isProcessingRef.current = false
    setTranscript('')
    setCountdown(null)
  }

  // ── Status label ─────────────────────────────────────────────────────────
  const statusLabel = isProcessing
    ? 'Thinking…'
    : isPlaying
    ? 'Speaking…'
    : countdown !== null
    ? `Sending in ${countdown.toFixed(1)}s…`
    : isListening
    ? 'Listening…'
    : 'Ready…'

  const statusColor = isPlaying
    ? '#ffffff'
    : isListening
    ? selectedVoice.color
    : 'rgba(255,255,255,0.4)'

  return (
    <div className="h-screen flex flex-col" style={{ background: '#111116' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04] bg-[#14141c]/60 backdrop-blur-xl relative z-10">
        <div className="flex items-center gap-3">
          <Tooltip content="Return to Chat" position="right">
            <Link
              to="/chat"
              onClick={handleEndSession}
              className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors border border-transparent hover:border-white/5"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Tooltip>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#D97757]/15 flex items-center justify-center border border-[#D97757]/20">
              <Volume2 className="w-4 h-4 text-[#D97757]" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">Voice Channel</h1>
              <p className="text-[10px] text-gray-500 font-medium">Hands-free AI conversation</p>
            </div>
          </div>
        </div>
        <Tooltip content="Voice Settings" position="left">
          <Link
            to="/voice-settings"
            onClick={handleEndSession}
            className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors border border-transparent hover:border-white/5"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </Tooltip>
      </header>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${selectedVoice.color}12 0%, transparent 70%)` }}
        />

        <div className="w-full max-w-md flex flex-col items-center justify-center gap-8 relative z-10">
          <AnimatePresence mode="wait">
            {step === 'select' ? (
              <motion.div
                key="select-stage"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="w-full flex flex-col items-center gap-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white tracking-tight">Choose your voice partner</h2>
                  <p className="text-xs text-gray-400 mt-1">Select a persona to begin hands-free conversation.</p>
                </div>

                {/* Voice carousel */}
                <div className="flex items-center justify-between w-full mt-4 select-none">
                  <button onClick={handlePrev} className="flex items-center gap-1.5 opacity-30 hover:opacity-100 transition-opacity w-1/4 justify-end">
                    <ChevronLeft className="w-5 h-5 text-white" />
                    <div className="hidden sm:block overflow-hidden">
                      <div className="text-xs font-semibold text-white truncate">{prevVoice.label}</div>
                    </div>
                  </button>

                  <div className="flex flex-col items-center justify-center w-2/4">
                    <VoiceSphere isActive={true} orbColors={selectedVoice.orbColors} />
                    <div className="text-center h-12 mt-5">
                      <h3 className="text-lg font-bold text-white">{selectedVoice.label}</h3>
                      <p className="text-xs text-white/50 mt-0.5">{selectedVoice.desc}</p>
                    </div>
                  </div>

                  <button onClick={handleNext} className="flex items-center gap-1.5 opacity-30 hover:opacity-100 transition-opacity w-1/4 justify-start">
                    <div className="hidden sm:block overflow-hidden">
                      <div className="text-xs font-semibold text-white truncate">{nextVoice.label}</div>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-white rotate-180" />
                  </button>
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-center max-w-xs">
                    {error}
                  </p>
                )}

                <button
                  onClick={handleStartSession}
                  className="w-full max-w-[200px] py-3 rounded-full font-bold text-black bg-white hover:bg-white/95 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg mt-2"
                >
                  Start Session
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="active-stage"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="w-full flex flex-col items-center gap-6"
              >
                {/* Orb */}
                <VoiceSphere
                  isActive={isListening || isPlaying || isProcessing}
                  orbColors={selectedVoice.orbColors}
                />

                <div className="text-center">
                  <h2 className="text-xl font-bold text-white">{selectedVoice.label}</h2>
                  <p className="text-xs text-white/40 mt-0.5">{selectedVoice.desc}</p>
                </div>

                {/* Waveform */}
                <div className="w-full py-2">
                  <WaveformBars
                    isActive={isListening || isPlaying}
                    color={selectedVoice.color}
                    intensity={isPlaying ? 0.7 : 1.3}
                  />
                </div>

                {/* Status */}
                <div className="text-center min-h-[72px] w-full px-4">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={statusLabel}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm font-semibold tracking-wide"
                      style={{ color: statusColor }}
                    >
                      {statusLabel}
                    </motion.p>
                  </AnimatePresence>

                  {transcript ? (
                    <p className="mt-2 text-xs text-white/50 max-w-xs mx-auto leading-relaxed italic">
                      &ldquo;{transcript}&rdquo;
                    </p>
                  ) : lastReply && !isPlaying ? (
                    <p className="mt-2 text-xs text-white/30 max-w-xs mx-auto leading-relaxed line-clamp-2">
                      {lastReply}
                    </p>
                  ) : null}

                  {/* Countdown bar */}
                  {countdown !== null && (
                    <div className="mt-2 mx-auto w-32 h-0.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: selectedVoice.color }}
                        initial={{ width: '100%' }}
                        animate={{ width: `${(countdown / 0.8) * 100}%` }}
                        transition={{ duration: 0.1, ease: 'linear' }}
                      />
                    </div>
                  )}

                  {error && (
                    <p className="mt-2 text-xs text-red-400">{error}</p>
                  )}
                </div>

                {/* End Session */}
                <button
                  onClick={handleEndSession}
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-white/10 border border-white/10 hover:bg-white/15 hover:border-white/15 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  End Session
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <footer className="pb-8 relative z-10 flex-shrink-0 text-center">
        <p className="text-[10px] text-white/10 uppercase tracking-widest font-bold">
          Codeva Secure Voice Channel
        </p>
      </footer>
    </div>
  )
}
