import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Alert, Linking } from 'react-native'
import { router } from 'expo-router'
import { Colors } from '@/constants/colors'
import { useSettingsStore } from '@/stores/settingsStore'
import { Icon } from '@/components/ui/Icon'

const PROVIDER_LIST = [
  { id: 'groq', name: 'Groq', model: 'Bheem · Llama 3.3 70B', desc: 'Free & lightning fast. Best for everyday chat.', prefix: 'gsk_', getUrl: 'https://console.groq.com/keys' },
  { id: 'gemini', name: 'Google Gemini', model: 'Madhav · Gemini 2.0 Flash', desc: 'Free. Understands images, long context, reasoning.', prefix: 'AIza', getUrl: 'https://aistudio.google.com/apikey' },
]

export default function ProvidersScreen() {
  const c = Colors.dark
  const { providerKeys, setProviderKey, removeProviderKey } = useSettingsStore()
  const [editing, setEditing] = useState<string | null>(null)
  const [keyInput, setKeyInput] = useState('')

  const save = (id: string) => {
    if (!keyInput.trim()) return
    setProviderKey(id as any, keyInput.trim())
    setEditing(null)
    setKeyInput('')
    Alert.alert('Connected', `${PROVIDER_LIST.find((p) => p.id === id)?.name} is ready to use.`)
  }

  const disconnect = (id: string, name: string) => {
    Alert.alert('Disconnect', `Remove your ${name} key?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeProviderKey(id as any) },
    ])
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 22, gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrowLeft" size={22} color={c.text} />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: c.text }}>Connect a Model</Text>
            <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 2 }}>Free keys — your key, direct & private</Text>
          </View>
        </View>

        <View style={{ backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 14, marginBottom: 20, flexDirection: 'row', gap: 12 }}>
          <Icon name="shield" size={18} color={c.accent} />
          <Text style={{ fontSize: 13, color: c.textMuted, lineHeight: 19, flex: 1 }}>
            Keys are stored only on your device. Requests go straight from your phone to the provider — Codeva never sees them.
          </Text>
        </View>

        <View style={{ gap: 14 }}>
          {PROVIDER_LIST.map((p) => {
            const connected = !!(providerKeys as any)[p.id]
            const isEditing = editing === p.id
            return (
              <View key={p.id} style={{ backgroundColor: c.elevated, borderWidth: 1, borderColor: connected ? 'rgba(74,222,128,0.35)' : c.border, borderRadius: 16, padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: c.text }}>{p.name}</Text>
                      <View style={{ backgroundColor: 'rgba(74,222,128,0.12)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, color: c.success, fontWeight: '700' }}>FREE</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: c.textDim, marginTop: 2 }}>{p.model}</Text>
                    <Text style={{ fontSize: 12.5, color: c.textMuted, marginTop: 5 }}>{p.desc}</Text>
                  </View>
                  {connected ? (
                    <TouchableOpacity onPress={() => disconnect(p.id, p.name)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon name="check" size={15} color={c.success} />
                      <Text style={{ fontSize: 12.5, color: c.success, fontWeight: '600' }}>Connected</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => { setEditing(p.id); setKeyInput('') }} style={{ backgroundColor: c.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}>
                      <Text style={{ fontSize: 13, color: '#fff', fontWeight: '600' }}>Connect</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {isEditing && (
                  <View style={{ marginTop: 14, gap: 10 }}>
                    <TextInput
                      style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 12, fontSize: 13, color: c.text, fontFamily: 'monospace' }}
                      placeholder={`Paste your key (${p.prefix}…)`}
                      placeholderTextColor={c.textDim}
                      value={keyInput}
                      onChangeText={setKeyInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry
                    />
                    <TouchableOpacity onPress={() => Linking.openURL(p.getUrl)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon name="globe" size={14} color={c.accent} />
                      <Text style={{ fontSize: 12.5, color: c.accent }}>Get a free key from {p.name} →</Text>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity onPress={() => setEditing(null)} style={{ flex: 1, padding: 11, borderRadius: 10, borderWidth: 1, borderColor: c.border, alignItems: 'center' }}>
                        <Text style={{ color: c.textMuted, fontSize: 13 }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => save(p.id)} style={{ flex: 2, padding: 11, borderRadius: 10, backgroundColor: c.accent, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Save Key</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )
          })}
        </View>

        <Text style={{ fontSize: 12.5, color: c.textDim, textAlign: 'center', lineHeight: 19, marginTop: 24, paddingHorizontal: 10 }}>
          Both are free and take 30 seconds to set up — no credit card needed.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
