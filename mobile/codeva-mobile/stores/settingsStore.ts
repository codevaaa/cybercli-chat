import { create } from 'zustand'
import { saveSettings } from '@/services/storage/chatStorage'

interface ProviderKeys {
  groq?: string
  gemini?: string
  codeva?: string
}

interface SettingsState {
  model: string
  theme: 'dark' | 'light' | 'system'
  providerKeys: ProviderKeys
  voiceEnabled: boolean
  voiceSpeed: number
  hapticFeedback: boolean
  fontSize: 'small' | 'medium' | 'large'

  setModel: (model: string) => void
  setTheme: (theme: 'dark' | 'light' | 'system') => void
  setProviderKey: (provider: keyof ProviderKeys, key: string) => void
  removeProviderKey: (provider: keyof ProviderKeys) => void
  setVoiceEnabled: (enabled: boolean) => void
  setVoiceSpeed: (speed: number) => void
  setHapticFeedback: (enabled: boolean) => void
  setFontSize: (size: 'small' | 'medium' | 'large') => void
  hasAnyProvider: () => boolean
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  model: 'auto',
  theme: 'dark',
  providerKeys: {},
  voiceEnabled: true,
  voiceSpeed: 1.0,
  hapticFeedback: true,
  fontSize: 'medium',

  setModel: (model) => { set({ model }); persistSettings(get) },
  setTheme: (theme) => { set({ theme }); persistSettings(get) },
  setProviderKey: (provider, key) => {
    set((s) => ({ providerKeys: { ...s.providerKeys, [provider]: key } }))
    persistSettings(get)
  },
  removeProviderKey: (provider) => {
    set((s) => {
      const keys = { ...s.providerKeys }
      delete keys[provider]
      return { providerKeys: keys }
    })
    persistSettings(get)
  },
  setVoiceEnabled: (enabled) => { set({ voiceEnabled: enabled }); persistSettings(get) },
  setVoiceSpeed: (speed) => { set({ voiceSpeed: speed }); persistSettings(get) },
  setHapticFeedback: (enabled) => { set({ hapticFeedback: enabled }); persistSettings(get) },
  setFontSize: (size) => { set({ fontSize: size }); persistSettings(get) },
  hasAnyProvider: () => {
    const keys = get().providerKeys
    return !!(keys.groq || keys.gemini || keys.codeva)
  },
}))

function persistSettings(get: () => SettingsState) {
  const s = get()
  void saveSettings({
    model: s.model,
    theme: s.theme,
    providerKeys: s.providerKeys,
    voiceEnabled: s.voiceEnabled,
    voiceSpeed: s.voiceSpeed,
    hapticFeedback: s.hapticFeedback,
    fontSize: s.fontSize,
  })
}
