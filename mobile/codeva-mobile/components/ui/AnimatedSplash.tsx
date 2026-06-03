import { useEffect, useRef } from 'react'
import { View, Animated, Easing, Dimensions, StyleSheet } from 'react-native'
import { Colors } from '@/constants/colors'
import { CodevaMark } from './CodevaLogo'

const { width, height } = Dimensions.get('window')

interface Props {
  onFinish: () => void
}

/**
 * Premium animated splash — plays every app launch.
 * The Sudarshan Chakra enters from bottom-right corner, scales up to center
 * while spinning, holds briefly with a glow pulse, then fades out to reveal
 * the app. Takes ~2.2s total — feels premium but doesn't slow the user down.
 */
export function AnimatedSplash({ onFinish }: Props) {
  const c = Colors.dark

  // Animation values
  const translateX = useRef(new Animated.Value(width * 0.35)).current
  const translateY = useRef(new Animated.Value(height * 0.4)).current
  const scale = useRef(new Animated.Value(0.3)).current
  const rotate = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(1)).current
  const glowOpacity = useRef(new Animated.Value(0)).current
  const textOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Phase 1: Chakra enters from bottom-right corner → center (0.7s)
    const enterAnim = Animated.parallel([
      Animated.spring(translateX, { toValue: 0, tension: 14, friction: 7, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 14, friction: 7, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 16, friction: 6, useNativeDriver: true }),
    ])

    // Phase 2: Rotate 360° + glow pulse (0.9s)
    const spinAndGlow = Animated.parallel([
      Animated.timing(rotate, { toValue: 1, duration: 900, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(textOpacity, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
    ])

    // Phase 3: Hold briefly, then fade out (0.6s)
    const exitAnim = Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 500, delay: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.4, duration: 500, delay: 300, useNativeDriver: true }),
    ])

    Animated.sequence([enterAnim, spinAndGlow, exitAnim]).start(() => {
      onFinish()
    })
  }, [])

  const spinDeg = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  return (
    <Animated.View style={[styles.container, { backgroundColor: c.background, opacity }]}>
      {/* Ambient background glow */}
      <Animated.View style={[styles.glow, { opacity: glowOpacity, backgroundColor: c.accent }]} />

      {/* Chakra logo */}
      <Animated.View
        style={{
          transform: [
            { translateX },
            { translateY },
            { scale },
            { rotate: spinDeg },
          ],
        }}
      >
        <CodevaMark size={120} color={c.accent} spin={false} />
      </Animated.View>

      {/* "Codeva" text fades in */}
      <Animated.Text style={[styles.brandText, { color: c.text, opacity: textOpacity }]}>
        Codeva
      </Animated.Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0,
  },
  brandText: {
    position: 'absolute',
    bottom: '18%',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
})
