import * as ImagePicker from 'expo-image-picker'
import { Alert, Linking, Platform } from 'react-native'

/**
 * Permission helpers with graceful denial handling.
 * If the user denied a permission, we show a popup directing them to Settings,
 * so uploads never silently fail.
 */

export async function ensureCameraPermission(): Promise<boolean> {
  const { status, canAskAgain } = await ImagePicker.getCameraPermissionsAsync()
  if (status === 'granted') return true

  if (canAskAgain) {
    const req = await ImagePicker.requestCameraPermissionsAsync()
    if (req.status === 'granted') return true
  }

  showDeniedAlert('Camera', 'take photos')
  return false
}

export async function ensureGalleryPermission(): Promise<boolean> {
  const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync()
  if (status === 'granted') return true

  if (canAskAgain) {
    const req = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (req.status === 'granted') return true
  }

  showDeniedAlert('Photos', 'attach images')
  return false
}

function showDeniedAlert(what: string, action: string) {
  if (Platform.OS === 'web') {
    Alert.alert(`${what} access needed`, `Please allow ${what.toLowerCase()} access in your browser to ${action}.`)
    return
  }
  Alert.alert(
    `${what} permission needed`,
    `Codeva needs ${what.toLowerCase()} access to ${action}. Enable it in Settings.`,
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  )
}
