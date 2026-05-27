import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Settings, Volume2, VolumeX, Sparkles, Zap, Mic, MicOff, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTTS } from '../../hooks/useTTS.js'
import api, { API_BASE } from '../../lib/api.js'
import { motion, AnimatePresence } from 'framer-motion'

const VOICE_MODELS = [
  { id: 'gemini_flash',  label: 'Sahadeva (Gemini Flash)', desc: 'AI Native Voice (Fast & Friendly)', color: '#4285F4', orbColors: ['#4285F4', '#1A73E8', '#74AAFF'] },
  { id: 'gemini_pro',    label: 'Sahadeva Pro (Gemini Pro)', desc: 'Advanced AI Voice (Analytical)',  color: '#8B5CF6', orbColors: ['#8B5CF6', '#6D28D9', '#DDD6FE'] },
  { id: 'mistral_large', label: 'Vayu (Mistral Large)', desc: 'Technical & Expressive Advisor',     color: '#D97757', orbColors: ['#D97757', '#B85D3D', '#F4A261'] },
]

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

function VoiceSphere({ isActive, orbColors }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      {isActive && [1, 2, 3].map(ring => (
        <motion.div
          key={ring}
          className="absolute rounded-full pointer-events-none"
          style={{ border: `1px solid ${orbColors[0]}20` }}
          animate={{
            width: [200, 200 + ring * 35],
            height: [200, 200 + ring * 35],
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

      <motion.div
        className="rounded-full flex items-center justify-center overflow-hidden relative shadow-2xl"
        style={{ 
          width: 200, 
          height: 200,
          boxShadow: isActive ? `0 0 40px ${orbColors[0]}40` : 'none'
        }}
        animate={isActive ? { scale: [1, 1.03, 0.97, 1.02, 1] } : { scale: 1 }}
        transition={isActive ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.5 }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${orbColors[2] || '#b3e5fc'} 30%, ${orbColors[1]} 75%, ${orbColors[0]} 100%)`,
          }}
        />
        <motion.div
          className="absolute rounded-full opacity-60 mix-blend-overlay filter blur-xl"
          style={{
            width: '140%',
            height: '140%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 60%)',
          }}
          animate={isActive ? {
            x: [-30, 20, -10, 15, -30],
            y: [-25, 10, -20, 5, -25],
          } : { x: -10, y: -10 }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 rounded-full mix-blend-color opacity-30" style={{ backgroundColor: orbColors[0] }} />
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: '70%',
            height: '40%',
            top: '8%',
            left: '15%',
            background: 'radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.4) 0%, transparent 75%)',
            filter: 'blur(3px)',
          }}
        />
      </motion.div>
    </div>
  )
}

export default function VoiceChatPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState('select') // select | active
  const [voiceIndex, setVoiceIndex] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [messages, setMessages] = useState([])
  const [countdown, setCountdown] = useState(null)

  const recognitionRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const countdownRef = useRef(null)
  const finalTranscriptRef = useRef('')

  const {
    speak,
    stop,
    isPlaying,
    isLoading: ttsLoading,
    updateProvider,
    updateVoice,
    currentVoice
  } = useTTS()

  const selectedVoice = VOICE_MODELS[voiceIndex] || VOICE_MODELS[0]
  const prevVoice = VOICE_MODELS[(voiceIndex - 1 + VOICE_MODELS.length) % VOICE_MODELS.length]
  const nextVoice = VOICE_MODELS[(voiceIndex + 1) % VOICE_MODELS.length]

  // Synchronize state values to refs for the closures
  const isPlayingRef = useRef(isPlaying)
  const isProcessingRef = useRef(isProcessing)
  const stepRef = useRef(step)

  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { isProcessingRef.current = isProcessing }, [isProcessing])
  useEffect(() => { stepRef.current = step }, [step])

  // Sync chosen voice to local storage settings
  useEffect(() => {
    if (step === 'active') {
      const provider = 'gemini'
      updateProvider(provider)
      updateVoice(selectedVoice.id)
    }
  }, [step, selectedVoice, updateProvider, updateVoice])

  // Load last selected voice index
  useEffect(() => {
    const saved = localStorage.getItem('voice_page_index')
    if (saved !== null) {
      const idx = parseInt(saved, 10)
      if (!isNaN(idx) && idx >= 0 && idx < VOICE_MODELS.length) setVoiceIndex(idx)
    }
  }, [])

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

  const handleInterrupt = useCallback(() => {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    stop()
    clearTimeout(silenceTimerRef.current)
    clearInterval(countdownRef.current)
    setCountdown(null)
  }, [stop])

  const handleSendMessage = useCallback(async (text) => {
    if (!text.trim() || isProcessing) return
    const userText = text.trim()

    // Append to messages list
    const userMsg = { role: 'user', content: userText }
    const updatedMessages = [...messages, userMsg]
    setMessages(prev => [...prev, userMsg])
    setIsProcessing(true)

    // Setup speech agent config
    const VOICE_AGENTS_BRAINS = {
      gemini_flash: {
        model: 'gemini/gemini-2.5-flash',
        prompt: `You are Sahadeva, a warm, natural, and friendly conversational AI voice assistant. Keep your responses brief, conversational, and extremely concise (maximum 1-2 short sentences). Absolutely DO NOT use any markdown syntax, lists, bullet points, asterisks, or code blocks in your response, as your text will be read aloud. Speak in a warm and natural tone.`
      },
      gemini_pro: {
        model: 'gemini/gemini-2.5-pro',
        prompt: `You are Sahadeva Pro, an advanced, analytical, and highly capable voice assistant. Keep your responses precise, logical, and very concise (maximum 1-2 sentences). Absolutely DO NOT use any markdown syntax, bold text, or lists. Speak clearly and professionally.`
      },
      mistral_large: {
        model: 'mistral/mistral-large-latest',
        prompt: `You are Vayu, a technical, expressive, and wise strategic advisor. Keep your responses thoughtful, technical, and very short (maximum 1-2 sentences). Absolutely DO NOT use markdown formatting, bullet points, or code blocks. Speak with confidence and authority.`
      }
    }

    const brain = VOICE_AGENTS_BRAINS[selectedVoice.id] || VOICE_AGENTS_BRAINS.gemini_flash
    const token = localStorage.getItem('sb-access-token')

    try {
      const response = await fetch(`${API_BASE}/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: brain.prompt, _skip_inject: true },
            ...updatedMessages.map(m => ({ role: m.role, content: m.content }))
          ],
          model: brain.model,
          stream: false // complete response for faster cleaner audio trigger
        })
      })

      if (!response.ok) throw new Error('API completion failed')
      const data = await response.json()
      const reply = data.choices?.[0]?.message?.content || data.content || ''
      
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      setIsProcessing(false)

      // Play back audio response
      speak(reply)
    } catch (err) {
      console.error('Error fetching voice completions:', err)
      const errText = err.message.includes('Failed to fetch') ? 'Connection issue.' : err.message
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errText}` }])
      setIsProcessing(false)
      speak('I encountered an error. Please try again.')
    }
  }, [selectedVoice, isProcessing, speak, messages])

  const startSilenceTimer = useCallback(() => {
    clearTimeout(silenceTimerRef.current)
    clearInterval(countdownRef.current)
    setCountdown(0.8)
    let remaining = 0.8
    countdownRef.current = setInterval(() => {
      remaining -= 0.1
      setCountdown(Math.max(0, remaining))
    }, 100)

    silenceTimerRef.current = setTimeout(() => {
      clearInterval(countdownRef.current)
      setCountdown(null)
      if (finalTranscriptRef.current.trim()) {
        const text = finalTranscriptRef.current.trim()
        handleSendMessage(text)
        finalTranscriptRef.current = ''
        setTranscript('')
        setIsListening(false)
        try { recognitionRef.current?.stop() } catch {}
      }
    }, 800)
  }, [handleSendMessage])

  const initRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return null
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    const savedLang = localStorage.getItem('user_language') || 'EN'
    const langMap = {
      'EN': 'en-US',
      'HI': 'hi-IN',
      'FR': 'fr-FR',
      'DE': 'de-DE',
      'ID': 'id-ID',
      'ES': 'es-ES',
      'IT': 'it-IT',
      'JA': 'ja-JP',
      'KO': 'ko-KR',
      'PT': 'pt-BR',
      'UR': 'ur-PK'
    }
    let resolvedLang = langMap[savedLang.toUpperCase()] || 'en-US'
    if (savedLang.toUpperCase() === 'EN') {
      const navLang = navigator.language || 'en-US'
      if (navLang.toLowerCase().includes('in') || navLang.toLowerCase().startsWith('hi') || navLang.toLowerCase().startsWith('ur')) {
        resolvedLang = 'hi-IN'
      }
    }
    rec.lang = resolvedLang

    rec.onresult = (event) => {
      // Interrupt speaker if user starts talking
      if (isPlayingRef.current) {
        handleInterrupt()
      }

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

    rec.onerror = (e) => {
      console.error('Speech recognition error:', e)
      setIsListening(false)
      clearTimeout(silenceTimerRef.current)
      clearInterval(countdownRef.current)
      setCountdown(null)
    }

    rec.onend = () => {
      if (!isPlayingRef.current && !isProcessingRef.current && stepRef.current === 'active') {
        setTimeout(() => {
          try { rec.start() } catch {}
        }, 100)
      } else {
        setIsListening(false)
      }
    }

    return rec
  }, [startSilenceTimer, handleInterrupt])

  // Continuous auto-listening trigger hook
  useEffect(() => {
    if (step !== 'active') {
      if (recognitionRef.current && isListening) {
        try { recognitionRef.current.stop() } catch {}
      }
      setIsListening(false)
      return
    }

    const shouldBeListening = !isPlaying && !isProcessing && !ttsLoading

    if (shouldBeListening) {
      if (!isListening) {
        finalTranscriptRef.current = ''
        setTranscript('')
        try {
          if (!recognitionRef.current) {
            recognitionRef.current = initRecognition()
          }
          recognitionRef.current?.start()
          setIsListening(true)
        } catch (e) {}
      }
    } else {
      if (isListening) {
        try { recognitionRef.current?.stop() } catch {}
        setIsListening(false)
      }
      if (isPlaying) {
        finalTranscriptRef.current = ''
        setTranscript('')
      }
    }
  }, [step, isPlaying, isProcessing, ttsLoading, isListening, initRecognition])

  useEffect(() => {
    recognitionRef.current = initRecognition()
    return () => {
      recognitionRef.current?.stop()
      clearTimeout(silenceTimerRef.current)
      clearInterval(countdownRef.current)
      if (window.speechSynthesis) window.speechSynthesis.cancel()
    }
  }, [initRecognition])

  const handleStartSession = () => {
    setStep('active')
    setMessages([])
    setTranscript('')
    finalTranscriptRef.current = ''
  }

  const handleEndSession = () => {
    handleInterrupt()
    setIsListening(false)
    try { recognitionRef.current?.stop() } catch {}
    setStep('select')
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: '#111116' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04] bg-[#14141c]/60 backdrop-blur-xl relative z-10">
        <div className="flex items-center gap-3">
          <Link to="/chat" onClick={handleEndSession} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors border border-transparent hover:border-white/5">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#D97757]/15 flex items-center justify-center border border-[#D97757]/20">
              <Volume2 className="w-4 h-4 text-[#D97757]" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">Voice Channel</h1>
              <p className="text-[10px] text-gray-500 font-medium">Hands-free communication</p>
            </div>
          </div>
        </div>
        <Link to="/voice-settings" onClick={handleEndSession} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors border border-transparent hover:border-white/5">
          <Settings className="w-5 h-5" />
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${selectedVoice.color}10 0%, transparent 70%)`
          }}
        />

        <div className="w-full max-w-md flex flex-col items-center justify-center gap-8 relative z-10">
          <AnimatePresence mode="wait">
            {step === 'select' ? (
              /* Step 1: Voice Select Carousel */
              <motion.div
                key="select-stage"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="w-full flex flex-col items-center gap-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white tracking-tight">Choose your voice partner</h2>
                  <p className="text-xs text-gray-400 mt-1">Select a persona below to begin hands-free conversation.</p>
                </div>

                <div className="flex items-center justify-between w-full mt-4 select-none">
                  {/* Left Slide */}
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-1.5 opacity-30 hover:opacity-100 transition-opacity w-1/4 justify-end text-right"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                    <div className="hidden sm:block overflow-hidden">
                      <div className="text-xs font-semibold text-white truncate">{prevVoice.label}</div>
                    </div>
                  </button>

                  {/* Center Sphere */}
                  <div className="flex flex-col items-center justify-center w-2/4">
                    <VoiceSphere isActive={true} orbColors={selectedVoice.orbColors} />
                    <div className="text-center h-12 mt-5">
                      <h3 className="text-lg font-bold text-white">{selectedVoice.label}</h3>
                      <p className="text-xs text-white/50 mt-0.5">{selectedVoice.desc}</p>
                    </div>
                  </div>

                  {/* Right Slide */}
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1.5 opacity-30 hover:opacity-100 transition-opacity w-1/4 justify-start text-left"
                  >
                    <div className="hidden sm:block overflow-hidden">
                      <div className="text-xs font-semibold text-white truncate">{nextVoice.label}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Continue button */}
                <button
                  onClick={handleStartSession}
                  className="w-full max-w-[200px] py-3 rounded-full font-bold text-black bg-white hover:bg-white/95 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg mt-4"
                >
                  Start Session
                </button>
              </motion.div>
            ) : (
              /* Step 2: Active Hands-Free Call */
              <motion.div
                key="active-stage"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="w-full flex flex-col items-center gap-6"
              >
                {/* Voice Visualizer Orb */}
                <VoiceSphere
                  isActive={isListening || isPlaying || isProcessing}
                  orbColors={selectedVoice.orbColors}
                />

                <div className="text-center">
                  <h2 className="text-xl font-bold text-white">{selectedVoice.label}</h2>
                  <p className="text-xs text-white/40 mt-0.5">{selectedVoice.desc}</p>
                </div>

                {/* Waveform visualizer */}
                <div className="w-full py-2">
                  <WaveformBars
                    isActive={isListening || isPlaying}
                    color={selectedVoice.color}
                    intensity={isPlaying ? 0.7 : 1.3}
                  />
                </div>

                {/* Real-time Status / Subtitle transcript */}
                <div className="text-center min-h-[64px] w-full px-4">
                  <p
                    className="text-sm font-semibold tracking-wide transition-all"
                    style={{
                      color: isPlaying ? '#ffffff' : isListening ? selectedVoice.color : 'rgba(255,255,255,0.4)'
                    }}
                  >
                    {isProcessing ? 'Thinking…' : isPlaying ? 'Speaking…' : countdown !== null ? `Sending in ${countdown.toFixed(1)}s…` : 'Listening…'}
                  </p>

                  {transcript ? (
                    <p className="mt-2 text-xs text-white/50 max-w-xs mx-auto leading-relaxed italic">
                      &ldquo;{transcript}&rdquo;
                    </p>
                  ) : messages.length > 0 ? (
                    <p className="mt-2 text-xs text-white/30 max-w-xs mx-auto truncate">
                      Last: {messages[messages.length - 1].content}
                    </p>
                  ) : null}

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
                </div>

                {/* End Session button */}
                <div className="flex items-center justify-center mt-4">
                  <button
                    onClick={handleEndSession}
                    className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-white/10 border border-white/10 hover:bg-white/15 hover:border-white/15 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    End Session
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <footer className="pb-8 relative z-10 flex-shrink-0 text-center">
        <p className="text-[10px] text-white/10 uppercase tracking-widest font-bold">
          CyberCli Secure Voice Channel
        </p>
      </footer>
    </div>
  )
}
