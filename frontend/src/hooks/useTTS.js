import { useState, useCallback, useEffect, useRef } from 'react'
import tts from '../lib/tts.js'

export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentProvider, setCurrentProvider] = useState('puter')
  const [currentVoice, setCurrentVoice] = useState('ava')
  const [speed, setSpeed] = useState(1.0)
  const [pitch, setPitch] = useState(1.0)
  const [geminiApiKey, setGeminiApiKey] = useState(null)
  const [voices, setVoices] = useState([])
  const [providers, setProviders] = useState([])
  
  const audioRef = useRef(null)

  useEffect(() => {
    // Load saved settings from localStorage
    const savedProvider = localStorage.getItem('tts_provider')
    const savedVoice = localStorage.getItem('tts_voice')
    const savedSpeed = localStorage.getItem('tts_speed')
    const savedPitch = localStorage.getItem('tts_pitch')
    const savedGeminiKey = localStorage.getItem('gemini_api_key')

    if (savedProvider) {
      setCurrentProvider(savedProvider)
      tts.setProvider(savedProvider)
    }
    if (savedVoice) {
      setCurrentVoice(savedVoice)
      tts.setVoice(savedVoice)
    }
    if (savedSpeed) {
      setSpeed(parseFloat(savedSpeed))
      tts.setSpeed(parseFloat(savedSpeed))
    }
    if (savedPitch) {
      setPitch(parseFloat(savedPitch))
      tts.setPitch(parseFloat(savedPitch))
    }
    if (savedGeminiKey) {
      setGeminiApiKey(savedGeminiKey)
      tts.setGeminiApiKey(savedGeminiKey)
    }

    // Load voices and providers
    loadVoices()
    loadProviders()
  }, [])

  const loadVoices = useCallback(() => {
    const voicesData = tts.getVoices()
    setVoices(voicesData)
  }, [])

  const loadProviders = useCallback(() => {
    const providersData = tts.getProviders()
    setProviders(providersData)
  }, [])

  const speak = useCallback(async (text) => {
    if (!text || !text.trim()) return

    setIsLoading(true)
    setError(null)
    setIsPlaying(true)

    try {
      await tts.speak(text)
    } catch (err) {
      setError(err.message)
      console.error('TTS error:', err)
    } finally {
      setIsLoading(false)
      setIsPlaying(false)
    }
  }, [])

  const stop = useCallback(() => {
    tts.stop()
    setIsPlaying(false)
    setIsLoading(false)
  }, [])

  const updateProvider = useCallback((provider) => {
    setCurrentProvider(provider)
    tts.setProvider(provider)
    localStorage.setItem('tts_provider', provider)
    loadVoices()
  }, [loadVoices])

  const updateVoice = useCallback((voice) => {
    setCurrentVoice(voice)
    tts.setVoice(voice)
    localStorage.setItem('tts_voice', voice)
  }, [])

  const updateSpeed = useCallback((newSpeed) => {
    const speedValue = Math.min(Math.max(parseFloat(newSpeed), 0.25), 4.0)
    setSpeed(speedValue)
    tts.setSpeed(speedValue)
    localStorage.setItem('tts_speed', speedValue.toString())
  }, [])

  const updatePitch = useCallback((newPitch) => {
    const pitchValue = Math.min(Math.max(parseFloat(newPitch), 0.5), 2.0)
    setPitch(pitchValue)
    tts.setPitch(pitchValue)
    localStorage.setItem('tts_pitch', pitchValue.toString())
  }, [])

  const updateGeminiApiKey = useCallback((key) => {
    setGeminiApiKey(key)
    tts.setGeminiApiKey(key)
    localStorage.setItem('gemini_api_key', key)
  }, [])

  return {
    // State
    isPlaying,
    isLoading,
    error,
    currentProvider,
    currentVoice,
    speed,
    pitch,
    geminiApiKey,
    voices,
    providers,

    // Actions
    speak,
    stop,
    updateProvider,
    updateVoice,
    updateSpeed,
    updatePitch,
    updateGeminiApiKey,
    loadVoices,
    loadProviders,
  }
}
