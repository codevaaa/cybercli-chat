import * as Speech from 'expo-speech'
import { Platform } from 'react-native'

let speaking = false

/**
 * Read text aloud using the best available natural voice.
 * On web: uses Web Speech API with preference for Google/Microsoft natural voices.
 * On native: uses expo-speech with system TTS (quality depends on device).
 */
export function speak(text: string, opts?: { rate?: number; onDone?: () => void; lang?: string }) {
  // Strip markdown for cleaner speech
  const clean = text
    .replace(/```[\s\S]*?```/g, ' code block ')
    .replace(/\|[^|]+\|/g, '') // tables
    .replace(/[*_#`>~\[\]]/g, '')
    .replace(/\([^)]*\)/g, '') // markdown links
    .replace(/https?:\/\/\S+/g, '') // URLs
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim()

  if (!clean) { opts?.onDone?.(); return }

  speaking = true

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
    speakWeb(clean, opts)
  } else {
    speakNative(clean, opts)
  }
}

/** Web Speech API — find and use a natural human voice */
function speakWeb(text: string, opts?: { rate?: number; onDone?: () => void; lang?: string }) {
  const synth = window.speechSynthesis
  synth.cancel() // stop anything already playing

  const utter = new SpeechSynthesisUtterance(text)
  utter.rate = opts?.rate ?? 1.0
  utter.lang = opts?.lang ?? 'en-US'
  utter.pitch = 1.0

  // Pick a natural-sounding voice (not robotic)
  const voices = synth.getVoices()
  const naturalVoice = pickBestVoice(voices, utter.lang)
  if (naturalVoice) utter.voice = naturalVoice

  utter.onend = () => { speaking = false; opts?.onDone?.() }
  utter.onerror = () => { speaking = false; opts?.onDone?.() }

  // Chrome sometimes needs voices to be loaded async
  if (voices.length === 0) {
    synth.onvoiceschanged = () => {
      const v = synth.getVoices()
      const best = pickBestVoice(v, utter.lang)
      if (best) utter.voice = best
      synth.speak(utter)
    }
  } else {
    synth.speak(utter)
  }
}

/**
 * Pick the most natural-sounding voice. Priority:
 * 1. Google UK English Female / Male (very natural on Chrome)
 * 2. Microsoft online voices (Edge)
 * 3. Any "Natural" or "Neural" tagged voice
 * 4. Any female English voice
 * 5. Default
 */
function pickBestVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  const langPrefix = lang.split('-')[0] // 'en'

  // Filter to matching language
  const langVoices = voices.filter((v) => v.lang.startsWith(langPrefix))
  if (!langVoices.length) return voices[0]

  // Priority patterns
  const naturalPatterns = [
    /google.*female/i,
    /google.*male/i,
    /microsoft.*online.*natural/i,
    /natural/i,
    /neural/i,
    /samantha/i,
    /daniel/i,
    /karen/i,
    /moira/i,
  ]

  for (const pattern of naturalPatterns) {
    const match = langVoices.find((v) => pattern.test(v.name))
    if (match) return match
  }

  // Prefer non-local (online) voices — usually higher quality
  const online = langVoices.find((v) => !v.localService)
  if (online) return online

  return langVoices[0]
}

/** Native TTS via expo-speech */
function speakNative(text: string, opts?: { rate?: number; onDone?: () => void; lang?: string }) {
  Speech.speak(text, {
    rate: opts?.rate ?? 1.0,
    language: opts?.lang ?? 'en-US',
    onDone: () => { speaking = false; opts?.onDone?.() },
    onStopped: () => { speaking = false },
    onError: () => { speaking = false; opts?.onDone?.() },
  })
}

export function stopSpeaking() {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  } else {
    Speech.stop()
  }
  speaking = false
}

export function isSpeaking(): boolean {
  return speaking
}

export async function getAvailableVoices() {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
    return window.speechSynthesis.getVoices().map((v) => ({ id: v.name, name: v.name, lang: v.lang }))
  }
  try {
    const voices = await Speech.getAvailableVoicesAsync()
    return voices
  } catch {
    return []
  }
}
