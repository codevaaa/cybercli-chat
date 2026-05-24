import { API_BASE } from './api.js'

const TTS_PROVIDERS = {
  puter: {
    name: 'Puter.js (Free)',
    description: 'Free ElevenLabs TTS via Puter.js - no API key needed',
    voices: [
      { id: 'sol', name: 'Sol', gender: 'female', accent: 'american' },
      { id: 'cove', name: 'Cove', gender: 'female', accent: 'american' },
      { id: 'breeze', name: 'Breeze', gender: 'female', accent: 'british' },
      { id: 'orion', name: 'Orion', gender: 'male', accent: 'american' },
      { id: 'echo', name: 'Echo', gender: 'male', accent: 'american' },
    ],
  },
  gemini: {
    name: 'Google Gemini Flash TTS',
    description: 'Google Gemini Flash Text-to-Speech (Server-side)',
    voices: [
      { id: 'gemini', name: 'Gemini Voice', gender: 'female', accent: 'american' },
      { id: 'sol', name: 'Sol', gender: 'female', accent: 'american' },
      { id: 'orion', name: 'Orion', gender: 'male', accent: 'american' },
    ],
  },
  browser: {
    name: 'Browser Native',
    description: 'Browser built-in TTS (Web Speech API) - free, no internet',
    voices: [], // Will be loaded from browser
  },
}

class TTSService {
  constructor() {
    this.currentProvider = 'puter'
    this.currentVoice = 'ava'
    this.currentSpeed = 1.0
    this.currentPitch = 1.0
    this.browserVoices = []
    this.geminiApiKey = null
    
    // Load browser voices
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.browserVoices = window.speechSynthesis.getVoices()
      }
    }
  }

  setProvider(provider) {
    if (TTS_PROVIDERS[provider]) {
      this.currentProvider = provider
    }
  }

  setVoice(voiceId) {
    this.currentVoice = voiceId
  }

  setSpeed(speed) {
    this.currentSpeed = Math.min(Math.max(speed, 0.25), 4.0)
  }

  setPitch(pitch) {
    this.currentPitch = Math.min(Math.max(pitch, 0.5), 2.0)
  }

  setGeminiApiKey(key) {
    this.geminiApiKey = key
  }

  getVoices() {
    if (this.currentProvider === 'puter') {
      return TTS_PROVIDERS.puter.voices
    } else if (this.currentProvider === 'gemini') {
      return TTS_PROVIDERS.gemini.voices
    } else if (this.currentProvider === 'browser') {
      return this.browserVoices.map(v => ({
        id: v.name,
        name: v.name,
        gender: 'unknown',
        accent: v.lang,
      }))
    }
    return []
  }

  getProviders() {
    return Object.keys(TTS_PROVIDERS).map(key => ({
      id: key,
      ...TTS_PROVIDERS[key],
    }))
  }

  // Puter.js TTS (Free ElevenLabs)
  async speakWithPuter(text) {
    try {
      // Load Puter.js dynamically
      if (!window.puter) {
        await this.loadPuter()
      }

      let voice = this.currentVoice || 'ava'
      
      // Map shortnames to real ElevenLabs voice IDs
      const PUTER_VOICES_MAP = {
        sol: 'H6QPv2pQZDcGqLwDTIJQ',
        cove: 'FZkK3TvQ0pjyDmT8fzIW',
        breeze: 'CwhRBWXzGAHq8TQ4Fs17',
        orion: 'wbOlq3nIga8HKqcDhASI',
        echo: 'TxGEqn7nUaNZTR5JgIec',
      }
      
      const realVoiceId = PUTER_VOICES_MAP[voice.toLowerCase()] || voice

      // Call the real puter.ai.txt2speech endpoint
      const audio = await window.puter.ai.txt2speech(text, { provider: 'elevenlabs', voice: realVoiceId })
      
      return new Promise((resolve, reject) => {
        // Handle stopping
        this.activePuterAudio = audio
        
        audio.onended = () => {
          this.activePuterAudio = null
          resolve()
        }
        audio.onerror = (err) => {
          this.activePuterAudio = null
          console.warn('Puter Audio error, falling back to Browser SpeechSynthesis', err)
          this.speakWithBrowser(text).then(resolve).catch(reject)
        }
        audio.play().catch((err) => {
          this.activePuterAudio = null
          console.warn('Puter play error, falling back to Browser SpeechSynthesis', err)
          this.speakWithBrowser(text).then(resolve).catch(reject)
        })
      })
    } catch (error) {
      console.error('Puter TTS error:', error)
      // Fallback to browser TTS
      return this.speakWithBrowser(text)
    }
  }

  async loadPuter() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://js.puter.com/v2/'
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  // Google Gemini TTS
  async speakWithGemini(text) {
    try {
      const token = localStorage.getItem('sb-access-token')
      const response = await fetch(`${API_BASE}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          text,
          voice_id: this.currentVoice || 'gemini',
          speed: this.currentSpeed,
        }),
      })

      if (!response.ok) {
        throw new Error(`Gemini TTS API status ${response.status}`)
      }

      const audioBlob = await response.blob()
      return this.playAudio(audioBlob)
    } catch (error) {
      console.error('Gemini TTS error:', error)
      // Fallback to browser TTS
      return this.speakWithBrowser(text)
    }
  }

  // Browser Native TTS (Web Speech API)
  async speakWithBrowser(text) {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Browser does not support speech synthesis'))
        return
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      
      // Find voice
      const voices = window.speechSynthesis.getVoices()
      const selectedVoice = voices.find(v => v.name === this.currentVoice) || voices[0]
      if (selectedVoice) {
        utterance.voice = selectedVoice
      }

      utterance.rate = this.currentSpeed
      utterance.pitch = this.currentPitch

      utterance.onend = () => resolve()
      utterance.onerror = (event) => reject(new Error(event.error))

      window.speechSynthesis.speak(utterance)
    })
  }

  async playAudio(audioBlob) {
    const audioUrl = URL.createObjectURL(audioBlob)
    const audio = new Audio(audioUrl)
    
    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
        resolve()
      }
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl)
        reject(new Error('Audio playback failed'))
      }
      audio.play().catch(reject)
    })
  }

  async speak(text) {
    if (!text || !text.trim()) return

    switch (this.currentProvider) {
      case 'puter':
        return this.speakWithPuter(text)
      case 'gemini':
        return this.speakWithGemini(text)
      case 'browser':
        return this.speakWithBrowser(text)
      default:
        return this.speakWithBrowser(text)
    }
  }

  stop() {
    if (this.activePuterAudio) {
      try {
        this.activePuterAudio.pause()
        this.activePuterAudio = null
      } catch (e) {}
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    // Stop any audio elements
    const audios = document.querySelectorAll('audio')
    audios.forEach(audio => audio.pause())
  }
}

// Create singleton instance
const tts = new TTSService()

export default tts
export { TTS_PROVIDERS }
