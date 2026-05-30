/**
 * Codeva Desktop — Deep Link Protocol Handler
 *
 * Handles codeva:// URLs for:
 * - Auth: codeva://auth?token=xxx
 * - Chat: codeva://chat?id=xxx
 * - Settings: codeva://settings
 */

import { app, BrowserWindow } from 'electron'

export function setupDeepLinkProtocol(): void {
  // Register as default handler for codeva:// protocol
  if (!app.isDefaultProtocolClient('codeva')) {
    app.setAsDefaultProtocolClient('codeva')
  }
}

export function handleDeepLink(url: string, mainWindow: BrowserWindow): void {
  try {
    const parsed = new URL(url)
    const route = parsed.hostname // e.g., 'auth', 'chat', 'settings'
    const params = Object.fromEntries(parsed.searchParams)

    switch (route) {
      case 'auth': {
        const token = params.token
        if (token && mainWindow) {
          mainWindow.webContents.send('auth:token', token)
          mainWindow.show()
          mainWindow.focus()
          // Tell the app to close the landing/sign-in windows.
          ;(app as unknown as NodeJS.EventEmitter).emit('codeva:auth-complete')
        }
        break
      }
      case 'chat': {
        const chatId = params.id
        if (mainWindow) {
          mainWindow.webContents.send('navigate:chat', chatId)
          mainWindow.show()
          mainWindow.focus()
        }
        break
      }
      case 'settings': {
        if (mainWindow) {
          mainWindow.webContents.send('navigate:settings')
          mainWindow.show()
          mainWindow.focus()
        }
        break
      }
      default:
        console.log('Unknown deep link route:', route)
    }
  } catch (err) {
    console.error('Failed to handle deep link:', err)
  }
}
