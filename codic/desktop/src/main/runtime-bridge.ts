import { randomUUID } from 'node:crypto'
import { existsSync, realpathSync, statSync } from 'node:fs'
import path from 'node:path'
import { CodicRuntime, type CodicCheckpointSummary, type CodicRuntimeEvent, type CodicRuntimeOptions } from '../../../../cybercoder/packages/codic-runtime/src/index.js'

const MAX_ACTIVE_PRIMARY_RUNS = 1
type RuntimeHandle = Pick<CodicRuntime, 'start' | 'cancel' | 'cancelSubagent' | 'resolveApproval' | 'listCheckpoints' | 'restoreCheckpoint'>

export interface StartTaskRequest {
  workspacePath: string
  prompt: string
  model: string
  reasoningEffort?: 'low' | 'medium' | 'high'
  approvalPolicy?: 'ask' | 'safe-reads' | 'full-access'
  subagentsEnabled?: boolean
  maxParallelSubagents?: number
  conversationId?: string
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
  taskId?: string
}

export interface ResolveApprovalRequest {
  taskId: string
  approvalId: string
  decision: 'allow' | 'deny'
}

interface RuntimeRecord {
  runtime: RuntimeHandle
  workspacePath: string
  model: string
  runId: string
}

interface RuntimeBridgeOptions {
  apiBaseUrl: string
  getAccessToken: () => Promise<string | null>
  onEvent: (event: CodicRuntimeEvent, taskId: string) => void
  /** Test seam; production uses CodicRuntime. This does not change runtime permissions. */
  createRuntime?: (options: CodicRuntimeOptions) => RuntimeHandle
}

/** Bridges trusted IPC requests to one live primary runtime scoped to a selected project. */
export class CodicRuntimeBridge {
  // Keep only live primary runs here. Finished runs and checkpoint-only runtimes
  // can be recreated from their task ID and workspace when review is requested.
  private readonly tasks = new Map<string, RuntimeRecord>()
  private readonly primaryRunReservations = new Set<string>()

  constructor(private readonly options: RuntimeBridgeOptions) {}

  hasActiveTask(workspacePath: string): boolean {
    let canonicalPath: string
    try { canonicalPath = this.resolveWorkspace(workspacePath) } catch { return false }
    return [...this.tasks.values()].some((task) => task.workspacePath === canonicalPath)
  }

  /** Counts parent coding runs only; read-only helper agents may run within the active task. */
  activePrimaryRunCount(): number {
    return this.tasks.size + this.primaryRunReservations.size
  }

  /** Reserve the shared primary slot while a scheduled task prepares its window. */
  reservePrimaryRun(): string | null {
    if (this.activePrimaryRunCount() >= MAX_ACTIVE_PRIMARY_RUNS) return null
    const reservationId = randomUUID()
    this.primaryRunReservations.add(reservationId)
    return reservationId
  }

  releasePrimaryRunReservation(reservationId: string): void {
    this.primaryRunReservations.delete(reservationId)
  }

