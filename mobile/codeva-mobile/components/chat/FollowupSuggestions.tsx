import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { Colors } from '@/constants/colors'
import { Icon } from '@/components/ui/Icon'

const c = Colors.dark

interface Props {
  suggestions: string[]
  onSelect: (text: string) => void
}

/**
 * Clickable follow-up question chips shown after an AI response.
 * Tapping one sends it as the next user message instantly.
 */
export function FollowupSuggestions({ suggestions, onSelect }: Props) {
  if (!suggestions || suggestions.length === 0) return null

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {suggestions.map((s, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onSelect(s)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: c.elevated,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 9,
            }}
          >
            <Icon name="sparkles" size={13} color={c.accent} />
            <Text style={{ fontSize: 13, color: c.text, maxWidth: 220 }} numberOfLines={1}>
              {s.replace(/^["']|["']$/g, '')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}
