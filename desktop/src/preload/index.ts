/**
 * CyberCli Desktop — Preload Script
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

  // Auth
  openLoginInBrowser: () => ipcRenderer.invoke('auth:open-login'),
  completeAuth: (token: string) => ipcRenderer.invoke('auth:complete', token),

  // File system
  readFile: (path: string) => ipcRenderer.invoke('fs:read-file', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:write-file', path, content),
  selectFile: () => ipcRenderer.invoke('fs:select-file'),

  // Notifications
  showNotification: (title: string, body: string) => ipcRenderer.invoke('notify:show', title, body),

  // Event listeners (from main → renderer)
  onAuthToken: (callback: (token: string) => void) => {
    ipcRenderer.on('auth:token', (_event, token) => callback(token))
  },
  onNavigateChat: (callback: (chatId?: string) => void) => {
    ipcRenderer.on('navigate:chat', (_event, chatId) => callback(chatId))
  },
  onNavigateSettings: (callback: () => void) => {
    ipcRenderer.on('navigate:settings', () => callback())
  },
  onShortcutNewChat: (callback: () => void) => {
    ipcRenderer.on('shortcut:new-chat', () => callback())
  },
  onShortcutFocusInput: (callback: () => void) => {
    ipcRenderer.on('shortcut:focus-input', () => callback())
  },
  onDeepLink: (callback: (url: string) => void) => {
    ipcRenderer.on('deeplink', (_event, url) => callback(url))
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
