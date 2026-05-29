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

    // Landing → Main
    openMainWindow: () => api?.openMainWindow?.(),

    // Drag & Drop
    readDroppedFiles: (paths) => api?.readDroppedFiles?.(paths),

    // Auto-updater
    restartToUpdate: () => api?.restartToUpdate?.(),

    // Event listeners
    onAuthToken: (cb) => api?.onAuthToken?.(cb),
    onNavigateChat: (cb) => api?.onNavigateChat?.(cb),
    onNavigateSettings: (cb) => api?.onNavigateSettings?.(cb),
    onShortcutNewChat: (cb) => api?.onShortcutNewChat?.(cb),
    onShortcutFocusInput: (cb) => api?.onShortcutFocusInput?.(cb),
    onUpdateAvailable: (cb) => api?.onUpdateAvailable?.(cb),
  }
}
