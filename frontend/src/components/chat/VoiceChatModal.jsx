import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, VolumeX, ChevronLeft, ChevronRight, Send, Check, Mic, MicOff } from 'lucide-react'
import CodevaMark from '../ui/CodevaLogo.jsx'



const VOICE_MODELS = [
  { id: 'gemini_female',  label: 'Saraswati (Fast & Natural)', desc: 'Warm, highly responsive divine voice', color: '#4285F4', orbColors: ['#4285F4', '#1A73E8', '#74AAFF'] },
  { id: 'gemini_male_1',  label: 'Madhav (Omniscient)', desc: 'Lightning-fast, precise, warm divine voice',  color: '#8B5CF6', orbColors: ['#8B5CF6', '#6D28D9', '#DDD6FE'] },
  { id: 'gemini_male_2',  label: 'Ravan (Strategic & Powerful)', desc: 'Confident, thoughtful, authoritative voice',     color: '#D97757', orbColors: ['#D97757', '#B85D3D', '#F4A261'] },
]

const VOICE_BRAINS = {
  gemini_female: {
    model: 'google/gemini-1.5-flash',
    prompt: 'You are Saraswati, the divine embodiment of knowledge and arts. You have a calm, warm, and highly comforting voice. You can understand and speak all languages fluently. Keep responses extremely brief, conversational, and natural (max 1-2 short sentences). Never use markdown, lists, asterisks, or code blocks — your text will be spoken aloud directly.',
  },
  gemini_male_1: {
    model: 'google/gemini-1.5-flash',
    prompt: 'You are Madhav, an omniscient, lightning-fast, and deeply wise divine advisor. Keep responses precise, calm, and concise (max 1-2 sentences). Never use markdown or lists. Speak clearly and professionally, radiating calm authority.',
  },
  gemini_male_2: {
    model: 'google/gemini-1.5-pro',
    prompt: 'You are Ravan, a highly strategic, immensely powerful, and incredibly intelligent authoritative entity. Keep responses thoughtful, confident, and short (max 1-2 sentences). Never use markdown formatting. Speak with absolute confidence and authority.',
  },
}

const BAR_COUNT = 36