  startTask(request: StartTaskRequest, reservationId?: string): { taskId: string } {
    const prompt = request.prompt.trim()
    if (!prompt) throw new Error('Write a prompt before starting a task.')
    const workspacePath = this.resolveWorkspace(request.workspacePath)
    if (this.hasActiveTask(workspacePath)) {
      throw new Error('A task is already running in this project. Stop it or wait for it to finish.')
    }
    const hasReservation = typeof reservationId === 'string' && this.primaryRunReservations.has(reservationId)
    if (reservationId && !hasReservation) throw new Error('The scheduled task could not reserve a run slot. Try again.')
    if (!hasReservation && this.activePrimaryRunCount() >= MAX_ACTIVE_PRIMARY_RUNS) {
      throw new Error('A Codic task is already running in another window. Stop it or wait for it to finish before starting another task.')
    }

    const taskId = request.taskId || randomUUID()
    let record: RuntimeRecord | null = null
    let runtime: RuntimeHandle | null = null
    let didFinish = false
    let runId = ''
    const notify = (event: CodicRuntimeEvent) => {
      if (event.type === 'run_finished') {
        if (didFinish) return
        didFinish = true
        if (record && this.tasks.get(taskId) === record) this.tasks.delete(taskId)
      }
      this.options.onEvent(event, taskId)
    }
    try {
      runtime = this.createRuntime({
        workspaceRoot: workspacePath,
        apiBaseUrl: this.options.apiBaseUrl,
        getAccessToken: this.options.getAccessToken,
        model: request.model || 'auto',
        reasoningEffort: request.reasoningEffort ?? 'medium',
        approvalPolicy: request.approvalPolicy ?? 'ask',
        subagentsEnabled: request.subagentsEnabled !== false,
        maxParallelSubagents: request.maxParallelSubagents,
        checkpointSessionId: taskId,
        onEvent: (event: CodicRuntimeEvent) => {
          if (event.type === 'run_started') {
            runId = event.runId
            if (record) record.runId = event.runId
          }
          notify(event)
        },
      })
      record = { runtime, workspacePath, model: request.model || 'auto', runId }
    } catch (error) {
      if (hasReservation) this.primaryRunReservations.delete(reservationId!)
      notify({
        type: 'run_finished',
        runId: `startup-${taskId}`,
        reason: 'error',
        error: error instanceof Error ? error.message : 'The task could not be started.',
      })
      throw error
    }

    if (hasReservation) this.primaryRunReservations.delete(reservationId!)
    this.tasks.set(taskId, record)
    try {
      record.runId = runtime.start(request.messages?.length ? request.messages : [{ role: 'user', content: prompt }])
      return { taskId }
    } catch (error) {
      this.tasks.delete(taskId)
      notify({
        type: 'run_finished',
        runId: runId || `startup-${taskId}`,
        reason: 'error',
        error: error instanceof Error ? error.message : 'The task could not be started.',
      })
      // Notify first so a cancel event emitted while cleaning up cannot replace
      // the actual start failure as the run's single terminal result.
      try { runtime.cancel() } catch { /* Preserve the startup error while attempting cleanup. */ }
      throw error
    }
  }

  cancelTask(taskId: string): void {
    this.tasks.get(taskId)?.runtime.cancel()
  }

  cancelSubagent(taskId: string, agentId: string): boolean {
    if (!/^[0-9a-f-]{36}-subagent-\d+-[0-9a-f]{8}$/i.test(agentId)) return false
    return this.tasks.get(taskId)?.runtime.cancelSubagent(agentId) ?? false
  }

  resolveApproval(request: ResolveApprovalRequest): boolean {
    const record = this.tasks.get(request.taskId)
    if (!record) return false
    return record.runtime.resolveApproval(request.approvalId, request.decision === 'allow')
  }

  listCheckpoints(taskId: string, workspacePath: string): CodicCheckpointSummary[] {
    return this.getRecord(taskId, workspacePath).runtime.listCheckpoints()
  }

  restoreCheckpoint(taskId: string, workspacePath: string, seq: number): { restored: number; deleted: number } {
    return this.getRecord(taskId, workspacePath).runtime.restoreCheckpoint(seq)
  }

  cancelAll(): void {
    for (const { runtime } of this.tasks.values()) runtime.cancel()
    this.tasks.clear()
    this.primaryRunReservations.clear()
  }

  private resolveWorkspace(workspacePath: string): string {
    if (typeof workspacePath !== 'string' || !workspacePath.trim() || workspacePath.includes('\0')) {
      throw new Error('Choose a valid project folder first.')
    }
    const absolute = path.resolve(workspacePath)
    if (!existsSync(absolute) || !statSync(absolute).isDirectory()) throw new Error('That project folder is no longer available.')
    return realpathSync(absolute)
  }

  private getRecord(taskId: string, requestedWorkspace: string): RuntimeRecord {
    if (typeof taskId !== 'string' || !taskId.trim()) throw new Error('Choose a task first.')
    const workspacePath = this.resolveWorkspace(requestedWorkspace)
    const existing = this.tasks.get(taskId)
    if (existing) {
      if (existing.workspacePath !== workspacePath) throw new Error('This task belongs to another project folder.')
      return existing
    }
    let record: RuntimeRecord
    const runtime = this.createRuntime({
      workspaceRoot: workspacePath,
      apiBaseUrl: this.options.apiBaseUrl,
      getAccessToken: this.options.getAccessToken,
      model: 'auto',
      checkpointSessionId: taskId,
      onEvent: (event) => this.options.onEvent(event, taskId),
    })
    record = { runtime, workspacePath, model: 'auto', runId: '' }
    return record
  }

  private createRuntime(options: CodicRuntimeOptions): RuntimeHandle {
    return this.options.createRuntime?.(options) ?? new CodicRuntime(options)
  }
}
