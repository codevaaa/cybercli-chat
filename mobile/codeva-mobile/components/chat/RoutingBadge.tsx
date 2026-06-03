import { View, Text } from 'react-native'
import { Colors } from '@/constants/colors'
import { Icon, IconName } from '@/components/ui/Icon'

const c = Colors.dark

interface Props {
  tier: string
}

const TIER_INFO: Record<string, { icon: IconName; label: string; color: string }> = {
  fast: { icon: 'zap', label: 'Fast', color: c.success },
  balanced: { icon: 'sparkles', label: 'Balanced', color: c.accent },
  reasoning: { icon: 'brain', label: 'Reasoning', color: c.purple },
}

/**
 * Small badge showing which routing tier the AI auto-selected.
 * Helps user understand why some responses are faster/deeper.
 */
export function RoutingBadge({ tier }: Props) {
  const info = TIER_INFO[tier] || TIER_INFO.balanced
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${info.color}12`, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Icon name={info.icon} size={10} color={info.color} />
      <Text style={{ fontSize: 10, color: info.color, fontWeight: '600' }}>{info.label}</Text>
    </View>
  )
}
