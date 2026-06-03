import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Link } from 'expo-router'
import { Colors } from '@/constants/colors'
import { CodevaMark } from '@/components/ui/CodevaLogo'
import { Icon } from '@/components/ui/Icon'
import { resetPassword } from '@/services/auth'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const c = Colors.dark

  const handleReset = async () => {
    if (!email.trim()) { setError('Enter your email'); return }
    setLoading(true)
    setError('')
    const res = await resetPassword(email.trim())
    setLoading(false)
    if (!res.ok) { setError(res.error || 'Failed to send reset email'); return }
    setSent(true)
  }

  if (sent) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Icon name="mail" size={32} color={c.accent} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: c.text, textAlign: 'center' }}>Check your email</Text>
        <Text style={{ fontSize: 14, color: c.textMuted, textAlign: 'center', marginTop: 8, maxWidth: 300, lineHeight: 21 }}>
          We sent a password reset link to {email}
        </Text>
        <Link href="/(auth)/login" style={{ marginTop: 24 }}>
          <Text style={{ color: c.accent, fontSize: 14, fontWeight: '600' }}>Back to Sign In</Text>
        </Link>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', color: c.text, textAlign: 'center' }}>Reset Password</Text>
      <Text style={{ fontSize: 14, color: c.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 32 }}>
        Enter your email and we'll send a reset link
      </Text>

      <TextInput
        style={{ backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, fontSize: 15, color: c.text }}
        placeholder="Email"
        placeholderTextColor={c.textDim}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {error ? <Text style={{ color: c.error, fontSize: 13, textAlign: 'center', marginTop: 8 }}>{error}</Text> : null}

      <TouchableOpacity
        onPress={handleReset}
        disabled={loading}
        style={{ backgroundColor: c.accent, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 16, opacity: loading ? 0.6 : 1 }}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Send Reset Link</Text>}
      </TouchableOpacity>

      <Link href="/(auth)/login" style={{ textAlign: 'center', marginTop: 16 }}>
        <Text style={{ color: c.accent, fontSize: 14 }}>← Back to Sign In</Text>
      </Link>
    </View>
  )
}
