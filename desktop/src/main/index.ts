/**
 * Codeva Desktop — Main Process (v0.3.0)
 *
 * Simplified: Single window loads the deployed web app.
 * No separate landing/login windows — the React app handles auth.
 */

import { app, BrowserWindow, ipcMain, shell, dialog, Menu } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import pkg from 'electron-updater'
const { autoUpdater } = pkg

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Constants ──────────────────────────────────────────────

const isDev = process.env.NODE_ENV === 'development' || (!app.isPackaged && process.env.NODE_ENV !== 'production')
const isMac = process.platform === 'darwin'
const isWin = process.platform === 'win32'

// The deployed web app URL — this is the REAL frontend
const WEB_APP_URL = 'https://cybermindcli.info'
const FRONTEND_DEV_URL = 'http://localhost:5173'

// ─── State ────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null

// ─── Auto Updater ─────────────────────────────────────────────

function sendToMain(channel: string, payload?: unknown) {
  try { mainWindow?.webContents.send(channel, payload) } catch { /* window gone */ }
}

function setupAutoUpdater() {
  if (isDev) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => sendToMain('update:checking'))
  autoUpdater.on('update-available', (info: { version?: string; releaseNotes?: string | unknown }) => {
    sendToMain('update:available', { version: info?.version })
  })
  autoUpdater.on('update-not-available', () => sendToMain('update:none'))
  autoUpdater.on('download-progress', (p: { percent?: number }) => {
    sendToMain('update:progress', { percent: Math.round(p?.percent || 0) })
  })
  autoUpdater.on('error', (err: Error) => sendToMain('update:error', err?.message || 'Update failed'))
  autoUpdater.on('update-downloaded', (info: { version?: string }) => {
    sendToMain('update:downloaded', { version: info?.version })
  })

  autoUpdater.checkForUpdates().catch(() => {})
  setInterval(() => { autoUpdater.checkForUpdates().catch(() => {}) }, 3 * 60 * 60 * 1000)
}

// ─── Application Menu ───────────────────────────────────────

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New Chat', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('shortcut:new-chat') },
        { type: 'separator' },
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => {
          if (mainWindow) {
            mainWindow.show()
            mainWindow.loadURL(`${WEB_APP_URL}/app/settings`).catch(() => {})
          }
        }},
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ role: 'toggleDevTools' as const }] : []),
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const },
        ] : [
          { role: 'close' as const },
        ]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About Codeva', click: () => {
          dialog.showMessageBox({
            type: 'info',
            title: 'Codeva Desktop',
            message: `Codeva Desktop v${app.getVersion()}`,
            detail: 'AI-powered chat & coding assistant.\nhttps://cybermindcli.info',
          })
        }},
        { label: 'Check for Updates', click: () => {
          autoUpdater.checkForUpdates().catch(() => {
            dialog.showMessageBox({ type: 'info', title: 'Updates', message: 'Could not check for updates.' })
          })
        }},
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// ─── Window Factory ───────────────────────────────────────

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: true, // Always show native window controls
    backgroundColor: '#0A0A0F',
    icon: path.join(__dirname, '../../../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      allowRunningInsecureContent: false,
    },
  })

  // Load the web app
  const url = isDev ? FRONTEND_DEV_URL : WEB_APP_URL
  win.loadURL(url).catch(() => {
    // If web app fails (offline), show a simple error page
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html><head><style>
        body { background: #0A0A0F; color: #f5f4f2; font-family: -apple-system, sans-serif;
               display: flex; flex-direction: column; align-items: center; justify-content: center;
               height: 100vh; margin: 0; text-align: center; }
        h2 { color: #d97757; margin-bottom: 16px; }
        p { color: #a3a097; margin-bottom: 24px; max-width: 400px; }
        button { background: #f5f4f2; color: #1a1a1a; border: none; padding: 12px 32px;
                 border-radius: 10px; font-size: 15px; cursor: pointer; font-family: inherit; }
        button:hover { background: #fff; }
      </style></head><body>
        <h2>Unable to Connect</h2>
        <p>Could not reach the Codeva servers. Please check your internet connection and try again.</p>
        <button onclick="location.reload()">Retry</button>
      </body></html>
    `)}`)
  })

  // Show when ready
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

  // Inject desktop-specific CSS
  win.webContents.on('dom-ready', () => {
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

// ─── App Lifecycle ──────────────────────────────────────────

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

app.whenReady().then(() => {
  buildMenu()
  setupAutoUpdater()

  // Create the one and only window
  mainWindow = createMainWindow()

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
  if (!isMac) {
    app.quit()
  }
})

// ─── IPC Handlers ───────────────────────────────────────────

// Window controls
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('window:close', () => mainWindow?.close())
ipcMain.handle('window:hide', () => mainWindow?.hide())
ipcMain.handle('window:show', () => { mainWindow?.show(); mainWindow?.focus() })

// Auto-updater IPC
ipcMain.handle('update:restart', () => autoUpdater.quitAndInstall())
ipcMain.handle('update:check', async () => {
  if (isDev) return { success: false, dev: true, message: 'Updates are disabled in development.' }
  try {
    const result = await autoUpdater.checkForUpdates()
    return { success: true, version: result?.updateInfo?.version }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
})
ipcMain.handle('update:download', async () => {
  if (isDev) return { success: false, dev: true }
  try {
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
})

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

// Drag & Drop file handling
ipcMain.handle('dragdrop:read-files', async (_event, filePaths: string[]) => {
  const results = []
  for (const filePath of filePaths) {
    try {
      const stats = await fs.promises.stat(filePath)
      if (stats.isDirectory()) {
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

export { mainWindow }
