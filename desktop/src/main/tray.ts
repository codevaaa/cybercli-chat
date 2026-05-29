/**
 * CyberCli Desktop — System Tray / Menubar
 */

import { Tray, Menu, nativeImage, app } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface TrayOptions {
  onToggle: () => void
  onNewChat: () => void
  onSettings: () => void
  onQuit: () => void
}

export function createTray(options: TrayOptions): Tray {
  // Create icon from PNG
  const iconPath = path.join(__dirname, '../../resources/icon.png')
  let icon = nativeImage.createFromPath(iconPath)
  icon = icon.resize({ width: 16, height: 16 })
  icon.setTemplateImage(true) // For macOS dark mode

  const tray = new Tray(icon)
  tray.setToolTip('CyberCli')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide CyberCli',
      click: options.onToggle,
    },
    { type: 'separator' },
    {
      label: 'New Chat',
      accelerator: 'CmdOrCtrl+Alt+N',
      click: options.onNewChat,
    },
    {
      label: 'Settings',
      click: options.onSettings,
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: options.onQuit,
    },
  ])

  tray.setContextMenu(contextMenu)

  // Click on macOS shows the app (Windows uses context menu)
  tray.on('click', () => {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      options.onToggle()
    }
  })

  return tray
}
