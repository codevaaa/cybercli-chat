import * as Updates from 'expo-updates'
import { Platform, Alert } from 'react-native'

/**
 * OTA update checker. On app launch (and resume), checks for a new JS bundle
 * pushed via `eas update`. If found, downloads and prompts to reload.
 * This lets us ship fixes/features without a Play Store re-submission.
 */
export async function checkForUpdates(silent = true): Promise<void> {
  if (Platform.OS === 'web' || __DEV__) return // OTA only on built native apps

  try {
    const update = await Updates.checkForUpdateAsync()
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync()
      if (silent) {
        // Apply on next launch silently
        return
      }
      Alert.alert(
        'Update available',
        'A new version of Codeva is ready. Restart to apply?',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Restart', onPress: () => Updates.reloadAsync() },
        ]
      )
    }
  } catch {
    // Network or no-update — ignore silently
  }
}
