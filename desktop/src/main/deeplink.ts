/**
 * CyberCli Desktop — Deep Link Protocol Handler
 *
 * Handles cybercli:// URLs for:
 * - Auth: cybercli://auth?token=xxx
 * - Chat: cybercli://chat?id=xxx
 * - Settings: cybercli://settings
 */

import { app, BrowserWindow } from 'electron'

export function setupDeepLinkProtocol(): void {
  // Register as default handler for cybercli:// protocol
  if (!app.isDefaultProtocolClient('cybercli')) {
    app.setAsDefaultProtocolClient('cybercli')
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
