import { app, BrowserWindow, clipboard, contentTracing, dialog, ipcMain, safeStorage, shell, type WebContents } from 'electron'
import electronUpdater, { type NsisUpdater } from 'electron-updater'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import * as pty from '@homebridge/node-pty-prebuilt-multiarch'
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { CodicRuntimeBridge } from './runtime-bridge.js'
import { CodicLocalStore } from './local-store.js'
import { findCodicAuthCallback, parseCodicAuthCallback } from '../shared/authHandoff.js'
import { listThreadSummaries, loadThreadHistory } from './history.js'
import { toCodicApiPlatform } from './device-platform.js'
import { readWorkspaceDiff, runWorkspaceCommand } from './workspace-tools.js'
import { SecretScanner } from '../../../../cybercoder/packages/codic-runtime/src/shared-bridge.js'
import type { CodicDiagnostics, CodicModelCatalog, CodicRuntimeEvent, CodicRuntimeEventEnvelope, CodicUpdateCheck, EditAction } from '../shared/contracts.js'

declare const __CODIC_LOCAL_PREVIEW_ENABLED__: boolean

const { autoUpdater } = electronUpdater

const isDevelopment = !app.isPackaged
const devRendererUrl = process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173'
const apiRoot = (process.env.CODEVA_API_BASE_URL || 'https://cybercli-api.onrender.com').replace(/\/+$/, '')
const apiBase = apiRoot.endsWith('/api/v1') ? apiRoot : `${apiRoot}/api/v1`
const authStoragePath = () => path.join(app.getPath('userData'), 'auth-store.bin')
const handoffVerifierPath = () => path.join(app.getPath('userData'), 'auth-handoff.bin')
const deviceIdPath = () => path.join(app.getPath('userData'), 'device-id')
const terminalSessions = new Map<string, { terminal: pty.IPty; owner: WebContents; projectPath: string }>()
let mainWindow: BrowserWindow | null = null
const taskWindowOwners = new Map<string, BrowserWindow>()
let pendingAuthCallback: string | null = null
let runtimeBridge: CodicRuntimeBridge | null = null
let localStore: CodicLocalStore | null = null
let schedulePollTimer: NodeJS.Timeout | null = null
let browserWindow: BrowserWindow | null = null
let performanceTraceRunning = false
let localPreviewAccessGranted = false
const ephemeralTaskIds = new Set<string>()

let codicUpdateState: CodicUpdateCheck = {
  currentVersion: app.getVersion(), latestVersion: null, available: false, downloadPath: '/downloads/codic',
  message: 'Update check has not run yet.', phase: 'idle', percent: null, transferredBytes: null, totalBytes: null, bytesPerSecond: null,
}

const emitUpdateState = (update: Partial<CodicUpdateCheck>) => {
  codicUpdateState = { ...codicUpdateState, ...update, currentVersion: app.getVersion() }
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('codic:update-state', codicUpdateState)
  }
  return codicUpdateState
}

const configureAutoUpdater = () => {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.allowDowngrade = false
  // Preview installers are unsigned. HTTPS and the release manifest checksum
  // are verified by electron-updater; publisher-signature verification is not available yet.
  if (process.platform === 'win32') (autoUpdater as NsisUpdater).verifyUpdateCodeSignature = async () => null
  autoUpdater.setFeedURL({ provider: 'generic', url: `${apiBase}/downloads/codic/updates/` })

  autoUpdater.on('checking-for-update', () => emitUpdateState({
    phase: 'checking', available: false, latestVersion: null, percent: null, transferredBytes: null, totalBytes: null,
    bytesPerSecond: null, message: 'Checking the Codeva release service…',
  }))
  autoUpdater.on('update-available', (info) => emitUpdateState({
    phase: 'available', available: true, latestVersion: info.version, percent: 0, transferredBytes: 0, totalBytes: null,
    bytesPerSecond: 0, message: `Codic ${info.version} is available. Downloading in the background…`,
  }))
  autoUpdater.on('update-not-available', (info) => emitUpdateState({
    phase: 'not-available', available: false, latestVersion: info.version, percent: null, transferredBytes: null, totalBytes: null,
    bytesPerSecond: null, message: `Codic ${app.getVersion()} is up to date.`,
  }))
  autoUpdater.on('download-progress', (progress) => emitUpdateState({
    phase: 'downloading', available: true, percent: Math.max(0, Math.min(100, progress.percent)),
    transferredBytes: progress.transferred, totalBytes: progress.total, bytesPerSecond: progress.bytesPerSecond,
    message: `Downloading Codic ${codicUpdateState.latestVersion || ''}… ${Math.round(progress.percent)}%`,
  }))
  autoUpdater.on('update-downloaded', (info) => emitUpdateState({
    phase: 'downloaded', available: true, latestVersion: info.version, percent: 100,
    transferredBytes: codicUpdateState.totalBytes, bytesPerSecond: 0,
    message: `Codic ${info.version} is downloaded and ready to install.`,
  }))
  autoUpdater.on('error', (error) => emitUpdateState({
    phase: 'error', available: false, percent: null, transferredBytes: null, totalBytes: null, bytesPerSecond: null,
    message: `Update failed: ${String(error.message || 'The release service could not complete the update.').slice(0, 220)}`,
  }))
}

const checkForCodicUpdates = async () => {
  if (process.platform !== 'win32') return emitUpdateState({
    phase: 'unsupported', available: false, latestVersion: null, percent: null, transferredBytes: null, totalBytes: null,
    bytesPerSecond: null, message: 'Automatic updates are available for Windows preview builds. Download the latest installer for this platform.',
  })
  if (!app.isPackaged) return emitUpdateState({
    phase: 'unsupported', available: false, latestVersion: null, message: 'Package Codic for Windows to check its release update feed.',
  })
  if (codicUpdateState.phase === 'checking' || codicUpdateState.phase === 'downloading') return codicUpdateState
  try {
    const result = await autoUpdater.checkForUpdates()
    if (!result && (codicUpdateState.phase as CodicUpdateCheck['phase']) === 'checking') {
      return emitUpdateState({ phase: 'not-available', available: false, message: `Codic ${app.getVersion()} is up to date.` })
    }
    return codicUpdateState
  } catch (error) {
    return emitUpdateState({
      phase: 'error', available: false, percent: null, transferredBytes: null, totalBytes: null, bytesPerSecond: null,
      message: `Could not check for updates: ${String(error instanceof Error ? error.message : 'The release service is unavailable.').slice(0, 220)}`,
    })
  }
}

const getExpectedRendererPath = () => path.resolve(app.getAppPath(), 'dist/renderer/index.html')

const requireSavedProject = (workspacePath: unknown) => {
  if (typeof workspacePath !== 'string' || !workspacePath.trim() || workspacePath.includes('\0')) throw new Error('Choose a saved project folder first.')
  const canonicalPath = realpathSync(path.resolve(workspacePath))
  const project = localStore?.findProjectByPath(canonicalPath)
  if (!project) throw new Error('Open this project in Codic before using workspace tools.')
  return project
}

