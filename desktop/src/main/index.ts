/**
 * CyberCli Desktop — Main Process
 *
 * Responsibilities:
 * - Window lifecycle (create, show, hide, quit)
 * - System tray / menubar
 * - Global keyboard shortcuts
 * - Deep link protocol handlers (cybercli://)
 * - Auto-updater
 * - IPC bridge to renderer
 */

import { app, BrowserWindow, ipcMain, shell, dialog, globalShortcut } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { createTray } from './tray.js'
import { registerShortcuts, unregisterShortcuts } from './shortcuts.js'
import { setupDeepLinkProtocol, handleDeepLink } from './deeplink.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Constants ──────────────────────────────────────────────

const isDev = !app.isPackaged
const isMac = process.platform === 'darwin'
const isWin = process.platform === 'win32'

// Load URL: dev = frontend dev server (if running), prod = built frontend
const FRONTEND_DEV_URL = 'http://localhost:5173'
const FRONTEND_PROD_PATH = path.join(__dirname, '../../frontend/dist/index.html')

// Renderer HTML files (built)
const RENDERER_DIR = isDev
  ? path.join(__dirname, '../renderer')  // dist/renderer after build
  : path.join(__dirname, '../renderer')

// ─── State ────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null
let landingWindow: BrowserWindow | null = null
let loginWindow: BrowserWindow | null = null
let tray: ReturnType<typeof createTray> | null = null

// ─── Window Factories ───────────────────────────────────────

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    show: false, // Show when ready
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 12, y: 12 } : undefined,
    backgroundColor: '#0A0A0F',
    icon: path.join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      allowRunningInsecureContent: false,
      webSecurity: !isDev, // Allow CORS in dev for localhost API
    },
  })

  // Load the frontend
  if (isDev) {
    win.loadURL(FRONTEND_DEV_URL).catch(() => {
      // Fallback: load built renderer index if dev server not running
      win.loadFile(path.join(RENDERER_DIR, 'index.html'))
    })
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(FRONTEND_PROD_PATH)
  }

  // Show when ready to prevent blank flash
  win.once('ready-to-show', () => {
    win.show()
    win.focus()
  })

  // External links open in system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Handle navigation to external URLs
  win.webContents.on('will-navigate', (event, url) => {
    if (isDev && url.startsWith('http://localhost')) return
    if (!url.startsWith('file://') && !url.startsWith('http://localhost')) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  return win
}

function createLandingWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 520,
    height: 640,
    resizable: false,
    maximizable: false,
    minimizable: false,
    show: false,
    backgroundColor: '#0A0A0F',
    titleBarStyle: 'hidden',
    frame: false,
    icon: path.join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.loadFile(path.join(RENDERER_DIR, 'landing.html'))
  win.once('ready-to-show', () => win.show())
  return win
}

function createLoginWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 460,
    height: 580,
    resizable: false,
    maximizable: false,
    show: false,
    backgroundColor: '#0A0A0F',
    titleBarStyle: 'hidden',
    frame: false,
    icon: path.join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.loadFile(path.join(RENDERER_DIR, 'login.html'))
  win.once('ready-to-show', () => win.show())
  return win
}

// ─── App Lifecycle ──────────────────────────────────────────

app.whenReady().then(() => {
  setupDeepLinkProtocol()

  // Create main window (hidden initially)
  mainWindow = createMainWindow()
  mainWindow.hide()

  // Show landing window on first launch
  landingWindow = createLandingWindow()

  // Create system tray
  tray = createTray({
    onToggle: () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide()
        } else {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    onNewChat: () => {
      if (mainWindow) {
        mainWindow.show()
        mainWindow.webContents.send('shortcut:new-chat')
      }
    },
    onSettings: () => {
      if (mainWindow) {
        mainWindow.show()
        mainWindow.webContents.send('navigate:settings')
      }
    },
    onQuit: () => {
      app.quit()
    },
  })

  // Register global shortcuts
  registerShortcuts(mainWindow)

  // On macOS, re-create window when dock icon clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    } else if (mainWindow) {
      mainWindow.show()
    }
  })
})

app.on('window-all-closed', () => {
  unregisterShortcuts()
  if (!isMac) {
    app.quit()
    tray = null
  }
})

app.on('before-quit', () => {
  unregisterShortcuts()
})

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_, argv) => {
    // Someone tried to run a second instance
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
    // Handle deep link from second instance
    const url = argv.find((arg) => arg.startsWith('cybercli://'))
    if (url && mainWindow) {
      handleDeepLink(url, mainWindow)
    }
  })
}

// Deep link on macOS (open-url event)
app.on('open-url', (event, url) => {
  event.preventDefault()
  if (mainWindow) {
    handleDeepLink(url, mainWindow)
  }
})

// Deep link on Windows/Linux (protocol argv)
app.on('ready', () => {
  const url = process.argv.find((arg) => arg.startsWith('cybercli://'))
  if (url && mainWindow) {
    handleDeepLink(url, mainWindow)
  }
})

// ─── IPC Handlers ───────────────────────────────────────────

// Window controls
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.handle('window:close', () => {
  mainWindow?.hide() // Hide to tray, don't quit
})

ipcMain.handle('window:hide', () => {
  mainWindow?.hide()
})

ipcMain.handle('window:show', () => {
  mainWindow?.show()
  mainWindow?.focus()
})

// Auth flow
ipcMain.handle('auth:open-login', () => {
  // Open the web login in browser, will redirect back via deep link
  const loginUrl = 'https://cybermindcli.info/login?redirect=desktop'
  shell.openExternal(loginUrl)
})

ipcMain.handle('auth:complete', (_event, token: string) => {
  // Store token and show main window
  mainWindow?.webContents.send('auth:token', token)
  mainWindow?.show()
  mainWindow?.focus()
  // Close login/landing windows
  landingWindow?.close()
  loginWindow?.close()
  landingWindow = null
  loginWindow = null
})

// File system (via MCP-like local access)
ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    return { success: true, content }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
})

ipcMain.handle('fs:write-file', async (_event, filePath: string, content: string) => {
  try {
    await fs.promises.writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
})

ipcMain.handle('fs:select-file', async () => {
  if (!mainWindow) return { success: false, error: 'No window' }
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Code', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs'] },
    ],
  })
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, canceled: true }
  }
  const content = await fs.promises.readFile(result.filePaths[0], 'utf-8')
  return { success: true, path: result.filePaths[0], content }
})

// App info
ipcMain.handle('app:get-info', () => ({
  version: app.getVersion(),
  platform: process.platform,
  isPackaged: app.isPackaged,
}))

// Notifications
ipcMain.handle('notify:show', async (_event, title: string, body: string) => {
  const { Notification } = await import('electron')
  new Notification({ title, body, icon: path.join(__dirname, '../../resources/icon.png') }).show()
})

// ─── Exports for other modules ───────────────────────────────

export { mainWindow, landingWindow, loginWindow }
