import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, Text as RNText, TextInput as RNTextInput } from 'react-native'
import {
  useFonts,
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
} from '@expo-google-fonts/inter'
import * as SplashScreen from 'expo-splash-screen'
import { Colors } from '@/constants/colors'
import { Fonts } from '@/constants/fonts'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { AnimatedSplash } from '@/components/ui/AnimatedSplash'
import { useChatStore } from '@/stores/chatStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { loadThreads, loadActiveThread, loadSettings } from '@/services/storage/chatStorage'
import { checkForUpdates } from '@/services/updates'

SplashScreen.preventAutoHideAsync().catch(() => {})

/**
 * Apply Inter as the default font safely via defaultProps.
 */
function applyGlobalFont() {
  const TextAny = RNText as any
  const InputAny = RNTextInput as any
  if (!TextAny.defaultProps) TextAny.defaultProps = {}
  TextAny.defaultProps.style = [{ fontFamily: Fonts.regular }, TextAny.defaultProps.style]
  if (!InputAny.defaultProps) InputAny.defaultProps = {}
  InputAny.defaultProps.style = [{ fontFamily: Fonts.regular }, InputAny.defaultProps.style]
}

export default function RootLayout() {
  const hydrate = useChatStore((s) => s.hydrate)
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
  })
  const [splashDone, setSplashDone] = useState(false)

  useEffect(() => {
    void checkForUpdates(true)
    ;(async () => {
      const [threads, activeId, settings] = await Promise.all([
        loadThreads(), loadActiveThread(), loadSettings(),
      ])
      hydrate(threads, activeId)
      if (settings) {
        const st = useSettingsStore.getState()
        if (settings.model) st.setModel(settings.model as string)
        if (settings.providerKeys) {
          const keys = settings.providerKeys as Record<string, string>
          Object.entries(keys).forEach(([k, v]) => st.setProviderKey(k as any, v))
        }
      }
    })()
  }, [])

  useEffect(() => {
    if (fontsLoaded) { applyGlobalFont(); SplashScreen.hideAsync().catch(() => {}) }
  }, [fontsLoaded])

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: Colors.dark.background }} />
  }

  return (
    <ErrorBoundary>
      <View style={{ flex: 1, backgroundColor: Colors.dark.background }}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.dark.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="landing" options={{ animation: 'fade' }} />
          <Stack.Screen name="voice" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
          <Stack.Screen name="providers" options={{ animation: 'slide_from_right' }} />
        </Stack>

        {/* Animated Sudarshan Chakra splash — plays on every app launch */}
        {!splashDone && <AnimatedSplash onFinish={() => setSplashDone(true)} />}
      </View>
    </ErrorBoundary>
  )
}
