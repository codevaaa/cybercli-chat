import { Platform } from 'react-native'

/**
 * Speech-to-text. On web uses the Web Speech API (SpeechRecognition).
 * On native, we rely on expo-speech-recognition if available, else fall back.
 * Designed for the voice-to-voice conversation loop.
 */

export interface STTHandlers {
  onPartial?: (text: string) => void
  onFinal: (text: string) => void
  onError?: (err: string) => void
  onEnd?: () => void
}

let recognition: any = null

export function isSTTAvailable(): boolean {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  }
  // Native STT requires expo-speech-recognition (a dev build, not Expo Go)
  try {
    require('expo-speech-recognition')
    return true
  } catch {
    return false
  }
}

export function startListening(handlers: STTHandlers, lang = 'en-US') {
  if (Platform.OS === 'web') {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { handlers.onError?.('Speech recognition not supported in this browser'); return }
    recognition = new SR()
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = true

    let finalText = ''
    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += transcript
        else interim += transcript
      }
      if (interim) handlers.onPartial?.(finalText + interim)
    }
    recognition.onerror = (e: any) => handlers.onError?.(e.error || 'recognition error')
    recognition.onend = () => {
      if (finalText.trim()) handlers.onFinal(finalText.trim())
      handlers.onEnd?.()
    }
    recognition.start()
    return
  }

  // Native path
  try {
    const Speech = require('expo-speech-recognition')
    const ExpoSpeechRecognition = Speech.ExpoSpeechRecognitionModule || Speech.default
    if (!ExpoSpeechRecognition) { handlers.onError?.('STT module not available'); return }

    let finalText = ''
    const subResult = Speech.addSpeechRecognitionListener?.('result', (e: any) => {
      const t = e.results?.[0]?.transcript || ''
      if (e.isFinal) { finalText = t; handlers.onFinal(t) }
      else handlers.onPartial?.(t)
    })
    const subEnd = Speech.addSpeechRecognitionListener?.('end', () => handlers.onEnd?.())
    recognition = { stop: () => { ExpoSpeechRecognition.stop?.(); subResult?.remove?.(); subEnd?.remove?.() } }

    ExpoSpeechRecognition.requestPermissionsAsync?.().then(() => {
      ExpoSpeechRecognition.start?.({ lang, interimResults: true, continuous: false })
    })
  } catch (e: any) {
    handlers.onError?.(e.message || 'STT not available on this device')
  }
}

export function stopListening() {
  try {
    if (Platform.OS === 'web') recognition?.stop?.()
    else recognition?.stop?.()
  } catch {}
  recognition = null
}
