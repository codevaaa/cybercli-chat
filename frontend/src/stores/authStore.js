import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase.js'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      error: null,

      initialize: async () => {
        set({ loading: true, error: null })

        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            localStorage.setItem('sb-access-token', session.access_token)
            localStorage.setItem('user_name', session.user?.user_metadata?.name || session.user?.email || '')
            localStorage.setItem('user_email', session.user?.email || '')
          } else {
            localStorage.removeItem('sb-access-token')
          }
          set({ session, user: session?.user || null, loading: false })

          supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.access_token) {
              localStorage.setItem('sb-access-token', session.access_token)
              localStorage.setItem('user_name', session.user?.user_metadata?.name || session.user?.email || '')
              localStorage.setItem('user_email', session.user?.email || '')
            } else {
              localStorage.removeItem('sb-access-token')
              localStorage.removeItem('user_name')
              localStorage.removeItem('user_email')
            }
            set({ session, user: session?.user || null })
          })
        } catch (error) {
          set({ error: error.message, loading: false })
        }
      },

      signInWithEmail: async (email, password) => {
        set({ loading: true, error: null })

        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error

          if (data.session?.access_token) {
            localStorage.setItem('sb-access-token', data.session.access_token)
            localStorage.setItem('user_name', data.user?.user_metadata?.name || data.user?.email || '')
            localStorage.setItem('user_email', data.user?.email || '')
          }
          set({ session: data.session, user: data.user, loading: false })
          return { success: true }
        } catch (error) {
          set({ error: error.message, loading: false })
          return { success: false, error: error.message }
        }
      },

      signUpWithEmail: async (email, password, name) => {
        set({ loading: true, error: null })

        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { name },
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          })
          if (error) throw error

          if (data.session?.access_token) {
            localStorage.setItem('sb-access-token', data.session.access_token)
            localStorage.setItem('user_name', data.user?.user_metadata?.name || data.user?.email || '')
            localStorage.setItem('user_email', data.user?.email || '')
          }
          set({ session: data.session, user: data.user, loading: false })
          return { success: true, needsVerification: !data.session }
        } catch (error) {
          set({ error: error.message, loading: false })
          return { success: false, error: error.message }
        }
      },

      signInWithOAuth: async (provider) => {
        set({ loading: true, error: null })

        try {
          const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } })
          if (error) throw error

          return { success: true, url: data.url }
        } catch (error) {
          set({ error: error.message, loading: false })
          return { success: false, error: error.message }
        }
      },

      signInWithMagicLink: async (email) => {
        set({ loading: true, error: null })

        try {
          const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
          if (error) throw error

          set({ loading: false })
          return { success: true }
        } catch (error) {
          set({ error: error.message, loading: false })
          return { success: false, error: error.message }
        }
      },

      signOut: async () => {
        set({ loading: true })

        try {
          await supabase.auth.signOut()
        } catch (error) {
          console.error('[AuthStore] Supabase signOut error:', error)
        } finally {
          localStorage.removeItem('sb-access-token')
          localStorage.removeItem('user_name')
          localStorage.removeItem('user_email')
          set({ user: null, session: null, loading: false })
        }
        return { success: true }
      },

      resetPassword: async (email) => {
        set({ loading: true, error: null })

        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/reset-password` })
          if (error) throw error

          set({ loading: false })
          return { success: true }
        } catch (error) {
          set({ error: error.message, loading: false })
          return { success: false, error: error.message }
        }
      },

      updatePassword: async (password) => {
        set({ loading: true, error: null })

        try {
          const { error } = await supabase.auth.updateUser({ password })
          if (error) throw error

          set({ loading: false })
          return { success: true }
        } catch (error) {
          set({ error: error.message, loading: false })
          return { success: false, error: error.message }
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, session: state.session }),
    }
  )
)
