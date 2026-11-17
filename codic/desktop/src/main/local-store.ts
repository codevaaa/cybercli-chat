import { chmodSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const CURRENT_SCHEMA_VERSION = 4

export type LocalTaskState = 'running' | 'completed' | 'cancelled' | 'failed' | 'interrupted'

export interface LocalProject {
  id: string
  path: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface LocalThread {
  id: string
  projectId: string
  title: string
  createdAt: string
  updatedAt: string
  pinned: boolean
  archived: boolean
  parentThreadId: string | null
}

export interface LocalProfileStats {
  taskCount: number
  completedRuns: number
  totalTokens: number
  tokensEstimated: boolean
  longestTaskSeconds: number
  activity: Array<{ date: string; count: number }>
}

export interface LocalTask {
  id: string
  threadId: string
  model: string
  prompt: string
  state: LocalTaskState
  startedAt: string
  finishedAt: string | null
  error: string | null
}

export interface LocalTaskEvent {
  id: string
  taskId: string
  seq: number
  type: string
  payload: unknown
  createdAt: string
}

export interface LocalReviewComment {
  id: string
  projectId: string
  filePath: string
  lineNumber: number
  side: 'old' | 'new'
  body: string
  createdAt: string
}

export type ScheduleRecurrence = 'once' | 'daily' | 'weekly'
export interface LocalScheduledTask {
  id: string
  projectId: string
  sourceThreadId: string | null
  title: string
  prompt: string
  model: string
  reasoningEffort: 'low' | 'medium' | 'high'
  recurrence: ScheduleRecurrence
  nextRunAt: string
  enabled: boolean
  lastRunAt: string | null
  createdAt: string
}
export interface DueScheduledTask extends LocalScheduledTask { workspacePath: string }

type ProjectRow = { id: string; path: string; name: string; created_at: string; updated_at: string }
type ThreadRow = { id: string; project_id: string; title: string; created_at: string; updated_at: string; pinned: number; archived: number; parent_thread_id: string | null }
type TaskRow = { id: string; thread_id: string; model: string; prompt: string; state: LocalTaskState; started_at: string; finished_at: string | null; error: string | null }
type EventRow = { id: string; task_id: string; seq: number; type: string; payload_json: string; created_at: string }
type ReviewCommentRow = { id: string; project_id: string; file_path: string; line_number: number; side: 'old' | 'new'; body: string; created_at: string }
type ScheduledTaskRow = { id: string; project_id: string; source_thread_id: string | null; title: string; prompt: string; model: string; reasoning_effort: 'low' | 'medium' | 'high'; recurrence: ScheduleRecurrence; next_run_at: string; enabled: number; last_run_at: string | null; created_at: string }

/** Versioned on-device metadata store. Project files and account credentials are never copied into SQLite. */
export class CodicLocalStore {
  private readonly database: DatabaseSync

  private constructor(database: DatabaseSync) {
    this.database = database
    database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;')
    this.migrate()
    database.exec("UPDATE tasks SET state = 'interrupted', finished_at = COALESCE(finished_at, datetime('now')) WHERE state = 'running'")
  }

  static open(databasePath: string): CodicLocalStore {
    const absolutePath = path.resolve(databasePath)
    mkdirSync(path.dirname(absolutePath), { recursive: true, mode: 0o700 })
    const database = new DatabaseSync(absolutePath, { enableForeignKeyConstraints: true })
    if (process.platform !== 'win32') chmodSync(absolutePath, 0o600)
    return new CodicLocalStore(database)
  }

  addProject(project: { id: string; path: string; name: string }): LocalProject {
    const normalizedPath = path.resolve(project.path)
    this.database.prepare(`
      INSERT INTO projects (id, path, name) VALUES (?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET name = excluded.name, updated_at = datetime('now')
    `).run(project.id, normalizedPath, project.name.trim().slice(0, 200))
    return this.findProjectByPath(normalizedPath)!
  }

  findProjectByPath(projectPath: string): LocalProject | null {
    const normalizedPath = path.resolve(projectPath)
    const row = this.database.prepare('SELECT * FROM projects WHERE path = ?').get(normalizedPath) as ProjectRow | undefined
    return row ? mapProject(row) : null
  }

  getProject(id: string): LocalProject | null {
    const row = this.database.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined
    return row ? mapProject(row) : null
  }

  listProjects(): LocalProject[] {
    const rows = this.database.prepare('SELECT * FROM projects ORDER BY updated_at DESC, name COLLATE NOCASE').all() as ProjectRow[]
    return rows.map(mapProject)
  }

  createThread(thread: { id: string; projectId: string; title: string; parentThreadId?: string | null }): LocalThread {
    this.database.prepare('INSERT INTO threads (id, project_id, title, parent_thread_id) VALUES (?, ?, ?, ?)')
      .run(thread.id, thread.projectId, thread.title.trim().slice(0, 240) || 'New task', thread.parentThreadId ?? null)
    const row = this.database.prepare('SELECT * FROM threads WHERE id = ?').get(thread.id) as ThreadRow | undefined
    if (!row) throw new Error('The local task thread could not be saved.')
    return mapThread(row)
  }

  listThreads(projectId: string, includeArchived = false): LocalThread[] {
    const rows = this.database.prepare(`
      SELECT * FROM threads WHERE project_id = ? AND (? = 1 OR archived = 0)
      ORDER BY pinned DESC, updated_at DESC, rowid DESC
    `).all(projectId, includeArchived ? 1 : 0) as ThreadRow[]
    return rows.map(mapThread)
  }

  getThread(projectId: string, threadId: string): LocalThread | null {
    const row = this.database.prepare('SELECT * FROM threads WHERE project_id = ? AND id = ?').get(projectId, threadId) as ThreadRow | undefined
    return row ? mapThread(row) : null
  }

  renameThread(projectId: string, threadId: string, title: string): LocalThread {
    const cleanedTitle = title.trim().slice(0, 160)
    if (!cleanedTitle) throw new Error('A task title cannot be empty.')
    const result = this.database.prepare("UPDATE threads SET title = ?, updated_at = datetime('now') WHERE project_id = ? AND id = ?")
      .run(cleanedTitle, projectId, threadId)
    if (!result.changes) throw new Error('This task does not belong to the selected project.')
    return this.getThread(projectId, threadId)!
  }

  setThreadPinned(projectId: string, threadId: string, pinned: boolean): LocalThread {
    const result = this.database.prepare("UPDATE threads SET pinned = ?, updated_at = datetime('now') WHERE project_id = ? AND id = ?")
      .run(pinned ? 1 : 0, projectId, threadId)
    if (!result.changes) throw new Error('This task does not belong to the selected project.')
    return this.getThread(projectId, threadId)!
  }

  setThreadArchived(projectId: string, threadId: string, archived: boolean): LocalThread {
    const result = this.database.prepare("UPDATE threads SET archived = ?, updated_at = datetime('now') WHERE project_id = ? AND id = ?")
      .run(archived ? 1 : 0, projectId, threadId)
    if (!result.changes) throw new Error('This task does not belong to the selected project.')
    return this.getThread(projectId, threadId)!
  }

  getProfileStats(): LocalProfileStats {
    const rows = this.database.prepare('SELECT state, started_at, finished_at FROM tasks ORDER BY started_at DESC').all() as Array<Pick<TaskRow, 'state' | 'started_at' | 'finished_at'>>
    const activityByDate = new Map<string, number>()
    let longestTaskSeconds = 0
    for (const task of rows) {
      const date = task.started_at.slice(0, 10)
      activityByDate.set(date, (activityByDate.get(date) || 0) + 1)
      if (task.finished_at) {
        const startTime = Date.parse(`${task.started_at.replace(' ', 'T')}Z`)
        const endTime = Date.parse(`${task.finished_at.replace(' ', 'T')}Z`)
        if (Number.isFinite(startTime) && Number.isFinite(endTime)) longestTaskSeconds = Math.max(longestTaskSeconds, Math.floor((endTime - startTime) / 1000))
      }
    }

    const usageRows = this.database.prepare("SELECT payload_json FROM task_events WHERE type = 'agent_event'").all() as Array<{ payload_json: string }>
    let totalTokens = 0
    let tokensEstimated = false
    for (const row of usageRows) {
      try {
        const payload = JSON.parse(row.payload_json) as { event?: { type?: string; inputTokens?: number; outputTokens?: number; estimated?: boolean } }
        const usage = payload.event
        if (usage?.type !== 'usage') continue
        totalTokens += Math.max(0, Number(usage.inputTokens) || 0) + Math.max(0, Number(usage.outputTokens) || 0)
        tokensEstimated ||= usage.estimated === true
      } catch {
        // A malformed historical event must not prevent the profile from opening.
      }
    }

    const today = new Date()
    const activity: Array<{ date: string; count: number }> = []
    for (let offset = 83; offset >= 0; offset -= 1) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      activity.push({ date: key, count: activityByDate.get(key) || 0 })
    }

    return {
      taskCount: rows.length,
      completedRuns: rows.filter((task) => task.state === 'completed').length,
      totalTokens,
      tokensEstimated,
      longestTaskSeconds,
      activity,
    }
  }

  createTask(task: { id: string; threadId: string; model: string; prompt: string }): LocalTask {
    this.database.prepare('INSERT INTO tasks (id, thread_id, model, prompt, state) VALUES (?, ?, ?, ?, ?)')
      .run(task.id, task.threadId, task.model, task.prompt, 'running')
    this.database.prepare("UPDATE threads SET updated_at = datetime('now') WHERE id = ?").run(task.threadId)
    const row = this.database.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id) as TaskRow | undefined
    if (!row) throw new Error('The local task could not be saved.')
    return mapTask(row)
  }

  appendTaskEvent(event: { id: string; taskId: string; type: string; payload: unknown }): LocalTaskEvent {
    const payloadJson = JSON.stringify(event.payload)
    this.database.prepare(`
      INSERT INTO task_events (id, task_id, seq, type, payload_json)
      VALUES (?, ?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM task_events WHERE task_id = ?), ?, ?)
    `).run(event.id, event.taskId, event.taskId, event.type.slice(0, 80), payloadJson)
    const row = this.database.prepare('SELECT * FROM task_events WHERE id = ?').get(event.id) as EventRow | undefined
    if (!row) throw new Error('The task event could not be saved.')
    return mapEvent(row)
  }

  finishTask(id: string, state: Exclude<LocalTaskState, 'running'>, error?: string): void {
    this.database.prepare(`
      UPDATE tasks SET state = ?, finished_at = datetime('now'), error = ? WHERE id = ?
    `).run(state, error ? error.slice(0, 2_000) : null, id)
  }

  listTaskEvents(taskId: string): LocalTaskEvent[] {
    const rows = this.database.prepare('SELECT * FROM task_events WHERE task_id = ? ORDER BY seq').all(taskId) as EventRow[]
    return rows.map(mapEvent)
  }

  addReviewComment(comment: Omit<LocalReviewComment, 'createdAt'>): LocalReviewComment {
    this.database.prepare('INSERT INTO review_comments (id, project_id, file_path, line_number, side, body) VALUES (?, ?, ?, ?, ?, ?)')
      .run(comment.id, comment.projectId, comment.filePath, comment.lineNumber, comment.side, comment.body.trim().slice(0, 5_000))
    const row = this.database.prepare('SELECT * FROM review_comments WHERE id = ?').get(comment.id) as ReviewCommentRow | undefined
    if (!row) throw new Error('The review comment could not be saved.')
    return mapReviewComment(row)
  }

  listReviewComments(projectId: string): LocalReviewComment[] {
    const rows = this.database.prepare('SELECT * FROM review_comments WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as ReviewCommentRow[]
    return rows.map(mapReviewComment)
  }

  createScheduledTask(task: Omit<LocalScheduledTask, 'enabled' | 'lastRunAt' | 'createdAt'>): LocalScheduledTask {
    const title = task.title.trim().slice(0, 160)
    const prompt = task.prompt.trim()
    const nextRun = new Date(task.nextRunAt)
    if (!title || !prompt || prompt.length > 20_000 || !Number.isFinite(nextRun.getTime())) throw new Error('Enter a title, prompt, and valid run time for this scheduled task.')
    if (!['once', 'daily', 'weekly'].includes(task.recurrence)) throw new Error('Choose a valid schedule frequency.')
    if (!['low', 'medium', 'high'].includes(task.reasoningEffort)) throw new Error('Choose a valid reasoning level.')
    if (task.sourceThreadId) {
      const source = this.database.prepare('SELECT id FROM threads WHERE id = ? AND project_id = ?').get(task.sourceThreadId, task.projectId)
      if (!source) throw new Error('The source task does not belong to this project.')
    }
    this.database.prepare(`
      INSERT INTO scheduled_tasks (id, project_id, source_thread_id, title, prompt, model, reasoning_effort, recurrence, next_run_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(task.id, task.projectId, task.sourceThreadId, title, prompt, task.model.slice(0, 160), task.reasoningEffort, task.recurrence, nextRun.toISOString())
    return this.getScheduledTask(task.projectId, task.id)!
  }

  listScheduledTasks(projectId: string): LocalScheduledTask[] {
    const rows = this.database.prepare('SELECT * FROM scheduled_tasks WHERE project_id = ? ORDER BY enabled DESC, next_run_at ASC, created_at DESC').all(projectId) as ScheduledTaskRow[]
    return rows.map(mapScheduledTask)
  }

  getScheduledTask(projectId: string, taskId: string): LocalScheduledTask | null {
    const row = this.database.prepare('SELECT * FROM scheduled_tasks WHERE project_id = ? AND id = ?').get(projectId, taskId) as ScheduledTaskRow | undefined
    return row ? mapScheduledTask(row) : null
  }

  listDueScheduledTasks(now = new Date()): DueScheduledTask[] {
    const rows = this.database.prepare(`
      SELECT scheduled_tasks.*, projects.path AS workspace_path
      FROM scheduled_tasks JOIN projects ON projects.id = scheduled_tasks.project_id
      WHERE scheduled_tasks.enabled = 1 AND scheduled_tasks.next_run_at <= ?
      ORDER BY scheduled_tasks.next_run_at ASC
    `).all(now.toISOString()) as Array<ScheduledTaskRow & { workspace_path: string }>
    return rows.map((row) => ({ ...mapScheduledTask(row), workspacePath: row.workspace_path }))
  }

  claimScheduledTask(
    projectId: string,
    taskId: string,
    run: { threadId: string; taskId: string; prompt: string },
    now = new Date(),
  ): LocalScheduledTask | null {
    const row = this.database.prepare('SELECT * FROM scheduled_tasks WHERE project_id = ? AND id = ? AND enabled = 1 AND next_run_at <= ?').get(projectId, taskId, now.toISOString()) as ScheduledTaskRow | undefined
    if (!row) return null
    if (!run.threadId.trim() || !run.taskId.trim() || !run.prompt.trim() || run.prompt.length > 20_000) {
      throw new Error('The scheduled task could not be prepared safely.')
    }
    let nextRunAt: string | null = null
    if (row.recurrence !== 'once') {
      const candidate = new Date(row.next_run_at)
      const increment = row.recurrence === 'daily' ? 1 : 7
      let advances = 0
      do {
        candidate.setDate(candidate.getDate() + increment)
        advances += 1
      } while (candidate.getTime() <= now.getTime() && advances < 10_000)
      if (candidate.getTime() <= now.getTime()) throw new Error('The recurring task schedule is too far behind to safely catch up.')
      nextRunAt = candidate.toISOString()
    }
    this.database.exec('BEGIN IMMEDIATE')
    try {
      const result = this.database.prepare(`
        UPDATE scheduled_tasks SET enabled = ?, next_run_at = COALESCE(?, next_run_at), last_run_at = ?
        WHERE project_id = ? AND id = ? AND enabled = 1 AND next_run_at <= ?
      `).run(nextRunAt ? 1 : 0, nextRunAt, now.toISOString(), projectId, taskId, now.toISOString())
      if (!result.changes) {
        this.database.exec('COMMIT')
        return null
      }
      // Advancing the occurrence and creating its durable history are one
      // transaction. A disk/database failure rolls both sides back, so the
      // scheduler can safely retry the same due occurrence later.
      this.createThread({
        id: run.threadId,
        projectId: row.project_id,
        title: row.title,
        parentThreadId: row.source_thread_id,
      })
      this.createTask({ id: run.taskId, threadId: run.threadId, model: row.model, prompt: run.prompt })
      this.database.exec('COMMIT')
      return this.getScheduledTask(projectId, taskId)
    } catch (error) {
      this.database.exec('ROLLBACK')
      throw error
    }
  }

  setScheduledTaskEnabled(projectId: string, taskId: string, enabled: boolean): LocalScheduledTask {
    const schedule = this.getScheduledTask(projectId, taskId)
    if (!schedule) throw new Error('This scheduled task does not belong to the selected project.')
    if (enabled && schedule.recurrence === 'once' && schedule.lastRunAt) throw new Error('This one-time task has already run. Create a new schedule to run it again.')
    const result = this.database.prepare('UPDATE scheduled_tasks SET enabled = ? WHERE project_id = ? AND id = ?').run(enabled ? 1 : 0, projectId, taskId)
    if (!result.changes) throw new Error('This scheduled task does not belong to the selected project.')
    return this.getScheduledTask(projectId, taskId)!
  }

  deleteScheduledTask(projectId: string, taskId: string): void {
    const result = this.database.prepare('DELETE FROM scheduled_tasks WHERE project_id = ? AND id = ?').run(projectId, taskId)
    if (!result.changes) throw new Error('This scheduled task does not belong to the selected project.')
  }

  listTasks(threadId: string): LocalTask[] {
    const rows = this.database.prepare('SELECT * FROM tasks WHERE thread_id = ? ORDER BY started_at DESC, rowid DESC').all(threadId) as TaskRow[]
    return rows.map(mapTask)
  }

  close(): void {
    this.database.close()
  }

  private migrate(): void {
    const { user_version: version } = this.database.prepare('PRAGMA user_version').get() as { user_version: number }
    if (version > CURRENT_SCHEMA_VERSION) throw new Error('Codic task history was created by a newer app version.')
    if (version === 0) {
      this.database.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE projects (
          id TEXT PRIMARY KEY NOT NULL,
          path TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        ) STRICT;
        CREATE TABLE threads (
          id TEXT PRIMARY KEY NOT NULL,
          project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        ) STRICT;
        CREATE INDEX threads_project_updated ON threads(project_id, updated_at DESC);
        CREATE TABLE tasks (
          id TEXT PRIMARY KEY NOT NULL,
          thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
          model TEXT NOT NULL,
          prompt TEXT NOT NULL,
          state TEXT NOT NULL CHECK(state IN ('running', 'completed', 'cancelled', 'failed', 'interrupted')),
          started_at TEXT NOT NULL DEFAULT (datetime('now')),
          finished_at TEXT,
          error TEXT
        ) STRICT;
        CREATE INDEX tasks_thread_started ON tasks(thread_id, started_at DESC);
        CREATE TABLE task_events (
          id TEXT PRIMARY KEY NOT NULL,
          task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          seq INTEGER NOT NULL CHECK(seq > 0),
          type TEXT NOT NULL,
          payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(task_id, seq)
        ) STRICT;
        CREATE INDEX task_events_task_seq ON task_events(task_id, seq);
        PRAGMA user_version = 1;
        COMMIT;
      `)
    }
    if (version < 2) {
      this.database.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE review_comments (
          id TEXT PRIMARY KEY NOT NULL,
          project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          file_path TEXT NOT NULL,
          line_number INTEGER NOT NULL CHECK(line_number >= 1),
          side TEXT NOT NULL CHECK(side IN ('old', 'new')),
          body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 5000),
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        ) STRICT;
        CREATE INDEX review_comments_project_file ON review_comments(project_id, file_path, line_number);
        PRAGMA user_version = 2;
        COMMIT;
      `)
    }
    if (version < 3) {
      this.database.exec(`
        BEGIN IMMEDIATE;
        ALTER TABLE threads ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0 CHECK(pinned IN (0, 1));
        ALTER TABLE threads ADD COLUMN archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0, 1));
        ALTER TABLE threads ADD COLUMN parent_thread_id TEXT REFERENCES threads(id) ON DELETE SET NULL;
        CREATE INDEX threads_project_pinned_updated ON threads(project_id, pinned DESC, archived, updated_at DESC);
        PRAGMA user_version = 3;
        COMMIT;
      `)
    }
    if (version < 4) {
      this.database.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE scheduled_tasks (
          id TEXT PRIMARY KEY NOT NULL,
          project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          source_thread_id TEXT REFERENCES threads(id) ON DELETE SET NULL,
          title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 160),
          prompt TEXT NOT NULL CHECK(length(prompt) BETWEEN 1 AND 20000),
          model TEXT NOT NULL,
          reasoning_effort TEXT NOT NULL CHECK(reasoning_effort IN ('low', 'medium', 'high')),
          recurrence TEXT NOT NULL CHECK(recurrence IN ('once', 'daily', 'weekly')),
          next_run_at TEXT NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
          last_run_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        ) STRICT;
        CREATE INDEX scheduled_tasks_due ON scheduled_tasks(enabled, next_run_at);
        PRAGMA user_version = 4;
        COMMIT;
      `)
    }
  }
}

