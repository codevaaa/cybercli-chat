/**
 * Codeva Desktop — Preload Script
 *
 * Secure bridge between renderer (web) and main (Node.js).
 * Exposes only safe APIs via contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron'

// ─── API exposed to renderer ────────────────────────────────

const electronAPI = {
  // Platform info
  platform: process.platform as NodeJS.Platform,
  isDesktop: true,

  // App info
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  hideWindow: () => ipcRenderer.invoke('window:hide'),
  showWindow: () => ipcRenderer.invoke('window:show'),

  // Auth (Claude-desktop style flow)
  openSignIn: (opts?: { method?: string; email?: string }) => ipcRenderer.invoke('auth:open-signin', opts),
  backToLanding: () => ipcRenderer.invoke('auth:back-to-landing'),
  openLoginInBrowser: (opts?: { method?: string; email?: string }) => ipcRenderer.invoke('auth:open-login', opts),
  completeAuth: (token: string) => ipcRenderer.invoke('auth:complete', token),

  // Landing → Main transition
  openMainWindow: () => ipcRenderer.invoke('landing:open-main'),

  // Session state persistence (skip landing on next launch)
  setSessionState: (hasSession: boolean) => ipcRenderer.invoke('auth:set-session', hasSession),

  // Kali_Kal Bug Bounty Hunter window (MAX plan only)
  openHunter: (token?: string) => ipcRenderer.invoke('hunter:open', token),

  // Hunter window receives auth token from main window
  onHunterToken: (callback: (token: string) => void) => {
    const handler = (_event: any, token: string) => callback(token)
    ipcRenderer.on('hunter:token', handler)
    return () => ipcRenderer.removeListener('hunter:token', handler)
  },

  // File system
  readFile: (path: string) => ipcRenderer.invoke('fs:read-file', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:write-file', path, content),
  selectFile: () => ipcRenderer.invoke('fs:select-file'),
  readDroppedFiles: (paths: string[]) => ipcRenderer.invoke('dragdrop:read-files', paths),

  // Notifications
  showNotification: (title: string, body: string) => ipcRenderer.invoke('notify:show', title, body),

  // Auto-updater
  restartToUpdate: () => ipcRenderer.invoke('update:restart'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),

  // Event listeners (from main → renderer)
  onAuthToken: (callback: (token: string) => void) => {
    const handler = (_event: any, token: string) => callback(token)
    ipcRenderer.on('auth:token', handler)
    return () => ipcRenderer.removeListener('auth:token', handler)
  },
  onNavigateChat: (callback: (chatId?: string) => void) => {
    const handler = (_event: any, chatId?: string) => callback(chatId)
    ipcRenderer.on('navigate:chat', handler)
    return () => ipcRenderer.removeListener('navigate:chat', handler)
  },
  onNavigateSettings: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('navigate:settings', handler)
    return () => ipcRenderer.removeListener('navigate:settings', handler)
  },
  onShortcutNewChat: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('shortcut:new-chat', handler)
    return () => ipcRenderer.removeListener('shortcut:new-chat', handler)
  },
  onShortcutFocusInput: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('shortcut:focus-input', handler)
    return () => ipcRenderer.removeListener('shortcut:focus-input', handler)
  },
  onDeepLink: (callback: (url: string) => void) => {
    const handler = (_event: any, url: string) => callback(url)
    ipcRenderer.on('deeplink', handler)
    return () => ipcRenderer.removeListener('deeplink', handler)
  },
  onUpdateAvailable: (callback: (info?: { version?: string; releaseNotes?: string }) => void) => {
    const handler = (_event: any, info?: { version?: string; releaseNotes?: string }) => callback(info)
    ipcRenderer.on('update:available', handler)
    return () => ipcRenderer.removeListener('update:available', handler)
  },
  onUpdateChecking: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('update:checking', handler)
    return () => ipcRenderer.removeListener('update:checking', handler)
  },
  onUpdateNone: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('update:none', handler)
    return () => ipcRenderer.removeListener('update:none', handler)
  },
  onUpdateProgress: (callback: (p: { percent: number; transferred?: number; total?: number; bytesPerSecond?: number }) => void) => {
    const handler = (_event: any, p: any) => callback(p)
    ipcRenderer.on('update:progress', handler)
    return () => ipcRenderer.removeListener('update:progress', handler)
  },
  onUpdateDownloaded: (callback: (info?: { version?: string; releaseNotes?: string }) => void) => {
    const handler = (_event: any, info?: any) => callback(info)
    ipcRenderer.on('update:downloaded', handler)
    return () => ipcRenderer.removeListener('update:downloaded', handler)
  },
  onUpdateError: (callback: (message: string) => void) => {
    const handler = (_event: any, message: string) => callback(message)
    ipcRenderer.on('update:error', handler)
    return () => ipcRenderer.removeListener('update:error', handler)
  },

  // Remove listeners (cleanup)
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
}

// Expose to window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Type declaration for renderer
declare global {
  interface Window {
    electronAPI: typeof electronAPI
  }
}

export type ElectronAPI = typeof electronAPI
