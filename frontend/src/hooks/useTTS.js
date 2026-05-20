import { useState, useCallback, useEffect, useRef } from 'react'
import tts from '../lib/tts.js'

export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [apiKey, setApiKey] = useState(null)
  const [currentModel, setCurrentModel] = useState('multilingual-v2')
  const [currentVoice, setCurrentVoice] = useState('ava')
  const [speed, setSpeed] = useState(1.0)
  const [stability, setStability] = useState(0.5)
  const [similarity, setSimilarity] = useState(0.75)
  const [voices, setVoices] = useState([])
  const [models, setModels] = useState([])
  
  const audioRef = useRef(null)

  useEffect(() => {
    // Load saved settings from localStorage
    const savedApiKey = localStorage.getItem('elevenlabs_api_key')
    const savedModel = localStorage.getItem('tts_model')
    const savedVoice = localStorage.getItem('tts_voice')
    const savedSpeed = localStorage.getItem('tts_speed')
    const savedStability = localStorage.getItem('tts_stability')
    const savedSimilarity = localStorage.getItem('tts_similarity')

    if (savedApiKey) {
      setApiKey(savedApiKey)
      tts.setApiKey(savedApiKey)
    }
    if (savedModel) {
      setCurrentModel(savedModel)
      tts.setModel(savedModel)
    }
    if (savedVoice) {
      setCurrentVoice(savedVoice)
      tts.setVoice(savedVoice)
    }
    if (savedSpeed) {
      setSpeed(parseFloat(savedSpeed))
      tts.setSpeed(parseFloat(savedSpeed))
    }
    if (savedStability) {
      setStability(parseFloat(savedStability))
      tts.setStability(parseFloat(savedStability))
    }
    if (savedSimilarity) {
      setSimilarity(parseFloat(savedSimilarity))
      tts.setSimilarity(parseFloat(savedSimilarity))
    }

    // Load voices and models
    loadVoices()
    loadModels()
  }, [])

  const loadVoices = useCallback(async () => {
    try {
      const voicesData = await tts.getVoices()
      setVoices(voicesData)
    } catch (err) {
      console.error('Failed to load voices:', err)
    }
  }, [])

  const loadModels = useCallback(async () => {
    try {
      const modelsData = await tts.getModels()
      setModels(modelsData)
    } catch (err) {
      console.error('Failed to load models:', err)
    }
  }, [])

  const speak = useCallback(async (text, options = {}) => {
    if (!text || !text.trim()) return

    setIsLoading(true)
    setError(null)
    setIsPlaying(true)

    try {
      await tts.speak(text, {
        model: options.model || currentModel,
        voice: options.voice || currentVoice,
        speed: options.speed || speed,
        stability: options.stability || stability,
        similarity: options.similarity || similarity,
      })
    } catch (err) {
      setError(err.message)
      console.error('TTS error:', err)
    } finally {
      setIsLoading(false)
      setIsPlaying(false)
    }
  }, [currentModel, currentVoice, speed, stability, similarity])

  const stop = useCallback(() => {
    tts.stop()
    setIsPlaying(false)
    setIsLoading(false)
  }, [])

  const updateApiKey = useCallback((key) => {
    setApiKey(key)
    tts.setApiKey(key)
    localStorage.setItem('elevenlabs_api_key', key)
    
    // Reload voices and models with new key
    loadVoices()
    loadModels()
  }, [loadVoices, loadModels])

  const updateModel = useCallback((model) => {
    setCurrentModel(model)
    tts.setModel(model)
    localStorage.setItem('tts_model', model)
  }, [])

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

  const updateStability = useCallback((newStability) => {
    const stabilityValue = Math.min(Math.max(parseFloat(newStability), 0), 1)
    setStability(stabilityValue)
    tts.setStability(stabilityValue)
    localStorage.setItem('tts_stability', stabilityValue.toString())
  }, [])

  const updateSimilarity = useCallback((newSimilarity) => {
    const similarityValue = Math.min(Math.max(parseFloat(newSimilarity), 0), 1)
    setSimilarity(similarityValue)
    tts.setSimilarity(similarityValue)
    localStorage.setItem('tts_similarity', similarityValue.toString())
  }, [])

  return {
    // State
    isPlaying,
    isLoading,
    error,
    apiKey,
    currentModel,
    currentVoice,
    speed,
    stability,
    similarity,
    voices,
    models,

    // Actions
    speak,
    stop,
    updateApiKey,
    updateModel,
    updateVoice,
    updateSpeed,
    updateStability,
    updateSimilarity,
    loadVoices,
    loadModels,
  }
}
