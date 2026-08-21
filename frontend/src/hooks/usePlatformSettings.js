/**
 * usePlatformSettings — Hook to load/save platform settings from/to the backend.
 * Settings are persisted per-user in MongoDB via /api/v1/platform/settings.
 * Falls back to localStorage if backend is unreachable.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import api from '@lib/api.js'

const CACHE_KEY = 'codeva_platform_settings_cache'
const DEBOUNCE_MS = 800

export function usePlatformSettings() {
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') } catch { return {} }
  })
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const saveTimerRef            = useRef(null)

  // Load settings from backend on mount
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data } = await api.get('/platform/settings')
        if (!cancelled) {
          setSettings(data)
          localStorage.setItem(CACHE_KEY, JSON.stringify(data))
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
          // Use cached version
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Update a single setting (debounced save to backend)
  const update = useCallback((key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(CACHE_KEY, JSON.stringify(next))

      // Debounce backend save
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        try {
          await api.put('/platform/settings', { [key]: value })
        } catch (err) {
          console.error('[PlatformSettings] Save failed:', err.message)
        }
      }, DEBOUNCE_MS)

      return next
    })
  }, [])

  // Bulk update (immediate save)
  const updateBulk = useCallback(async (updates) => {
    setSettings(prev => {
      const next = { ...prev, ...updates }
      localStorage.setItem(CACHE_KEY, JSON.stringify(next))
      return next
    })
    try {
      await api.put('/platform/settings', updates)
    } catch (err) {
      console.error('[PlatformSettings] Bulk save failed:', err.message)
    }
  }, [])

  // Reset to defaults
  const reset = useCallback(async () => {
    try {
      const { data } = await api.delete('/platform/settings')
      setSettings(data)
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    } catch (err) {
      console.error('[PlatformSettings] Reset failed:', err.message)
    }
  }, [])

  return { settings, loading, error, update, updateBulk, reset }
}
