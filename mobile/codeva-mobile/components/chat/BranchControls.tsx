import { View, Text, TouchableOpacity } from 'react-native'
import { Colors } from '@/constants/colors'
import { Icon } from '@/components/ui/Icon'
import type { Message } from '@/stores/chatStore'

const c = Colors.dark

interface Props {
  message: Message
  onSwitchBranch: (index: number) => void
  onCreateBranch: () => void
}

/**
 * Branch navigation controls shown on messages that have alternate versions.
 * User can switch between branches (like Git branches for conversations)
 * or create a new branch (regenerate into a new alternate reality).
 */
export function BranchControls({ message, onSwitchBranch, onCreateBranch }: Props) {
  const branches = message.branches
  if (!branches || branches.length <= 1) {
    // No branches yet — just show the "branch" action button
    return (
      <TouchableOpacity
        onPress={onCreateBranch}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
      >
        <Icon name="layers" size={14} color={c.textDim} />
        <Text style={{ fontSize: 12, color: c.textDim }}>Branch</Text>
      </TouchableOpacity>
    )
  }

  const active = message.activeBranch ?? 0
  const total = branches.length

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
      {/* Previous branch */}
      <TouchableOpacity
        onPress={() => onSwitchBranch(Math.max(0, active - 1))}
        disabled={active === 0}
        style={{ opacity: active === 0 ? 0.3 : 1 }}
      >
        <Icon name="chevronDown" size={16} color={c.accent} strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Branch indicator */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.elevated, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: c.border }}>
        <Icon name="layers" size={12} color={c.accent} />
        <Text style={{ fontSize: 11.5, color: c.text, fontWeight: '600' }}>
          {active + 1} / {total}
        </Text>
      </View>

      {/* Next branch */}
      <TouchableOpacity
        onPress={() => onSwitchBranch(Math.min(total - 1, active + 1))}
        disabled={active === total - 1}
        style={{ opacity: active === total - 1 ? 0.3 : 1 }}
      >
        <Icon name="chevronUp" size={16} color={c.accent} strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Add new branch */}
      <TouchableOpacity onPress={onCreateBranch} style={{ marginLeft: 4 }}>
        <Icon name="plus" size={15} color={c.textMuted} />
      </TouchableOpacity>
    </View>
  )
}
