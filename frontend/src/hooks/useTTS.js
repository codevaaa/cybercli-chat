import { useState, useRef, useEffect } from 'react'

export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentProvider, setCurrentProvider] = useState('puter')
  const [voiceSettings, setVoiceSettings] = useState({
    provider: 'puter',
    voice: 'default',
    speed: 1.0,
    pitch: 1.0,
  })
  const audioRef = useRef(null)

  useEffect(() => {
    // Load saved settings from localStorage
    const savedProvider = localStorage.getItem('tts_provider')
    const savedVoice = localStorage.getItem('tts_voice')
    const savedSpeed = localStorage.getItem('tts_speed')
    const savedPitch = localStorage.getItem('tts_pitch')

    if (savedProvider) {
      setVoiceSettings(prev => ({ ...prev, provider: savedProvider }))
      setCurrentProvider(savedProvider)
    }
    if (savedVoice) {
      setVoiceSettings(prev => ({ ...prev, voice: savedVoice }))
    }
    if (savedSpeed) {
      setVoiceSettings(prev => ({ ...prev, speed: parseFloat(savedSpeed) }))
    }
    if (savedPitch) {
      setVoiceSettings(prev => ({ ...prev, pitch: parseFloat(savedPitch) }))
    }
  }, [])

  const speak = async (text, provider = voiceSettings.provider) => {
    if (!text || text.trim() === '') return

    setIsLoading(true)
    setIsPlaying(false)

    try {
      if (provider === 'puter' && window.puter) {
        // Use Puter.js for TTS (unlimited free tier)
        const audioUrl = await window.puter.ai.voice.generate(text, {
          voice: voiceSettings.voice,
          speed: voiceSettings.speed,
          pitch: voiceSettings.pitch,
        })
        
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }

        audioRef.current = new Audio(audioUrl)
        
        audioRef.current.onplay = () => setIsPlaying(true)
        audioRef.current.onended = () => setIsPlaying(false)
        audioRef.current.onerror = () => {
          setIsPlaying(false)
          setIsLoading(false)
        }

        await audioRef.current.play()
      } else if (provider === 'browser') {
        // Fallback to browser speech synthesis
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = voiceSettings.speed
        utterance.pitch = voiceSettings.pitch
        utterance.onstart = () => setIsPlaying(true)
        utterance.onend = () => setIsPlaying(false)
        window.speechSynthesis.speak(utterance)
      } else if (provider === 'gemini') {
        // Gemini Flash TTS (server-side)
        const response = await fetch(`${import.meta.env.VITE_API_URL}/tts/gemini`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text, voice: voiceSettings.voice }),
        })

        if (response.ok) {
          const audioBlob = await response.blob()
          const audioUrl = URL.createObjectURL(audioBlob)
          
          if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
          }

          audioRef.current = new Audio(audioUrl)
          
          audioRef.current.onplay = () => setIsPlaying(true)
          audioRef.current.onended = () => setIsPlaying(false)
          audioRef.current.onerror = () => {
            setIsPlaying(false)
            setIsLoading(false)
          }

          await audioRef.current.play()
        }
      } else {
        throw new Error(`Unknown provider: ${provider}`)
      }
    } catch (error) {
      console.error('TTS error:', error)
      // Fallback to browser speech synthesis
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = voiceSettings.speed
      utterance.pitch = voiceSettings.pitch
      utterance.onstart = () => setIsPlaying(true)
      utterance.onend = () => setIsPlaying(false)
      window.speechSynthesis.speak(utterance)
    } finally {
      setIsLoading(false)
    }
  }

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsLoading(false)
  }

  const updateVoiceSettings = (settings) => {
    setVoiceSettings(prev => ({ ...prev, ...settings }))
    if (settings.provider) {
      setCurrentProvider(settings.provider)
      localStorage.setItem('tts_provider', settings.provider)
    }
    if (settings.voice) {
      localStorage.setItem('tts_voice', settings.voice)
    }
    if (settings.speed) {
      localStorage.setItem('tts_speed', settings.speed.toString())
    }
    if (settings.pitch) {
      localStorage.setItem('tts_pitch', settings.pitch.toString())
    }
  }

  const getAvailableProviders = () => [
    { id: 'puter', name: 'Puter.js ElevenLabs', description: 'High quality, unlimited free' },
    { id: 'gemini', name: 'Gemini Flash TTS', description: 'Fast, server-side' },
    { id: 'browser', name: 'Browser TTS', description: 'Built-in, offline' },
  ]

  const getAvailableVoices = (provider) => {
    if (provider === 'browser') {
      return window.speechSynthesis.getVoices().map(voice => ({
        id: voice.name,
        name: voice.name,
        lang: voice.lang,
      }))
    }
    // Puter and Gemini voices (simplified list)
    return [
      { id: 'default', name: 'Default' },
      { id: 'female-1', name: 'Female Voice 1' },
      { id: 'female-2', name: 'Female Voice 2' },
      { id: 'male-1', name: 'Male Voice 1' },
      { id: 'male-2', name: 'Male Voice 2' },
    ]
  }

  return {
    speak,
    stop,
    isPlaying,
    isLoading,
    currentProvider,
    voiceSettings,
    updateVoiceSettings,
    getAvailableProviders,
    getAvailableVoices,
  }
}
