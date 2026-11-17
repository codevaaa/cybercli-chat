import { contextBridge, ipcRenderer } from 'electron'
import type { CodicBridge, CodicCheckpointSummary, CodicDiagnostics, CodicModelCatalog, CodicRuntimeEvent, CodicTerminalEvent, CodicUpdateCheck, CompanionActivity, ReviewComment, ScheduledTask, TerminalCommandResult, ThreadHistory, ThreadSummary, WorkspaceDiff, WorkspaceInfo, ContextAttachmentSelection } from '../shared/contracts.js'

const authCallbacks = new Set<(url: string) => void>()
const signedOutCallbacks = new Set<() => void>()
const terminalCallbacks = new Set<(event: CodicTerminalEvent) => void>()
const companionStateCallbacks = new Set<(state: { enabled: boolean; activity: CompanionActivity }) => void>()
const companionActivityCallbacks = new Set<(activity: CompanionActivity) => void>()
const companionPromptCallbacks = new Set<(prompt: string) => void>()
let pendingAuthCallback: string | null = null
ipcRenderer.on('codic:auth-callback', (_event, url: string) => {
  if (authCallbacks.size === 0) pendingAuthCallback = url
  else for (const callback of authCallbacks) callback(url)
})
ipcRenderer.on('codic:auth-signed-out', () => {
  for (const callback of signedOutCallbacks) callback()
})
const windowStateCallbacks = new Set<(state: { maximized: boolean }) => void>()
ipcRenderer.on('codic:window-state', (_event, state: { maximized: boolean }) => {
  for (const callback of windowStateCallbacks) callback({ maximized: Boolean(state?.maximized) })
})
ipcRenderer.on('codic:terminal-event', (_event, terminalEvent: CodicTerminalEvent) => {
  for (const callback of terminalCallbacks) callback(terminalEvent)
})
ipcRenderer.on('codic:companion-state', (_event, state: { enabled: boolean; activity: CompanionActivity }) => {
  for (const callback of companionStateCallbacks) callback({ enabled: Boolean(state?.enabled), activity: state?.activity || 'idle' })
})
ipcRenderer.on('codic:companion-activity', (_event, activity: CompanionActivity) => {
  for (const callback of companionActivityCallbacks) callback(activity || 'idle')
})
ipcRenderer.on('codic:companion-prompt', (_event, prompt: string) => {
  if (typeof prompt !== 'string') return
  for (const callback of companionPromptCallbacks) callback(prompt)
})

