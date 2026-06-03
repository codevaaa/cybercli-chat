import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const SUPABASE_URL = 'https://bqaaxqibrarewctxvlix.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxYWF4cWlicmFyZXdjdHh2bGl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyODk3MjMsImV4cCI6MjA5NDg2NTcyM30.Mhr4Ko1shONjFKxDyQo5KDKjIRkbyJRUyohBYJNr6dU'

/**
 * SecureStore adapter for Supabase session persistence on native.
 * On web, falls back to localStorage (handled by supabase-js automatically).
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      return Promise.resolve(typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null)
    }
    return SecureStore.getItemAsync(key)
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
      return Promise.resolve()
    }
    return SecureStore.setItemAsync(key, value)
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key)
      return Promise.resolve()
    }
    return SecureStore.deleteItemAsync(key)
  },
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    // PKCE is the secure OAuth flow. On web, supabase-js auto-exchanges the
    // ?code=… in the URL; on native we exchange it manually in the callback.
    flowType: 'pkce',
    detectSessionInUrl: Platform.OS === 'web',
  },
})

export { SUPABASE_URL, SUPABASE_ANON_KEY }
