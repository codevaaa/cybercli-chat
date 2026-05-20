import { useState, useEffect } from 'react'
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

  const speak = async (text) => {
    if (!text || text.trim() === '') return
    setIsLoading(true)
    setIsPlaying(false)
    try {
      setIsPlaying(true)
      await tts.speak(text)
    } catch (error) {
      console.error('TTS Hook error:', error)
    } finally {
      setIsPlaying(false)
      setIsLoading(false)
    }
  }

  const stop = () => {
    tts.stop()
    setIsPlaying(false)
    setIsLoading(false)
  }

  const updateProvider = (provider) => {
    tts.setProvider(provider)
    localStorage.setItem('tts_provider', provider)
    setVoiceSettings(prev => ({ ...prev, provider }))
  }

  const updateVoice = (voice) => {
    tts.setVoice(voice)
    localStorage.setItem('tts_voice', voice)
    setVoiceSettings(prev => ({ ...prev, voice }))
  }

  const updateSpeed = (speed) => {
    tts.setSpeed(speed)
    localStorage.setItem('tts_speed', speed.toString())
    setVoiceSettings(prev => ({ ...prev, speed }))
  }

  const updatePitch = (pitch) => {
    tts.setPitch(pitch)
    localStorage.setItem('tts_pitch', pitch.toString())
    setVoiceSettings(prev => ({ ...prev, pitch }))
  }

  const updateGeminiApiKey = (key) => {
    localStorage.setItem('gemini_api_key', key)
    setGeminiApiKey(key)
  }

  const getAvailableProviders = () => tts.getProviders()
  const getAvailableVoices = (provider) => {
    const originalProvider = tts.currentProvider
    tts.setProvider(provider)
    const voices = tts.getVoices()
    tts.setProvider(originalProvider)
    return voices
  }

  const updateVoiceSettings = (settings) => {
    if (settings.provider) updateProvider(settings.provider)
    if (settings.voice) updateVoice(settings.voice)
    if (settings.speed) updateSpeed(settings.speed)
    if (settings.pitch) updatePitch(settings.pitch)
  }

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
