/**
 * TaskGraph — Directed Acyclic Graph of agent tasks
 *
 * Each node = one task assigned to one agent type.
 * Edges = dependency relationships (B cannot start until A completes).
 * The scheduler walks the graph and releases tasks whose dependencies are done.
 *
 * Inspired by Antigravity 2.0's dependency graph architecture.
 */
import { EventEmitter } from 'eventemitter3'
import { v4 as uuid } from 'uuid'

export const TASK_STATUS = {
  PENDING:    'pending',
  READY:      'ready',
  RUNNING:    'running',
  COMPLETED:  'completed',
  FAILED:     'failed',
  SKIPPED:    'skipped',
  CANCELLED:  'cancelled',
}

export class Task {
  constructor({ id, title, description, agentType, model, tools, inputs, dependencies = [], priority = 5, maxRetries = 2, metadata = {} }) {
    this.id           = id || uuid()
    this.title        = title
    this.description  = description
    this.agentType    = agentType        // 'coder' | 'tester' | 'debugger' | etc.
    this.model        = model || null    // override default agent model
    this.tools        = tools || []      // tools this task may use
    this.inputs       = inputs || {}     // data passed in from dependencies
    this.dependencies = dependencies     // array of task IDs that must complete first
    this.priority     = priority         // 1-10, higher = more urgent
    this.maxRetries   = maxRetries
    this.retryCount   = 0
    this.metadata     = metadata

    this.status       = TASK_STATUS.PENDING
    this.output       = null
    this.error        = null
    this.startedAt    = null
    this.completedAt  = null
    this.durationMs   = null
    this.agentId      = null             // assigned worker agent ID
  }

  toJSON() {
    return {
      id:           this.id,
      title:        this.title,
      description:  this.description,
      agentType:    this.agentType,
      model:        this.model,
      status:       this.status,
      dependencies: this.dependencies,
      priority:     this.priority,
      retryCount:   this.retryCount,
      maxRetries:   this.maxRetries,
      output:       this.output,
      error:        this.error,
      startedAt:    this.startedAt,
      completedAt:  this.completedAt,
      durationMs:   this.durationMs,
      agentId:      this.agentId,
      metadata:     this.metadata,
    }
  }
}

export class TaskGraph extends EventEmitter {
  constructor(sessionId) {
    super()
    this.sessionId = sessionId
    this.tasks     = new Map()   // id → Task
    this.createdAt = new Date()
  }

  // ── Graph Mutations ──────────────────────────────────────────────────────

  addTask(taskDef) {
    const task = taskDef instanceof Task ? taskDef : new Task(taskDef)
    this.tasks.set(task.id, task)
    this.emit('task:added', task)
    return task
  }

  addTasks(taskDefs) {
    return taskDefs.map(t => this.addTask(t))
  }

  getTask(id) {
    return this.tasks.get(id)
  }

  // ── Dependency Logic ─────────────────────────────────────────────────────

  /**
   * Returns tasks whose dependencies are all COMPLETED — ready to run now.
   */
  getReadyTasks() {
    const ready = []
    for (const task of this.tasks.values()) {
      if (task.status !== TASK_STATUS.PENDING) continue
      const depsComplete = task.dependencies.every(depId => {
        const dep = this.tasks.get(depId)
        return dep && dep.status === TASK_STATUS.COMPLETED
      })
      if (depsComplete) {
        task.status = TASK_STATUS.READY
        ready.push(task)
      }
    }
    // Sort by priority descending
    return ready.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Collect output from completed dependency tasks and inject into `inputs`.
   */
  resolveInputs(task) {
    const inputs = { ...task.inputs }
    for (const depId of task.dependencies) {
      const dep = this.tasks.get(depId)
      if (dep?.output) {
        inputs[dep.agentType] = dep.output
        inputs[`_dep_${depId}`] = dep.output
      }
    }
    return inputs
  }

  // ── Status Transitions ───────────────────────────────────────────────────

  markRunning(id, agentId) {
    const task = this._get(id)
    task.status    = TASK_STATUS.RUNNING
    task.startedAt = new Date()
    task.agentId   = agentId
    this.emit('task:running', task)
  }

  markCompleted(id, output) {
    const task = this._get(id)
    task.status      = TASK_STATUS.COMPLETED
    task.output      = output
    task.completedAt = new Date()
    task.durationMs  = task.startedAt ? task.completedAt - task.startedAt : null
    this.emit('task:completed', task)
    this.emit('graph:changed', this.snapshot())
  }

  markFailed(id, error) {
    const task = this._get(id)
    task.error       = error?.message || String(error)
    task.completedAt = new Date()
    task.durationMs  = task.startedAt ? task.completedAt - task.startedAt : null

    if (task.retryCount < task.maxRetries) {
      task.retryCount++
      task.status    = TASK_STATUS.PENDING  // re-queue for retry
      task.startedAt = null
      this.emit('task:retry', task)
    } else {
      task.status = TASK_STATUS.FAILED
      this.emit('task:failed', task)
      // Cancel dependents
      this._cancelDownstream(id)
    }
    this.emit('graph:changed', this.snapshot())
  }

  // ── Graph Queries ────────────────────────────────────────────────────────

  isComplete() {
    for (const task of this.tasks.values()) {
      if (task.status !== TASK_STATUS.COMPLETED &&
          task.status !== TASK_STATUS.FAILED    &&
          task.status !== TASK_STATUS.SKIPPED   &&
          task.status !== TASK_STATUS.CANCELLED) {
        return false
      }
    }
    return true
  }

  hasBlockingFailure() {
    return [...this.tasks.values()].some(t => t.status === TASK_STATUS.FAILED)
  }

  getStats() {
    const all      = [...this.tasks.values()]
    const byStatus = {}
    for (const s of Object.values(TASK_STATUS)) {
      byStatus[s] = all.filter(t => t.status === s).length
    }
    return {
      total:     all.length,
      byStatus,
      completed: byStatus[TASK_STATUS.COMPLETED],
      failed:    byStatus[TASK_STATUS.FAILED],
      running:   byStatus[TASK_STATUS.RUNNING],
      pending:   byStatus[TASK_STATUS.PENDING] + byStatus[TASK_STATUS.READY],
    }
  }

  snapshot() {
    return {
      sessionId: this.sessionId,
      tasks: [...this.tasks.values()].map(t => t.toJSON()),
      stats: this.getStats(),
    }
  }

  // ── Internals ────────────────────────────────────────────────────────────

  _get(id) {
    const task = this.tasks.get(id)
    if (!task) throw new Error(`Task ${id} not found in graph`)
    return task
  }

  _cancelDownstream(failedId) {
    for (const task of this.tasks.values()) {
      if (task.dependencies.includes(failedId) &&
          task.status === TASK_STATUS.PENDING   ||
          task.status === TASK_STATUS.READY) {
        task.status = TASK_STATUS.CANCELLED
        this.emit('task:cancelled', task)
        this._cancelDownstream(task.id)
      }
    }
  }
}
