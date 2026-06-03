import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Switch, Alert, Linking, Modal, Pressable, Platform } from 'react-native'
import { router } from 'expo-router'
import { Colors } from '@/constants/colors'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useChatStore } from '@/stores/chatStore'
import { MODELS } from '@/constants/config'
import { signOut as supabaseSignOut } from '@/services/auth'
import { Icon, IconName } from '@/components/ui/Icon'

const TERMS_URL = 'https://cybermindcli.info/terms-of-service'
const PRIVACY_URL = 'https://cybermindcli.info/privacy-policy'

function Row({ icon, label, value, onPress, showArrow = true, danger }: { icon: IconName; label: string; value?: string; onPress?: () => void; showArrow?: boolean; danger?: boolean }) {
  const c = Colors.dark
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 16, gap: 14 }} activeOpacity={onPress ? 0.6 : 1}>
      <Icon name={icon} size={19} color={danger ? c.error : c.textMuted} />
      <Text style={{ flex: 1, fontSize: 15, color: danger ? c.error : c.text }}>{label}</Text>
      {value ? <Text style={{ fontSize: 13.5, color: c.textMuted }}>{value}</Text> : null}
      {showArrow && onPress && <Icon name="chevronRight" size={16} color={c.textDim} />}
    </TouchableOpacity>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = Colors.dark
  return (
    <View style={{ marginBottom: 22 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: c.textDim, textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 16, marginBottom: 8 }}>{title}</Text>
      <View style={{ backgroundColor: c.elevated, borderRadius: 16, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>{children}</View>
    </View>
  )
}

export default function SettingsScreen() {
  const c = Colors.dark
  const { user, signOut } = useAuthStore()
  const { model, theme, fontSize, voiceEnabled, hapticFeedback, setTheme, setFontSize, setVoiceEnabled, setHapticFeedback } = useSettingsStore()
  const { clearAll } = useChatStore()
  const currentModel = MODELS.find((m) => m.id === model)

  const [themePicker, setThemePicker] = useState(false)
  const [fontPicker, setFontPicker] = useState(false)

  const handleSignOut = async () => {
    await supabaseSignOut()
    signOut()
    router.replace('/(auth)/login')
  }

  const handleClearData = () => {
    if (Platform.OS === 'web') {
      const yes = window.confirm('Clear all conversations? This permanently deletes all chats on this device.')
      if (yes) { clearAll(); alert('All conversations cleared.') }
    } else {
      Alert.alert('Clear all conversations?', 'This permanently deletes all chats on this device. Cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => { clearAll(); Alert.alert('Done', 'All conversations cleared.') } },
      ])
    }
  }

  const themeLabel = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'
  const fontLabel = fontSize === 'small' ? 'Small' : fontSize === 'large' ? 'Large' : 'Medium'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: c.text, marginBottom: 22 }}>Settings</Text>

        {/* Profile */}
        <View style={{ backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: c.text }}>{user?.name || 'User'}</Text>
            <Text style={{ fontSize: 13, color: c.textMuted }}>{user?.email}</Text>
            <Text style={{ fontSize: 11, color: c.accent, fontWeight: '600', marginTop: 4 }}>{(user?.plan || 'free').toUpperCase()} PLAN</Text>
          </View>
        </View>

        <Section title="AI Model">
          <Row icon="sparkles" label="Default Model" value={currentModel?.name || 'Auto'} showArrow={false} />
          <Row icon="key" label="Providers (API Keys)" onPress={() => router.push('/providers')} />
          <Row icon="brain" label="Council Mode" value="Per-chat toggle" showArrow={false} />
        </Section>

        <Section title="Voice & Input">
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 14 }}>
            <Icon name="speak" size={19} color={c.textMuted} />
            <Text style={{ flex: 1, fontSize: 15, color: c.text }}>Read responses aloud</Text>
            <Switch value={voiceEnabled} onValueChange={setVoiceEnabled} trackColor={{ true: c.accent, false: c.surface }} thumbColor="#fff" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 14 }}>
            <Icon name="zap" size={19} color={c.textMuted} />
            <Text style={{ flex: 1, fontSize: 15, color: c.text }}>Haptic Feedback</Text>
            <Switch value={hapticFeedback} onValueChange={setHapticFeedback} trackColor={{ true: c.accent, false: c.surface }} thumbColor="#fff" />
          </View>
          <Row icon="mic" label="Voice Conversation" onPress={() => router.push('/voice')} />
        </Section>

        <Section title="Appearance">
          <Row icon="moon" label="Theme" value={themeLabel} onPress={() => setThemePicker(true)} />
          <Row icon="type" label="Font Size" value={fontLabel} onPress={() => setFontPicker(true)} />
        </Section>

        <Section title="Data">
          <Row icon="database" label="Memory" value="On device" showArrow={false} />
          <Row icon="trash" label="Clear All Conversations" danger onPress={handleClearData} />
        </Section>

        <Section title="About">
          <Row icon="shield" label="Privacy Policy" onPress={() => Linking.openURL(PRIVACY_URL)} />
          <Row icon="file" label="Terms of Service" onPress={() => Linking.openURL(TERMS_URL)} />
          <Row icon="info" label="Version" value="1.0.0" showArrow={false} />
        </Section>

        <TouchableOpacity onPress={handleSignOut} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(248,113,113,0.1)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)', borderRadius: 14, padding: 15, marginTop: 4 }}>
          <Icon name="logout" size={18} color={c.error} />
          <Text style={{ color: c.error, fontSize: 15, fontWeight: '600' }}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Theme Picker Modal */}
      <PickerModal
        visible={themePicker}
        onClose={() => setThemePicker(false)}
        title="Choose Theme"
        options={[
          { id: 'dark', label: 'Dark', icon: 'moon' as IconName },
          { id: 'light', label: 'Light', icon: 'sun' as IconName },
          { id: 'system', label: 'System Default', icon: 'settings' as IconName },
        ]}
        selected={theme}
        onSelect={(id) => { setTheme(id as any); setThemePicker(false) }}
      />

      {/* Font Size Picker Modal */}
      <PickerModal
        visible={fontPicker}
        onClose={() => setFontPicker(false)}
        title="Font Size"
        options={[
          { id: 'small', label: 'Small', desc: 'Compact text' },
          { id: 'medium', label: 'Medium', desc: 'Default size' },
          { id: 'large', label: 'Large', desc: 'Easier to read' },
        ]}
        selected={fontSize}
        onSelect={(id) => { setFontSize(id as any); setFontPicker(false) }}
      />
    </SafeAreaView>
  )
}

