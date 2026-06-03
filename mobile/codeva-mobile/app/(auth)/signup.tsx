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
import { signUpWithEmail, signInWithGoogle } from '@/services/auth'

export default function SignupScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [terms, setTerms] = useState(false)
  const { setUser } = useAuthStore()
  const c = Colors.dark

  const requireTerms = (): boolean => {
    if (!terms) { setError('Please accept the Terms of Service and Privacy Policy to continue.'); return false }
    return true
  }

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) { setError('Fill all fields'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (!requireTerms()) return
    setLoading(true)
    setError('')
    const res = await signUpWithEmail(name.trim(), email.trim(), password)
    setLoading(false)
    if (!res.ok) { setError(res.error || 'Signup failed'); return }
    if (res.user) {
      setUser({ id: res.user.id, email: res.user.email, name: res.user.name, plan: 'free' })
      router.replace('/(tabs)')
    } else {
      setError('Check your email to confirm your account, then sign in.')
    }
  }

  const handleGoogle = async () => {
    if (!requireTerms()) return
    setGoogleLoading(true)
    setError('')
    const res = await signInWithGoogle()
    setGoogleLoading(false)
    if (!res.ok) { setError(res.error || 'Google sign up failed'); return }
    if (res.user) {
      setUser({ id: res.user.id, email: res.user.email, name: res.user.name, plan: 'free' })
      router.replace('/(tabs)')
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <CodevaMark size={72} color={c.accent} />
          <Text style={{ fontSize: 24, fontWeight: '700', color: c.text, marginTop: 18 }}>Create Account</Text>
          <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 6 }}>Start using Codeva for free</Text>
        </View>

        {/* Terms gate — required before any auth */}
        <View style={{ marginBottom: 16 }}>
          <TermsGate accepted={terms} onToggle={() => setTerms(!terms)} />
        </View>

        {/* Google button */}
        <GoogleButton onPress={handleGoogle} loading={googleLoading} label="Sign up with Google" />

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
          <Text style={{ color: c.textDim, marginHorizontal: 12, fontSize: 12 }}>OR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        </View>

        <View style={{ gap: 14 }}>
          <TextInput
            style={{ backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, fontSize: 15, color: c.text }}
            placeholder="Full Name"
            placeholderTextColor={c.textDim}
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />
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
            placeholder="Password (min 6 characters)"
            placeholderTextColor={c.textDim}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? <Text style={{ color: c.error, fontSize: 13, textAlign: 'center' }}>{error}</Text> : null}

          <TouchableOpacity
            onPress={handleSignup}
            disabled={loading}
            style={{ backgroundColor: c.accent, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 4, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Create Account</Text>}
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
          <Text style={{ color: c.textMuted, fontSize: 14 }}>Already have an account? </Text>
          <Link href="/(auth)/login">
            <Text style={{ color: c.accent, fontSize: 14, fontWeight: '600' }}>Sign In</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
