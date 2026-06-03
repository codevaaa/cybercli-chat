import { useEffect, useRef } from 'react'
import { Animated, Easing, View, Text } from 'react-native'
import Svg, { Circle, Line, Polygon, G, RadialGradient, Stop, Defs } from 'react-native-svg'

/**
 * Animated Sudarshan Chakra logo — same design as the website's CodevaMark.
 * 8 geometric blades, concentric rings, crosshair markers, central octagon hub.
 * Spins continuously + entrance scale animation.
 */

const AnimatedG = Animated.createAnimatedComponent(G)

interface MarkProps {
  size?: number
  color?: string
  spin?: boolean
}

export function CodevaMark({ size = 48, color = '#C96442', spin = true }: MarkProps) {
  const rotate = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Entrance animation
    Animated.spring(scale, {
      toValue: 1,
      tension: 18,
      friction: 6,
      useNativeDriver: true,
    }).start()

    // Continuous rotation
    if (spin) {
      Animated.loop(
        Animated.timing(rotate, {
          toValue: 1,
          duration: 28000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start()
    }
  }, [spin])

  const spinDeg = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  // Generate 8 blade polygons
  const blades = Array.from({ length: 8 }).map((_, i) => {
    const angle = (i / 8) * Math.PI * 2
    const angleTip = angle + 0.28
    const tipX = 50 + Math.cos(angleTip) * 42
    const tipY = 50 + Math.sin(angleTip) * 42
    const angleOuterCorner = angle + 0.12
    const outX = 50 + Math.cos(angleOuterCorner) * 36
    const outY = 50 + Math.sin(angleOuterCorner) * 36
    const baseX = 50 + Math.cos(angle) * 18
    const baseY = 50 + Math.sin(angle) * 18
    const angleCut = angle + 0.24
    const cutX = 50 + Math.cos(angleCut) * 26
    const cutY = 50 + Math.sin(angleCut) * 26
    return `${baseX.toFixed(2)},${baseY.toFixed(2)} ${outX.toFixed(2)},${outY.toFixed(2)} ${tipX.toFixed(2)},${tipY.toFixed(2)} ${cutX.toFixed(2)},${cutY.toFixed(2)}`
  })

  // Octagon hub lines
  const octagonLines = Array.from({ length: 8 }).map((_, i) => {
    const a1 = (i / 8) * Math.PI * 2
    const a2 = ((i + 1) / 8) * Math.PI * 2
    const r = 9
    return {
      x1: 50 + Math.cos(a1) * r,
      y1: 50 + Math.sin(a1) * r,
      x2: 50 + Math.cos(a2) * r,
      y2: 50 + Math.sin(a2) * r,
    }
  })

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ scale }] }}>
      <Animated.View style={{ width: size, height: size, transform: [{ rotate: spinDeg }] }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={color} stopOpacity="1" />
              <Stop offset="50%" stopColor={color} stopOpacity="0.75" />
              <Stop offset="100%" stopColor={color} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Cardinal crosshair markers */}
          <G stroke={color} strokeWidth={1.2} opacity={0.35}>
            <Line x1="50" y1="12" x2="50" y2="28" stroke={color} />
            <Line x1="50" y1="72" x2="50" y2="88" stroke={color} />
            <Line x1="12" y1="50" x2="28" y2="50" stroke={color} />
            <Line x1="72" y1="50" x2="88" y2="50" stroke={color} />
          </G>

          {/* Concentric rings */}
          <Circle cx="50" cy="50" r="44" stroke={color} strokeWidth={1} strokeDasharray="3 6" opacity={0.2} fill="none" />
          <Circle cx="50" cy="50" r="36" stroke={color} strokeWidth={1.5} opacity={0.15} fill="none" />
          <Circle cx="50" cy="50" r="26" stroke={color} strokeWidth={1} strokeDasharray="4 2" opacity={0.3} fill="none" />
          <Circle cx="50" cy="50" r="18" stroke={color} strokeWidth={1.2} opacity={0.45} fill="none" />

          {/* 8 blades */}
          <G fill={color}>
            {blades.map((pts, i) => (
              <Polygon key={i} points={pts} opacity={0.85} fill={color} />
            ))}
          </G>

          {/* Cardinal cosmic node dots */}
          <G fill={color} opacity={0.75}>
            <Circle cx="50" cy="8" r="1.5" fill={color} />
            <Circle cx="92" cy="50" r="1.5" fill={color} />
            <Circle cx="50" cy="92" r="1.5" fill={color} />
            <Circle cx="8" cy="50" r="1.5" fill={color} />
          </G>

          {/* Hub glow */}
          <Circle cx="50" cy="50" r="12" fill="url(#hubGlow)" opacity={0.4} />

          {/* Center octagon */}
          <G stroke={color} strokeWidth={1.2} opacity={0.8}>
            {octagonLines.map((l, i) => (
              <Line key={i} x1={l.x1.toFixed(2)} y1={l.y1.toFixed(2)} x2={l.x2.toFixed(2)} y2={l.y2.toFixed(2)} stroke={color} />
            ))}
          </G>

          {/* Core dot */}
          <Circle cx="50" cy="50" r="3.5" fill={color} />
        </Svg>
      </Animated.View>
    </Animated.View>
  )
}

interface WordmarkProps {
  size?: number
  color?: string
  textColor?: string
  spin?: boolean
}

export function CodevaWordmark({ size = 40, color = '#C96442', textColor = '#E8E4DE', spin = true }: WordmarkProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <CodevaMark size={size} color={color} spin={spin} />
      <Text
        style={{
          fontWeight: '700',
          fontSize: size * 0.66,
          letterSpacing: -0.5,
          color: textColor,
        }}
      >
        Codeva
      </Text>
    </View>
  )
}

export default CodevaMark
