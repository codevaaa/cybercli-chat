import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase.js'
import { authCallbackUrl, authErrorMessage, checkAuthAvailability } from '../lib/authFlow.js'
import { authApiBase, syncAccountSession } from '../lib/authSession.js'
let initializing = null, authSubscription = null, desktopBound = false, sessionWork = null, authRevision = 0

const dispatchAuthSync = (session) => {
  if (typeof window !== 'undefined') {
    const payload = {
      type: 'CYBERCLI_AUTH_SYNC',
      token: session?.access_token || null,
      user: session?.user ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.name || ''
      } : null
    }
    window.postMessage(payload, window.location.origin)
    window.dispatchEvent(new CustomEvent('cybercli-auth-change', { detail: payload }))
    
    // Sync session state directly with desktop main process to skip landing on next boot
    if (window.electronAPI?.setSessionState) {
      window.electronAPI.setSessionState(!!session?.access_token)
    }
  }
}

function cacheSession(session) {
  if (session?.access_token) {
    localStorage.setItem('codeva-account-ready', 'false')
    localStorage.setItem('sb-access-token', session.access_token)
    localStorage.setItem('user_name', session.user?.user_metadata?.name || session.user?.email || '')
    localStorage.setItem('user_email', session.user?.email || '')
  } else for (const key of ['sb-access-token', 'user_name', 'user_email', 'codeva-account-ready']) localStorage.removeItem(key)
}
async function establishSession(session, set, get) {
  if (!session?.access_token) {
    authRevision++; sessionWork = null; cacheSession(null)
    set({ session: null, user: null, loading: false, accountReady: false }); dispatchAuthSync(null)
    return
  }
  if (sessionWork?.token === session.access_token) {
    await sessionWork.promise
    if (get().session?.access_token === session.access_token && get().accountReady) set({ loading: false })
    return
  }
  const revision = ++authRevision
  const promise = (async () => {
    cacheSession(session)
    set({ session, user: session.user, loading: true, accountReady: false, error: null })
    try {
      await syncAccountSession(session, new URLSearchParams(window.location.search).get('from') === 'extension' ? 'extension' : 'web')
      if (revision !== authRevision) return
      localStorage.setItem('codeva-account-ready', 'true')
      set({ loading: false, accountReady: true, error: null }); dispatchAuthSync(session)
    } catch (error) {
      if (revision !== authRevision) return
      set({ loading: false, accountReady: false, error: authErrorMessage(error) })
      sessionWork = null
      if ([401, 403].includes(error.status)) {
        await supabase.auth.signOut()
        cacheSession(null); set({ session: null, user: null }); dispatchAuthSync(null)
      }
    }
  })()
  sessionWork = { token: session.access_token, promise }
  return promise
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      accountReady: false,
      error: null,

      initialize: async () => {
        if (initializing) return initializing
        const work = (async () => {
          set({ loading: true, error: null })
          try {
            if (!authSubscription) {
              const { data } = supabase.auth.onAuthStateChange((_event, session) => {
                // SDK callbacks must return before any session API is awaited.
                queueMicrotask(() => { establishSession(session, set, get).catch(error => set({ error: authErrorMessage(error), loading: false, accountReady: false })) })
              })
              authSubscription = data.subscription
            }
            if (!desktopBound && window.electronAPI?.onAuthToken) {
              desktopBound = true
              window.electronAPI.onAuthToken(async payload => {
                try {
                  const token = typeof payload === 'string' ? payload : payload.token
                  const refresh = typeof payload === 'string' ? '' : payload.refresh || ''
                  const result = refresh ? await supabase.auth.setSession({ access_token: token, refresh_token: refresh }) : await supabase.auth.getUser(token)
                  if (result.error) throw result.error
                  await establishSession(result.data.session || { access_token: token, user: result.data.user }, set, get)
                } catch (error) { set({ loading: false, error: authErrorMessage(error), accountReady: false }) }
              })
            }
            const { data, error } = await supabase.auth.getSession()
            if (error) throw error
            await establishSession(data.session, set, get)
          } catch (error) { set({ error: authErrorMessage(error), loading: false, accountReady: false }) }
        })()
        initializing = work
        try { await work } finally { if (initializing === work) initializing = null }
      },

      signInWithEmail: async (email, password) => {
        set({ loading: true, error: null })
        try {
          await checkAuthAvailability(authApiBase())
          const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
          if (error) throw error
          await establishSession(data.session, set, get)
          if (!get().accountReady) throw new Error(get().error || 'Could not connect your account. Please try again.')
          return { success: true, session: data.session }
        } catch (error) {
          const message = authErrorMessage(error); set({ error: message, loading: false })
          return { success: false, error: message }
        }
      },

      signUpWithEmail: async (email, password, name, flowQuery = '') => {
        set({ loading: true, error: null })
        try {
          await checkAuthAvailability(authApiBase())
          const { data, error } = await supabase.auth.signUp({ email: email.trim(), password,
            options: { data: { name }, emailRedirectTo: authCallbackUrl(window.location.origin, flowQuery, 'signup') } })
          if (error) throw error
          if (data.session) {
            await establishSession(data.session, set, get)
            if (!get().accountReady) throw new Error(get().error || 'Could not connect your account.')
          } else set({ loading: false })
          return { success: true, needsVerification: !data.session, session: data.session }
        } catch (error) {
          const message = authErrorMessage(error); set({ error: message, loading: false })
          return { success: false, error: message }
        }
      },

      signInWithOAuth: async (provider, params = window.location.search, action = 'login') => {
        set({ loading: true, error: null })
        try {
          await checkAuthAvailability(authApiBase())
          const { data, error } = await supabase.auth.signInWithOAuth({ provider,
            options: { redirectTo: authCallbackUrl(window.location.origin, params, action), skipBrowserRedirect: true } })
          if (error) throw error
          if (!data?.url) throw new Error('No sign-in link was returned. Please try again.')
          set({ loading: false }); return { success: true, url: data.url }
        } catch (error) {
          const message = authErrorMessage(error); set({ error: message, loading: false })
          return { success: false, error: message }
        }
      },

      signInWithMagicLink: async (email, flowQuery = '') => {
        set({ loading: true, error: null })
        try {
          await checkAuthAvailability(authApiBase())
          const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: authCallbackUrl(window.location.origin, flowQuery) } })
          if (error) throw error
          set({ loading: false }); return { success: true }
        } catch (error) {
          const message = authErrorMessage(error); set({ error: message, loading: false })
          return { success: false, error: message }
        }
      },

      signOut: async () => {
        authRevision++; sessionWork = null
        set({ loading: true, accountReady: false })

        try {
          await supabase.auth.signOut()
        } catch (error) {
          console.error('[AuthStore] Supabase signOut error:', error)
        } finally {
          // Clear all localStorage keys related to supabase auth to prevent session restore
          const keysToRemove = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('sb-access-token'))) {
              keysToRemove.push(key)
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key))
          localStorage.removeItem('sb-access-token')
          localStorage.removeItem('user_name')
          localStorage.removeItem('user_email')
          // Clear Zustand persist storage so auth state isn't restored on reload
          localStorage.removeItem('auth-storage')
          // Wipe sb- and supabase cookies to prevent Supabase SDK from restoring session
          document.cookie.split(';').forEach(c => {
            const name = c.split('=')[0].trim()
            if (name.startsWith('sb-') || name.includes('supabase')) {
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
            }
          })
          set({ user: null, session: null, loading: false, accountReady: false })
          dispatchAuthSync(null)

          if (typeof window !== 'undefined' && window.electronAPI?.backToLanding) {
            window.electronAPI.backToLanding()
          }
        }
        return { success: true }
      },

      resetPassword: async (email) => {
        set({ loading: true, error: null })

        try {
          await checkAuthAvailability(authApiBase())
          const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/reset-password` })
          if (error) throw error

          set({ loading: false })
          return { success: true }
        } catch (error) {
          const message = authErrorMessage(error); set({ error: message, loading: false })
          return { success: false, error: message }
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

      updateEmail: async (email) => {
        set({ loading: true, error: null })
        try {
          const { error } = await supabase.auth.updateUser({ email })
          if (error) throw error
          set({ loading: false })
          return { success: true }
        } catch (error) {
          set({ error: error.message, loading: false })
          return { success: false, error: error.message }
        }
      },

      updateName: async (name) => {
        set({ error: null })
        try {
          const { data, error } = await supabase.auth.updateUser({ data: { name } })
          if (error) throw error
          if (data?.user) {
            localStorage.setItem('user_name', name)
            set({ user: data.user })
          }
          return { success: true }
        } catch (error) {
          set({ error: error.message })
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