const requireSafeProjectFile = (projectRoot: string, filePath: string) => {
  if (!filePath.trim() || filePath.includes('\0') || path.isAbsolute(filePath)) throw new Error('Choose a valid project-relative file path.')
  const absolute = path.resolve(projectRoot, filePath)
  const relativePath = path.relative(projectRoot, absolute)
  if (relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) throw new Error('Review comments must stay inside the selected project.')
  let existing = absolute
  while (!existsSync(existing)) {
    const parent = path.dirname(existing)
    if (parent === existing) throw new Error('The review file path could not be verified.')
    existing = parent
  }
  const canonicalExisting = realpathSync(existing)
  const inside = path.relative(projectRoot, canonicalExisting)
  if (inside === '..' || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) throw new Error('Review comments must stay inside the selected project.')
  return relativePath.replace(/\\/g, '/')
}

const isTrustedSender = (event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent) => {
  const frame = event.senderFrame
  if (!frame || frame !== event.sender.mainFrame) return false
  try {
    const url = new URL(frame.url)
    if (isDevelopment) return url.origin === new URL(devRendererUrl).origin
    return url.protocol === 'file:' && path.resolve(fileURLToPath(url)) === getExpectedRendererPath()
  } catch {
    return false
  }
}

const assertTrustedSender = (event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent) => {
  if (!isTrustedSender(event)) throw new Error('This Codic request did not come from the trusted app window.')
}

const readSession = (): Record<string, unknown> | null => {
  const file = authStoragePath()
  if (!existsSync(file)) return null
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure token storage is unavailable on this device.')
  try {
    const decoded = safeStorage.decryptString(readFileSync(file))
    const value: unknown = JSON.parse(decoded)
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
  } catch {
    return null
  }
}

const readAccessToken = () => {
  const session = readSession()
  return typeof session?.access_token === 'string' ? session.access_token : null
}

const storeAuthValue = (key: string, value: string | null) => {
  if (key !== 'codic-auth') throw new Error('Unsupported secure-storage key.')
  const file = authStoragePath()
  const directory = path.dirname(file)
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure token storage is unavailable on this device.')
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  if (value === null) {
    try { unlinkSync(file) } catch { /* Missing credential file already means signed out. */ }
    return
  }
  const temporaryPath = `${file}.${randomUUID()}.tmp`
  writeFileSync(temporaryPath, safeStorage.encryptString(value), { mode: 0o600 })
  renameSync(temporaryPath, file)
}

const saveHandoffVerifier = (verifier: string) => {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure token storage is unavailable on this device.')
  const file = handoffVerifierPath()
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
  const temporaryPath = `${file}.${randomUUID()}.tmp`
  writeFileSync(temporaryPath, safeStorage.encryptString(verifier), { mode: 0o600 })
  renameSync(temporaryPath, file)
}

const consumeHandoffVerifier = () => {
  const file = handoffVerifierPath()
  if (!existsSync(file)) throw new Error('The Codic sign-in request expired. Start sign-in again.')
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure token storage is unavailable on this device.')
  try {
    const verifier = safeStorage.decryptString(readFileSync(file))
    unlinkSync(file)
    if (!/^[A-Za-z0-9_-]{43}$/.test(verifier)) throw new Error('Invalid sign-in request.')
    return verifier
  } catch {
    try { unlinkSync(file) } catch { /* The request is already unavailable. */ }
    throw new Error('The Codic sign-in request expired. Start sign-in again.')
  }
}

const requireAccessToken = () => {
  const token = readAccessToken()
  if (!token) throw new Error('Sign in to your Codeva account to use Codic’s model service.')
  return token
}

const assertSignedInSender = (event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent) => {
  assertTrustedSender(event)
  if (__CODIC_LOCAL_PREVIEW_ENABLED__ && localPreviewAccessGranted) return
  requireAccessToken()
}

const requestJson = async <T>(pathName: string, method: 'GET' | 'POST' | 'DELETE', body?: unknown): Promise<T> => {
  const token = requireAccessToken()
  const response = await fetch(`${apiBase}/${pathName}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  })
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) {
    const message = typeof payload.error === 'string' ? payload.error : `Codeva returned HTTP ${response.status}.`
    throw new Error(message)
  }
  return payload as T
}

const terminalEnvironment = (): NodeJS.ProcessEnv => {
  const names = process.platform === 'win32'
    ? ['PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA', 'OS', 'PROCESSOR_ARCHITECTURE']
    : ['PATH', 'HOME', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'TMPDIR']
  const environment: NodeJS.ProcessEnv = {}
  for (const name of names) {
    const value = process.env[name]
    if (value) environment[name] = value
  }
  environment.TERM = 'xterm-256color'
  environment.COLORTERM = 'truecolor'
  return environment
}

const terminalShell = () => process.platform === 'win32'
  ? { file: 'powershell.exe', args: ['-NoLogo', '-NoProfile'] }
  : existsSync('/bin/zsh') ? { file: '/bin/zsh', args: ['-l'] }
    : existsSync('/bin/bash') ? { file: '/bin/bash', args: ['-l'] }
      : { file: '/bin/sh', args: ['-l'] }

const getOwnedTerminal = (event: Electron.IpcMainInvokeEvent, sessionId: unknown) => {
  if (typeof sessionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(sessionId)) throw new Error('Choose a valid terminal session.')
  const session = terminalSessions.get(sessionId)
  if (!session || session.owner !== event.sender) throw new Error('That terminal is closed or belongs to another Codic window.')
  return session
}

const redeemCodicAuthHandoff = async (ticket: string, verifier: string) => {
  const response = await fetch(`${apiBase}/codic/auth-handoffs/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket, verifier }),
    signal: AbortSignal.timeout(30_000),
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({})) as { error?: unknown; session?: unknown }
  if (!response.ok || !payload.session || typeof payload.session !== 'object') {
    const message = response.status === 404
      ? 'This Codeva server does not have Codic sign-in enabled yet. Update the Codeva service and start sign-in again.'
      : typeof payload.error === 'string' ? payload.error : `Codeva returned HTTP ${response.status}.`
    throw new Error(message)
  }
  const session = payload.session as Record<string, unknown>
  if (typeof session.access_token !== 'string' || typeof session.refresh_token !== 'string') throw new Error('Codeva returned an invalid sign-in session.')
  return { access_token: session.access_token, refresh_token: session.refresh_token }
}

const getDeviceId = () => {
  const file = deviceIdPath()
  try {
    const value = readFileSync(file, 'utf8').trim()
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return value
  } catch {
    // Create a stable identifier for this installation when missing or invalid.
  }
  const id = randomUUID()
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
  writeFileSync(file, id, { mode: 0o600 })
  return id
}

const registerDevice = async () => {
  const deviceId = getDeviceId()
  const platform = toCodicApiPlatform(process.platform)
  await requestJson('codic/devices', 'POST', {
    deviceId,
    platform,
    appVersion: app.getVersion(),
    displayName: `${app.getName()} on ${platform}`,
  })
}

const revokeDevice = async () => {
  const deviceId = getDeviceId()
  await requestJson(`codic/devices/${encodeURIComponent(deviceId)}`, 'DELETE')
}

const emitRuntimeEvent = (event: CodicRuntimeEvent, taskId: string) => {
  const owner = taskWindowOwners.get(taskId)
  if (owner && !owner.isDestroyed()) owner.webContents.send('codic:runtime-event', { event, taskId } satisfies CodicRuntimeEventEnvelope)
  if (event.type === 'run_finished') taskWindowOwners.delete(taskId)
}

