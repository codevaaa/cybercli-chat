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

export interface CodicModelCatalog {
  models: ModelOption[]
  plan?: string
  limits?: CodicLimits
}

export type RuntimeCoreEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; id: string; name: string; output: string; ok: boolean }
  | { type: 'usage'; inputTokens: number; outputTokens: number; estimated?: boolean }
  | { type: 'iteration'; index: number; max: number }
  | { type: 'context'; note: string; tokens: number }
  | { type: 'done'; reason: 'end_turn' | 'max_iterations' | 'error'; error?: string }

export type CodicRuntimeEvent =
  | { type: 'run_started'; runId: string }
  | { type: 'agent_event'; runId: string; event: RuntimeCoreEvent }
  | { type: 'approval_required'; runId: string; approvalId: string; toolName: string; input: Record<string, unknown>; summary: string; unsandboxed: boolean }
  | { type: 'tool_blocked'; runId: string; toolName: string; reason: string }
  | { type: 'checkpoint_created'; runId: string; checkpoint: CodicCheckpointSummary }
  | { type: 'run_finished'; runId: string; reason: 'end_turn' | 'max_iterations' | 'error' | 'cancelled'; error?: string }

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
  }
  workspace: {
    choose(): Promise<WorkspaceInfo | null>
    listProjects(): Promise<WorkspaceInfo[]>
    selectSaved(workspacePath: string): Promise<WorkspaceInfo>
    getDiff(workspacePath: string): Promise<WorkspaceDiff>
  }
  history: {
    listThreads(workspacePath: string): Promise<ThreadSummary[]>
    loadThread(workspacePath: string, threadId: string): Promise<ThreadHistory>
  }
  terminal: {
    run(workspacePath: string, command: string): Promise<TerminalCommandResult>
  }
  review: {
    listComments(workspacePath: string): Promise<ReviewComment[]>
    addComment(comment: { workspacePath: string; filePath: string; lineNumber: number; side: 'old' | 'new'; body: string }): Promise<ReviewComment>
  }
  auth: {
    getItem(key: string): Promise<string | null>
    setItem(key: string, value: string): Promise<void>
    removeItem(key: string): Promise<void>
    openOAuth(url: string): Promise<void>
    onCallback(callback: (url: string) => void): () => void
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
      conversationId?: string
      messages?: Array<{ role: 'user' | 'assistant'; content: string }>
    }): Promise<{ taskId: string }>
    cancelTask(taskId: string): void
    resolveApproval(request: { taskId: string; approvalId: string; decision: 'allow' | 'deny' }): Promise<boolean>
    getCheckpoints(taskId: string): Promise<CodicCheckpointSummary[]>
    restoreCheckpoint(request: { taskId: string; seq: number }): Promise<{ restored: number; deleted: number }>
    onEvent(callback: (event: CodicRuntimeEvent) => void): () => void
  }
  window: {
    minimize(): void
    toggleMaximize(): void
    close(): void
  }
}
