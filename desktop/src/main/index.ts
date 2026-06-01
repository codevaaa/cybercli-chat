/**
 * Codeva Desktop — Main Process
 *
 * Responsibilities:
 * - Window lifecycle (create, show, hide, quit)
 * - System tray / menubar
 * - Global keyboard shortcuts
 * - Deep link protocol handlers (codeva://)
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
import pkg from 'electron-updater'
const { autoUpdater } = pkg

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Constants ──────────────────────────────────────────────

const isDev = process.env.NODE_ENV === 'development' || (!app.isPackaged && process.env.NODE_ENV !== 'production')
const isMac = process.platform === 'darwin'
const isWin = process.platform === 'win32'

// Load URL: dev = frontend dev server (if running), prod = built frontend
const FRONTEND_DEV_URL = 'http://localhost:5173'
const FRONTEND_PROD_PATH = path.join(__dirname, '../../../frontend/dist/index.html')

// Renderer HTML files (built) — resolve from app path for reliability
const RENDERER_DIR = path.join(app.getAppPath(), 'dist', 'renderer')

// ─── State ────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null
let landingWindow: BrowserWindow | null = null
let loginWindow: BrowserWindow | null = null
let tray: ReturnType<typeof createTray> | null = null

// ─── Auto Updater ─────────────────────────────────────────────

let updateInfoCache: { version?: string; releaseNotes?: string } | null = null

function sendToMain(channel: string, payload?: unknown) {
  try { mainWindow?.webContents.send(channel, payload) } catch { /* window gone */ }
}

