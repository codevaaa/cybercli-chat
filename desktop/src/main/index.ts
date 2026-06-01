/**
 * Codeva Desktop — Main Process (v0.4.0)
 *
 * Claude-style native desktop app:
 * Landing → Sign In → Browser Auth → Deep Link → Desktop Chat
 */

import { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, nativeImage } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import pkg from 'electron-updater'
const { autoUpdater } = pkg

// ─── Constants ──────────────────────────────────────────────

const isDev = !app.isPackaged
const isMac = process.platform === 'darwin'
const isWin = process.platform === 'win32'

// Paths — use app.getAppPath() for reliable resolution in asar
const APP_ROOT = app.getAppPath()
const DIST_DIR = path.join(APP_ROOT, 'dist')
const PRELOAD_PATH = path.join(DIST_DIR, 'preload', 'index.mjs')
const RENDERER_DIR = path.join(DIST_DIR, 'renderer')
const RESOURCES_DIR = path.join(APP_ROOT, 'resources')

// Web app URL for main chat window
const WEB_APP_URL = 'https://cybermindcli.info'
const WEB_AUTH_URL = 'https://cybermindcli.info/auth/login'
const FRONTEND_DEV_URL = 'http://localhost:5173'

// ─── State ────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null
let landingWindow: BrowserWindow | null = null
let loginWindow: BrowserWindow | null = null

// ─── Prevent multiple instances ─────────────────────────────

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

// ─── Window controls (custom titlebar buttons) ──────────────

function getWindowControlsForWindow(win: BrowserWindow | null) {
  return {
    minimize: () => win?.minimize(),
    maximize: () => {
      if (win?.isMaximized()) win.unmaximize()
      else win?.maximize()
    },
    close: () => win?.close(),
  }
}

// ─── Window Factories ───────────────────────────────────────

function createLandingWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 520,
    height: 640,
    resizable: false,
    maximizable: false,
    minimizable: true,
    show: false,
    frame: false,
    backgroundColor: '#1f1e1d',
    icon: path.join(RESOURCES_DIR, 'icon.png'),
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const landingPath = path.join(RENDERER_DIR, 'landing.html')
  console.log('[Codeva] Loading landing from:', landingPath)
  console.log('[Codeva] Preload path:', PRELOAD_PATH)
  console.log('[Codeva] File exists:', fs.existsSync(landingPath))
  
  win.loadFile(landingPath).catch((err) => {
    console.error('[Codeva] Failed to load landing:', err)
  })

  win.once('ready-to-show', () => win.show())

  win.webContents.on('did-finish-load', () => {
    console.log('[Codeva] Landing page loaded successfully')
  })

  return win
}

function createLoginWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 480,
    height: 600,
    resizable: false,
    maximizable: false,
    show: false,
    frame: false,
    backgroundColor: '#1f1e1d',
    icon: path.join(RESOURCES_DIR, 'icon.png'),
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const loginPath = path.join(RENDERER_DIR, 'login.html')
  win.loadFile(loginPath).catch((err) => {
    console.error('[Codeva] Failed to load login:', err)
  })

  win.once('ready-to-show', () => win.show())
  return win
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    backgroundColor: '#0A0A0F',
    icon: path.join(RESOURCES_DIR, 'icon.png'),
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Load the web app for the chat interface
  const url = isDev ? FRONTEND_DEV_URL : WEB_APP_URL
  win.loadURL(url).catch(() => {
    // Offline fallback
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html><head><style>
        body { background: #0A0A0F; color: #f5f4f2; font-family: -apple-system, sans-serif;
               display: flex; flex-direction: column; align-items: center; justify-content: center;
               height: 100vh; margin: 0; text-align: center; }
        h2 { color: #d97757; margin-bottom: 16px; }
        p { color: #a3a097; margin-bottom: 24px; max-width: 400px; }
        button { background: #f5f4f2; color: #1a1a1a; border: none; padding: 12px 32px;
                 border-radius: 10px; font-size: 15px; cursor: pointer; }
        button:hover { background: #fff; }
      </style></head><body>
        <h2>Unable to Connect</h2>
        <p>Could not reach the Codeva servers. Please check your internet connection.</p>
        <button onclick="location.reload()">Retry</button>
      </body></html>
    `)}`)
  })

  win.once('ready-to-show', () => {
    win.show()
    win.focus()
  })

  // External links open in system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http') && !url.includes('cybermindcli.info') && !url.includes('localhost')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  return win
}

// ─── App Lifecycle ──────────────────────────────────────────

app.whenReady().then(() => {
  console.log('[Codeva] App ready. isDev:', isDev, 'isPackaged:', app.isPackaged)
  console.log('[Codeva] APP_ROOT:', APP_ROOT)
  console.log('[Codeva] PRELOAD_PATH:', PRELOAD_PATH)
  
  // Set up protocol for deep links
  if (!isDev) {
    app.setAsDefaultProtocolClient('codeva')
  }

  // Show landing window first (Claude-style)
  landingWindow = createLandingWindow()

  // Auto-updater
  if (!isDev) {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.checkForUpdates().catch(() => {})
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      landingWindow = createLandingWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (!isMac) app.quit()
})

// Second instance handling (for deep links)
if (gotTheLock) {
  app.on('second-instance', (_event, argv) => {
    // Check for deep link
    const url = argv.find((arg) => arg.startsWith('codeva://'))
    if (url) {
      handleDeepLink(url)
    }
    // Focus existing window
    const focusWin = mainWindow || landingWindow || loginWindow
    if (focusWin) {
      if (focusWin.isMinimized()) focusWin.restore()
      focusWin.show()
      focusWin.focus()
    }
  })
}

// Deep link on macOS
app.on('open-url', (event, url) => {
  event.preventDefault()
  handleDeepLink(url)
})

// Deep link handler
function handleDeepLink(url: string) {
  console.log('[Codeva] Deep link received:', url)
  try {
    const parsed = new URL(url)
    if (parsed.pathname === '//auth' || parsed.pathname === '/auth') {
      const token = parsed.searchParams.get('token')
      if (token) {
        completeAuth(token)
      }
    }
  } catch (err) {
    console.error('[Codeva] Failed to parse deep link:', err)
  }
}

function completeAuth(token: string) {
  console.log('[Codeva] Auth complete, token received')
  
  // Close landing and login windows
  if (landingWindow && !landingWindow.isDestroyed()) {
    landingWindow.close()
    landingWindow = null
  }
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.close()
    loginWindow = null
  }

  // Create main window if not exists
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow()
  }

  // Send token to main window once loaded
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow?.webContents.send('auth:token', token)
  })
  
  mainWindow.show()
  mainWindow.focus()
}

