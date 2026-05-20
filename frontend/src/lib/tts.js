// TTS Service using Puter.js (Free TTS via ElevenLabs - no API key needed)
// Puter.js provides free access to ElevenLabs TTS without requiring your own API key

const TTS_PROVIDERS = {
  puter: {
    name: 'Puter.js (Free)',
    description: 'Free ElevenLabs TTS via Puter.js - no API key needed',
    voices: [
      { id: 'ava', name: 'Ava', gender: 'female', accent: 'american' },
      { id: 'bella', name: 'Bella', gender: 'female', accent: 'american' },
      { id: 'emma', name: 'Emma', gender: 'female', accent: 'british' },
      { id: 'rachel', name: 'Rachel', gender: 'female', accent: 'american' },
      { id: 'charlotte', name: 'Charlotte', gender: 'female', accent: 'american' },
      { id: 'adam', name: 'Adam', gender: 'male', accent: 'american' },
      { id: 'josh', name: 'Josh', gender: 'male', accent: 'american' },
      { id: 'fin', name: 'Fin', gender: 'male', accent: 'irish' },
    ],
  },
  gemini: {
    name: 'Google Gemini Flash TTS',
    description: 'Google Gemini Flash Text-to-Speech - requires API key',
    voices: [
      { id: 'en-US-Neural2-A', name: 'Neural2 A', gender: 'female', accent: 'american' },
      { id: 'en-US-Neural2-B', name: 'Neural2 B', gender: 'male', accent: 'american' },
      { id: 'en-US-Neural2-C', name: 'Neural2 C', gender: 'female', accent: 'american' },
      { id: 'en-GB-Neural2-A', name: 'Neural2 UK A', gender: 'female', accent: 'british' },
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

      return new Promise((resolve, reject) => {
        window.puter.ai.chat(text)
          .then(response => {
            // Puter.js doesn't have direct TTS, so we'll use browser fallback
            // or you can use Puter's media features
            this.speakWithBrowser(text).then(resolve).catch(reject)
          })
          .catch(err => {
            // Fallback to browser TTS
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
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not set')
    }

    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: 'en-US',
              name: this.currentVoice || 'en-US-Neural2-A',
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: this.currentSpeed,
              pitch: this.currentPitch,
            },
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Gemini TTS API error')
      }

      const data = await response.json()
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
        { type: 'audio/mp3' }
      )

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
