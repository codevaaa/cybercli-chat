import { API_BASE } from './api.js'

const TTS_PROVIDERS = {
  gemini: {
    name: 'Google Gemini Flash TTS',
    description: 'Google Gemini Flash Text-to-Speech (Server-side)',
    voices: [
      { id: 'gemini_female', name: 'Kushi (Fast & Natural)', gender: 'female', accent: 'multilingual' },
      { id: 'gemini_male_1', name: 'Rudra (Fast JARVIS-like)', gender: 'male', accent: 'multilingual' },
      { id: 'gemini_male_2', name: 'Sankalp (Fast & Expressive)', gender: 'male', accent: 'multilingual' },
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
    this.currentSpeed = 1.15 // Fast but natural human speed
    this.currentPitch = 1.0 // Natural pitch
    this.browserVoices = []
    this.geminiApiKey = null

    // Prefetching & Playback Queue
    this.queue = []
    this.isFetching = false
    this.isPlaying = false

    this.activeAudio = null
    this.activeAudioUrl = null
    this.activeFetchController = null
    this.stopped = false

    // State callback
    this.onStateChange = null

    // Load browser voices
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.browserVoices = window.speechSynthesis.getVoices()
      }
    }
  }

  _notifyState() {
    if (this.onStateChange) {
      const isActuallyPlaying = this.isPlaying || (this.queue.length > 0)
      this.onStateChange({
        isPlaying: isActuallyPlaying,
        isLoading: this.isFetching && !this.isPlaying
      })
    }
  }

  setProvider(provider) {
    if (TTS_PROVIDERS[provider]) {
      this.currentProvider = provider
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

  async fetchGeminiAudio(text) {
    if (this.stopped) return null
    const controller = new AbortController()
    this.activeFetchController = controller
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
          speed: 1.15,
        }),
      })

      // If backend signals browser fallback (no Gemini key), switch provider automatically
      if (response.status === 503) {
        const data = await response.json().catch(() => ({}))
        if (data.fallback === 'browser') {
          console.warn('[TTS] Gemini key unavailable — switching to browser TTS permanently')
          this.currentProvider = 'browser'
          this._notifyState()
          return null  // null signals caller to use browser TTS
        }
      }

      if (!response.ok) throw new Error(`Gemini TTS API status ${response.status}`)
      return await response.blob()
    } catch (error) {
      if (error?.name === 'AbortError' || this.stopped) return null
      console.error('Gemini TTS fetch error:', error)
      throw error
    } finally {
      if (this.activeFetchController === controller) this.activeFetchController = null
    }
  }

  pickBrowserVoice(voices) {
    if (!voices || voices.length === 0) return null
    const wantMale = /male/.test(this.currentVoice) && !/female/.test(this.currentVoice)
    const wantFemale = /female/.test(this.currentVoice)

    const femaleHints = ['female', 'aoede', 'zira', 'aria', 'jenny', 'samantha', 'victoria', 'susan', 'hazel', 'eva', 'sonia', 'michelle', 'libby', 'fiona', 'tessa', 'karen', 'moira', 'serena', 'google uk english female']
    const maleHints = ['male', 'charon', 'puck', 'david', 'guy', 'mark', 'george', 'ryan', 'james', 'daniel', 'alex', 'fred', 'oliver', 'google uk english male']

    const lang = (localStorage.getItem('user_language') || 'en').toLowerCase()
    const prefersLang = (v) => v.lang && v.lang.toLowerCase().startsWith(lang.slice(0, 2))

    const score = (v) => {
      const n = (v.name || '').toLowerCase()
      let s = 0
      if (wantFemale && femaleHints.some(h => n.includes(h))) s += 10
      if (wantMale && maleHints.some(h => n.includes(h))) s += 10
      if (wantFemale && maleHints.some(h => n.includes(h))) s -= 8
      if (wantMale && femaleHints.some(h => n.includes(h))) s -= 8
      if (prefersLang(v)) s += 3
      if (/google|microsoft|natural|online/.test(n)) s += 1
      return s
    }

    const sorted = [...voices].sort((a, b) => score(b) - score(a))
    return sorted[0] || voices[0]
  }

  async speakWithBrowser(text) {
    if (this.stopped) return
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve()
        return
      }

      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      const voices = window.speechSynthesis.getVoices()
      const selectedVoice = (this.currentProvider === 'browser'
        ? voices.find(v => v.name === this.currentVoice)
        : this.pickBrowserVoice(voices)) || voices[0]
      
      if (selectedVoice) utterance.voice = selectedVoice
      utterance.rate = this.currentProvider === 'gemini' ? 1.15 : this.currentSpeed
      utterance.pitch = this.currentProvider === 'gemini' ? 1.0 : this.currentPitch

      const duration = Math.max(6000, text.length * 120)
      const safetyTimeout = setTimeout(() => resolve(), duration)

      utterance.onend = () => { clearTimeout(safetyTimeout); resolve() }
      utterance.onerror = () => { clearTimeout(safetyTimeout); resolve() }

      window.speechSynthesis.speak(utterance)
    })
  }

  async playAudio(audioBlob) {
    if (this.stopped) return
    const wavBlob = new Blob([audioBlob], { type: 'audio/wav' })
    const audioUrl = URL.createObjectURL(wavBlob)
    const audio = new Audio(audioUrl)
    this.activeAudio = audio
    this.activeAudioUrl = audioUrl

    return new Promise((resolve) => {
      const cleanup = () => {
        URL.revokeObjectURL(audioUrl)
        if (this.activeAudio === audio) { this.activeAudio = null; this.activeAudioUrl = null }
      }
      audio.onended = () => { cleanup(); resolve() }
      audio.onerror = () => { cleanup(); resolve() }
      audio.play().catch(() => { cleanup(); resolve() })
    })
  }

  speak(text) {
    if (!text || !text.trim()) return
    this.stopped = false
    this.queue.push({ text, blob: null, fetching: false, error: false })
    this._notifyState()
    // Immediately start fetching this item AND kick playback
    this._prefetchNext()
    this._drainPlayback()
  }

  // Prefetch the NEXT unfetched item (runs in background, non-blocking)
  async _prefetchNext() {
    if (this.isFetching || this.currentProvider !== 'gemini') return
    const item = this.queue.find(i => !i.blob && !i.fetching && !i.error)
    if (!item) return
    this.isFetching = true
    item.fetching = true
    this._notifyState()
    try {
      const blob = await this.fetchGeminiAudio(item.text)
      if (blob === null && this.currentProvider === 'browser') {
        // Backend switched us to browser — mark as error so _drainPlayback uses browser
        item.error = true
      } else {
        item.blob = blob
      }
    } catch {
      item.error = true
    } finally {
      item.fetching = false
      this.isFetching = false
      this._notifyState()
      // Prefetch the one after this too (pipeline)
      this._prefetchNext()
      // Wake up playback in case it was waiting
      this._drainPlayback()
    }
  }

  // Playback loop — plays items as soon as blobs arrive
  async _drainPlayback() {
    if (this.isPlaying || this.stopped) return
    if (this.queue.length === 0) return

    const item = this.queue[0]

    if (this.currentProvider === 'browser') {
      this.isPlaying = true
      this._notifyState()
      this.queue.shift()
      await this.speakWithBrowser(item.text)
      this.isPlaying = false
      this._notifyState()
      if (!this.stopped) this._drainPlayback()
      return
    }

    if (item.blob) {
      this.isPlaying = true
      this._notifyState()
      this.queue.shift()
      // Start prefetching the next item immediately while this plays
      this._prefetchNext()
      await this.playAudio(item.blob)
      this.isPlaying = false
      this._notifyState()
      if (!this.stopped) this._drainPlayback()
    } else if (item.error) {
      // Fallback to browser TTS
      this.isPlaying = true
      this._notifyState()
      this.queue.shift()
      await this.speakWithBrowser(item.text)
      this.isPlaying = false
      this._notifyState()
      if (!this.stopped) this._drainPlayback()
    } else {
      // Blob not ready yet — poll every 15ms (very tight loop for low latency)
      setTimeout(() => { if (!this.stopped) this._drainPlayback() }, 15)
    }
  }

  async pumpQueue() {
    // Legacy method — delegates to new parallel pipeline
    this._prefetchNext()
    this._drainPlayback()
  }

  stop() {
    this.stopped = true
    this.queue = []
    
    if (this.activeFetchController) {
      try { this.activeFetchController.abort() } catch {}
      this.activeFetchController = null
    }

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

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    document.querySelectorAll('audio').forEach(audio => { try { audio.pause() } catch {} })

    this.isPlaying = false
    this.isFetching = false
    this._notifyState()
  }
}

// Create singleton instance
const tts = new TTSService()

export default tts
export { TTS_PROVIDERS }
