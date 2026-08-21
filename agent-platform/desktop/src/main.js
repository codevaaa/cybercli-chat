/**
 * CodeVaa Agent Manager — Electron Main Process
 *
 * Architecture:
 *   1. Spawns the agent-platform server as a child process
 *   2. Waits for platform to become healthy
 *   3. Opens the BrowserWindow loading the React UI
 *   4. Cleans up child processes on exit
 *   5. System tray with quick-run input
 */
import { app, BrowserWindow, Tray, Menu, shell, ipcMain, dialog } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname    = path.dirname(fileURLToPath(import.meta.url))
const isDev        = process.env.NODE_ENV === 'development'
const PLATFORM_URL = 'http://localhost:4000'
const UI_URL       = isDev
  ? 'http://localhost:5174'
  : `file://${path.join(process.resourcesPath || __dirname, isDev ? '../../ui-dist' : '../ui-dist', 'index.html')}`

let mainWindow = null
let tray       = null
let platformProcess = null

// ── Platform Server ────────────────────────────────────────────────────────

function startPlatformServer() {
  const platformEntry = path.join(__dirname, '../../src/index.js')
  if (!fs.existsSync(platformEntry)) {
    console.warn('[Desktop] Platform entry not found:', platformEntry)
    return
  }

  platformProcess = spawn(process.execPath, [platformEntry], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production' },
  })

  platformProcess.stdout?.on('data', d => console.log('[Platform]', d.toString().trim()))
  platformProcess.stderr?.on('data', d => console.error('[Platform]', d.toString().trim()))
  platformProcess.on('exit', (code) => {
    console.log(`[Platform] exited with code ${code}`)
    platformProcess = null
  })
}

async function waitForPlatform(maxWait = 15000) {
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    try {
      const res = await fetch(`${PLATFORM_URL}/health`, { signal: AbortSignal.timeout(1000) })
      if (res.ok) return true
    } catch {}
    await new Promise(r => setTimeout(r, 500))
  }
  return false
}

// ── Window ─────────────────────────────────────────────────────────────────

async function createWindow() {
  mainWindow = new BrowserWindow({
    width:           1200,
    height:          800,
    minWidth:        800,
    minHeight:       600,
    backgroundColor: '#0A0A0F',
    titleBarStyle:   process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame:           true,
    show:            false,
    webPreferences: {
      preload:         path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      webSecurity:      true,
    },
    icon: path.join(__dirname, '../assets/icon.png'),
  })

  // Show splash while platform starts
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show()
  })

  mainWindow.loadURL(UI_URL)

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.on('closed', () => { mainWindow = null })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url)
    return { action: 'deny' }
  })
}

// ── Tray ───────────────────────────────────────────────────────────────────

function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png')
  if (!fs.existsSync(iconPath)) return

  tray = new Tray(iconPath)
  tray.setToolTip('CodeVaa Agent Manager')

  const menu = Menu.buildFromTemplate([
    { label: 'Open Agent Manager', click: () => mainWindow?.show() || createWindow() },
    { type: 'separator' },
    { label: 'Platform Status',    click: () => shell.openExternal(PLATFORM_URL + '/health') },
    { type: 'separator' },
    { label: 'Quit CodeVaa',       click: () => app.quit() },
  ])
  tray.setContextMenu(menu)
  tray.on('double-click', () => mainWindow?.show())
}

// ── IPC ────────────────────────────────────────────────────────────────────

ipcMain.handle('platform:status', async () => {
  try {
    const res = await fetch(`${PLATFORM_URL}/health`)
    return { online: res.ok }
  } catch {
    return { online: false }
  }
})

ipcMain.handle('platform:openProject', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Project Directory',
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('app:getVersion', () => app.getVersion())

// ── App Lifecycle ──────────────────────────────────────────────────────────

app.on('ready', async () => {
  // Start embedded platform server
  startPlatformServer()

  // Wait a moment for platform to start
  await new Promise(r => setTimeout(r, 1500))

  createWindow()
  createTray()
})

app.on('window-all-closed', () => {
  // On macOS, keep app running in tray
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (!mainWindow) createWindow()
})

app.on('before-quit', () => {
  if (platformProcess) {
    platformProcess.kill('SIGTERM')
  }
})

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}
