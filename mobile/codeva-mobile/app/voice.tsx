import { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, SafeAreaView, Animated, Easing } from 'react-native'
import { router } from 'expo-router'
import { Colors } from '@/constants/colors'
import { Icon } from '@/components/ui/Icon'
import { CodevaMark } from '@/components/ui/CodevaLogo'
import { startListening, stopListening, isSTTAvailable } from '@/services/voice/stt'
import { speak, stopSpeaking } from '@/services/voice/tts'
import { streamChat, resolveProvider, ChatMessage } from '@/services/ai/engine'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/services/supabase'
import { useChatStore } from '@/stores/chatStore'
import { VOICE_SYSTEM_PROMPT } from '@/constants/config'

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking'

export default function VoiceScreen() {
  const c = Colors.dark
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')
  const [available] = useState(isSTTAvailable())
  const conversationRef = useRef<ChatMessage[]>([])
  const pulse = useRef(new Animated.Value(1)).current
  const { model, providerKeys, voiceSpeed } = useSettingsStore()
  const { user } = useAuthStore()
  const [authToken, setAuthToken] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthToken(data.session?.access_token || ''))
  }, [])

  const mergedKeys = {
    ...(providerKeys as Record<string, string>),
    ...(user ? { __useBackend: 'true', __token: authToken } : {}),
  }

  // Pulse animation while listening/speaking
  useEffect(() => {
    if (state === 'listening' || state === 'speaking') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.15, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      )
      loop.start()
      return () => loop.stop()
    } else {
      pulse.setValue(1)
    }
  }, [state])

  const askAI = useCallback(async (userText: string) => {
    setState('thinking')
    setResponse('')
    conversationRef.current.push({ role: 'user', content: userText })

    const config = resolveProvider(model, mergedKeys)
    if (!config) {
      setError('Could not connect to the AI. Check your internet connection.')
      setState('idle')
      return
    }

    let full = ''
    await streamChat(
      conversationRef.current,
      config,
      {
        onToken: (t) => { full += t; setResponse(full) },
        onDone: (text) => {
          conversationRef.current.push({ role: 'assistant', content: text })
          setState('speaking')
          // Speak the response, then auto-listen again (continuous conversation)
          speak(text, {
            rate: voiceSpeed,
            onDone: () => {
              setState('idle')
              // Auto re-listen for a natural back-and-forth
              setTimeout(() => beginListening(), 400)
            },
          })
        },
        onError: (err) => { setError(err); setState('idle') },
      },
      undefined,
      VOICE_SYSTEM_PROMPT
    )
  }, [model, providerKeys, voiceSpeed])

  const beginListening = useCallback(() => {
    if (!available) { setError('Voice input not available here. Use a dev build or Chrome.'); return }
    setError('')
    setTranscript('')
    setResponse('')
    setState('listening')
    startListening({
      onPartial: (t) => setTranscript(t),
      onFinal: (t) => { setTranscript(t); if (t.trim()) askAI(t.trim()); else setState('idle') },
      onError: (e) => { setError(e); setState('idle') },
      onEnd: () => { /* handled in onFinal */ },
    })
  }, [available, askAI])

  const handleMainButton = () => {
    if (state === 'listening') { stopListening(); setState('idle') }
    else if (state === 'speaking') { stopSpeaking(); setState('idle') }
    else if (state === 'idle') beginListening()
  }

  const exit = () => {
    stopListening()
    stopSpeaking()
    router.back()
  }

  const stateLabel = {
    idle: 'Tap to speak',
    listening: 'Listening…',
    thinking: 'Thinking…',
    speaking: 'Speaking…',
  }[state]

  const ringColor = state === 'listening' ? c.accent : state === 'speaking' ? c.purple : state === 'thinking' ? c.textMuted : c.border

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 }}>
        <TouchableOpacity onPress={exit} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="chevronDown" size={22} color={c.textMuted} />
          <Text style={{ fontSize: 15, color: c.textMuted }}>Close</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>Voice</Text>
        <View style={{ width: 70 }} />
      </View>

      {/* Orb */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <Animated.View style={{ transform: [{ scale: pulse }], marginBottom: 36 }}>
          <View style={{
            width: 160, height: 160, borderRadius: 80,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: ringColor,
            backgroundColor: state === 'idle' ? c.elevated : `${ringColor}18`,
            shadowColor: ringColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: state === 'idle' ? 0 : 0.6, shadowRadius: 30,
          }}>
            <CodevaMark size={70} color={state === 'idle' ? c.accent : ringColor} spin={state === 'thinking' || state === 'speaking'} />
          </View>
        </Animated.View>

        <Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>{stateLabel}</Text>

        {/* Live transcript / response */}
        <View style={{ marginTop: 24, minHeight: 80, maxWidth: 320 }}>
          {transcript ? (
            <Text style={{ fontSize: 15, color: c.textMuted, textAlign: 'center', lineHeight: 22 }}>"{transcript}"</Text>
          ) : null}
          {response ? (
            <Text style={{ fontSize: 16, color: c.text, textAlign: 'center', lineHeight: 24, marginTop: 12 }}>{response}</Text>
          ) : null}
          {error ? (
            <Text style={{ fontSize: 14, color: c.error, textAlign: 'center', marginTop: 12 }}>{error}</Text>
          ) : null}
        </View>
      </View>

      {/* Controls */}
      <View style={{ alignItems: 'center', paddingBottom: 50 }}>
        <TouchableOpacity
          onPress={handleMainButton}
          disabled={state === 'thinking'}
          style={{
            width: 84, height: 84, borderRadius: 42,
            backgroundColor: state === 'listening' || state === 'speaking' ? c.error : c.accent,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: c.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16,
            opacity: state === 'thinking' ? 0.5 : 1,
          }}
        >
          <Icon name={state === 'listening' || state === 'speaking' ? 'stop' : 'mic'} size={32} color="#fff" />
        </TouchableOpacity>
        <Text style={{ fontSize: 13, color: c.textDim, marginTop: 16, maxWidth: 280, textAlign: 'center' }}>
          {available
            ? 'Speak naturally. Codeva listens, responds, then listens again — a real conversation.'
            : 'Voice input needs a device build or Chrome browser.'}
        </Text>
      </View>
    </SafeAreaView>
  )
}
