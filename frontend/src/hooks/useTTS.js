import { useState, useEffect, useRef, useCallback } from 'react'
import tts from '../lib/tts.js'

export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [voiceSettings, setVoiceSettings] = useState({
    provider: tts.currentProvider,
    voice: tts.currentVoice,
    speed: tts.currentSpeed,
    pitch: tts.currentPitch
  })
  const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('gemini_api_key') || '')

  const queueRef = useRef([])
  const isPlayingRef = useRef(false)
  const isProcessingRef = useRef(false)

  useEffect(() => {
    // Sync settings from local storage to tts service
    const savedProvider = localStorage.getItem('tts_provider')
    const savedVoice = localStorage.getItem('tts_voice')
    const savedSpeed = localStorage.getItem('tts_speed')
    const savedPitch = localStorage.getItem('tts_pitch')

    if (savedProvider) {
      tts.setProvider(savedProvider)
    }
    if (savedVoice) {
      tts.setVoice(savedVoice)
    }
    if (savedSpeed) {
      tts.setSpeed(parseFloat(savedSpeed))
    }
    if (savedPitch) {
      tts.setPitch(parseFloat(savedPitch))
    }

    setVoiceSettings({
      provider: tts.currentProvider,
      voice: tts.currentVoice,
      speed: tts.currentSpeed,
      pitch: tts.currentPitch
    })
  }, [])

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    while (queueRef.current.length > 0) {
      const sentence = queueRef.current.shift()
      if (!sentence || sentence.trim() === '') continue

      setIsLoading(true)
      try {
        setIsPlaying(true)
        isPlayingRef.current = true
        await tts.speak(sentence)
      } catch (error) {
        console.error('TTS Hook playback error:', error)
      } finally {
        isPlayingRef.current = false
        setIsLoading(false)
      }
    }

    setIsPlaying(false)
    isPlayingRef.current = false
    isProcessingRef.current = false
  }, [])

  const speak = useCallback(async (text) => {
    if (!text || text.trim() === '') return
    queueRef.current.push(text)
    processQueue()
  }, [processQueue])

  const stop = useCallback(() => {
    queueRef.current = []
    tts.stop()
    setIsPlaying(false)
    isPlayingRef.current = false
    setIsLoading(false)
    isProcessingRef.current = false
  }, [])

  const updateProvider = useCallback((provider) => {
    tts.setProvider(provider)
    localStorage.setItem('tts_provider', provider)
    setVoiceSettings(prev => ({ ...prev, provider }))
  }, [])

  const updateVoice = useCallback((voice) => {
    tts.setVoice(voice)
    localStorage.setItem('tts_voice', voice)
    setVoiceSettings(prev => ({ ...prev, voice }))
  }, [])

  const updateSpeed = useCallback((speed) => {
    tts.setSpeed(speed)
    localStorage.setItem('tts_speed', speed.toString())
    setVoiceSettings(prev => ({ ...prev, speed }))
  }, [])

  const updatePitch = useCallback((pitch) => {
    tts.setPitch(pitch)
    localStorage.setItem('tts_pitch', pitch.toString())
    setVoiceSettings(prev => ({ ...prev, pitch }))
  }, [])

  const updateGeminiApiKey = useCallback((key) => {
    localStorage.setItem('gemini_api_key', key)
    setGeminiApiKey(key)
  }, [])

  const getAvailableProviders = useCallback(() => tts.getProviders(), [])
  const getAvailableVoices = useCallback((provider) => {
    const originalProvider = tts.currentProvider
    tts.setProvider(provider)
    const voices = tts.getVoices()
    tts.setProvider(originalProvider)
    return voices
  }, [])

  const updateVoiceSettings = useCallback((settings) => {
    if (settings.provider) updateProvider(settings.provider)
    if (settings.voice) updateVoice(settings.voice)
    if (settings.speed) updateSpeed(settings.speed)
    if (settings.pitch) updatePitch(settings.pitch)
  }, [updateProvider, updateVoice, updateSpeed, updatePitch])

  return {
    speak,
    stop,
    isPlaying,
    isLoading,
    currentProvider: voiceSettings.provider,
    currentVoice: voiceSettings.voice,
    speed: voiceSettings.speed,
    pitch: voiceSettings.pitch,
    geminiApiKey,
    voices: getAvailableVoices(voiceSettings.provider),
    providers: getAvailableProviders(),
    updateProvider,
    updateVoice,
    updateSpeed,
    updatePitch,
    updateGeminiApiKey,
    voiceSettings,
    updateVoiceSettings,
    getAvailableProviders,
    getAvailableVoices,
  }
}
