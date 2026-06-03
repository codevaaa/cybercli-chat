import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { Colors } from '@/constants/colors'
import { Icon } from '@/components/ui/Icon'
import { ensureCameraPermission, ensureGalleryPermission } from '@/services/permissions'
import type { Attachment } from '@/stores/chatStore'

const c = Colors.dark

interface Props {
  value: string
  onChangeText: (t: string) => void
  onSend: (attachments: Attachment[]) => void
  onStop: () => void
  streaming: boolean
  councilMode: boolean
  onToggleCouncil: () => void
  webSearch: boolean
  onToggleWebSearch: () => void
  researchMode: boolean
  onToggleResearch: () => void
}

export function Composer({
  value, onChangeText, onSend, onStop, streaming,
  councilMode, onToggleCouncil, webSearch, onToggleWebSearch,
  researchMode, onToggleResearch,
}: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [menuOpen, setMenuOpen] = useState(false)

  const pickImage = async () => {
    setMenuOpen(false)
    if (!(await ensureGalleryPermission())) return
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.7 })
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0]
      setAttachments((p) => [...p, { type: 'image', uri: a.uri, base64: a.base64 || undefined, mimeType: a.mimeType || 'image/jpeg' }])
    }
  }

  const takePhoto = async () => {
    setMenuOpen(false)
    if (!(await ensureCameraPermission())) return
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0]
      setAttachments((p) => [...p, { type: 'image', uri: a.uri, base64: a.base64 || undefined, mimeType: 'image/jpeg' }])
    }
  }

  const pickFile = async () => {
    setMenuOpen(false)
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true })
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0]
      setAttachments((p) => [...p, { type: 'file', uri: a.uri, name: a.name, mimeType: a.mimeType }])
    }
  }

  const handleSend = () => {
    if ((!value.trim() && attachments.length === 0) || streaming) return
    onSend(attachments)
    setAttachments([])
  }

  const canSend = value.trim().length > 0 || attachments.length > 0
  const accent = councilMode ? c.purple : researchMode ? '#06B6D4' : c.accent

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 }}>
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <ScrollView horizontal style={{ marginBottom: 10 }} showsHorizontalScrollIndicator={false}>
          {attachments.map((att, i) => (
            <View key={i} style={{ marginRight: 10, position: 'relative' }}>
              {att.type === 'image' ? (
                <Image source={{ uri: att.uri }} style={{ width: 60, height: 60, borderRadius: 10 }} />
              ) : (
                <View style={{ width: 60, height: 60, borderRadius: 10, backgroundColor: c.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border }}>
                  <Icon name="file" size={22} color={c.accent} />
                </View>
              )}
              <TouchableOpacity
                onPress={() => setAttachments((p) => p.filter((_, idx) => idx !== i))}
                style={{ position: 'absolute', top: -6, right: -6, backgroundColor: c.error, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="close" size={11} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Attachment menu */}
      {menuOpen && (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <MenuBtn icon="image" label="Photos" onPress={pickImage} />
          <MenuBtn icon="camera" label="Camera" onPress={takePhoto} />
          <MenuBtn icon="file" label="Files" onPress={pickFile} />
        </View>
      )}

      {/* Tool toggles row */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <Toggle icon="brain" label="Council" active={councilMode} color={c.purple} onPress={onToggleCouncil} />
        <Toggle icon="globe" label="Web" active={webSearch} color={c.accent} onPress={onToggleWebSearch} />
        <Toggle icon="search" label="Research" active={researchMode} color="#06B6D4" onPress={onToggleResearch} />
      </View>

      {/* Input box */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', backgroundColor: c.elevated, borderWidth: 1.5, borderColor: canSend ? accent : c.border, borderRadius: 22, paddingLeft: 6, paddingRight: 6, paddingVertical: 5 }}>
        <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)} style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={menuOpen ? 'close' : 'plus'} size={22} color={c.textMuted} />
        </TouchableOpacity>
        <TextInput
          style={{ flex: 1, fontSize: 16, color: c.text, maxHeight: 130, paddingVertical: 9, paddingHorizontal: 4 }}
          placeholder={councilMode ? 'Ask the Council…' : 'Message Codeva'}
          placeholderTextColor={c.textDim}
          value={value}
          onChangeText={onChangeText}
          multiline
        />
        {streaming ? (
          <TouchableOpacity onPress={onStop} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c.text, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: c.background }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: canSend ? accent : c.surface, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="arrowUp" size={20} color={canSend ? '#fff' : c.textDim} strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

function MenuBtn({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flex: 1, backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 4 }}>
      <Icon name={icon} size={20} color={c.accent} />
      <Text style={{ fontSize: 11, color: c.textMuted }}>{label}</Text>
    </TouchableOpacity>
  )
}

function Toggle({ icon, label, active, color, onPress }: { icon: any; label: string; active: boolean; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
        backgroundColor: active ? `${color}22` : 'transparent',
        borderWidth: 1, borderColor: active ? color : c.border,
      }}
    >
      <Icon name={icon} size={14} color={active ? color : c.textMuted} />
      <Text style={{ fontSize: 12.5, color: active ? color : c.textMuted, fontWeight: active ? '600' : '400' }}>{label}</Text>
    </TouchableOpacity>
  )
}