/** Reusable bottom-sheet style picker modal */
function PickerModal({ visible, onClose, title, options, selected, onSelect }: {
  visible: boolean
  onClose: () => void
  title: string
  options: { id: string; label: string; icon?: IconName; desc?: string }[]
  selected: string
  onSelect: (id: string) => void
}) {
  const c = Colors.dark
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable style={{ backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 }} onPress={(e) => e.stopPropagation()}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.border }} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: c.text, marginBottom: 16 }}>{title}</Text>
          <View style={{ gap: 8 }}>
            {options.map((opt) => {
              const isSelected = opt.id === selected
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => onSelect(opt.id)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                    padding: 16, borderRadius: 14,
                    backgroundColor: isSelected ? `${c.accent}18` : c.elevated,
                    borderWidth: 1.5, borderColor: isSelected ? c.accent : c.border,
                  }}
                >
                  {opt.icon && <Icon name={opt.icon} size={20} color={isSelected ? c.accent : c.textMuted} />}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: isSelected ? c.accent : c.text }}>{opt.label}</Text>
                    {opt.desc && <Text style={{ fontSize: 12, color: c.textDim, marginTop: 2 }}>{opt.desc}</Text>}
                  </View>
                  {isSelected && <Icon name="check" size={18} color={c.accent} strokeWidth={2.5} />}
                </TouchableOpacity>
              )
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