function WaveformBars({ isActive, color = '#22d3ee', intensity = 1 }) {
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
    <div className="flex items-center justify-center gap-[4px] h-16 w-full px-4">
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

// Cloudy sky visualizer sphere
function VoiceSphere({ isActive, orbColors }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
      {/* Outer pulse rings */}
      {isActive && [1, 2, 3].map(ring => (
        <motion.div
          key={ring}
          className="absolute rounded-full"
          style={{ border: `1px solid ${orbColors[0]}20` }}
          animate={{
            width: [220, 220 + ring * 40],
            height: [220, 220 + ring * 40],
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

      {/* Main sphere */}
      <motion.div
        className="rounded-full flex items-center justify-center overflow-hidden relative shadow-[0_0_50px_rgba(2,136,209,0.35)]"
        style={{ width: 220, height: 220 }}
        animate={isActive ? {
          scale: [1, 1.03, 0.97, 1.02, 1],
        } : { scale: 1 }}
        transition={isActive ? {
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        } : { duration: 0.5 }}
      >
        {/* Base cloudy sky gradient */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #ffffff 0%, #b3e5fc 30%, #0288d1 75%, #01579b 100%)',
          }}
        />

        {/* Shimmer clouds overlay */}
        <motion.div
          className="absolute rounded-full opacity-60 mix-blend-overlay filter blur-xl"
          style={{
            width: '140%',
            height: '140%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 60%)',
          }}
          animate={isActive ? {
            x: [-35, 25, -15, 20, -35],
            y: [-30, 15, -25, 10, -30],
          } : { x: -10, y: -10 }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Dynamic theme accent coloring */}
        <div
          className="absolute inset-0 rounded-full mix-blend-color opacity-30"
          style={{ backgroundColor: orbColors[0] }}
        />

        {/* Glass reflection highlight */}
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

import { API_BASE } from '../../lib/api.js'

function browserStop() {
  if (window.speechSynthesis) window.speechSynthesis.cancel()
}

export default function VoiceChatModal({
  isOpen,
  onClose,
  onSendMessage,
  isPlaying,
  isProcessing,
  ttsLoading,
  speak: externalSpeak,
  stop: externalStop,
  updateProvider,
  updateVoice
}) {
  const [step, setStep] = useState('select')
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [voiceIndex, setVoiceIndex] = useState(0)
  const [status, setStatus] = useState('idle') // idle | listening | processing | speaking
  const [countdown, setCountdown] = useState(null)
  
  // Local AI State to decouple from slow parent chat
  const [localProcessing, setLocalProcessing] = useState(false)
  const [localReply, setLocalReply] = useState('')

  const recognitionRef = useRef(null)
  const finalTranscriptRef = useRef('')
  const silenceTimerRef = useRef(null)
  const countdownRef = useRef(null)
  const abortControllerRef = useRef(null)
  const messagesRef = useRef([])
  const localProcessingRef = useRef(false)

  const isPlayingRef = useRef(isPlaying)
  const isProcessingRef = useRef(isProcessing)
  const stepRef = useRef(step)

  const onSendMessageRef = useRef(onSendMessage)
  const externalStopRef = useRef(externalStop)
  const externalSpeakRef = useRef(externalSpeak)

  const prevIndex = (voiceIndex - 1 + VOICE_MODELS.length) % VOICE_MODELS.length
  const nextIndex = (voiceIndex + 1) % VOICE_MODELS.length
  
  const prevVoice = VOICE_MODELS[prevIndex]
  const selectedVoice = VOICE_MODELS[voiceIndex] || VOICE_MODELS[0]
  const nextVoice = VOICE_MODELS[nextIndex]

  // Sync ref values for access inside recognition closures
  useEffect(() => { onSendMessageRef.current = onSendMessage }, [onSendMessage])
  useEffect(() => { externalStopRef.current = externalStop }, [externalStop])
  useEffect(() => { externalSpeakRef.current = externalSpeak }, [externalSpeak])

  // Sync ref values for access inside recognition closures
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { isProcessingRef.current = isProcessing }, [isProcessing])
  useEffect(() => { localProcessingRef.current = localProcessing }, [localProcessing])
  useEffect(() => { stepRef.current = step }, [step])

  const handleInterrupt = useCallback(() => {
    browserStop()
    if (externalStopRef.current) externalStopRef.current()
    if (abortControllerRef.current) abortControllerRef.current.abort()
    clearTimeout(silenceTimerRef.current)
    clearInterval(countdownRef.current)
    setCountdown(null)
    setLocalProcessing(false)
  }, [])

  // Reset to selection step when modal is opened
  useEffect(() => {
    if (isOpen) {
      setStep('select')
      setIsListening(false)
      setTranscript('')
      setLocalReply('')
      messagesRef.current = []
      finalTranscriptRef.current = ''
    }
  }, [isOpen])

  // Sync voice model selection to parent
  useEffect(() => {
    const model = VOICE_MODELS[voiceIndex]
    if (!model) return
    const provider = 'gemini'
    const voice = model.id
    if (updateProvider) updateProvider(provider)
    if (updateVoice) updateVoice(voice)
  }, [voiceIndex, updateProvider, updateVoice])

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

  // Update status label
  useEffect(() => {
    setStatus(
      isPlaying ? 'speaking' :
      (isProcessing || localProcessing) ? 'processing' :
      isListening ? 'listening' :
      'idle'
    )
  }, [isListening, isProcessing, localProcessing, isPlaying])

  const sendToAI = useCallback(async (userText) => {
    if (!userText.trim()) return
    setLocalProcessing(true)
    setLocalReply('')
    
    // Append to local conversational context
    messagesRef.current = [...messagesRef.current, { role: 'user', content: userText }]
    
    const voiceId = VOICE_MODELS[voiceIndex]?.id || 'gemini_female'
    const brain = VOICE_BRAINS[voiceId] || VOICE_BRAINS.gemini_female
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
        if (sentence.length > 2 && externalSpeakRef.current) {
          externalSpeakRef.current(sentence)
        }
        lastEnd = match.index + match[0].length
      }
      if (flush && segment.slice(lastEnd).trim().length > 2) {
        if (externalSpeakRef.current) externalSpeakRef.current(segment.slice(lastEnd).trim())
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
            ...messagesRef.current
          ],
          model: brain.model,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!res.ok) throw new Error('API Error')
      
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
              setLocalReply(fullReply)
              speakNextSentence(fullReply)
            }
          } catch {}
        }
      }
      speakNextSentence(fullReply, true)
      messagesRef.current = [...messagesRef.current, { role: 'assistant', content: fullReply }]
      
      // Sync strictly to parent chat history if provided, but don't wait for it
      if (onSendMessageRef.current) {
        // Just silently notify parent of the user message (optional, could be customized)
        // For absolute self-containment, we leave it in the modal.
      }
      
    } catch (err) {
      if (err.name === 'AbortError') return
      setLocalReply('I encountered an error. Please try again.')
      if (externalSpeakRef.current) externalSpeakRef.current('I encountered an error. Please try again.')
    } finally {
      setLocalProcessing(false)
    }
  }, [voiceIndex])

  const startSilenceTimer = useCallback(() => {
    clearTimeout(silenceTimerRef.current)
    clearInterval(countdownRef.current)
    setCountdown(0.3)
    let remaining = 0.3
    countdownRef.current = setInterval(() => {
      remaining -= 0.1
      setCountdown(Math.max(0, remaining))
    }, 100)
    silenceTimerRef.current = setTimeout(() => {
      clearInterval(countdownRef.current)
      setCountdown(null)
      if (finalTranscriptRef.current.trim()) {
        const text = finalTranscriptRef.current.trim()
        sendToAI(text)
        finalTranscriptRef.current = ''
        setTranscript('')
        setIsListening(false)
        try { recognitionRef.current?.stop() } catch {}
      }
    }, 300)
  }, [sendToAI])

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
      const navLang = (navigator.language || 'en-US').toLowerCase()
      if (navLang.startsWith('hi') || navLang.startsWith('ur')) {
        resolvedLang = 'hi-IN'
      } else if (navLang.includes('-in') || navLang.includes('in')) {
        resolvedLang = 'en-IN'
      }
    }
    rec.lang = resolvedLang
    rec.onresult = (event) => {
      // Barge-in: the moment the user starts speaking, stop the assistant —
      // whether it's already playing audio OR still fetching/processing TTS.
      // This guarantees the voice models actually stop on interrupt.
      if (isPlayingRef.current || isProcessingRef.current || localProcessingRef.current) {
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
    rec.onerror = () => {
      setIsListening(false)
      clearTimeout(silenceTimerRef.current)
      clearInterval(countdownRef.current)
      setCountdown(null)
    }
    rec.onend = () => {
      if (!isPlayingRef.current && !isProcessingRef.current && !localProcessing && stepRef.current === 'active') {
        setTimeout(() => {
          try { rec.start() } catch {}
        }, 100)
      } else {
        setIsListening(false)
      }
    }
    return rec
  }, [startSilenceTimer, handleInterrupt])

  // Continuous loop trigger effect
  useEffect(() => {
    if (!isOpen || step !== 'active') {
      if (recognitionRef.current && isListening) {
        try { recognitionRef.current.stop() } catch {}
      }
      setIsListening(false)
      return
    }

    const shouldBeListening = !isPlaying && !isProcessing && !localProcessing && !ttsLoading

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
        } catch (e) {
          // If already running
        }
      }
    } else {
      if (isListening) {
        try {
          recognitionRef.current?.stop()
        } catch (e) {}
        setIsListening(false)
      }
      if (isPlaying) {
        finalTranscriptRef.current = ''
        setTranscript('')
      }
    }
  }, [isOpen, step, isPlaying, isProcessing, ttsLoading, isListening, initRecognition])

  useEffect(() => {
    recognitionRef.current = initRecognition()
    return () => {
      recognitionRef.current?.stop()
      clearTimeout(silenceTimerRef.current)
      clearInterval(countdownRef.current)
      browserStop()
    }
  }, [initRecognition])


  const handlePrev = () => {
    setVoiceIndex(prev => (prev === 0 ? VOICE_MODELS.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setVoiceIndex(prev => (prev === VOICE_MODELS.length - 1 ? 0 : prev + 1))
  }

  const handleContinue = async () => {
    try {
      // Force the browser to ask for Microphone permissions natively before doing anything
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      console.warn("Mic permission denied or unavailable", err)
      // Proceed anyway, but it might not listen well
    }

    // TODO: Premium limit check logic can go here in the future
    // if (selectedVoice.premium && !canUsePremium) { ... }

    setStep('active')
    finalTranscriptRef.current = ''
    setTranscript('')
  }

  const handleBackToSelect = () => {
    handleInterrupt()
    setIsListening(false)
    try { recognitionRef.current?.stop() } catch {}
    setStep('select')
  }

  const statusLabel = {
    idle: 'Listening...',
    listening: countdown !== null ? `Sending in ${countdown.toFixed(1)}s…` : 'Listening…',
    processing: 'Thinking…',
    speaking: 'Speaking...',
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
          className="fixed inset-0 z-50 flex flex-col items-center justify-between"
          style={{ background: '#1c1b1b' }}
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
                <CodevaMark size={18} />
              </div>
              <div>
                <span className="text-sm font-semibold text-white/80 font-sans">Codeva</span>
                <div className="text-[10px] text-white/30 font-medium tracking-wider">by Codeva</div>
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
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg px-6 gap-8 relative z-10">
            {step === 'select' ? (
              <div className="w-full flex flex-col items-center gap-6">
                {/* Header */}
                <div className="text-center mt-2 relative z-20">
                  <h2 className="text-3xl font-extrabold text-white tracking-tight">Choose your partner</h2>
                  <p className="text-sm text-gray-400 mt-2">Tap the sphere below to begin hands-free conversation.</p>
                </div>

                {/* Slider Carousel */}
                <div className="flex items-center justify-between w-full mt-4 select-none">
                  {/* Left chevron & preview */}
                  <div
                    className="flex items-center gap-1 cursor-pointer opacity-30 hover:opacity-75 transition-opacity w-1/4 justify-end text-right"
                    onClick={handlePrev}
                  >
                    <ChevronLeft className="w-6 h-6 text-white flex-shrink-0" />
                    <div className="hidden sm:block overflow-hidden">
                      <div className="text-sm font-semibold text-white truncate">{prevVoice.label}</div>
                      <div className="text-[10px] text-white/60 truncate max-w-[80px]">{prevVoice.desc}</div>
                    </div>
                  </div>

                  {/* Center Selected Voice */}
                  <div 
                    className="flex flex-col items-center justify-center w-2/4 relative z-20 cursor-pointer group"
                    onClick={handleContinue}
                  >
                    <div className="absolute inset-0 bg-white/5 rounded-full blur-2xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="scale-[1.2] mb-4 hover:scale-[1.25] transition-transform">
                      <VoiceSphere isActive={true} orbColors={selectedVoice.orbColors} />
                    </div>
                    <div className="text-center h-14 mt-6">
                      <h3 className="text-xl font-bold text-white tracking-wide flex items-center justify-center gap-2">
                        {selectedVoice.label}
                        {selectedVoice.premium && (
                          <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-wider border border-orange-500/30">
                            Premium
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-white/60 mt-0.5">{selectedVoice.desc}</p>
                    </div>
                  </div>

                  {/* Right chevron & preview */}
                  <div
                    className="flex items-center gap-1 cursor-pointer opacity-30 hover:opacity-75 transition-opacity w-1/4 justify-start text-left"
                    onClick={handleNext}
                  >
                    <div className="hidden sm:block overflow-hidden">
                      <div className="text-sm font-semibold text-white truncate">{nextVoice.label}</div>
                      <div className="text-[10px] text-white/60 truncate max-w-[80px]">{nextVoice.desc}</div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-white flex-shrink-0" />
                  </div>
                </div>

                {/* Continue Button removed for instant tap-to-start */}

                {/* Back to chat link */}
                <button
                  onClick={onClose}
                  className="text-sm text-white/50 hover:text-white transition-colors mt-2"
                >
                  Back to chat
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center gap-8">
                {/* Visualizer sphere */}
                <VoiceSphere
                  isActive={status === 'listening' || status === 'speaking' || status === 'processing'}
                  orbColors={selectedVoice.orbColors}
                />

                {/* Voice name + description */}
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                    {selectedVoice.label}
                    {selectedVoice.premium && (
                      <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-wider border border-orange-500/30">
                        Premium
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-white/40 mt-1">{selectedVoice.desc}</p>
                </div>

                {/* Back Button / Switch Agent */}
                <button
                  onClick={handleBackToSelect}
                  className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/60 hover:text-white transition-all flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Change Agent Persona
                </button>

                {/* Waveform */}
                <WaveformBars
                  isActive={status === 'listening' || status === 'speaking'}
                  color="#22d3ee"
                  intensity={status === 'speaking' ? 0.7 : 1.2}
                />

                {/* Status text + transcript */}
                <div className="text-center min-h-[48px] w-full">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={status + String(countdown !== null)}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm font-medium"
                      style={{
                        color: status === 'speaking' ? '#ffffff'
                          : status === 'listening' ? '#22d3ee'
                          : 'rgba(255,255,255,0.5)'
                      }}
                    >
                      {statusLabel}
                    </motion.p>
                  </AnimatePresence>
                  {transcript && (
                    <p className="mt-1.5 text-xs text-white/40 max-w-xs mx-auto leading-relaxed italic">
                      &ldquo;{transcript}&rdquo;
                    </p>
                  )}
                  {countdown !== null && (
                    <div className="mt-2 mx-auto w-32 h-0.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: '#22d3ee' }}
                        initial={{ width: '100%' }}
                        animate={{ width: `${(countdown / 0.3) * 100}%` }}
                        transition={{ duration: 0.1, ease: 'linear' }}
                      />
                    </div>
                  )}

                  {/* AI Response Text (Typewriter effect) */}
                  {localReply && (status === 'processing' || status === 'speaking') && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] max-w-md mx-auto w-full backdrop-blur-md shadow-2xl"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400/80">Codeva AI</span>
                      </div>
                      <p className="text-sm text-white/90 leading-relaxed font-sans text-left break-words">
                        {localReply}
                        {(status === 'processing' || status === 'speaking') && (
                          <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-white/70 animate-pulse" />
                        )}
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* End Session button */}
                <div className="flex items-center justify-center mt-4">
                  <motion.button
                    onClick={handleBackToSelect}
                    className="px-6 py-2.5 rounded-full text-sm font-semibold text-white/70 hover:text-white transition-all bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/15"
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.03 }}
                  >
                    End Session
                  </motion.button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pb-8 relative z-10 flex-shrink-0">
            <p className="text-[10px] text-white/20 text-center uppercase tracking-widest font-semibold font-sans">
              Codeva Secure Voice Channel
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
