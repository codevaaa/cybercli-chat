import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Thread } from '@/stores/chatStore'

const THREADS_KEY = 'codeva_threads_v1'
const ACTIVE_KEY = 'codeva_active_thread_v1'

/** Persist all threads to local storage (survives app restart). */
export async function saveThreads(threads: Thread[]): Promise<void> {
  try {
    await AsyncStorage.setItem(THREADS_KEY, JSON.stringify(threads))
  } catch (e) {
    console.warn('Failed to save threads', e)
  }
}

/** Load all threads from local storage. */
export async function loadThreads(): Promise<Thread[]> {
  try {
    const raw = await AsyncStorage.getItem(THREADS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export async function saveActiveThread(id: string | null): Promise<void> {
  try {
    if (id) await AsyncStorage.setItem(ACTIVE_KEY, id)
    else await AsyncStorage.removeItem(ACTIVE_KEY)
  } catch { /* ignore */ }
}

export async function loadActiveThread(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

const SETTINGS_KEY = 'codeva_settings_v1'

export async function saveSettings(settings: Record<string, unknown>): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch { /* ignore */ }
}

export async function loadSettings(): Promise<Record<string, unknown> | null> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
