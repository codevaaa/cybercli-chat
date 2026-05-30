/**
 * Codeva Desktop — Global Keyboard Shortcuts
 */

import { globalShortcut, BrowserWindow } from 'electron'

export function registerShortcuts(mainWindow: BrowserWindow | null): void {
  if (!mainWindow) return

  // Toggle app visibility: Ctrl+Alt+C (like Claude's Ctrl+Alt+Space)
  globalShortcut.register('CommandOrControl+Alt+C', () => {
    if (!mainWindow) return
    if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // Quick new chat
  globalShortcut.register('CommandOrControl+Alt+N', () => {
    if (!mainWindow) return
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('shortcut:new-chat')
  })

  // Focus input
  globalShortcut.register('CommandOrControl+Alt+Shift+C', () => {
    if (!mainWindow) return
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('shortcut:focus-input')
  })
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
}