const bridge: CodicBridge = {
  companion: {
    getState: () => ipcRenderer.invoke('codic:companion-get-state') as Promise<{ enabled: boolean; activity: CompanionActivity }>,
    getActivity: () => ipcRenderer.invoke('codic:companion-get-activity') as Promise<CompanionActivity>,
    toggle: () => ipcRenderer.invoke('codic:companion-toggle') as Promise<{ enabled: boolean }>,
    focusApp: async () => { await ipcRenderer.invoke('codic:companion-focus') },
    hide: async () => { await ipcRenderer.invoke('codic:companion-hide') },
    submitPrompt: async (prompt) => { await ipcRenderer.invoke('codic:companion-prompt', prompt) },
    onStateChange: (callback) => { companionStateCallbacks.add(callback); return () => { companionStateCallbacks.delete(callback) } },
    onActivityChange: (callback) => { companionActivityCallbacks.add(callback); return () => { companionActivityCallbacks.delete(callback) } },
    onPrompt: (callback) => { companionPromptCallbacks.add(callback); return () => { companionPromptCallbacks.delete(callback) } },
  },
  app: {
    getVersion: async () => (await ipcRenderer.invoke('codic:app-info')).version as string,
    getPlatform: () => process.platform,
    quit: async () => { await ipcRenderer.invoke('codic:app-quit') },
    openWebsite: async (page) => { await ipcRenderer.invoke('codic:open-website', page) },
    checkForUpdates: () => ipcRenderer.invoke('codic:check-updates'),
    downloadUpdate: async () => { await ipcRenderer.invoke('codic:download-update') },
    installUpdate: async () => { await ipcRenderer.invoke('codic:install-update') },
    getUpdateState: () => ipcRenderer.invoke('codic:get-update-state') as Promise<CodicUpdateCheck>,
    onUpdateState: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, state: CodicUpdateCheck) => callback(state)
      ipcRenderer.on('codic:update-state', handler)
      return () => ipcRenderer.removeListener('codic:update-state', handler)
    },
    getTaskManagerData: () => ipcRenderer.invoke('codic:task-manager-data') as Promise<CodicDiagnostics>,
    startPerformanceTrace: async () => { await ipcRenderer.invoke('codic:trace-start') },
    stopPerformanceTrace: () => ipcRenderer.invoke('codic:trace-stop') as Promise<string | null>,
  },
  workspace: {
    choose: () => ipcRenderer.invoke('codic:choose-workspace') as Promise<WorkspaceInfo | null>,
    chooseNewProject: () => ipcRenderer.invoke('codic:choose-new-project') as Promise<WorkspaceInfo | null>,
    chooseContextFiles: () => ipcRenderer.invoke('codic:choose-context-files') as Promise<ContextAttachmentSelection>,
    chooseContextFolder: () => ipcRenderer.invoke('codic:choose-context-folder') as Promise<ContextAttachmentSelection>,
    removeContextAttachment: async (attachmentId) => { await ipcRenderer.invoke('codic:remove-context-attachment', attachmentId) },
    listProjects: () => ipcRenderer.invoke('codic:list-projects') as Promise<WorkspaceInfo[]>,
    selectSaved: (workspacePath) => ipcRenderer.invoke('codic:select-saved-project', workspacePath) as Promise<WorkspaceInfo>,
    getDiff: (workspacePath) => ipcRenderer.invoke('codic:workspace-diff', workspacePath) as Promise<WorkspaceDiff>,
  },
  history: {
    listThreads: (workspacePath) => ipcRenderer.invoke('codic:list-threads', workspacePath) as Promise<ThreadSummary[]>,
    listArchivedThreads: (workspacePath) => ipcRenderer.invoke('codic:list-archived-threads', workspacePath) as Promise<ThreadSummary[]>,
    loadThread: (workspacePath, threadId) => ipcRenderer.invoke('codic:load-thread', { workspacePath, threadId }) as Promise<ThreadHistory>,
    renameThread: (request) => ipcRenderer.invoke('codic:rename-thread', request) as Promise<ThreadSummary>,
    setThreadPinned: (request) => ipcRenderer.invoke('codic:set-thread-pinned', request) as Promise<ThreadSummary>,
    setThreadArchived: (request) => ipcRenderer.invoke('codic:set-thread-archived', request) as Promise<ThreadSummary>,
    forkThread: (request) => ipcRenderer.invoke('codic:fork-thread', request) as Promise<ThreadSummary>,
    getProfileStats: () => ipcRenderer.invoke('codic:profile-stats') as Promise<{ taskCount: number; completedRuns: number; totalTokens: number; tokensEstimated: boolean; longestTaskSeconds: number; activity: Array<{ date: string; count: number }> }>,
    exportMarkdown: (request) => ipcRenderer.invoke('codic:export-thread-markdown', request) as Promise<string | null>,
    copyText: async (text) => { await ipcRenderer.invoke('codic:copy-text', text) },
  },
  schedules: {
    list: (workspacePath) => ipcRenderer.invoke('codic:list-scheduled-tasks', workspacePath) as Promise<ScheduledTask[]>,
    create: (request) => ipcRenderer.invoke('codic:create-scheduled-task', request) as Promise<ScheduledTask>,
    setEnabled: (request) => ipcRenderer.invoke('codic:set-scheduled-task-enabled', request) as Promise<ScheduledTask>,
    delete: async (request) => { await ipcRenderer.invoke('codic:delete-scheduled-task', request) },
  },
  terminal: {
    run: (workspacePath, command) => ipcRenderer.invoke('codic:terminal-run', { workspacePath, command }) as Promise<TerminalCommandResult>,
    open: (workspacePath) => ipcRenderer.invoke('codic:terminal-open', workspacePath) as Promise<{ sessionId: string; shell: string }>,
    write: async (sessionId, data) => { await ipcRenderer.invoke('codic:terminal-write', { sessionId, data }) },
    resize: async (sessionId, cols, rows) => { await ipcRenderer.invoke('codic:terminal-resize', { sessionId, cols, rows }) },
    close: async (sessionId) => { await ipcRenderer.invoke('codic:terminal-close', sessionId) },
    onEvent: (callback) => { terminalCallbacks.add(callback); return () => { terminalCallbacks.delete(callback) } },
  },
  review: {
    listComments: (workspacePath) => ipcRenderer.invoke('codic:list-review-comments', workspacePath) as Promise<ReviewComment[]>,
    addComment: (comment) => ipcRenderer.invoke('codic:add-review-comment', comment) as Promise<ReviewComment>,
  },
  auth: {
    getLocalPreviewStatus: () => ipcRenderer.invoke('codic:local-preview-status') as Promise<{ available: boolean; enabled: boolean }>,
    continueLocally: async () => { await ipcRenderer.invoke('codic:local-preview-enable') },
    getItem: (key) => ipcRenderer.invoke('codic:auth-storage-get', key) as Promise<string | null>,
    setItem: async (key, value) => { await ipcRenderer.invoke('codic:auth-storage-set', key, value) },
    removeItem: async (key) => { await ipcRenderer.invoke('codic:auth-storage-remove', key) },
    beginCodevaSignIn: async () => { await ipcRenderer.invoke('codic:auth-begin-codeva-sign-in') },
    redeemHandoff: (ticket) => ipcRenderer.invoke('codic:auth-redeem-handoff', ticket) as Promise<{ access_token: string; refresh_token: string }>,
    onCallback: (callback) => {
      authCallbacks.add(callback)
      if (pendingAuthCallback) {
        callback(pendingAuthCallback)
        pendingAuthCallback = null
      }
      return () => { authCallbacks.delete(callback) }
    },
    onSignedOut: (callback) => { signedOutCallbacks.add(callback); return () => { signedOutCallbacks.delete(callback) } },
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
    cancelSubagent: (taskId, agentId) => ipcRenderer.invoke('codic:cancel-subagent', { taskId, agentId }) as Promise<boolean>,
    resolveApproval: (request) => ipcRenderer.invoke('codic:resolve-approval', request) as Promise<boolean>,
    getCheckpoints: (taskId) => ipcRenderer.invoke('codic:get-checkpoints', taskId) as Promise<CodicCheckpointSummary[]>,
    restoreCheckpoint: (request) => ipcRenderer.invoke('codic:restore-checkpoint', request) as Promise<{ restored: number; deleted: number }>,
    onEvent: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, value: { event: CodicRuntimeEvent; taskId: string }) => callback(value.event, value.taskId)
      ipcRenderer.on('codic:runtime-event', handler)
      return () => ipcRenderer.removeListener('codic:runtime-event', handler)
    },
  },
  window: {
    getState: () => ipcRenderer.invoke('codic:window-state') as Promise<{ maximized: boolean }>,
    onStateChange: (callback) => { windowStateCallbacks.add(callback); return () => { windowStateCallbacks.delete(callback) } },
    minimize: () => { void ipcRenderer.invoke('codic:window-action', 'minimize') },
    toggleMaximize: () => { void ipcRenderer.invoke('codic:window-action', 'maximize') },
    close: () => { void ipcRenderer.invoke('codic:window-action', 'close') },
    setZoomFactor: (zoom) => { void ipcRenderer.invoke('codic:window-zoom', zoom) },
    toggleFullScreen: () => { void ipcRenderer.invoke('codic:window-action', 'fullscreen') },
    openBlank: async () => { await ipcRenderer.invoke('codic:open-blank-window') },
    editAction: async (action) => { await ipcRenderer.invoke('codic:edit-action', action) },
    openThread: async (workspacePath, threadId) => { await ipcRenderer.invoke('codic:open-thread-window', { workspacePath, threadId }) },
    openBrowser: async (url) => { await ipcRenderer.invoke('codic:browser-open', url) },
    browserAction: async (action) => { await ipcRenderer.invoke('codic:browser-action', action) },
  },
}

contextBridge.exposeInMainWorld('codic', bridge)
