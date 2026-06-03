import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Redirect } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '@/stores/authStore'
import { getCurrentUser } from '@/services/auth'
import { checkBanStatus } from '@/services/userSync'
import { supabase } from '@/services/supabase'
import { Colors } from '@/constants/colors'
import { CodevaMark } from '@/components/ui/CodevaLogo'

const SEEN_LANDING_KEY = 'codeva_seen_landing'

export default function Index() {
  const { user, setUser, setLoading, loading } = useAuthStore()
  const [checked, setChecked] = useState(false)
  const [seenLanding, setSeenLanding] = useState<boolean | null>(null)
  const c = Colors.dark

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const [current, seen] = await Promise.all([
        getCurrentUser(),
        AsyncStorage.getItem(SEEN_LANDING_KEY),
      ])
      if (!mounted) return
      if (current) {
        // Re-verify ban status for already-logged-in users on every cold start.
        const ban = await checkBanStatus()
        if (ban.banned) {
          await supabase.auth.signOut().catch(() => {})
          setUser(null)
        } else {
          setUser({ id: current.id, email: current.email, name: current.name, plan: (ban.plan as any) || 'free' })
        }
      }
      setSeenLanding(seen === 'yes')
      if (seen !== 'yes') void AsyncStorage.setItem(SEEN_LANDING_KEY, 'yes')
      setLoading(false)
      setChecked(true)
    })()
    return () => { mounted = false }
  }, [])

  if (!checked || loading || seenLanding === null) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
        <CodevaMark size={84} color={c.accent} />
        <ActivityIndicator color={c.accent} style={{ marginTop: 30 }} />
      </View>
    )
  }

  // First launch → animated landing
  if (!seenLanding) return <Redirect href="/landing" />
  // Returning → straight to app or login
  if (!user) return <Redirect href="/(auth)/login" />
  return <Redirect href="/(tabs)" />
}
