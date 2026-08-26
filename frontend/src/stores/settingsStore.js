/**
 * settingsStore — Global Zustand store for user settings (theme, language, font).
 * Replaces scattered localStorage reads with a single reactive source of truth.
 * Syncs to backend via PATCH /settings and caches in localStorage for offline.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@lib/api.js'
import { applyAppearanceTheme } from '@lib/theme.js'

const useSettingsStore = create(
  persist(
    (set, get) => ({
      // ─── State ─────────────────────────────────────────────────────────────
      theme: 'dark',         // 'dark' | 'light' | 'system'
      language: 'EN',        // Language code (EN, FR, HI, DE, ES, etc.)
      languageName: 'English (United States)',
      chatFont: 'Inter',     // 'Inter' | 'Instrument Serif' | 'JetBrains Mono'
      voice: 'Sahadeva (Gemini Flash)',
      voiceSpeed: 'Normal',
      _hydrated: false,

      // ─── Actions ───────────────────────────────────────────────────────────

      /**
       * Set theme and apply it immediately to the DOM + localStorage
       */
      setTheme: (theme) => {
        const resolved = applyAppearanceTheme(theme)
        // Also write to legacy key for index.html FOUC script
        localStorage.setItem('setting_theme', theme)
        set({ theme })
        // Fire backend save (fire-and-forget)
        api.patch('/settings', { appearance: theme }).catch(() => {})
      },

      /**
       * Set language and persist. Triggers re-render in all consumers.
       */
      setLanguage: (code, name) => {
        // Write legacy keys for speech recognition / TTS compatibility
        localStorage.setItem('user_language', code)
        localStorage.setItem('user_language_name', name || code)
        set({ language: code, languageName: name || code })
        // Sync to backend
        api.patch('/settings', { language: code.toLowerCase() }).catch(() => {})
      },

      /**
       * Set chat font and apply to DOM
       */
      setChatFont: (font) => {
        const root = document.documentElement
        root.classList.remove('font-sans', 'font-serif', 'font-mono')
        const fontVal = font.toLowerCase()
        if (fontVal === 'serif' || fontVal === 'instrument serif') {
          root.classList.add('font-serif')
        } else if (fontVal === 'mono' || fontVal === 'jetbrains mono') {
          root.classList.add('font-mono')
        } else {
          root.classList.add('font-sans')
        }
        set({ chatFont: font })
        // Map to backend format
        const backendFont = fontVal.includes('serif') ? 'serif' : fontVal.includes('mono') ? 'mono' : 'inter'
        api.patch('/settings', { chat_font: backendFont }).catch(() => {})
      },

      /**
       * Set voice preference
       */
      setVoice: (voice) => {
        localStorage.setItem('tts_voice', voice.toLowerCase())
        set({ voice })
        const voiceMap = {
          'Sahadeva (Gemini Flash)': 'gemini_flash',
          'Sahadeva Pro (Gemini Pro)': 'gemini_pro',
          'Vayu (Mistral Large)': 'mistral_large',
        }
        api.patch('/settings', { voice: voiceMap[voice] || voice.toLowerCase() }).catch(() => {})
      },

      /**
       * Set voice speed
       */
      setVoiceSpeed: (speed) => {
        const speedMap = { slow: '0.85', normal: '1.0', fast: '1.25' }
        localStorage.setItem('tts_speed', speedMap[speed.toLowerCase()] || '1.0')
        set({ voiceSpeed: speed })
        api.patch('/settings', { voice_speed: speed.toLowerCase() }).catch(() => {})
      },

      /**
       * Hydrate store from backend on login/mount.
       * Called once from App.jsx or a top-level effect.
       */
      hydrate: async () => {
        try {
          const { data } = await api.get('/settings')
          const updates = {}
          if (data.appearance) {
            const t = data.appearance.toLowerCase()
            updates.theme = t
            applyAppearanceTheme(t)
            localStorage.setItem('setting_theme', t)
          }
          if (data.language) {
            const code = data.language.toUpperCase()
            updates.language = code
            localStorage.setItem('user_language', code)
          }
          if (data.chat_font) {
            const fontMap = { inter: 'Inter', serif: 'Instrument Serif', mono: 'JetBrains Mono' }
            updates.chatFont = fontMap[data.chat_font] || 'Inter'
          }
          if (data.voice) {
            const voiceRevMap = {
              'gemini_flash': 'Sahadeva (Gemini Flash)',
              'gemini_pro': 'Sahadeva Pro (Gemini Pro)',
              'mistral_large': 'Vayu (Mistral Large)',
            }
            updates.voice = voiceRevMap[data.voice] || 'Sahadeva (Gemini Flash)'
          }
          if (data.voice_speed) {
            updates.voiceSpeed = data.voice_speed.charAt(0).toUpperCase() + data.voice_speed.slice(1)
          }
          updates._hydrated = true
          set(updates)
        } catch (err) {
          // Use persisted zustand state (from localStorage)
          set({ _hydrated: true })
        }
      },
    }),
    {
      name: 'codeva-settings',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        languageName: state.languageName,
        chatFont: state.chatFont,
        voice: state.voice,
        voiceSpeed: state.voiceSpeed,
      }),
    }
  )
)

export default useSettingsStore
