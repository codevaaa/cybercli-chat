import { View, Text, Animated } from 'react-native'
import { useRef, useEffect } from 'react'
import { Colors } from '@/constants/colors'
import { Icon } from '@/components/ui/Icon'

const c = Colors.dark

interface AgentStatus {
  id: string
  name: string
  role: string
  done: boolean
}

interface Props {
  agents: AgentStatus[]
  phase: 'dispatching' | 'researching' | 'synthesizing' | 'done'
}

/**
 * Animated research progress indicator.
 * Shows the multi-agent brain working: each agent's name + status,
 * then the synthesis phase.
 */
export function ResearchProgress({ agents, phase }: Props) {
  const pulse = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    if (phase !== 'done') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        ])
      ).start()
    } else {
      pulse.setValue(1)
    }
  }, [phase])

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Animated.View style={{ opacity: pulse }}>
          <Icon name="brain" size={16} color={c.purple} />
        </Animated.View>
        <Text style={{ fontSize: 13, color: c.purple, fontWeight: '700' }}>
          {phase === 'dispatching' ? 'Deploying research agents...' :
           phase === 'researching' ? 'Agents analyzing...' :
           phase === 'synthesizing' ? 'Codic synthesizing final answer...' :
           'Research complete'}
        </Text>
      </View>

      {/* Agent grid */}
      {agents.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {agents.map((agent) => (
            <View
              key={agent.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: agent.done ? 'rgba(74,222,128,0.08)' : c.elevated,
                borderWidth: 1,
                borderColor: agent.done ? 'rgba(74,222,128,0.25)' : c.border,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <View style={{
                width: 6, height: 6, borderRadius: 3,
                backgroundColor: agent.done ? c.success : c.purple,
              }} />
              <Text style={{ fontSize: 11.5, color: agent.done ? c.success : c.text, fontWeight: '600' }}>
                {agent.name}
              </Text>
              <Text style={{ fontSize: 10, color: c.textDim }}>{agent.role}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
