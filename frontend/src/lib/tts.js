// ElevenLabs TTS Service (Client-side)
// Best models: multilingual-v2, eleven_multilingual_v2, eleven_turbo_v2

const ELEVENLABS_MODELS = {
  'multilingual-v2': {
    id: 'eleven_multilingual_v2',
    name: 'Multilingual v2',
    description: 'Best for multiple languages, high quality',
    supportsSSML: true,
  },
  'eleven-turbo-v2': {
    id: 'eleven_turbo_v2_5',
    name: 'Eleven Turbo v2.5',
    description: 'Low latency, fast generation',
    supportsSSML: true,
  },
  'monolingual-v1': {
    id: 'eleven_monolingual_v1',
    name: 'Monolingual v1',
    description: 'English only, classic quality',
    supportsSSML: false,
  },
}

const ELEVENLABS_VOICES = {
  // Female voices
  'ava': { id: '21m00Tcm4TlvDq8ikWAM', name: 'Ava', gender: 'female', accent: 'american' },
  'bella': { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', accent: 'american' },
  'emma': { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Emma', gender: 'female', accent: 'british' },
  'rachel': { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'female', accent: 'american' },
  'charlotte': { id: 'XB0reDy9RPKgq4vXk3Mb', name: 'Charlotte', gender: 'female', accent: 'american' },
  // Male voices
  'adam': { id: 'pNInz6obpgDQG0FNeSSg', name: 'Adam', gender: 'male', accent: 'american' },
  'josh': { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', gender: 'male', accent: 'american' },
  'fin': { id: 'JBFqnPBsM7m6zl9Zq4Pn', name: 'Fin', gender: 'male', accent: 'irish' },
  'michael': { id: 'flK6cRy7YtN5c1c2z2z2', name: 'Michael', gender: 'male', accent: 'american' },
}

class ElevenLabsTTS {
  constructor(apiKey = null) {
    this.apiKey = apiKey || process.env.VITE_ELEVENLABS_API_KEY || null
    this.baseUrl = 'https://api.elevenlabs.io/v1'
    this.currentModel = 'multilingual-v2'
    this.currentVoice = 'ava'
    this.currentSpeed = 1.0
    this.currentStability = 0.5
    this.currentSimilarity = 0.75
  }

  setApiKey(key) {
    this.apiKey = key
  }

  setModel(modelId) {
    if (ELEVENLABS_MODELS[modelId]) {
      this.currentModel = modelId
    }
  }

  setVoice(voiceId) {
    if (ELEVENLABS_VOICES[voiceId]) {
      this.currentVoice = voiceId
    }
  }

  setSpeed(speed) {
    this.currentSpeed = Math.min(Math.max(speed, 0.25), 4.0)
  }

  setStability(stability) {
    this.currentStability = Math.min(Math.max(stability, 0), 1)
  }

  setSimilarity(similarity) {
    this.currentSimilarity = Math.min(Math.max(similarity, 0), 1)
  }

  async getVoices() {
    if (!this.apiKey) {
      return Object.keys(ELEVENLABS_VOICES).map(key => ({
        voice_id: ELEVENLABS_VOICES[key].id,
        name: ELEVENLABS_VOICES[key].name,
        labels: {
          gender: ELEVENLABS_VOICES[key].gender,
          accent: ELEVENLABS_VOICES[key].accent,
        },
      }))
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) throw new Error('Failed to fetch voices')
      
      const data = await response.json()
      return data.voices
    } catch (error) {
      console.error('Error fetching voices:', error)
      return Object.keys(ELEVENLABS_VOICES).map(key => ({
        voice_id: ELEVENLABS_VOICES[key].id,
        name: ELEVENLABS_VOICES[key].name,
        labels: {
          gender: ELEVENLABS_VOICES[key].gender,
          accent: ELEVENLABS_VOICES[key].accent,
        },
      }))
    }
  }

  async getModels() {
    if (!this.apiKey) {
      return Object.keys(ELEVENLABS_MODELS).map(key => ({
        model_id: ELEVENLABS_MODELS[key].id,
        name: ELEVENLABS_MODELS[key].name,
        description: ELEVENLABS_MODELS[key].description,
      }))
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) throw new Error('Failed to fetch models')
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching models:', error)
      return Object.keys(ELEVENLABS_MODELS).map(key => ({
        model_id: ELEVENLABS_MODELS[key].id,
        name: ELEVENLABS_MODELS[key].name,
        description: ELEVENLABS_MODELS[key].description,
      }))
    }
  }

  async synthesize(text, options = {}) {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not set. Please add VITE_ELEVENLABS_API_KEY to environment variables.')
    }

    const {
      model = this.currentModel,
      voice = this.currentVoice,
      speed = this.currentSpeed,
      stability = this.currentStability,
      similarity = this.currentSimilarity,
    } = options

    const voiceId = ELEVENLABS_VOICES[voice]?.id || voice
    const modelId = ELEVENLABS_MODELS[model]?.id || model

    try {
      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarity,
            style: 0.0,
            use_speaker_boost: true,
          },
          pronunciation_dictionary: [],
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail?.message || 'Failed to synthesize speech')
      }

      const audioBlob = await response.blob()
      return audioBlob
    } catch (error) {
      console.error('TTS synthesis error:', error)
      throw error
    }
  }

  async synthesizeStream(text, options = {}) {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not set')
    }

    const {
      model = this.currentModel,
      voice = this.currentVoice,
      speed = this.currentSpeed,
      stability = this.currentStability,
      similarity = this.currentSimilarity,
    } = options

    const voiceId = ELEVENLABS_VOICES[voice]?.id || voice
    const modelId = ELEVENLABS_MODELS[model]?.id || model

    try {
      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}/stream`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarity,
            style: 0.0,
            use_speaker_boost: true,
          },
          output_format: 'mp3_44100_128',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail?.message || 'Failed to stream speech')
      }

      return response.body
    } catch (error) {
      console.error('TTS stream error:', error)
      throw error
    }
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

  async speak(text, options = {}) {
    try {
      const audioBlob = await this.synthesize(text, options)
      await this.playAudio(audioBlob)
    } catch (error) {
      console.error('Speech synthesis failed:', error)
      throw error
    }
  }

  async speakStream(text, options = {}, onChunk = null) {
    try {
      const stream = await this.synthesizeStream(text, options)
      const reader = stream.getReader()
      const chunks = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        chunks.push(value)
        if (onChunk) onChunk(value)
      }

      const audioBlob = new Blob(chunks, { type: 'audio/mpeg' })
      await this.playAudio(audioBlob)
    } catch (error) {
      console.error('Streamed speech synthesis failed:', error)
      throw error
    }
  }

  stop() {
    // Stop any currently playing audio
    const audios = document.querySelectorAll('audio')
    audios.forEach(audio => audio.pause())
  }
}

// Create singleton instance
const tts = new ElevenLabsTTS()

export default tts
export { ELEVENLABS_MODELS, ELEVENLABS_VOICES }
