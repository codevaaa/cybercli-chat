import React from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { Colors } from '@/constants/colors'
import { CodevaMark } from './CodevaLogo'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * App-wide error boundary. Without this, any uncaught render error unmounts
 * the entire React tree and the user sees a blank white screen. This catches
 * the error, keeps the app alive, and offers a one-tap recovery.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep a breadcrumb for debugging; never crashes the app.
    if (__DEV__) console.error('Codeva ErrorBoundary caught:', error, info)
  }

  reset = () => this.setState({ hasError: false, error: null })

  render() {
    if (!this.state.hasError) return this.props.children

    const c = Colors.dark
    return (
      <View style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <CodevaMark size={72} color={c.accent} spin={false} />
        <Text style={{ fontSize: 20, fontWeight: '700', color: c.text, marginTop: 26, textAlign: 'center' }}>
          Something went wrong
        </Text>
        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 10, textAlign: 'center', lineHeight: 21, maxWidth: 320 }}>
          Codeva hit an unexpected error. Your conversations are safe. Tap below to recover.
        </Text>

        {__DEV__ && this.state.error ? (
          <ScrollView style={{ maxHeight: 160, marginTop: 18, alignSelf: 'stretch' }}>
            <Text style={{ fontSize: 11.5, color: c.error, fontFamily: 'monospace' }}>
              {this.state.error.message}
            </Text>
          </ScrollView>
        ) : null}

        <TouchableOpacity
          onPress={this.reset}
          activeOpacity={0.85}
          style={{ backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 40, marginTop: 28 }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    )
  }
}