function setupAutoUpdater() {
  if (isDev) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    sendToMain('update:checking')
  })

  autoUpdater.on('update-available', (info: { version?: string; releaseNotes?: string | unknown }) => {
    updateInfoCache = {
      version: info?.version,
      releaseNotes: typeof info?.releaseNotes === 'string' ? info.releaseNotes : undefined,
    }
    sendToMain('update:available', updateInfoCache)
    new (require('electron').Notification)({
      title: 'Codeva Update Available',
      body: `Version ${info?.version || ''} is downloading in the background.`,
    }).show()
  })

  autoUpdater.on('update-not-available', () => {
    sendToMain('update:none')
  })

  autoUpdater.on('download-progress', (p: { percent?: number; transferred?: number; total?: number; bytesPerSecond?: number }) => {
    sendToMain('update:progress', {
      percent: Math.round(p?.percent || 0),
      transferred: p?.transferred,
      total: p?.total,
      bytesPerSecond: p?.bytesPerSecond,
    })
  })

  autoUpdater.on('error', (err: Error) => {
    sendToMain('update:error', err?.message || 'Update failed')
  })

  autoUpdater.on('update-downloaded', (info: { version?: string }) => {
    sendToMain('update:downloaded', { version: info?.version, ...updateInfoCache })
    new (require('electron').Notification)({
      title: 'Codeva Update Ready',
      body: 'Restart to install the latest version.',
    }).show()
  })

  // Initial silent check shortly after launch, then every 3 hours.
  autoUpdater.checkForUpdates().catch(() => {})
  setInterval(() => { autoUpdater.checkForUpdates().catch(() => {}) }, 3 * 60 * 60 * 1000)
}

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
    icon: path.join(__dirname, '../../../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      allowRunningInsecureContent: false,
      webSecurity: !isDev, // Allow CORS in dev for localhost API
    },
  })

  // Load the frontend
  if (isDev) {
    win.loadURL(FRONTEND_DEV_URL).catch(() => {
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

  // File drag & drop — expose to renderer
  win.webContents.on('dom-ready', () => {
    // Inject drag-drop CSS + JS
    win.webContents.insertCSS(`
      .desktop-drag-overlay {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(124, 58, 237, 0.15);
        border: 3px dashed #7C3AED;
        display: none;
        align-items: center; justify-content: center;
        pointer-events: none;
      }
      .desktop-drag-overlay.active { display: flex; }
      .desktop-drag-overlay span {
        color: #ECECEC; font-size: 18px; font-weight: 600;
        background: rgba(10,10,15,0.8); padding: 16px 32px; border-radius: 12px;
      }
    `)
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
    titleBarStyle: isMac ? 'hidden' : 'default',
    frame: !isWin,
    icon: path.join(__dirname, '../../../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
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
    titleBarStyle: isMac ? 'hidden' : 'default',
    frame: !isWin,
    icon: path.join(__dirname, '../../../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
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
  setupAutoUpdater()

  // Create main window (hidden initially)
  mainWindow = createMainWindow()
  mainWindow.hide()

  // Show landing window on first launch (no auth token yet)
  const hasToken = false // Will check localStorage in renderer
  if (!hasToken) {
    landingWindow = createLandingWindow()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }

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
    const url = argv.find((arg) => arg.startsWith('codeva://'))
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

// When auth completes via deep link, tear down the landing/sign-in windows.
;(app as unknown as NodeJS.EventEmitter).on('codeva:auth-complete', () => {
  if (landingWindow) { landingWindow.close(); landingWindow = null }
  if (loginWindow) { loginWindow.close(); loginWindow = null }
})

// Deep link on Windows/Linux (protocol argv)
app.on('ready', () => {
  const url = process.argv.find((arg) => arg.startsWith('codeva://'))
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

// Auth flow — Claude-desktop style:
//   landing → "Get started" opens the Sign In window
//   Sign In → opens the secure web auth in the browser
//   browser auth completes → deep-links back codeva://auth?token=...
//   → token delivered to main window, main window shown, auth windows closed.

ipcMain.handle('auth:open-signin', () => {
  if (!loginWindow) {
    loginWindow = createLoginWindow()
  } else {
    loginWindow.show()
    loginWindow.focus()
  }
  // Close the landing window once we move to sign-in.
  if (landingWindow) {
    landingWindow.close()
    landingWindow = null
  }
})

ipcMain.handle('auth:back-to-landing', () => {
  if (!landingWindow) landingWindow = createLandingWindow()
  else { landingWindow.show(); landingWindow.focus() }
  if (loginWindow) { loginWindow.close(); loginWindow = null }
})

ipcMain.handle('auth:open-login', (_event, opts?: { method?: string; email?: string }) => {
  // Open the web auth flow in the system browser. It redirects back to the
  // desktop via the codeva:// deep link once the user authenticates.
  const base = (process.env.CODEVA_WEB_URL || 'https://cybermindcli.info').replace(/\/$/, '')
  const params = new URLSearchParams({ redirect: 'desktop' })
  if (opts?.method) params.set('method', opts.method)
  if (opts?.email) params.set('email', opts.email)
  shell.openExternal(`${base}/login?${params.toString()}`)
})

ipcMain.handle('auth:complete', (_event, token: string) => {
  // Send token to main window renderer
  mainWindow?.webContents.send('auth:token', token)
  // Show main window
  mainWindow?.show()
  mainWindow?.focus()
  // Close landing/login windows
  if (landingWindow) { landingWindow.close(); landingWindow = null }
  if (loginWindow) { loginWindow.close(); loginWindow = null }
})

// Landing window: user clicked "Get Started" → go to sign-in (kept for compat)
ipcMain.handle('landing:open-main', () => {
  mainWindow?.show()
  mainWindow?.focus()
  if (landingWindow) { landingWindow.close(); landingWindow = null }
})

// Drag & Drop file handling
ipcMain.handle('dragdrop:read-files', async (_event, filePaths: string[]) => {
  const results = []
  for (const filePath of filePaths) {
    try {
      const stats = await fs.promises.stat(filePath)
      if (stats.isDirectory()) {
        // Read directory recursively
        const files = await fs.promises.readdir(filePath)
        results.push({ type: 'directory', path: filePath, files })
      } else {
        const content = await fs.promises.readFile(filePath, 'utf-8')
        const name = path.basename(filePath)
        results.push({ type: 'file', path: filePath, name, content, size: stats.size })
      }
    } catch (err) {
      results.push({ type: 'error', path: filePath, error: (err as Error).message })
    }
  }
  return { success: true, files: results }
})

// Auto-updater: restart and install
ipcMain.handle('update:restart', () => {
  autoUpdater.quitAndInstall()
})

// Auto-updater: manual check (from Settings/Profile "Check for updates")
ipcMain.handle('update:check', async () => {
  if (isDev) return { success: false, dev: true, message: 'Updates are disabled in development.' }
  try {
    const result = await autoUpdater.checkForUpdates()
    return { success: true, version: result?.updateInfo?.version }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
})

// Auto-updater: download now (when autoDownload is off or user opts in)
ipcMain.handle('update:download', async () => {
  if (isDev) return { success: false, dev: true }
  try {
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
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
  new Notification({ title, body, icon: path.join(__dirname, '../../../resources/icon.png') }).show()
})

// ─── Exports for other modules ───────────────────────────────

export { mainWindow, landingWindow, loginWindow }
