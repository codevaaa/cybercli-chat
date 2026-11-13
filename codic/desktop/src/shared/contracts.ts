export type ApiMethod = 'GET' | 'POST'

export interface ModelOption {
  id: string
  name: string
  provider?: string
  available?: boolean
  locked?: boolean
}

export interface CodicUsageLimit {
  limit: number | null
  used: number
  remaining: number | null
  resetsAt: string | null
}

export interface CodicLimits {
  requestsPerHour: number
  monthlyTokens: CodicUsageLimit
}

export interface CodicCheckpointSummary {
  seq: number
  label: string
  createdAt: number
  files: string[]
}

export interface WorkspaceDiff {
  isGitRepository: boolean
  patch: string
  untrackedFiles: Array<{ path: string; content: string }>
  error?: string
}

export interface ReviewComment {
  id: string
  projectId: string
  filePath: string
  lineNumber: number
  side: 'old' | 'new'
  body: string
  createdAt: string
}

export interface TerminalCommandResult {
  exitCode: number
  output: string
  truncated: boolean
  timedOut: boolean
}

export type CodicTerminalEvent =
  | { type: 'data'; sessionId: string; data: string }
  | { type: 'exit'; sessionId: string; exitCode: number; signal?: number | null }

export interface CodicModelCatalog {
  models: ModelOption[]
  plan?: string
  limits?: CodicLimits
}

export interface CodicUpdateCheck {
  currentVersion: string
  latestVersion: string | null
  available: boolean
  downloadPath: string | null
  message: string
  phase: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error' | 'unsupported'
  percent: number | null
  transferredBytes: number | null
  totalBytes: number | null
  bytesPerSecond: number | null
}

export interface CodicDiagnostics {
  version: string
  platform: string
  processCount: number
  memoryMb: number
  processes: Array<{ name: string; type: string; pid: number; cpuPercent: number; memoryMb: number }>
}

export type EditAction = 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'delete' | 'select-all'

export type RuntimeCoreEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; id: string; name: string; output: string; ok: boolean }
  | { type: 'usage'; inputTokens: number; outputTokens: number; estimated?: boolean }
  | { type: 'iteration'; index: number; max: number }
  | { type: 'context'; note: string; tokens: number }
  | { type: 'subagent_progress'; agentId: string; skill: string; status: 'started' | 'working' | 'completed' | 'failed'; message?: string }
  | { type: 'done'; reason: 'end_turn' | 'max_iterations' | 'error'; error?: string }

export type CodicRuntimeEvent =
  | { type: 'run_started'; runId: string }
  | { type: 'agent_event'; runId: string; event: RuntimeCoreEvent }
  | { type: 'subagent_progress'; runId: string; agentId: string; label: string; skill: 'research' | 'plan' | 'code-review'; status: 'running' | 'done' | 'error'; summary?: string; durationMs?: number; error?: string }
  | { type: 'approval_required'; runId: string; approvalId: string; toolName: string; input: Record<string, unknown>; summary: string; unsandboxed: boolean }
  | { type: 'tool_blocked'; runId: string; toolName: string; reason: string }
  | { type: 'checkpoint_created'; runId: string; checkpoint: CodicCheckpointSummary }
  | { type: 'run_finished'; runId: string; reason: 'end_turn' | 'max_iterations' | 'error' | 'cancelled'; error?: string }

export interface CodicRuntimeEventEnvelope { taskId: string; event: CodicRuntimeEvent }

export interface WorkspaceInfo {
  path: string
  name: string
}

export interface ThreadSummary {
  id: string
  title: string
  updatedAt: string
  lastTaskId: string | null
  lastTaskState: 'running' | 'completed' | 'cancelled' | 'failed' | 'interrupted' | null
  pinned: boolean
  archived: boolean
  parentThreadId: string | null
}

export interface ScheduledTask {
  id: string
  projectId: string
  sourceThreadId: string | null
  title: string
  prompt: string
  model: string
  reasoningEffort: 'low' | 'medium' | 'high'
  recurrence: 'once' | 'daily' | 'weekly'
  nextRunAt: string
  enabled: boolean
  lastRunAt: string | null
  createdAt: string
}

export interface ThreadHistory {
  thread: { id: string; projectId: string; title: string; createdAt: string; updatedAt: string }
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string }>
  lastTaskId: string | null
  truncated: boolean
}

