import { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native'
import { router } from 'expo-router'
import { Colors } from '@/constants/colors'
import { CodevaMark } from '@/components/ui/CodevaLogo'
import { Icon } from '@/components/ui/Icon'
import { useAuthStore } from '@/stores/authStore'

const { width } = Dimensions.get('window')

export default function LandingScreen() {
  const c = Colors.dark
  const { user } = useAuthStore()

  const logoScale = useRef(new Animated.Value(0)).current
  const titleOpacity = useRef(new Animated.Value(0)).current
  const titleY = useRef(new Animated.Value(20)).current
  const subOpacity = useRef(new Animated.Value(0)).current
  const ctaOpacity = useRef(new Animated.Value(0)).current
  const ctaY = useRef(new Animated.Value(30)).current
  const featuresOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.sequence([
      // Logo springs in
      Animated.spring(logoScale, { toValue: 1, tension: 16, friction: 5.5, useNativeDriver: true }),
      // Title
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      // Subtitle
      Animated.timing(subOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      // Features + CTA together
      Animated.parallel([
        Animated.timing(featuresOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(ctaOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(ctaY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start()
  }, [])

  const enter = () => {
    if (user) router.replace('/(tabs)')
    else router.replace('/(auth)/login')
  }

  const features = [
    { icon: 'zap' as const, text: 'Lightning-fast free models' },
    { icon: 'mic' as const, text: 'Natural voice conversations' },
    { icon: 'brain' as const, text: 'Council Mode — models debate' },
    { icon: 'globe' as const, text: 'Live web search built in' },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* Ambient glow */}
      <View style={{ position: 'absolute', top: -100, alignSelf: 'center', width: 400, height: 400, borderRadius: 200, backgroundColor: c.accent, opacity: 0.07 }} />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        {/* Animated chakra logo */}
        <Animated.View style={{ transform: [{ scale: logoScale }] }}>
          <CodevaMark size={130} color={c.accent} spin />
        </Animated.View>

        {/* Title */}
        <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleY }], alignItems: 'center', marginTop: 36 }}>
          <Text style={{ fontSize: 42, fontWeight: '800', color: c.text, letterSpacing: -1 }}>Codeva</Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View style={{ opacity: subOpacity, marginTop: 12 }}>
          <Text style={{ fontSize: 17, color: c.textMuted, textAlign: 'center', lineHeight: 25, maxWidth: 320 }}>
            Every AI model. One conversation.{'\n'}Free, fast, and genuinely powerful.
          </Text>
        </Animated.View>

        {/* Features */}
        <Animated.View style={{ opacity: featuresOpacity, marginTop: 40, gap: 14, width: '100%', maxWidth: 320 }}>
          {features.map((f) => (
            <View key={f.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={f.icon} size={18} color={c.accent} />
              </View>
              <Text style={{ fontSize: 15, color: c.text }}>{f.text}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* CTA */}
      <Animated.View style={{ opacity: ctaOpacity, transform: [{ translateY: ctaY }], padding: 28, paddingBottom: 44 }}>
        <TouchableOpacity
          onPress={enter}
          activeOpacity={0.85}
          style={{ backgroundColor: c.accent, borderRadius: 16, paddingVertical: 17, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
        >
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>Get Started</Text>
          <Icon name="arrowUp" size={18} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={{ fontSize: 12.5, color: c.textDim, textAlign: 'center', marginTop: 16 }}>
          Free forever · No credit card required
        </Text>
      </Animated.View>
    </View>
  )
}