// ─── IPC Handlers ───────────────────────────────────────────

// Window controls — detect which window sent the message
ipcMain.handle('window:minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win?.minimize()
})

ipcMain.handle('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win?.isMaximized()) win.unmaximize()
  else win?.maximize()
})

ipcMain.handle('window:close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win?.close()
})

// Auth flow: Landing → Sign In
ipcMain.handle('auth:open-signin', () => {
  console.log('[Codeva] IPC: auth:open-signin received')
  
  if (!loginWindow || loginWindow.isDestroyed()) {
    loginWindow = createLoginWindow()
  } else {
    loginWindow.show()
    loginWindow.focus()
  }

  // Close landing
  if (landingWindow && !landingWindow.isDestroyed()) {
    landingWindow.close()
    landingWindow = null
  }
})

// Auth flow: Sign In → Back to Landing
ipcMain.handle('auth:back-to-landing', () => {
  console.log('[Codeva] IPC: auth:back-to-landing received')
  
  if (!landingWindow || landingWindow.isDestroyed()) {
    landingWindow = createLandingWindow()
  } else {
    landingWindow.show()
    landingWindow.focus()
  }

  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.close()
    loginWindow = null
  }
})

// Auth flow: Open browser for auth
ipcMain.handle('auth:open-login', (_event, opts?: { method?: string; email?: string }) => {
  console.log('[Codeva] IPC: auth:open-login, method:', opts?.method)
  
  const base = WEB_AUTH_URL
  const params = new URLSearchParams({ redirect: 'desktop' })
  if (opts?.method) params.set('method', opts.method)
  if (opts?.email) params.set('email', opts.email)
  shell.openExternal(`${base}?${params.toString()}`)
})

// Auth flow: Complete (from deep link)
ipcMain.handle('auth:complete', (_event, token: string) => {
  completeAuth(token)
})

// Landing → skip auth, go directly to main
ipcMain.handle('landing:open-main', () => {
  console.log('[Codeva] IPC: landing:open-main received')
  
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow()
  }
  mainWindow.show()
  mainWindow.focus()

  if (landingWindow && !landingWindow.isDestroyed()) {
    landingWindow.close()
    landingWindow = null
  }
})

// App info
ipcMain.handle('app:get-info', () => ({
  version: app.getVersion(),
  platform: process.platform,
  isPackaged: app.isPackaged,
}))

// File system
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
  const win = mainWindow || landingWindow
  if (!win) return { success: false, error: 'No window' }
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
  })
  if (result.canceled) return { success: false, canceled: true }
  const content = await fs.promises.readFile(result.filePaths[0], 'utf-8')
  return { success: true, path: result.filePaths[0], content }
})

// Drag & drop
ipcMain.handle('dragdrop:read-files', async (_event, filePaths: string[]) => {
  const results = []
  for (const fp of filePaths) {
    try {
      const stats = await fs.promises.stat(fp)
      if (stats.isDirectory()) {
        const files = await fs.promises.readdir(fp)
        results.push({ type: 'directory', path: fp, files })
      } else {
        const content = await fs.promises.readFile(fp, 'utf-8')
        results.push({ type: 'file', path: fp, name: path.basename(fp), content, size: stats.size })
      }
    } catch (err) {
      results.push({ type: 'error', path: fp, error: (err as Error).message })
    }
  }
  return { success: true, files: results }
})

// Notifications
ipcMain.handle('notify:show', (_event, title: string, body: string) => {
  const { Notification } = require('electron')
  new Notification({ title, body }).show()
})

// Auto-updater
ipcMain.handle('update:restart', () => autoUpdater.quitAndInstall())
ipcMain.handle('update:check', async () => {
  try {
    const result = await autoUpdater.checkForUpdates()
    return { success: true, version: result?.updateInfo?.version }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
})

export { mainWindow }
