import { View, Text, TouchableOpacity, Image, Share } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useState } from 'react'
import { Colors } from '@/constants/colors'
import { Markdown } from './Markdown'
import { RoutingBadge } from './RoutingBadge'
import { BranchControls } from './BranchControls'
import { CodevaMark } from '@/components/ui/CodevaLogo'
import { Icon } from '@/components/ui/Icon'
import { speak, stopSpeaking } from '@/services/voice/tts'
import type { Message } from '@/stores/chatStore'

const c = Colors.dark

interface Props {
  message: Message
  onRegenerate?: () => void
  onBranch?: () => void
  onSwitchBranch?: (index: number) => void
}

export function MessageBubble({ message, onRegenerate, onBranch, onSwitchBranch }: Props) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  // Use the active branch content if branches exist
  const displayContent = message.branches && message.activeBranch !== undefined
    ? message.branches[message.activeBranch]?.content || message.content
    : message.content

  const copy = async () => {
    await Clipboard.setStringAsync(displayContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const share = async () => {
    try { await Share.share({ message: displayContent }) } catch {}
  }

  const toggleSpeak = () => {
    if (speaking) { stopSpeaking(); setSpeaking(false) }
    else { speak(displayContent, { onDone: () => setSpeaking(false) }); setSpeaking(true) }
  }

  return (
    <View style={{ marginBottom: 20, paddingHorizontal: 16 }}>
      {/* Role label */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        {!isUser && <CodevaMark size={17} color={c.accent} spin={false} />}
        {isUser && (
          <View style={{ width: 17, height: 17, borderRadius: 9, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="user" size={11} color="#fff" />
          </View>
        )}
        <Text style={{ fontSize: 11, color: c.textDim, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {isUser ? 'You' : 'Codeva'}
        </Text>
        {!isUser && message.tier && <RoutingBadge tier={message.tier} />}
      </View>

      {/* Image attachments */}
      {message.attachments?.map((att, i) =>
        att.type === 'image' ? (
          <Image
            key={i}
            source={{ uri: att.uri }}
            style={{ width: 220, height: 220, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border }}
            resizeMode="cover"
          />
        ) : (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <Icon name="file" size={18} color={c.accent} />
            <Text style={{ fontSize: 13, color: c.text }} numberOfLines={1}>{att.name || 'file'}</Text>
          </View>
        )
      )}

      {/* Content */}
      <View style={isUser ? { backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 13 } : {}}>
        {isUser ? (
          <Text style={{ fontSize: 15, color: c.text, lineHeight: 23 }} selectable>{displayContent}</Text>
        ) : (
          <Markdown text={displayContent} />
        )}
      </View>

      {/* Branch controls */}
      {!isUser && message.id !== 'streaming' && (message.branches || onBranch) && (
        <BranchControls
          message={message}
          onSwitchBranch={onSwitchBranch || (() => {})}
          onCreateBranch={onBranch || (() => {})}
        />
      )}

      {/* Council details */}
      {message.council && message.council.length > 0 && <CouncilDetails council={message.council} />}

      {/* Assistant actions */}
      {!isUser && displayContent && message.id !== 'streaming' && (
        <View style={{ flexDirection: 'row', gap: 18, marginTop: 10 }}>
          <ActionBtn icon={copied ? 'check' : 'copy'} label={copied ? 'Copied' : 'Copy'} active={copied} onPress={copy} />
          <ActionBtn icon={speaking ? 'stop' : 'speak'} label={speaking ? 'Stop' : 'Read'} active={speaking} onPress={toggleSpeak} />
          <ActionBtn icon="share" label="Share" onPress={share} />
          {onRegenerate && <ActionBtn icon="regenerate" label="Retry" onPress={onRegenerate} />}
        </View>
      )}
    </View>
  )
}

function ActionBtn({ icon, label, active, onPress }: { icon: any; label: string; active?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Icon name={icon} size={14} color={active ? c.accent : c.textDim} />
      <Text style={{ fontSize: 12, color: active ? c.accent : c.textDim }}>{label}</Text>
    </TouchableOpacity>
  )
}

function CouncilDetails({ council }: { council: { model: string; response: string }[] }) {
  const [open, setOpen] = useState(false)
  return (
    <View style={{ marginTop: 10 }}>
      <TouchableOpacity onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="brain" size={14} color={c.purple} />
        <Text style={{ fontSize: 12, color: c.purple, fontWeight: '600' }}>
          Council · {council.length} models debated
        </Text>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={12} color={c.purple} />
      </TouchableOpacity>
      {open && (
        <View style={{ marginTop: 8, gap: 8 }}>
          {council.map((r, i) => (
            <View key={i} style={{ backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 11, color: c.purple, fontWeight: '600', marginBottom: 4 }}>{r.model}</Text>
              <Text style={{ fontSize: 13, color: c.textMuted, lineHeight: 19 }} numberOfLines={8}>{r.response}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
