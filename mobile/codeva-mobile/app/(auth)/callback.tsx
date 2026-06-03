import { useEffect, useState } from 'react'
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { Colors } from '@/constants/colors'
import { CodevaMark } from '@/components/ui/CodevaLogo'
import { getCurrentUser } from '@/services/auth'
import { syncUserToBackend } from '@/services/userSync'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'

/**
 * OAuth / email-link callback handler.
 *
 * Web (PKCE): Supabase redirects back here with ?code=… . supabase-js (with
 * detectSessionInUrl) exchanges it automatically, but we also exchange it
 * explicitly as a fallback and then route INTO the app — never to the website.
 *
 * Native: the in-app browser flow already set the session before we get here;
 * this screen just confirms and routes.
 */
export default function AuthCallback() {
  const { setUser } = useAuthStore()
  const [error, setError] = useState('')
  const c = Colors.dark

  useEffect(() => {
    let cancelled = false

    const finish = async (): Promise<boolean> => {
      // 1) If supabase-js already has a session, use it.
      let user = await getCurrentUser()

      // 2) Web fallback: manually exchange ?code=… if present and no session yet.
      if (!user && typeof window !== 'undefined') {
        const url = window.location.href
        if (url.includes('code=')) {
          try {
            await supabase.auth.exchangeCodeForSession(url)
            user = await getCurrentUser()
          } catch {
            // fall through to polling
          }
        }
      }

      if (!user) return false

      // 3) Enforce ban + register in backend registry.
      const sync = await syncUserToBackend()
      if (sync.banned) {
        await supabase.auth.signOut().catch(() => {})
        if (!cancelled) {
          setError(sync.reason || 'This account has been suspended.')
          setTimeout(() => router.replace('/(auth)/login'), 2200)
        }
        return true
      }

      if (!cancelled) {
        setUser({ id: user.id, email: user.email, name: user.name, plan: (sync.plan as any) || 'free' })
        // Clean the ?code=… from the web URL so refreshes don't re-trigger.
        if (typeof window !== 'undefined' && window.history?.replaceState) {
          window.history.replaceState({}, '', '/')
        }
        router.replace('/(tabs)')
      }
      return true
    }

    let attempts = 0
    const tick = async () => {
      if (cancelled) return
      attempts++
      const done = await finish()
      if (done || cancelled) return
      if (attempts > 15) {
        if (!cancelled) {
          setError('Sign-in took too long. Please try again.')
          setTimeout(() => router.replace('/(auth)/login'), 1800)
        }
        return
      }
      setTimeout(tick, 500)
    }
    void tick()

    return () => { cancelled = true }
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <CodevaMark size={72} color={c.accent} />
      {error ? (
        <>
          <Text style={{ color: c.error, marginTop: 22, fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 300 }}>{error}</Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={{ marginTop: 20 }}>
            <Text style={{ color: c.accent, fontSize: 14, fontWeight: '600' }}>Back to Sign In</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <ActivityIndicator color={c.accent} style={{ marginTop: 24 }} />
          <Text style={{ color: c.textMuted, marginTop: 16, fontSize: 14 }}>Signing you in…</Text>
        </>
      )}
    </View>
  )
}
