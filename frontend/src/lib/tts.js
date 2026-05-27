import { API_BASE } from './api.js'

const TTS_PROVIDERS = {
  gemini: {
    name: 'Google Gemini Flash TTS',
    description: 'Google Gemini Flash Text-to-Speech (Server-side)',
    voices: [
      { id: 'gemini_flash', name: 'Sahadeva (Gemini Flash)', gender: 'female', accent: 'multilingual' },
      { id: 'gemini_pro', name: 'Sahadeva Pro (Gemini Pro)', gender: 'male', accent: 'multilingual' },
      { id: 'mistral_large', name: 'Vayu (Mistral Large)', gender: 'male', accent: 'multilingual' },
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
    this.currentProvider = 'gemini'
    this.currentVoice = 'gemini_flash'
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
      // Set a default voice for the provider if none selected
      if (provider === 'gemini') {
        this.currentVoice = 'gemini_flash'
      } else if (provider === 'browser' && this.browserVoices.length > 0) {
        this.currentVoice = this.browserVoices[0].name
      }
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
    if (this.currentProvider === 'gemini') {
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
          voice_id: this.currentVoice || 'gemini_flash',
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

      // Safety timeout: resolve if onend doesn't fire within expected duration
      const duration = Math.max(6000, text.length * 120)
      const safetyTimeout = setTimeout(() => {
        console.warn('Browser SpeechSynthesis safety timeout reached');
        resolve()
      }, duration)

      utterance.onend = () => {
        clearTimeout(safetyTimeout)
        resolve()
      }
      utterance.onerror = (event) => {
        clearTimeout(safetyTimeout)
        reject(new Error(event.error))
      }

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
      case 'gemini':
        return this.speakWithGemini(text)
      case 'browser':
        return this.speakWithBrowser(text)
      default:
        return this.speakWithBrowser(text)
    }
  }

  stop() {
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
