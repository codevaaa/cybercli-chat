import { API_BASE } from './api.js'

const TTS_PROVIDERS = {
  gemini: {
    name: 'Google Gemini Flash TTS',
    description: 'Google Gemini Flash Text-to-Speech (Server-side)',
    voices: [
      { id: 'gemini_female', name: 'Nexus (Ultra-Fast Robotic)', gender: 'female', accent: 'multilingual' },
      { id: 'gemini_male_1', name: 'Prime (Ultra-Fast Robotic)', gender: 'male', accent: 'multilingual' },
      { id: 'gemini_male_2', name: 'Cipher (Ultra-Fast Robotic)', gender: 'male', accent: 'multilingual' },
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
    this.currentVoice = 'gemini_female'
    this.currentSpeed = 2.0 // Ultra fast
    this.currentPitch = 0.8 // Slightly lower pitch for robotic feel
    this.browserVoices = []
    this.geminiApiKey = null

    // Track the currently playing audio + in-flight request so stop()/barge-in
    // can immediately halt everything (this is what makes interrupt feel instant).
    this.activeAudio = null
    this.activeAudioUrl = null
    this.activeController = null
    this.stopped = false

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
        this.currentVoice = 'gemini_female'
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
    // A stop()/interrupt may have fired before this sentence started — bail out.
    if (this.stopped) return
    const controller = new AbortController()
    this.activeController = controller
    try {
      const token = localStorage.getItem('sb-access-token')
      const clientKey = this.geminiApiKey || localStorage.getItem('client_gemini_api_key')

      const response = await fetch(`${API_BASE}/tts`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(clientKey ? { 'X-Gemini-API-Key': clientKey } : {}),
        },
        body: JSON.stringify({
          text,
          voice_id: this.currentVoice || 'gemini_female',
          speed: 2.0, // Forced ultra-fast for robotic models
        }),
      })

      if (!response.ok) {
        throw new Error(`Gemini TTS API status ${response.status}`)
      }

      const audioBlob = await response.blob()
      if (this.stopped) return // interrupted while the audio was downloading
      return this.playAudio(audioBlob)
    } catch (error) {
      if (error?.name === 'AbortError' || this.stopped) return
      console.error('Gemini TTS error:', error)
      // Fallback to browser TTS, preserving the requested voice gender.
      return this.speakWithBrowser(text)
    } finally {
      if (this.activeController === controller) this.activeController = null
    }
  }

  /**
   * Pick a browser voice that matches the requested gender so the Edge/browser
   * fallback doesn't make a "female" agent sound male. We infer the desired
   * gender from the selected Gemini voice id (…_female / …_male_*).
   */
  pickBrowserVoice(voices) {
    if (!voices || voices.length === 0) return null
    const wantMale = /male/.test(this.currentVoice) && !/female/.test(this.currentVoice)
    const wantFemale = /female/.test(this.currentVoice)

    // Common gendered voice-name hints across platforms (Windows/Edge/Chrome/macOS).
    const femaleHints = ['female', 'aoede', 'zira', 'aria', 'jenny', 'samantha', 'victoria', 'susan', 'hazel', 'eva', 'sonia', 'michelle', 'libby', 'fiona', 'tessa', 'karen', 'moira', 'serena', 'google uk english female']
    const maleHints = ['male', 'charon', 'puck', 'david', 'guy', 'mark', 'george', 'ryan', 'james', 'daniel', 'alex', 'fred', 'oliver', 'google uk english male']

    const lang = (localStorage.getItem('user_language') || 'en').toLowerCase()
    const prefersLang = (v) => v.lang && v.lang.toLowerCase().startsWith(lang.slice(0, 2))

    const score = (v) => {
      const n = (v.name || '').toLowerCase()
      let s = 0
      if (wantFemale && femaleHints.some(h => n.includes(h))) s += 10
      if (wantMale && maleHints.some(h => n.includes(h))) s += 10
      // Penalize the opposite gender so we never cross over.
      if (wantFemale && maleHints.some(h => n.includes(h))) s -= 8
      if (wantMale && femaleHints.some(h => n.includes(h))) s -= 8
      if (prefersLang(v)) s += 3
      if (/google|microsoft|natural|online/.test(n)) s += 1
      return s
    }

    const sorted = [...voices].sort((a, b) => score(b) - score(a))
    return sorted[0] || voices[0]
  }

  // Browser Native TTS (Web Speech API)
  async speakWithBrowser(text) {
    if (this.stopped) return
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Browser does not support speech synthesis'))
        return
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)

      // Find a gender-appropriate voice (fixes the "all 3 sound male" fallback bug).
      const voices = window.speechSynthesis.getVoices()
      const selectedVoice = (this.currentProvider === 'browser'
        ? voices.find(v => v.name === this.currentVoice)
        : this.pickBrowserVoice(voices)) || voices[0]
      if (selectedVoice) {
        utterance.voice = selectedVoice
      }

      if (this.currentProvider === 'gemini') {
        utterance.rate = 2.0 // Forced ultra-fast for robotic models
        utterance.pitch = 0.8 // Lower pitch for robotic feel
      } else {
        utterance.rate = this.currentSpeed
        utterance.pitch = this.currentPitch
      }

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
        // 'interrupted'/'canceled' are expected during barge-in — treat as resolve.
        if (event.error === 'interrupted' || event.error === 'canceled' || this.stopped) {
          resolve()
        } else {
          reject(new Error(event.error))
        }
      }

      window.speechSynthesis.speak(utterance)
    })
  }

  async playAudio(audioBlob) {
    if (this.stopped) return
    // Ensure browser treats the response as WAV audio regardless of server Content-Type header
    const wavBlob = new Blob([audioBlob], { type: 'audio/wav' })
    const audioUrl = URL.createObjectURL(wavBlob)
    const audio = new Audio(audioUrl)
    this.activeAudio = audio
    this.activeAudioUrl = audioUrl

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        URL.revokeObjectURL(audioUrl)
        if (this.activeAudio === audio) { this.activeAudio = null; this.activeAudioUrl = null }
      }
      audio.onended = () => { cleanup(); resolve() }
      audio.onerror = () => { cleanup(); this.stopped ? resolve() : reject(new Error('Audio playback failed')) }
      audio.play().catch((e) => { cleanup(); this.stopped ? resolve() : reject(e) })
    })
  }

  async speak(text) {
    if (!text || !text.trim()) return
    // A fresh speak() clears the stopped flag so a new turn can play.
    this.stopped = false

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
    // Mark stopped FIRST so any in-flight async work bails out immediately.
    this.stopped = true

    // Abort an in-flight TTS fetch (stops audio that hasn't started yet).
    if (this.activeController) {
      try { this.activeController.abort() } catch {}
      this.activeController = null
    }

    // Stop the active Gemini audio element (created via new Audio(), NOT in DOM —
    // this is the bug that made interrupt fail to stop the voice).
    if (this.activeAudio) {
      try {
        this.activeAudio.pause()
        this.activeAudio.currentTime = 0
        this.activeAudio.src = ''
      } catch {}
      if (this.activeAudioUrl) { try { URL.revokeObjectURL(this.activeAudioUrl) } catch {} }
      this.activeAudio = null
      this.activeAudioUrl = null
    }

    // Stop browser speech synthesis.
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    // Belt-and-suspenders: pause any <audio> elements that ARE in the DOM.
    document.querySelectorAll('audio').forEach(audio => { try { audio.pause() } catch {} })
  }
}

// Create singleton instance
const tts = new TTSService()

export default tts
export { TTS_PROVIDERS }