export interface CodicBridge {
  app: {
    getVersion(): Promise<string>
    getPlatform(): string
    quit(): Promise<void>
    openWebsite(path: '/help' | '/status' | '/contact' | '/downloads/codic'): Promise<void>
    checkForUpdates(): Promise<CodicUpdateCheck>
    downloadUpdate(): Promise<void>
    installUpdate(): Promise<void>
    getUpdateState(): Promise<CodicUpdateCheck>
    onUpdateState(callback: (state: CodicUpdateCheck) => void): () => void
    getTaskManagerData(): Promise<CodicDiagnostics>
    startPerformanceTrace(): Promise<void>
    stopPerformanceTrace(): Promise<string | null>
  }
  workspace: {
    choose(): Promise<WorkspaceInfo | null>
    chooseNewProject(): Promise<WorkspaceInfo | null>
    listProjects(): Promise<WorkspaceInfo[]>
    selectSaved(workspacePath: string): Promise<WorkspaceInfo>
    getDiff(workspacePath: string): Promise<WorkspaceDiff>
  }
  history: {
    listThreads(workspacePath: string): Promise<ThreadSummary[]>
    listArchivedThreads(workspacePath: string): Promise<ThreadSummary[]>
    loadThread(workspacePath: string, threadId: string): Promise<ThreadHistory>
    renameThread(request: { workspacePath: string; threadId: string; title: string }): Promise<ThreadSummary>
    setThreadPinned(request: { workspacePath: string; threadId: string; pinned: boolean }): Promise<ThreadSummary>
    setThreadArchived(request: { workspacePath: string; threadId: string; archived: boolean }): Promise<ThreadSummary>
    forkThread(request: { workspacePath: string; threadId: string; mode: 'fork' | 'side-chat' }): Promise<ThreadSummary>
    getProfileStats(): Promise<{ taskCount: number; completedRuns: number; totalTokens: number; tokensEstimated: boolean; longestTaskSeconds: number; activity: Array<{ date: string; count: number }> }>
    exportMarkdown(request: { workspacePath: string; threadId: string }): Promise<string | null>
    copyText(text: string): Promise<void>
  }
  schedules: {
    list(workspacePath: string): Promise<ScheduledTask[]>
    create(request: { workspacePath: string; sourceThreadId: string | null; title: string; prompt: string; model: string; reasoningEffort: 'low' | 'medium' | 'high'; recurrence: 'once' | 'daily' | 'weekly'; nextRunAt: string }): Promise<ScheduledTask>
    setEnabled(request: { workspacePath: string; scheduleId: string; enabled: boolean }): Promise<ScheduledTask>
    delete(request: { workspacePath: string; scheduleId: string }): Promise<void>
  }
  terminal: {
    run(workspacePath: string, command: string): Promise<TerminalCommandResult>
    open(workspacePath: string): Promise<{ sessionId: string; shell: string }>
    write(sessionId: string, data: string): Promise<void>
    resize(sessionId: string, cols: number, rows: number): Promise<void>
    close(sessionId: string): Promise<void>
    onEvent(callback: (event: CodicTerminalEvent) => void): () => void
  }
  review: {
    listComments(workspacePath: string): Promise<ReviewComment[]>
    addComment(comment: { workspacePath: string; filePath: string; lineNumber: number; side: 'old' | 'new'; body: string }): Promise<ReviewComment>
  }
  auth: {
    getLocalPreviewStatus(): Promise<{ available: boolean; enabled: boolean }>
    continueLocally(): Promise<void>
    getItem(key: string): Promise<string | null>
    setItem(key: string, value: string): Promise<void>
    removeItem(key: string): Promise<void>
    beginCodevaSignIn(): Promise<void>
    redeemHandoff(ticket: string): Promise<{ access_token: string; refresh_token: string }>
    onCallback(callback: (url: string) => void): () => void
    onSignedOut(callback: () => void): () => void
  }
  api: {
    getModels(): Promise<CodicModelCatalog>
    syncAccount(): Promise<{ banned?: boolean; plan?: string; status?: string }>
    registerDevice(): Promise<void>
    revokeDevice(): Promise<void>
  }
  runtime: {
    startTask(request: {
      workspacePath: string
      prompt: string
      model: string
      reasoningEffort: 'low' | 'medium' | 'high'
      approvalPolicy: 'ask' | 'safe-reads' | 'full-access'
      temporary?: boolean
      conversationId?: string
      messages?: Array<{ role: 'user' | 'assistant'; content: string }>
    }): Promise<{ taskId: string }>
    cancelTask(taskId: string): void
    resolveApproval(request: { taskId: string; approvalId: string; decision: 'allow' | 'deny' }): Promise<boolean>
    getCheckpoints(taskId: string): Promise<CodicCheckpointSummary[]>
    restoreCheckpoint(request: { taskId: string; seq: number }): Promise<{ restored: number; deleted: number }>
    onEvent(callback: (event: CodicRuntimeEvent, taskId: string) => void): () => void
  }
  window: {
    getState(): Promise<{ maximized: boolean }>
    onStateChange(callback: (state: { maximized: boolean }) => void): () => void
    minimize(): void
    toggleMaximize(): void
    close(): void
    setZoomFactor(zoom: number): void
    toggleFullScreen(): void
    openBlank(): Promise<void>
    editAction(action: EditAction): Promise<void>
    openThread(workspacePath: string, threadId: string): Promise<void>
    openBrowser(url?: string): Promise<void>
    browserAction(action: 'back' | 'forward' | 'reload' | 'external' | 'close'): Promise<void>
  }
}