function mapProject(row: ProjectRow): LocalProject {
  return { id: row.id, path: row.path, name: row.name, createdAt: row.created_at, updatedAt: row.updated_at }
}

function mapThread(row: ThreadRow): LocalThread {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pinned: row.pinned === 1,
    archived: row.archived === 1,
    parentThreadId: row.parent_thread_id,
  }
}

function mapTask(row: TaskRow): LocalTask {
  return {
    id: row.id,
    threadId: row.thread_id,
    model: row.model,
    prompt: row.prompt,
    state: row.state,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    error: row.error,
  }
}

function mapEvent(row: EventRow): LocalTaskEvent {
  return {
    id: row.id,
    taskId: row.task_id,
    seq: row.seq,
    type: row.type,
    payload: JSON.parse(row.payload_json) as unknown,
    createdAt: row.created_at,
  }
}

function mapReviewComment(row: ReviewCommentRow): LocalReviewComment {
  return {
    id: row.id,
    projectId: row.project_id,
    filePath: row.file_path,
    lineNumber: row.line_number,
    side: row.side,
    body: row.body,
    createdAt: row.created_at,
  }
}

function mapScheduledTask(row: ScheduledTaskRow): LocalScheduledTask {
  return {
    id: row.id,
    projectId: row.project_id,
    sourceThreadId: row.source_thread_id,
    title: row.title,
    prompt: row.prompt,
    model: row.model,
    reasoningEffort: row.reasoning_effort,
    recurrence: row.recurrence,
    nextRunAt: row.next_run_at,
    enabled: row.enabled === 1,
    lastRunAt: row.last_run_at,
    createdAt: row.created_at,
  }
}
