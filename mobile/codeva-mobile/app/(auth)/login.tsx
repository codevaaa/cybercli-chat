import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native'
import { Link, router } from 'expo-router'
import { Colors } from '@/constants/colors'
import { useAuthStore } from '@/stores/authStore'
import { CodevaMark } from '@/components/ui/CodevaLogo'
import { GoogleButton } from '@/components/ui/GoogleButton'
import { TermsGate } from '@/components/ui/TermsGate'
import { signInWithEmail, signInWithGoogle } from '@/services/auth'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [terms, setTerms] = useState(false)
  const { setUser, setToken } = useAuthStore()
  const c = Colors.dark

  const requireTerms = (): boolean => {
    if (!terms) { setError('Please accept the Terms of Service and Privacy Policy to continue.'); return false }
    return true
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError('Enter email and password'); return }
    if (!requireTerms()) return
    setLoading(true)
    setError('')
    const res = await signInWithEmail(email.trim(), password)
    setLoading(false)
    if (!res.ok) { setError(res.error || 'Login failed'); return }
    if (res.user) {
      setUser({ id: res.user.id, email: res.user.email, name: res.user.name, plan: 'free' })
      router.replace('/(tabs)')
    }
  }

  const handleGoogle = async () => {
    if (!requireTerms()) return
    setGoogleLoading(true)
    setError('')
    const res = await signInWithGoogle()
    setGoogleLoading(false)
    if (!res.ok) { setError(res.error || 'Google sign in failed'); return }
    if (res.user) {
      setUser({ id: res.user.id, email: res.user.email, name: res.user.name, plan: 'free' })
      router.replace('/(tabs)')
    } else if (Platform.OS === 'web') {
      // Web redirect flow — session detected on the /callback screen.
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <CodevaMark size={72} color={c.accent} />
          <Text style={{ fontSize: 24, fontWeight: '700', color: c.text, marginTop: 18 }}>Welcome back</Text>
          <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 6 }}>Sign in to Codeva</Text>
        </View>

        {/* Terms gate — required before any auth */}
        <View style={{ marginBottom: 16 }}>
          <TermsGate accepted={terms} onToggle={() => setTerms(!terms)} />
        </View>

        {/* Google button — top, Claude-style */}
        <GoogleButton onPress={handleGoogle} loading={googleLoading} />

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
          <Text style={{ color: c.textDim, marginHorizontal: 12, fontSize: 12 }}>OR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        </View>

        {/* Email form */}
        <View style={{ gap: 14 }}>
          <TextInput
            style={{ backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, fontSize: 15, color: c.text }}
            placeholder="Email"
            placeholderTextColor={c.textDim}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={{ backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, fontSize: 15, color: c.text }}
            placeholder="Password"
            placeholderTextColor={c.textDim}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          {error ? <Text style={{ color: c.error, fontSize: 13, textAlign: 'center' }}>{error}</Text> : null}

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{ backgroundColor: c.accent, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 4, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Sign In</Text>}
          </TouchableOpacity>

          <Link href="/(auth)/forgot-password" style={{ textAlign: 'center', marginTop: 4 }}>
            <Text style={{ color: c.accent, fontSize: 14 }}>Forgot password?</Text>
          </Link>
        </View>

        {/* BYOK */}
        <TouchableOpacity
          onPress={() => router.push('/providers')}
          style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 }}
        >
          <Text style={{ color: c.text, fontSize: 14, fontWeight: '500' }}>Use a free API key instead</Text>
        </TouchableOpacity>

        {/* Signup link */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
          <Text style={{ color: c.textMuted, fontSize: 14 }}>Don't have an account? </Text>
          <Link href="/(auth)/signup">
            <Text style={{ color: c.accent, fontSize: 14, fontWeight: '600' }}>Sign Up</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
