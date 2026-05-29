/**
 * Desktop Integration Hook
 * Provides access to Electron IPC APIs when running inside CyberCli Desktop.
 */

const isDesktop = () => typeof window !== 'undefined' && !!window.electronAPI

export function useDesktop() {
  const api = isDesktop() ? window.electronAPI : null

  return {
    isDesktop: !!api,
    platform: api?.platform || 'web',

    // Window controls
    minimizeWindow: () => api?.minimizeWindow?.(),
    maximizeWindow: () => api?.maximizeWindow?.(),
    closeWindow: () => api?.closeWindow?.(),

    // Auth
    openLoginInBrowser: () => api?.openLoginInBrowser?.(),
    completeAuth: (token) => api?.completeAuth?.(token),

    // Files
    readFile: (path) => api?.readFile?.(path),
    writeFile: (path, content) => api?.writeFile?.(path, content),
    selectFile: () => api?.selectFile?.(),

    // Notifications
    showNotification: (title, body) => api?.showNotification?.(title, body),

    // Event listeners
    onAuthToken: (cb) => {
      api?.onAuthToken?.(cb)
      return () => api?.removeAllListeners?.('auth:token')
    },
    onNavigateChat: (cb) => {
      api?.onNavigateChat?.(cb)
      return () => api?.removeAllListeners?.('navigate:chat')
    },
    onNavigateSettings: (cb) => {
      api?.onNavigateSettings?.(cb)
      return () => api?.removeAllListeners?.('navigate:settings')
    },
    onShortcutNewChat: (cb) => {
      api?.onShortcutNewChat?.(cb)
      return () => api?.removeAllListeners?.('shortcut:new-chat')
    },
    onShortcutFocusInput: (cb) => {
      api?.onShortcutFocusInput?.(cb)
      return () => api?.removeAllListeners?.('shortcut:focus-input')
    },
  }
}
