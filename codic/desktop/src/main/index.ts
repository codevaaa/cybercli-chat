import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { CodicRuntimeBridge } from './runtime-bridge.js'
import { CodicLocalStore } from './local-store.js'
import { listThreadSummaries, loadThreadHistory } from './history.js'
import { toCodicApiPlatform } from './device-platform.js'
import { readWorkspaceDiff, runWorkspaceCommand } from './workspace-tools.js'
import { SecretScanner } from '../../../../cybercoder/packages/codic-runtime/src/shared-bridge.js'
import type { CodicModelCatalog, CodicRuntimeEvent } from '../shared/contracts.js'

const isDevelopment = !app.isPackaged
const devRendererUrl = process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173'
const apiRoot = (process.env.CODEVA_API_BASE_URL || 'https://cybercli-api.onrender.com').replace(/\/+$/, '')
const apiBase = apiRoot.endsWith('/api/v1') ? apiRoot : `${apiRoot}/api/v1`
const authStoragePath = () => path.join(app.getPath('userData'), 'auth-store.bin')
const deviceIdPath = () => path.join(app.getPath('userData'), 'device-id')
let mainWindow: BrowserWindow | null = null
let pendingAuthCallback: string | null = null
let runtimeBridge: CodicRuntimeBridge | null = null
let localStore: CodicLocalStore | null = null

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

const requireAccessToken = () => {
  const token = readAccessToken()
  if (!token) throw new Error('Sign in to your Codeva account to use Codic’s model service.')
  return token
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

const emitRuntimeEvent = (event: CodicRuntimeEvent) => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('codic:runtime-event', event)
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

const isAllowedOAuthUrl = (value: string) => {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return false
    if (url.hostname === 'accounts.google.com') return true
    const configuredHost = new URL(process.env.VITE_SUPABASE_URL || 'https://invalid.local').hostname
    return Boolean(process.env.VITE_SUPABASE_URL) && url.hostname === configuredHost
  } catch {
    return false
  }
}

const handleDeepLink = (value: string) => {
  try {
    const url = new URL(value)
    if (url.protocol !== 'codic:' || url.hostname !== 'auth' || url.pathname !== '/callback') return
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('codic:auth-callback', value)
    else pendingAuthCallback = value
  } catch {
    // Ignore malformed or unrelated protocol arguments.
  }
}

