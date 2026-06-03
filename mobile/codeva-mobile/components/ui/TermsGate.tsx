import { View, Text, TouchableOpacity, Linking } from 'react-native'
import { Colors } from '@/constants/colors'
import { Icon } from './Icon'

const c = Colors.dark
const TERMS_URL = 'https://cybermindcli.info/terms-of-service'
const PRIVACY_URL = 'https://cybermindcli.info/privacy-policy'

/**
 * Terms & Conditions checkbox. Must be accepted before login/signup.
 * Required for app store compliance and legal protection.
 */
export function TermsGate({ accepted, onToggle }: { accepted: boolean; onToggle: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8, paddingHorizontal: 4 }}>
      <TouchableOpacity
        onPress={onToggle}
        style={{
          width: 22, height: 22, borderRadius: 6, marginTop: 1,
          borderWidth: 2, borderColor: accepted ? c.accent : c.textDim,
          backgroundColor: accepted ? c.accent : 'transparent',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        {accepted && <Icon name="check" size={14} color="#fff" strokeWidth={3} />}
      </TouchableOpacity>
      <Text style={{ flex: 1, fontSize: 12.5, color: c.textMuted, lineHeight: 18 }}>
        I agree to Codeva's{' '}
        <Text style={{ color: c.accent }} onPress={() => Linking.openURL(TERMS_URL)}>Terms of Service</Text>
        {' '}and{' '}
        <Text style={{ color: c.accent }} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>.
      </Text>
    </View>
  )
}