const redactHistoryValue = (value: unknown, depth = 0): unknown => {
  if (depth > 8) return '[omitted]'
  if (typeof value === 'string') {
    return SecretScanner.redact(value)
      .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
      .replace(/\b(?:ghp_|github_pat_|sk-|gsk_|sb_secret_)[A-Za-z0-9_-]{12,}/g, '[redacted credential]')
      .replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[redacted token]')
      .replace(/((?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)\s*[:=]\s*)(["']?)[^\s,"'}]+/gi, '$1$2[redacted]')
  }
  if (Array.isArray(value)) return value.slice(0, 200).map((item) => redactHistoryValue(item, depth + 1))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 200).map(([key, item]) => [key, redactHistoryValue(item, depth + 1)]))
  }
  return value
}

const handleDeepLink = (value: string) => {
  const callback = parseCodicAuthCallback(value)
  if (!callback) return
  const target = mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()
    ? mainWindow
    : BrowserWindow.getAllWindows().find((window) => !window.isDestroyed() && !window.webContents.isDestroyed())
  if (target) {
    if (target.isMinimized()) target.restore()
    target.show()
    target.focus()
    target.webContents.send('codic:auth-callback', callback)
  } else pendingAuthCallback = callback
}

const protocolLock = app.requestSingleInstanceLock()
app.setName('Codic')
if (process.platform === 'win32') app.setAppUserModelId('com.codeva.codic')
if (!protocolLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine) => {
    const url = findCodicAuthCallback(commandLine)
    if (url) handleDeepLink(url)
    const target = mainWindow && !mainWindow.isDestroyed()
      ? mainWindow
      : BrowserWindow.getAllWindows().find((window) => !window.isDestroyed())
    if (target?.isMinimized()) target.restore()
    target?.focus()
  })

  if (process.platform === 'darwin') {
    app.on('open-url', (event, url) => {
      event.preventDefault()
      handleDeepLink(url)
    })
  }

  const startupCallback = findCodicAuthCallback(process.argv)
  if (startupCallback) handleDeepLink(startupCallback)

  const createWindow = async (initialThread?: { workspacePath: string; threadId: string }, options: { makeMain?: boolean; empty?: boolean } = {}) => {
    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, 'icon.ico')
      : path.join(app.getAppPath(), 'assets', 'brand', 'codic-icon.ico')
    const window = new BrowserWindow({
      width: 1480,
      height: 940,
      minWidth: 360,
      minHeight: 540,
      show: false,
      frame: false,
      backgroundColor: '#10110f',
      title: 'Codic',
      icon: process.platform === 'win32' && existsSync(iconPath) ? iconPath : undefined,
      webPreferences: {
        preload: path.join(app.getAppPath(), 'dist/preload/index.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
    })

    if (!initialThread && options.makeMain !== false) mainWindow = window
    window.webContents.setWindowOpenHandler(({ url }) => {
      try {
        const parsed = new URL(url)
        if (parsed.protocol === 'https:') void shell.openExternal(parsed.toString())
      } catch {
        // Reject malformed links.
      }
      return { action: 'deny' }
    })
    window.webContents.on('will-navigate', (event, navigationUrl) => {
      try {
        const nextUrl = new URL(navigationUrl)
        const allowed = isDevelopment
          ? nextUrl.origin === new URL(devRendererUrl).origin
          : nextUrl.protocol === 'file:' && path.resolve(fileURLToPath(nextUrl)) === getExpectedRendererPath()
        if (!allowed) event.preventDefault()
      } catch {
        event.preventDefault()
      }
    })
    window.webContents.on('will-attach-webview', (event) => event.preventDefault())
    window.once('ready-to-show', () => { if (!window.isDestroyed()) window.show() })
    const sendWindowState = () => {
      if (!window.isDestroyed() && !window.webContents.isDestroyed()) window.webContents.send('codic:window-state', { maximized: window.isMaximized() })
    }
    window.on('maximize', sendWindowState)
    window.on('unmaximize', sendWindowState)
    window.webContents.once('did-finish-load', () => {
      sendWindowState()
      if (pendingAuthCallback && !window.isDestroyed() && !window.webContents.isDestroyed()) {
        window.webContents.send('codic:auth-callback', pendingAuthCallback)
        pendingAuthCallback = null
      }
    })
    // Electron emits `closed` after the BrowserWindow's native handle is gone.
    // Keep the WebContents reference now; reading window.webContents inside the
    // `closed` callback can throw “Object has been destroyed” on Windows.
    const ownerContents = window.webContents
    window.on('closed', () => {
      if (mainWindow === window) mainWindow = null
      for (const [taskId, owner] of taskWindowOwners) if (owner === window) taskWindowOwners.delete(taskId)
      for (const [sessionId, session] of terminalSessions) {
        if (session.owner !== ownerContents) continue
        terminalSessions.delete(sessionId)
        session.terminal.kill()
      }
    })

    if (isDevelopment) {
      const rendererUrl = new URL(devRendererUrl)
      if (initialThread) {
        rendererUrl.searchParams.set('project', initialThread.workspacePath)
        rendererUrl.searchParams.set('thread', initialThread.threadId)
      }
      if (options.empty) rendererUrl.searchParams.set('new', '1')
      await window.loadURL(rendererUrl.toString())
    } else {
      await window.loadFile(getExpectedRendererPath(), initialThread
        ? { query: { project: initialThread.workspacePath, thread: initialThread.threadId } }
        : options.empty ? { query: { new: '1' } } : undefined)
    }
    return window
  }

  app.whenReady().then(async () => {
    if (isDevelopment && process.argv[1]) {
      app.setAsDefaultProtocolClient('codic', process.execPath, [path.resolve(process.argv[1])])
    } else {
      app.setAsDefaultProtocolClient('codic')
    }
    configureAutoUpdater()
    localStore = CodicLocalStore.open(path.join(app.getPath('userData'), 'codic.sqlite'))
    runtimeBridge = new CodicRuntimeBridge({
      apiBaseUrl: apiBase,
      getAccessToken: async () => readAccessToken(),
      onEvent: (event, taskId) => {
        if (!ephemeralTaskIds.has(taskId)) {
          try {
            localStore?.appendTaskEvent({ id: randomUUID(), taskId, type: event.type, payload: redactHistoryValue(event) })
            if (event.type === 'run_finished') {
              const state = event.reason === 'cancelled' ? 'cancelled' : event.reason === 'error' ? 'failed' : 'completed'
              localStore?.finishTask(taskId, state, event.error ? String(redactHistoryValue(event.error)) : undefined)
            }
          } catch {
            // A local history write failure must not interrupt the user's agent run.
          }
        }
        emitRuntimeEvent(event, taskId)
        if (event.type === 'run_finished') ephemeralTaskIds.delete(taskId)
      },
    })

    ipcMain.handle('codic:app-info', (event) => {
      assertTrustedSender(event)
      return { version: app.getVersion(), platform: process.platform }
    })
    ipcMain.handle('codic:app-quit', (event) => {
      assertTrustedSender(event)
      app.quit()
    })
    ipcMain.handle('codic:open-website', async (event, page: unknown) => {
      assertTrustedSender(event)
      const allowedPages = new Set(['/help', '/status', '/contact', '/codic', '/downloads/codic'])
      if (typeof page !== 'string' || !allowedPages.has(page)) throw new Error('Choose a Codeva help page.')
      await shell.openExternal(`https://cybermindcli.info${page}`)
    })
    ipcMain.handle('codic:check-updates', async (event): Promise<CodicUpdateCheck> => {
      assertTrustedSender(event)
      return checkForCodicUpdates()
    })
    ipcMain.handle('codic:get-update-state', (event) => {
      assertTrustedSender(event)
      return codicUpdateState
    })
    ipcMain.handle('codic:download-update', async (event) => {
      assertTrustedSender(event)
      if (process.platform !== 'win32' || !app.isPackaged || codicUpdateState.phase !== 'available') {
        throw new Error('A Windows update must be available before it can be downloaded.')
      }
      await autoUpdater.downloadUpdate()
    })
    ipcMain.handle('codic:install-update', (event) => {
      assertTrustedSender(event)
      if (process.platform !== 'win32' || codicUpdateState.phase !== 'downloaded') throw new Error('Download a Codic update before installing it.')
      autoUpdater.quitAndInstall(false, true)
    })
    ipcMain.handle('codic:task-manager-data', (event): CodicDiagnostics => {
      assertSignedInSender(event)
      const metrics = app.getAppMetrics()
      const processes = metrics.map((metric) => ({
        name: metric.name || metric.type,
        type: metric.type,
        pid: metric.pid,
        cpuPercent: Math.max(0, metric.cpu.percentCPUUsage),
        memoryMb: Math.max(0, metric.memory.workingSetSize / 1024),
      }))
      return {
        version: app.getVersion(), platform: process.platform, processCount: processes.length,
        memoryMb: processes.reduce((total, item) => total + item.memoryMb, 0), processes,
      }
    })
    ipcMain.handle('codic:trace-start', async (event) => {
      assertSignedInSender(event)
      if (performanceTraceRunning) return
      await contentTracing.startRecording({ included_categories: ['electron', 'devtools.timeline', 'blink.user_timing', 'v8.execute'] })
      performanceTraceRunning = true
    })
    ipcMain.handle('codic:trace-stop', async (event) => {
      assertSignedInSender(event)
      if (!performanceTraceRunning) return null
      const owner = BrowserWindow.fromWebContents(event.sender)
      const filename = `Codic-performance-${new Date().toISOString().replace(/[:.]/g, '-')}.pftrace`
      const saveOptions = {
        title: 'Save Codic performance trace', defaultPath: path.join(app.getPath('documents'), filename),
        filters: [{ name: 'Performance trace', extensions: ['pftrace'] }],
      }
      const result = owner || mainWindow
        ? await dialog.showSaveDialog(owner || mainWindow!, saveOptions)
        : await dialog.showSaveDialog(saveOptions)
      if (result.canceled || !result.filePath) return null
      const savedPath = await contentTracing.stopRecording(result.filePath)
      performanceTraceRunning = false
      return savedPath
    })
    ipcMain.handle('codic:browser-open', async (event, requestedUrl: unknown) => {
      assertSignedInSender(event)
      const target = typeof requestedUrl === 'string' && requestedUrl ? requestedUrl : 'https://cybermindcli.info/help'
      let parsed: URL
      try { parsed = new URL(target) } catch { throw new Error('Enter a valid HTTPS address.') }
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('Codic Browser only opens secure HTTPS pages.')
      if (browserWindow && !browserWindow.isDestroyed()) {
        const currentBrowserWindow = browserWindow
        if (!currentBrowserWindow.webContents.isDestroyed()) {
          currentBrowserWindow.show()
          currentBrowserWindow.focus()
          if (currentBrowserWindow.webContents.getURL() !== parsed.href) {
            try { await currentBrowserWindow.loadURL(parsed.href) }
            catch (error) { if (!currentBrowserWindow.isDestroyed()) throw error }
          }
          return
        }
        browserWindow = null
      }
      const owner = BrowserWindow.fromWebContents(event.sender)
      browserWindow = new BrowserWindow({
        width: 1180, height: 780, minWidth: 360, minHeight: 480, show: false, title: 'Codic Browser',
        ...(owner ? { parent: owner } : {}),
        webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, partition: 'persist:codic-browser' },
      })
      const currentBrowserWindow = browserWindow
      currentBrowserWindow.webContents.setWindowOpenHandler(({ url }) => {
        try { const child = new URL(url); if (child.protocol === 'https:') void shell.openExternal(child.href) } catch { /* Reject malformed links. */ }
        return { action: 'deny' }
      })
      currentBrowserWindow.webContents.on('will-navigate', (navigationEvent, navigationUrl) => {
        try { if (new URL(navigationUrl).protocol !== 'https:') navigationEvent.preventDefault() }
        catch { navigationEvent.preventDefault() }
      })
      currentBrowserWindow.once('ready-to-show', () => { if (!currentBrowserWindow.isDestroyed()) currentBrowserWindow.show() })
      currentBrowserWindow.on('closed', () => { if (browserWindow === currentBrowserWindow) browserWindow = null })
      try { await currentBrowserWindow.loadURL(parsed.href) }
      catch (error) { if (!currentBrowserWindow.isDestroyed()) throw error }
    })
    ipcMain.handle('codic:browser-action', async (event, action: unknown) => {
      assertSignedInSender(event)
      const browser = browserWindow
      if (!browser || browser.isDestroyed() || browser.webContents.isDestroyed()) return
      if (action === 'back' && browser.webContents.canGoBack()) browser.webContents.goBack()
      else if (action === 'forward' && browser.webContents.canGoForward()) browser.webContents.goForward()
      else if (action === 'reload') browser.webContents.reload()
      else if (action === 'external') {
        const current = new URL(browser.webContents.getURL())
        if (current.protocol === 'https:') await shell.openExternal(current.href)
      } else if (action === 'close') browser.close()
    })
    ipcMain.handle('codic:choose-workspace', async (event) => {
      assertSignedInSender(event)
      const result = await dialog.showOpenDialog({ properties: ['openDirectory'], title: 'Open a project folder' })
      if (result.canceled || !result.filePaths[0]) return null
      const chosenPath = realpathSync(path.resolve(result.filePaths[0]))
      const name = path.basename(chosenPath) || chosenPath
      if (localStore) {
        const existing = localStore.findProjectByPath(chosenPath)
        localStore.addProject({ id: existing?.id || randomUUID(), path: chosenPath, name })
      }
      return { path: chosenPath, name }
    })
    ipcMain.handle('codic:choose-new-project', async (event) => {
      assertSignedInSender(event)
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Create or choose a project folder',
        buttonLabel: 'Open project',
      })
      if (result.canceled || !result.filePaths[0]) return null
      const chosenPath = realpathSync(path.resolve(result.filePaths[0]))
      const name = path.basename(chosenPath) || chosenPath
      if (localStore) {
        const existing = localStore.findProjectByPath(chosenPath)
        localStore.addProject({ id: existing?.id || randomUUID(), path: chosenPath, name })
      }
      return { path: chosenPath, name }
    })
    ipcMain.handle('codic:list-projects', (event) => {
      assertSignedInSender(event)
      return (localStore?.listProjects() ?? [])
        .filter((project) => {
          try { return statSync(project.path).isDirectory() } catch { return false }
        })
        .map(({ path: projectPath, name }) => ({ path: projectPath, name }))
    })
    ipcMain.handle('codic:select-saved-project', (event, workspacePath: unknown) => {
      assertSignedInSender(event)
      const project = requireSavedProject(workspacePath)
      if (!statSync(project.path).isDirectory()) throw new Error('That saved project folder is no longer available.')
      return { path: project.path, name: project.name }
    })
    ipcMain.handle('codic:list-threads', (event, workspacePath: unknown) => {
      assertSignedInSender(event)
      if (!localStore) return []
      const project = requireSavedProject(workspacePath)
      return listThreadSummaries(localStore, project.id)
    })
    ipcMain.handle('codic:list-archived-threads', (event, workspacePath: unknown) => {
      assertSignedInSender(event)
      if (!localStore) return []
      const project = requireSavedProject(workspacePath)
      return listThreadSummaries(localStore, project.id, 100, true).filter((thread) => thread.archived)
    })
    ipcMain.handle('codic:load-thread', (event, request: unknown) => {
      assertSignedInSender(event)
      if (!localStore || !request || typeof request !== 'object') throw new Error('Task history is not available yet.')
      const value = request as Record<string, unknown>
      if (typeof value.workspacePath !== 'string' || typeof value.threadId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.threadId)) {
        throw new Error('Choose a valid task from this project.')
      }
      const project = requireSavedProject(value.workspacePath)
      return loadThreadHistory(localStore, project.id, value.threadId)
    })
    ipcMain.handle('codic:rename-thread', (event, request: unknown) => {
      assertSignedInSender(event)
      if (!localStore || !request || typeof request !== 'object') throw new Error('Task history is not available yet.')
      const value = request as Record<string, unknown>
      if (typeof value.workspacePath !== 'string' || typeof value.threadId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.threadId) || typeof value.title !== 'string') {
        throw new Error('Choose a valid task and title.')
      }
      const project = requireSavedProject(value.workspacePath)
      const thread = localStore.renameThread(project.id, value.threadId, value.title)
      return listThreadSummaries(localStore, project.id, 100, true).find((item) => item.id === thread.id)!
    })
    ipcMain.handle('codic:set-thread-pinned', (event, request: unknown) => {
      assertSignedInSender(event)
      if (!localStore || !request || typeof request !== 'object') throw new Error('Task history is not available yet.')
      const value = request as Record<string, unknown>
      if (typeof value.workspacePath !== 'string' || typeof value.threadId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.threadId) || typeof value.pinned !== 'boolean') {
        throw new Error('Choose a valid task and pin setting.')
      }
      const project = requireSavedProject(value.workspacePath)
      const thread = localStore.setThreadPinned(project.id, value.threadId, value.pinned)
      return listThreadSummaries(localStore, project.id, 100, true).find((item) => item.id === thread.id)!
    })
    ipcMain.handle('codic:set-thread-archived', (event, request: unknown) => {
      assertSignedInSender(event)
      if (!localStore || !request || typeof request !== 'object') throw new Error('Task history is not available yet.')
      const value = request as Record<string, unknown>
      if (typeof value.workspacePath !== 'string' || typeof value.threadId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.threadId) || typeof value.archived !== 'boolean') {
        throw new Error('Choose a valid task and archive setting.')
      }
      const project = requireSavedProject(value.workspacePath)
      const thread = localStore.setThreadArchived(project.id, value.threadId, value.archived)
      return listThreadSummaries(localStore, project.id, 100, true).find((item) => item.id === thread.id)!
    })
    ipcMain.handle('codic:fork-thread', (event, request: unknown) => {
      assertSignedInSender(event)
      if (!localStore || !request || typeof request !== 'object') throw new Error('Task history is not available yet.')
      const value = request as Record<string, unknown>
      if (typeof value.workspacePath !== 'string' || typeof value.threadId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.threadId) ||
          (value.mode !== 'fork' && value.mode !== 'side-chat')) throw new Error('Choose a valid task branch.')
      const project = requireSavedProject(value.workspacePath)
      const parent = localStore.getThread(project.id, value.threadId)
      if (!parent) throw new Error('This task does not belong to the selected project.')
      const prefix = value.mode === 'side-chat' ? 'Side chat: ' : 'Fork: '
      const thread = localStore.createThread({
        id: randomUUID(),
        projectId: project.id,
        title: `${prefix}${parent.title}`.slice(0, 160),
        parentThreadId: parent.id,
      })
      return listThreadSummaries(localStore, project.id, 100, true).find((item) => item.id === thread.id)!
    })
    ipcMain.handle('codic:list-scheduled-tasks', (event, workspacePath: unknown) => {
      assertSignedInSender(event)
      if (!localStore) return []
      const project = requireSavedProject(workspacePath)
      return localStore.listScheduledTasks(project.id)
    })
    ipcMain.handle('codic:create-scheduled-task', (event, request: unknown) => {
      assertSignedInSender(event)
      if (!localStore || !request || typeof request !== 'object') throw new Error('Scheduled tasks are not available yet.')
      const value = request as Record<string, unknown>
      if (typeof value.workspacePath !== 'string' || typeof value.title !== 'string' || typeof value.prompt !== 'string' ||
          typeof value.model !== 'string' || typeof value.nextRunAt !== 'string' ||
          (value.sourceThreadId !== null && (typeof value.sourceThreadId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.sourceThreadId))) ||
          (value.reasoningEffort !== 'low' && value.reasoningEffort !== 'medium' && value.reasoningEffort !== 'high') ||
          (value.recurrence !== 'once' && value.recurrence !== 'daily' && value.recurrence !== 'weekly')) {
        throw new Error('Enter a valid scheduled task.')
      }
      const project = requireSavedProject(value.workspacePath)
      const existing = localStore.listScheduledTasks(project.id)
      if (existing.filter((task) => task.enabled).length >= 100) throw new Error('This project already has 100 active schedules.')
      const nextRun = new Date(value.nextRunAt)
      const now = Date.now()
      if (!Number.isFinite(nextRun.getTime()) || nextRun.getTime() < now + 60_000 || nextRun.getTime() > now + 366 * 24 * 60 * 60_000) {
        throw new Error('Choose a run time between one minute and one year from now.')
      }
      if (value.title.length > 160 || !value.title.trim() || !value.prompt.trim() || value.prompt.length > 20_000 || !value.model.trim()) {
        throw new Error('The title, prompt, or model is invalid.')
      }
      return localStore.createScheduledTask({
        id: randomUUID(),
        projectId: project.id,
        sourceThreadId: value.sourceThreadId as string | null,
        title: String(redactHistoryValue(value.title)),
        prompt: String(redactHistoryValue(value.prompt)),
        model: value.model,
        reasoningEffort: value.reasoningEffort,
        recurrence: value.recurrence,
        nextRunAt: nextRun.toISOString(),
      })
    })
    ipcMain.handle('codic:set-scheduled-task-enabled', (event, request: unknown) => {
      assertSignedInSender(event)
      if (!localStore || !request || typeof request !== 'object') throw new Error('Scheduled tasks are not available yet.')
      const value = request as Record<string, unknown>
      if (typeof value.workspacePath !== 'string' || typeof value.scheduleId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.scheduleId) || typeof value.enabled !== 'boolean') {
        throw new Error('Choose a valid schedule setting.')
      }
      const project = requireSavedProject(value.workspacePath)
      return localStore.setScheduledTaskEnabled(project.id, value.scheduleId, value.enabled)
    })
    ipcMain.handle('codic:delete-scheduled-task', (event, request: unknown) => {
      assertSignedInSender(event)
      if (!localStore || !request || typeof request !== 'object') throw new Error('Scheduled tasks are not available yet.')
      const value = request as Record<string, unknown>
      if (typeof value.workspacePath !== 'string' || typeof value.scheduleId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.scheduleId)) {
        throw new Error('Choose a valid schedule.')
      }
      const project = requireSavedProject(value.workspacePath)
      localStore.deleteScheduledTask(project.id, value.scheduleId)
    })
    ipcMain.handle('codic:profile-stats', (event) => {
      assertSignedInSender(event)
      return localStore?.getProfileStats() ?? { taskCount: 0, completedRuns: 0, totalTokens: 0, tokensEstimated: false, longestTaskSeconds: 0, activity: [] }
    })
    ipcMain.handle('codic:export-thread-markdown', async (event, request: unknown) => {
      assertSignedInSender(event)
      if (!localStore || !request || typeof request !== 'object') throw new Error('Task history is not available yet.')
      const value = request as Record<string, unknown>
      if (typeof value.workspacePath !== 'string' || typeof value.threadId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.threadId)) {
        throw new Error('Choose a valid task to export.')
      }
      const project = requireSavedProject(value.workspacePath)
      const history = loadThreadHistory(localStore, project.id, value.threadId)
      const markdown = [`# ${history.thread.title}`, '', `Project: ${project.name}`, '', ...history.messages.flatMap((message) => [`## ${message.role === 'user' ? 'You' : 'Codic'}`, '', message.content, ''])].join('\n')
      const options = {
        title: 'Export Codic task',
        defaultPath: `${history.thread.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').slice(0, 100) || 'Codic task'}.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      }
      const parentWindow = BrowserWindow.fromWebContents(event.sender)
      const result = parentWindow
        ? await dialog.showSaveDialog(parentWindow, options)
        : await dialog.showSaveDialog(options)
      if (result.canceled || !result.filePath) return null
      writeFileSync(result.filePath, markdown, { encoding: 'utf8' })
      return result.filePath
    })
    ipcMain.handle('codic:copy-text', (event, value: unknown) => {
      assertTrustedSender(event)
      if (typeof value !== 'string' || value.length > 1_000_000) throw new Error('The selected text is too large to copy.')
      clipboard.writeText(value)
    })
    ipcMain.handle('codic:auth-storage-get', (event, key: string) => {
      assertTrustedSender(event)
      if (key !== 'codic-auth') throw new Error('Unsupported secure-storage key.')
      const session = readSession()
      return session ? JSON.stringify(session) : null
    })
    ipcMain.handle('codic:auth-storage-set', (event, key: string, value: string) => {
      assertTrustedSender(event)
      if (typeof value !== 'string') throw new Error('Invalid secure-storage value.')
      storeAuthValue(key, value)
    })
    ipcMain.handle('codic:auth-storage-remove', (event, key: string) => {
      assertTrustedSender(event)
      storeAuthValue(key, null)
      if (key === 'codic-auth') {
        localPreviewAccessGranted = false
        runtimeBridge?.cancelAll()
        for (const session of terminalSessions.values()) session.terminal.kill()
        terminalSessions.clear()
        for (const window of BrowserWindow.getAllWindows()) {
          if (!window.isDestroyed() && !window.webContents.isDestroyed()) window.webContents.send('codic:auth-signed-out')
        }
      }
    })
    ipcMain.handle('codic:local-preview-status', (event) => {
      assertTrustedSender(event)
      return { available: __CODIC_LOCAL_PREVIEW_ENABLED__, enabled: __CODIC_LOCAL_PREVIEW_ENABLED__ && localPreviewAccessGranted }
    })
    ipcMain.handle('codic:local-preview-enable', (event) => {
      assertTrustedSender(event)
      if (!__CODIC_LOCAL_PREVIEW_ENABLED__) throw new Error('Local preview is disabled in this Codic build.')
      localPreviewAccessGranted = true
    })
    ipcMain.handle('codic:auth-begin-codeva-sign-in', async (event) => {
      assertTrustedSender(event)
      const verifier = randomBytes(32).toString('base64url')
      const challenge = createHash('sha256').update(verifier).digest('base64url')
      saveHandoffVerifier(verifier)
      const loginUrl = new URL('https://www.cybermindcli.info/auth/login')
      loginUrl.searchParams.set('redirect', 'codic')
      loginUrl.searchParams.set('challenge', challenge)
      try {
        await shell.openExternal(loginUrl.href)
      } catch (error) {
        try { unlinkSync(handoffVerifierPath()) } catch { /* Remove a stale sign-in verifier. */ }
        throw error
      }
    })
    ipcMain.handle('codic:auth-redeem-handoff', async (event, ticket: unknown) => {
      assertTrustedSender(event)
      if (typeof ticket !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(ticket)) throw new Error('The Codic sign-in link is invalid. Start sign-in again.')
      const verifier = consumeHandoffVerifier()
      return redeemCodicAuthHandoff(ticket, verifier)
    })
    ipcMain.handle('codic:models', async (event) => {
      assertSignedInSender(event)
      return requestJson<CodicModelCatalog>('codic/models', 'GET')
    })
    ipcMain.handle('codic:sync-account', async (event) => {
      assertSignedInSender(event)
      return requestJson<{ banned?: boolean; plan?: string; status?: string }>('auth/sync', 'POST', { platform: 'codic' })
    })
    ipcMain.handle('codic:register-device', async (event) => {
      assertSignedInSender(event)
      await registerDevice()
    })
    ipcMain.handle('codic:revoke-device', async (event) => {
      assertSignedInSender(event)
      await revokeDevice()
    })
    ipcMain.handle('codic:start-task', (event, request: unknown) => {
      assertSignedInSender(event)
      if (!request || typeof request !== 'object') throw new Error('Invalid task request.')
      const value = request as Record<string, unknown>
      if (typeof value.workspacePath !== 'string' || typeof value.prompt !== 'string' || typeof value.model !== 'string') {
        throw new Error('Choose a project, model, and prompt before starting a task.')
      }
      const reasoningEffort = value.reasoningEffort === 'medium' || value.reasoningEffort === 'high' ? value.reasoningEffort : 'low'
      const approvalPolicy = value.approvalPolicy === 'full-access' ? 'full-access' : value.approvalPolicy === 'safe-reads' ? 'safe-reads' : 'ask'
      let messages: Array<{ role: 'user' | 'assistant'; content: string }> | undefined
      if (value.messages !== undefined) {
        if (!Array.isArray(value.messages) || value.messages.length > 80) throw new Error('This conversation is too long to send in one task.')
        let totalCharacters = 0
        messages = value.messages.map((message) => {
          if (!message || typeof message !== 'object') throw new Error('Invalid conversation message.')
          const item = message as Record<string, unknown>
          if ((item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string') throw new Error('Invalid conversation message.')
          totalCharacters += item.content.length
          if (totalCharacters > 220_000) throw new Error('This conversation is too long to send in one task. Start a new task or shorten the conversation.')
          return { role: item.role, content: item.content }
        })
      }
      if (!runtimeBridge) throw new Error('The local runtime is not ready yet.')
      const workspacePath = realpathSync(path.resolve(value.workspacePath))
      if (!existsSync(workspacePath) || !statSync(workspacePath).isDirectory()) throw new Error('That project folder is no longer available.')
      const projectName = path.basename(workspacePath) || workspacePath
      let project = localStore?.findProjectByPath(workspacePath) ?? null
      if (localStore && !project) project = localStore.addProject({ id: randomUUID(), path: workspacePath, name: projectName })
      if (!project || !localStore) throw new Error('Local task history is not available yet.')
      const requestedThreadId = typeof value.conversationId === 'string' && /^[0-9a-f-]{36}$/i.test(value.conversationId)
        ? value.conversationId
        : randomUUID()
      const isTemporary = value.temporary === true
      let threadId = requestedThreadId
      if (!isTemporary) {
        threadId = localStore.listThreads(project.id).some((thread) => thread.id === requestedThreadId) ? requestedThreadId : ''
        if (!threadId) {
          threadId = requestedThreadId
          try {
            localStore.createThread({ id: threadId, projectId: project.id, title: value.prompt.trim().slice(0, 120) || 'New task' })
          } catch {
            threadId = randomUUID()
            localStore.createThread({ id: threadId, projectId: project.id, title: value.prompt.trim().slice(0, 120) || 'New task' })
          }
        }
      }
      const taskId = randomUUID()
      if (isTemporary) ephemeralTaskIds.add(taskId)
      else localStore.createTask({ id: taskId, threadId, model: value.model, prompt: String(redactHistoryValue(value.prompt)) })
      const taskWindow = BrowserWindow.fromWebContents(event.sender)
      if (taskWindow) taskWindowOwners.set(taskId, taskWindow)
      try {
        return runtimeBridge.startTask({
        workspacePath: value.workspacePath,
        prompt: value.prompt,
        model: value.model,
          reasoningEffort,
          approvalPolicy,
        conversationId: threadId,
        ...(messages ? { messages } : {}),
        taskId,
        })
      } catch (error) {
        taskWindowOwners.delete(taskId)
        ephemeralTaskIds.delete(taskId)
        if (!isTemporary) localStore.finishTask(taskId, 'failed', error instanceof Error ? String(redactHistoryValue(error.message)) : 'The task could not be started.')
        throw error
      }
    })
    ipcMain.handle('codic:cancel-task', (event, taskId: unknown) => {
      assertSignedInSender(event)
      if (typeof taskId === 'string') runtimeBridge?.cancelTask(taskId)
    })
    ipcMain.handle('codic:resolve-approval', (event, request: unknown) => {
      assertSignedInSender(event)
      if (!request || typeof request !== 'object') return false
      const value = request as Record<string, unknown>
      if (typeof value.taskId !== 'string' || typeof value.approvalId !== 'string' || (value.decision !== 'allow' && value.decision !== 'deny')) return false
      return runtimeBridge?.resolveApproval({ taskId: value.taskId, approvalId: value.approvalId, decision: value.decision }) ?? false
    })
    ipcMain.handle('codic:workspace-diff', async (event, workspacePath: unknown) => {
      assertSignedInSender(event)
      const project = requireSavedProject(workspacePath)
      return readWorkspaceDiff(project.path)
    })
    ipcMain.handle('codic:terminal-run', async (event, request: unknown) => {
      assertSignedInSender(event)
      if (!request || typeof request !== 'object') throw new Error('Enter a valid terminal command.')
      const value = request as Record<string, unknown>
      const project = requireSavedProject(value.workspacePath)
      if (typeof value.command !== 'string') throw new Error('Enter a terminal command.')
      return runWorkspaceCommand(project.path, value.command)
    })
    ipcMain.handle('codic:terminal-open', (event, workspacePath: unknown) => {
      assertSignedInSender(event)
      const project = requireSavedProject(workspacePath)
      const active = [...terminalSessions.values()].filter(session => session.owner === event.sender).length
      if (active >= 5) throw new Error('Close a terminal tab before opening another. Codic allows up to five live shells per window.')
      const shellSpec = terminalShell()
      const terminal = pty.spawn(shellSpec.file, shellSpec.args, {
        cwd: project.path,
        cols: 96,
        rows: 26,
        name: 'xterm-256color',
        env: terminalEnvironment(),
      })
      const sessionId = randomUUID()
      terminalSessions.set(sessionId, { terminal, owner: event.sender, projectPath: project.path })
      terminal.onData(data => {
        if (!event.sender.isDestroyed()) event.sender.send('codic:terminal-event', { type: 'data', sessionId, data })
      })
      terminal.onExit(({ exitCode, signal }) => {
        terminalSessions.delete(sessionId)
        if (!event.sender.isDestroyed()) event.sender.send('codic:terminal-event', { type: 'exit', sessionId, exitCode, signal })
      })
      return { sessionId, shell: shellSpec.file }
    })
    ipcMain.handle('codic:terminal-write', (event, request: unknown) => {
      assertSignedInSender(event)
      if (!request || typeof request !== 'object') throw new Error('Enter terminal input.')
      const value = request as Record<string, unknown>
      if (typeof value.data !== 'string' || value.data.length > 65_536) throw new Error('Terminal input is too large.')
      getOwnedTerminal(event, value.sessionId).terminal.write(value.data)
    })
    ipcMain.handle('codic:terminal-resize', (event, request: unknown) => {
      assertSignedInSender(event)
      if (!request || typeof request !== 'object') throw new Error('Choose valid terminal dimensions.')
      const value = request as Record<string, unknown>
      if (!Number.isInteger(value.cols) || Number(value.cols) < 20 || Number(value.cols) > 500 || !Number.isInteger(value.rows) || Number(value.rows) < 5 || Number(value.rows) > 200) {
        throw new Error('Choose valid terminal dimensions.')
      }
      getOwnedTerminal(event, value.sessionId).terminal.resize(Number(value.cols), Number(value.rows))
    })
    ipcMain.handle('codic:terminal-close', (event, sessionId: unknown) => {
      assertSignedInSender(event)
      const session = getOwnedTerminal(event, sessionId)
      terminalSessions.delete(String(sessionId))
      session.terminal.kill()
    })
    ipcMain.handle('codic:list-review-comments', (event, workspacePath: unknown) => {
      assertSignedInSender(event)
      if (!localStore) return []
      const project = requireSavedProject(workspacePath)
      return localStore.listReviewComments(project.id)
    })
    ipcMain.handle('codic:add-review-comment', (event, request: unknown) => {
      assertSignedInSender(event)
      if (!request || typeof request !== 'object' || !localStore) throw new Error('Review comments are not available yet.')
      const value = request as Record<string, unknown>
      if (typeof value.workspacePath !== 'string' || typeof value.filePath !== 'string' || typeof value.body !== 'string' ||
          !Number.isInteger(value.lineNumber) || Number(value.lineNumber) < 1 || (value.side !== 'old' && value.side !== 'new')) {
        throw new Error('Choose a valid line and write a comment.')
      }
      if (!value.body.trim() || value.body.length > 5_000) throw new Error('Comments must be between 1 and 5,000 characters.')
      const project = requireSavedProject(value.workspacePath)
      const safePath = requireSafeProjectFile(project.path, value.filePath)
      return localStore.addReviewComment({
        id: randomUUID(),
        projectId: project.id,
        filePath: safePath,
        lineNumber: Number(value.lineNumber),
        side: value.side,
        body: value.body,
      })
    })
    const findTaskWorkspace = (taskId: string) => {
      if (!localStore) return null
      for (const project of localStore.listProjects()) {
        for (const thread of localStore.listThreads(project.id)) {
          if (localStore.listTasks(thread.id).some((task) => task.id === taskId)) return project.path
        }
      }
      return null
    }
    ipcMain.handle('codic:get-checkpoints', (event, taskId: unknown) => {
      assertSignedInSender(event)
      if (typeof taskId !== 'string' || !runtimeBridge) return []
      const workspacePath = findTaskWorkspace(taskId)
      if (!workspacePath) return []
      return runtimeBridge.listCheckpoints(taskId, workspacePath)
    })
    ipcMain.handle('codic:restore-checkpoint', (event, request: unknown) => {
      assertSignedInSender(event)
      if (!request || typeof request !== 'object' || !runtimeBridge) throw new Error('This checkpoint is no longer available.')
      const value = request as Record<string, unknown>
      if (typeof value.taskId !== 'string' || !Number.isInteger(value.seq)) throw new Error('Choose a valid checkpoint.')
      const workspacePath = findTaskWorkspace(value.taskId)
      if (!workspacePath) throw new Error('This checkpoint does not belong to a saved Codic task.')
      return runtimeBridge.restoreCheckpoint(value.taskId, workspacePath, Number(value.seq))
    })
    ipcMain.handle('codic:window-action', (event, action: 'minimize' | 'maximize' | 'close' | 'fullscreen') => {
      assertTrustedSender(event)
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) return
      if (action === 'minimize') window.minimize()
      if (action === 'maximize') window.isMaximized() ? window.unmaximize() : window.maximize()
      if (action === 'close') window.close()
      if (action === 'fullscreen') window.setFullScreen(!window.isFullScreen())
    })
    ipcMain.handle('codic:window-state', (event) => {
      assertTrustedSender(event)
      const window = BrowserWindow.fromWebContents(event.sender)
      return { maximized: Boolean(window?.isMaximized()) }
    })
    ipcMain.handle('codic:open-blank-window', async (event) => {
      assertTrustedSender(event)
      await createWindow(undefined, { makeMain: false, empty: true })
    })
    ipcMain.handle('codic:edit-action', (event, action: unknown) => {
      assertTrustedSender(event)
      const window = BrowserWindow.fromWebContents(event.sender)
      const actions: EditAction[] = ['undo', 'redo', 'cut', 'copy', 'paste', 'delete', 'select-all']
      if (!window || typeof action !== 'string' || !actions.includes(action as EditAction)) return
      const contents = window.webContents
      switch (action as EditAction) {
        case 'undo': contents.undo(); break
        case 'redo': contents.redo(); break
        case 'cut': contents.cut(); break
        case 'copy': contents.copy(); break
        case 'paste': contents.paste(); break
        case 'delete': contents.delete(); break
        case 'select-all': contents.selectAll(); break
      }
    })
    ipcMain.handle('codic:window-zoom', (event, value: unknown) => {
      assertTrustedSender(event)
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window || typeof value !== 'number' || !Number.isFinite(value)) return
      window.webContents.setZoomFactor(Math.min(1.5, Math.max(0.75, value)))
    })
    ipcMain.handle('codic:open-thread-window', async (event, request: unknown) => {
      assertSignedInSender(event)
      if (!localStore || !request || typeof request !== 'object') throw new Error('Task history is not available yet.')
      const value = request as Record<string, unknown>
      if (typeof value.workspacePath !== 'string' || typeof value.threadId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.threadId)) {
        throw new Error('Choose a valid task to open in another window.')
      }
      const project = requireSavedProject(value.workspacePath)
      if (!localStore.getThread(project.id, value.threadId)) throw new Error('This task does not belong to the selected project.')
      await createWindow({ workspacePath: project.path, threadId: value.threadId })
    })

    let schedulePollInProgress = false
    const pollScheduledTasks = async () => {
      if (schedulePollInProgress || !localStore || !runtimeBridge || !readAccessToken()) return
      schedulePollInProgress = true
      try {
        for (const due of localStore.listDueScheduledTasks()) {
          if (runtimeBridge.hasActiveTask(due.workspacePath)) continue
          let projectPath: string
          try {
            projectPath = realpathSync(path.resolve(due.workspacePath))
            if (!statSync(projectPath).isDirectory()) throw new Error('missing')
          } catch {
            localStore.setScheduledTaskEnabled(due.projectId, due.id, false)
            continue
          }
          const claimed = localStore.claimScheduledTask(due.projectId, due.id)
          if (!claimed) continue
          let taskId: string | null = null
          try {
            const project = localStore.getProject(due.projectId)
            if (!project) throw new Error('The scheduled project is no longer available.')
            const thread = localStore.createThread({
              id: randomUUID(),
              projectId: project.id,
              title: claimed.title,
              parentThreadId: claimed.sourceThreadId,
            })
            taskId = randomUUID()
            localStore.createTask({ id: taskId, threadId: thread.id, model: claimed.model, prompt: String(redactHistoryValue(claimed.prompt)) })
            const owner = await createWindow({ workspacePath: projectPath, threadId: thread.id })
            taskWindowOwners.set(taskId, owner)
            runtimeBridge.startTask({
              workspacePath: projectPath,
              prompt: claimed.prompt,
              model: claimed.model,
              reasoningEffort: claimed.reasoningEffort,
              approvalPolicy: 'ask',
              conversationId: thread.id,
              messages: [{ role: 'user', content: claimed.prompt }],
              taskId,
            })
          } catch (error) {
            const message = error instanceof Error ? String(redactHistoryValue(error.message)) : 'The scheduled task could not be started.'
            if (taskId) {
              localStore.finishTask(taskId, 'failed', message)
              emitRuntimeEvent({ type: 'run_finished', runId: `schedule-${claimed.id}`, reason: 'error', error: message }, taskId)
            }
          }
        }
      } finally {
        schedulePollInProgress = false
      }
    }
    schedulePollTimer = setInterval(() => { void pollScheduledTasks() }, 15_000)
    void pollScheduledTasks()

    const initialUrl = findCodicAuthCallback(process.argv)
    if (initialUrl) handleDeepLink(initialUrl)
    await createWindow()
    if (process.platform === 'win32' && app.isPackaged) {
      const startupUpdateTimer = setTimeout(() => { void checkForCodicUpdates() }, 4_000)
      startupUpdateTimer.unref()
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    if (schedulePollTimer) clearInterval(schedulePollTimer)
    schedulePollTimer = null
    runtimeBridge?.cancelAll()
    for (const session of terminalSessions.values()) session.terminal.kill()
    terminalSessions.clear()
    if (browserWindow && !browserWindow.isDestroyed()) browserWindow.close()
    if (performanceTraceRunning) void contentTracing.stopRecording().catch(() => undefined)
    performanceTraceRunning = false
    runtimeBridge = null
    localStore?.close()
    localStore = null
  })
}