const protocolLock = app.requestSingleInstanceLock()
if (!protocolLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine) => {
    const url = commandLine.find((argument) => argument.startsWith('codic://'))
    if (url) handleDeepLink(url)
    if (mainWindow?.isMinimized()) mainWindow.restore()
    mainWindow?.focus()
  })

  if (process.platform === 'darwin') {
    app.on('open-url', (event, url) => {
      event.preventDefault()
      handleDeepLink(url)
    })
  }

  const startupCallback = process.argv.find((argument) => argument.startsWith('codic://'))
  if (startupCallback) handleDeepLink(startupCallback)

  const createWindow = async () => {
    mainWindow = new BrowserWindow({
      width: 1480,
      height: 940,
      minWidth: 360,
      minHeight: 540,
      show: false,
      frame: false,
      backgroundColor: '#10110f',
      title: 'Codic',
      webPreferences: {
        preload: path.join(app.getAppPath(), 'dist/preload/index.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
    })

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      try {
        const parsed = new URL(url)
        if (parsed.protocol === 'https:') void shell.openExternal(parsed.toString())
      } catch {
        // Reject malformed links.
      }
      return { action: 'deny' }
    })
    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
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
    mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault())
    mainWindow.once('ready-to-show', () => mainWindow?.show())
    mainWindow.webContents.once('did-finish-load', () => {
      if (pendingAuthCallback) {
        mainWindow?.webContents.send('codic:auth-callback', pendingAuthCallback)
        pendingAuthCallback = null
      }
    })
    mainWindow.on('closed', () => { mainWindow = null })

    if (isDevelopment) await mainWindow.loadURL(devRendererUrl)
    else await mainWindow.loadFile(getExpectedRendererPath())
  }

  app.whenReady().then(async () => {
    if (isDevelopment && process.argv[1]) {
      app.setAsDefaultProtocolClient('codic', process.execPath, [path.resolve(process.argv[1])])
    } else {
      app.setAsDefaultProtocolClient('codic')
    }
    localStore = CodicLocalStore.open(path.join(app.getPath('userData'), 'codic.sqlite'))
    runtimeBridge = new CodicRuntimeBridge({
      apiBaseUrl: apiBase,
      getAccessToken: async () => readAccessToken(),
      onEvent: (event, taskId) => {
        try {
          localStore?.appendTaskEvent({ id: randomUUID(), taskId, type: event.type, payload: redactHistoryValue(event) })
          if (event.type === 'run_finished') {
            const state = event.reason === 'cancelled' ? 'cancelled' : event.reason === 'error' ? 'failed' : 'completed'
            localStore?.finishTask(taskId, state, event.error ? String(redactHistoryValue(event.error)) : undefined)
          }
        } catch {
          // A local history write failure must not interrupt the user's agent run.
        }
        emitRuntimeEvent(event)
      },
    })

    ipcMain.handle('codic:app-info', (event) => {
      assertTrustedSender(event)
      return { version: app.getVersion(), platform: process.platform }
    })
    ipcMain.handle('codic:choose-workspace', async (event) => {
      assertTrustedSender(event)
      const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
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
      assertTrustedSender(event)
      return (localStore?.listProjects() ?? [])
        .filter((project) => {
          try { return statSync(project.path).isDirectory() } catch { return false }
        })
        .map(({ path: projectPath, name }) => ({ path: projectPath, name }))
    })
    ipcMain.handle('codic:select-saved-project', (event, workspacePath: unknown) => {
      assertTrustedSender(event)
      const project = requireSavedProject(workspacePath)
      if (!statSync(project.path).isDirectory()) throw new Error('That saved project folder is no longer available.')
      return { path: project.path, name: project.name }
    })
    ipcMain.handle('codic:list-threads', (event, workspacePath: unknown) => {
      assertTrustedSender(event)
      if (!localStore) return []
      const project = requireSavedProject(workspacePath)
      return listThreadSummaries(localStore, project.id)
    })
    ipcMain.handle('codic:load-thread', (event, request: unknown) => {
      assertTrustedSender(event)
      if (!localStore || !request || typeof request !== 'object') throw new Error('Task history is not available yet.')
      const value = request as Record<string, unknown>
      if (typeof value.workspacePath !== 'string' || typeof value.threadId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.threadId)) {
        throw new Error('Choose a valid task from this project.')
      }
      const project = requireSavedProject(value.workspacePath)
      return loadThreadHistory(localStore, project.id, value.threadId)
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
    })
    ipcMain.handle('codic:auth-open-oauth', async (event, value: string) => {
      assertTrustedSender(event)
      if (!isAllowedOAuthUrl(value)) throw new Error('Codic can only open a secure Google or Supabase sign-in link.')
      await shell.openExternal(value)
    })
    ipcMain.handle('codic:models', async (event) => {
      assertTrustedSender(event)
      return requestJson<CodicModelCatalog>('codic/models', 'GET')
    })
    ipcMain.handle('codic:sync-account', async (event) => {
      assertTrustedSender(event)
      return requestJson<{ banned?: boolean; plan?: string; status?: string }>('auth/sync', 'POST', { platform: 'codic' })
    })
    ipcMain.handle('codic:register-device', async (event) => {
      assertTrustedSender(event)
      await registerDevice()
    })
    ipcMain.handle('codic:revoke-device', async (event) => {
      assertTrustedSender(event)
      await revokeDevice()
    })
    ipcMain.handle('codic:start-task', (event, request: unknown) => {
      assertTrustedSender(event)
      if (!request || typeof request !== 'object') throw new Error('Invalid task request.')
      const value = request as Record<string, unknown>
      if (typeof value.workspacePath !== 'string' || typeof value.prompt !== 'string' || typeof value.model !== 'string') {
        throw new Error('Choose a project, model, and prompt before starting a task.')
      }
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
      let threadId = localStore.listThreads(project.id).some((thread) => thread.id === requestedThreadId) ? requestedThreadId : ''
      if (!threadId) {
        threadId = requestedThreadId
        try {
          localStore.createThread({ id: threadId, projectId: project.id, title: value.prompt.trim().slice(0, 120) || 'New task' })
        } catch {
          threadId = randomUUID()
          localStore.createThread({ id: threadId, projectId: project.id, title: value.prompt.trim().slice(0, 120) || 'New task' })
        }
      }
      const taskId = randomUUID()
      localStore.createTask({ id: taskId, threadId, model: value.model, prompt: String(redactHistoryValue(value.prompt)) })
      try {
        return runtimeBridge.startTask({
        workspacePath: value.workspacePath,
        prompt: value.prompt,
        model: value.model,
        conversationId: threadId,
        ...(messages ? { messages } : {}),
        taskId,
        })
      } catch (error) {
        localStore.finishTask(taskId, 'failed', error instanceof Error ? String(redactHistoryValue(error.message)) : 'The task could not be started.')
        throw error
      }
    })
    ipcMain.handle('codic:cancel-task', (event, taskId: unknown) => {
      assertTrustedSender(event)
      if (typeof taskId === 'string') runtimeBridge?.cancelTask(taskId)
    })
    ipcMain.handle('codic:resolve-approval', (event, request: unknown) => {
      assertTrustedSender(event)
      if (!request || typeof request !== 'object') return false
      const value = request as Record<string, unknown>
      if (typeof value.taskId !== 'string' || typeof value.approvalId !== 'string' || (value.decision !== 'allow' && value.decision !== 'deny')) return false
      return runtimeBridge?.resolveApproval({ taskId: value.taskId, approvalId: value.approvalId, decision: value.decision }) ?? false
    })
    ipcMain.handle('codic:workspace-diff', async (event, workspacePath: unknown) => {
      assertTrustedSender(event)
      const project = requireSavedProject(workspacePath)
      return readWorkspaceDiff(project.path)
    })
    ipcMain.handle('codic:terminal-run', async (event, request: unknown) => {
      assertTrustedSender(event)
      if (!request || typeof request !== 'object') throw new Error('Enter a valid terminal command.')
      const value = request as Record<string, unknown>
      const project = requireSavedProject(value.workspacePath)
      if (typeof value.command !== 'string') throw new Error('Enter a terminal command.')
      return runWorkspaceCommand(project.path, value.command)
    })
    ipcMain.handle('codic:list-review-comments', (event, workspacePath: unknown) => {
      assertTrustedSender(event)
      if (!localStore) return []
      const project = requireSavedProject(workspacePath)
      return localStore.listReviewComments(project.id)
    })
    ipcMain.handle('codic:add-review-comment', (event, request: unknown) => {
      assertTrustedSender(event)
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
      assertTrustedSender(event)
      if (typeof taskId !== 'string' || !runtimeBridge) return []
      const workspacePath = findTaskWorkspace(taskId)
      if (!workspacePath) return []
      return runtimeBridge.listCheckpoints(taskId, workspacePath)
    })
    ipcMain.handle('codic:restore-checkpoint', (event, request: unknown) => {
      assertTrustedSender(event)
      if (!request || typeof request !== 'object' || !runtimeBridge) throw new Error('This checkpoint is no longer available.')
      const value = request as Record<string, unknown>
      if (typeof value.taskId !== 'string' || !Number.isInteger(value.seq)) throw new Error('Choose a valid checkpoint.')
      const workspacePath = findTaskWorkspace(value.taskId)
      if (!workspacePath) throw new Error('This checkpoint does not belong to a saved Codic task.')
      return runtimeBridge.restoreCheckpoint(value.taskId, workspacePath, Number(value.seq))
    })
    ipcMain.handle('codic:window-action', (event, action: 'minimize' | 'maximize' | 'close') => {
      assertTrustedSender(event)
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) return
      if (action === 'minimize') window.minimize()
      if (action === 'maximize') window.isMaximized() ? window.unmaximize() : window.maximize()
      if (action === 'close') window.close()
    })

    const initialUrl = process.argv.find((argument) => argument.startsWith('codic://'))
    if (initialUrl) handleDeepLink(initialUrl)
    await createWindow()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    runtimeBridge?.cancelAll()
    runtimeBridge = null
    localStore?.close()
    localStore = null
  })
}
