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

// Resolve the packaged UI index.html.
// electron-builder copies ../ui-dist → resources/ui-dist (see extraResources).
function resolveUiPath() {
  if (isDev) return 'http://localhost:5174'
  const candidates = [
    path.join(process.resourcesPath || '', 'ui-dist', 'index.html'),
    path.join(__dirname, '..', 'ui-dist', 'index.html'),
    path.join(__dirname, '..', '..', 'ui-dist', 'index.html'),
    path.join(app.getAppPath(), '..', 'ui-dist', 'index.html'),
  ]
  for (const c of candidates) {
    try { if (c && fs.existsSync(c)) return c } catch {}
  }
  // Last resort — return the most likely path even if check failed
  return candidates[0]
}

let mainWindow = null
let tray       = null
let platformProcess = null
let autoUpdater = null

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

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show()
  })

  // If the UI fails to load, show a helpful fallback instead of a blank screen
  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDesc, validatedURL) => {
    console.error('[Desktop] UI failed to load:', errorCode, errorDesc, validatedURL)
    mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
      <html><body style="margin:0;background:#0A0A0F;color:#ECECEC;font-family:system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center">
        <div style="width:56px;height:56px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#E8A590,#D97757);margin-bottom:16px"></div>
        <h2 style="margin:0 0 8px">CodeVaa Agent Platform</h2>
        <p style="color:#8b8b93;max-width:420px;line-height:1.6">The interface could not load. Reinstall the app or contact support.</p>
        <p style="color:#555;font-size:12px;margin-top:20px">${errorDesc}</p>
      </body></html>`))
    mainWindow.show()
  })

  const uiPath = resolveUiPath()
  if (isDev) {
    mainWindow.loadURL(uiPath)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    // loadFile handles local paths + relative assets correctly
    mainWindow.loadFile(uiPath).catch(err => {
      console.error('[Desktop] loadFile failed:', err)
    })
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

// ── Auto Updater ─────────────────────────────────────────────────────────────

async function initAutoUpdater() {
  try {
    const pkg = await import('electron-updater')
    autoUpdater = pkg.autoUpdater || pkg.default?.autoUpdater
    if (!autoUpdater) return

    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.allowPrerelease = false

    autoUpdater.on('update-available', (info) => {
      console.log('[Updater] Update available:', info?.version)
      // Prompt the user
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info?.version}) of CodeVaa Agent Platform is available.`,
        detail: 'Would you like to download it now?',
        buttons: ['Download', 'Later'],
        defaultId: 0,
      }).then(({ response }) => {
        if (response === 0) autoUpdater.downloadUpdate().catch(e => console.error('[Updater] download failed', e))
      })
    })

    autoUpdater.on('download-progress', (p) => {
      if (mainWindow) mainWindow.setProgressBar((p.percent || 0) / 100)
    })

    autoUpdater.on('update-downloaded', (info) => {
      if (mainWindow) mainWindow.setProgressBar(-1)
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: `Version ${info?.version} has been downloaded.`,
        detail: 'Restart the app to apply the update.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
      }).then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall()
      })
    })

    autoUpdater.on('error', (err) => {
      const msg = err?.message || String(err)
      // Suppress "no release" / network errors silently
      if (/404|latest|ENOTFOUND|ETIMEDOUT|net::ERR|Cannot find/i.test(msg)) return
      console.error('[Updater] Error:', msg)
    })

    // Check on startup (deferred) then every 4 hours
    const check = () => autoUpdater.checkForUpdates().catch(() => {})
    setTimeout(check, 10000)
    setInterval(check, 4 * 60 * 60 * 1000)
  } catch (err) {
    console.error('[Updater] Failed to init:', err.message)
  }
}

// ── App Lifecycle ──────────────────────────────────────────────────────────

app.on('ready', async () => {
  // In dev, start the embedded platform server. In production, the UI connects
  // to the hosted backend (cybercli-api.onrender.com) — no local server needed.
  if (isDev) {
    startPlatformServer()
    await new Promise(r => setTimeout(r, 1500))
  }

  createWindow()
  createTray()

  // Initialize auto-updater (production only)
  if (!isDev) {
    initAutoUpdater()
  }
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
