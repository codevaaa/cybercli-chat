import { contextBridge, ipcRenderer } from 'electron'
import type { CodicBridge, CodicCheckpointSummary, CodicModelCatalog, CodicRuntimeEvent, ReviewComment, TerminalCommandResult, ThreadHistory, ThreadSummary, WorkspaceDiff, WorkspaceInfo } from '../shared/contracts.js'

const authCallbacks = new Set<(url: string) => void>()
let pendingAuthCallback: string | null = null
ipcRenderer.on('codic:auth-callback', (_event, url: string) => {
  if (authCallbacks.size === 0) pendingAuthCallback = url
  else for (const callback of authCallbacks) callback(url)
})

const bridge: CodicBridge = {
  app: {
    getVersion: async () => (await ipcRenderer.invoke('codic:app-info')).version as string,
    getPlatform: () => process.platform,
  },
  workspace: {
    choose: () => ipcRenderer.invoke('codic:choose-workspace') as Promise<WorkspaceInfo | null>,
    listProjects: () => ipcRenderer.invoke('codic:list-projects') as Promise<WorkspaceInfo[]>,
    selectSaved: (workspacePath) => ipcRenderer.invoke('codic:select-saved-project', workspacePath) as Promise<WorkspaceInfo>,
    getDiff: (workspacePath) => ipcRenderer.invoke('codic:workspace-diff', workspacePath) as Promise<WorkspaceDiff>,
  },
  history: {
    listThreads: (workspacePath) => ipcRenderer.invoke('codic:list-threads', workspacePath) as Promise<ThreadSummary[]>,
    loadThread: (workspacePath, threadId) => ipcRenderer.invoke('codic:load-thread', { workspacePath, threadId }) as Promise<ThreadHistory>,
  },
  terminal: {
    run: (workspacePath, command) => ipcRenderer.invoke('codic:terminal-run', { workspacePath, command }) as Promise<TerminalCommandResult>,
  },
  review: {
    listComments: (workspacePath) => ipcRenderer.invoke('codic:list-review-comments', workspacePath) as Promise<ReviewComment[]>,
    addComment: (comment) => ipcRenderer.invoke('codic:add-review-comment', comment) as Promise<ReviewComment>,
  },
  auth: {
    getItem: (key) => ipcRenderer.invoke('codic:auth-storage-get', key) as Promise<string | null>,
    setItem: async (key, value) => { await ipcRenderer.invoke('codic:auth-storage-set', key, value) },
    removeItem: async (key) => { await ipcRenderer.invoke('codic:auth-storage-remove', key) },
    openOAuth: async (url) => { await ipcRenderer.invoke('codic:auth-open-oauth', url) },
    onCallback: (callback) => {
      authCallbacks.add(callback)
      if (pendingAuthCallback) {
        callback(pendingAuthCallback)
        pendingAuthCallback = null
      }
      return () => { authCallbacks.delete(callback) }
    },
  },
  api: {
    getModels: () => ipcRenderer.invoke('codic:models') as Promise<CodicModelCatalog>,
    syncAccount: () => ipcRenderer.invoke('codic:sync-account'),
    registerDevice: async () => { await ipcRenderer.invoke('codic:register-device') },
    revokeDevice: async () => { await ipcRenderer.invoke('codic:revoke-device') },
  },
  runtime: {
    startTask: (request) => ipcRenderer.invoke('codic:start-task', request) as Promise<{ taskId: string }>,
    cancelTask: (taskId) => { void ipcRenderer.invoke('codic:cancel-task', taskId) },
    resolveApproval: (request) => ipcRenderer.invoke('codic:resolve-approval', request) as Promise<boolean>,
    getCheckpoints: (taskId) => ipcRenderer.invoke('codic:get-checkpoints', taskId) as Promise<CodicCheckpointSummary[]>,
    restoreCheckpoint: (request) => ipcRenderer.invoke('codic:restore-checkpoint', request) as Promise<{ restored: number; deleted: number }>,
    onEvent: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, value: CodicRuntimeEvent) => callback(value)
      ipcRenderer.on('codic:runtime-event', handler)
      return () => ipcRenderer.removeListener('codic:runtime-event', handler)
    },
  },
  window: {
    minimize: () => { void ipcRenderer.invoke('codic:window-action', 'minimize') },
    toggleMaximize: () => { void ipcRenderer.invoke('codic:window-action', 'maximize') },
    close: () => { void ipcRenderer.invoke('codic:window-action', 'close') },
  },
}

contextBridge.exposeInMainWorld('codic', bridge)
