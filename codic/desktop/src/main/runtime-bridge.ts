import { randomUUID } from 'node:crypto'
import { existsSync, realpathSync, statSync } from 'node:fs'
import path from 'node:path'
import { CodicRuntime, type CodicCheckpointSummary, type CodicRuntimeEvent } from '../../../../cybercoder/packages/codic-runtime/src/index.js'

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
  runtime: CodicRuntime
  workspacePath: string
  model: string
  runId: string
  finished: boolean
}

interface RuntimeBridgeOptions {
  apiBaseUrl: string
  getAccessToken: () => Promise<string | null>
  onEvent: (event: CodicRuntimeEvent, taskId: string) => void
}

/** Bridges trusted IPC requests to a local runtime scoped to one selected project. */
export class CodicRuntimeBridge {
  private readonly tasks = new Map<string, RuntimeRecord>()

  constructor(private readonly options: RuntimeBridgeOptions) {}

  hasActiveTask(workspacePath: string): boolean {
    let canonicalPath: string
    try { canonicalPath = this.resolveWorkspace(workspacePath) } catch { return false }
    return [...this.tasks.values()].some((task) => !task.finished && task.workspacePath === canonicalPath)
  }

  startTask(request: StartTaskRequest): { taskId: string } {
    const prompt = request.prompt.trim()
    if (!prompt) throw new Error('Write a prompt before starting a task.')
    const workspacePath = this.resolveWorkspace(request.workspacePath)
    if ([...this.tasks.values()].some((task) => !task.finished && task.workspacePath === workspacePath)) {
      throw new Error('A task is already running in this project. Stop it or wait for it to finish.')
    }

    const taskId = request.taskId || randomUUID()
    let record: RuntimeRecord
    const runtime = new CodicRuntime({
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
        if (event.type === 'run_started') record.runId = event.runId
        this.options.onEvent(event, taskId)
        if (event.type === 'run_finished') record.finished = true
      },
    })

    record = { runtime, workspacePath, model: request.model || 'auto', runId: '', finished: false }
    this.tasks.set(taskId, record)
    try {
      record.runId = runtime.start(request.messages?.length ? request.messages : [{ role: 'user', content: prompt }])
      return { taskId }
    } catch (error) {
      this.tasks.delete(taskId)
      runtime.cancel()
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
    const runtime = new CodicRuntime({
      workspaceRoot: workspacePath,
      apiBaseUrl: this.options.apiBaseUrl,
      getAccessToken: this.options.getAccessToken,
      model: 'auto',
      checkpointSessionId: taskId,
      onEvent: (event) => this.options.onEvent(event, taskId),
    })
    record = { runtime, workspacePath, model: 'auto', runId: '', finished: true }
    this.tasks.set(taskId, record)
    return record
  }
}
