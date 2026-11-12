import { chmodSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const CURRENT_SCHEMA_VERSION = 2

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

type ProjectRow = { id: string; path: string; name: string; created_at: string; updated_at: string }
type ThreadRow = { id: string; project_id: string; title: string; created_at: string; updated_at: string }
type TaskRow = { id: string; thread_id: string; model: string; prompt: string; state: LocalTaskState; started_at: string; finished_at: string | null; error: string | null }
type EventRow = { id: string; task_id: string; seq: number; type: string; payload_json: string; created_at: string }
type ReviewCommentRow = { id: string; project_id: string; file_path: string; line_number: number; side: 'old' | 'new'; body: string; created_at: string }

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

  createThread(thread: { id: string; projectId: string; title: string }): LocalThread {
    this.database.prepare('INSERT INTO threads (id, project_id, title) VALUES (?, ?, ?)')
      .run(thread.id, thread.projectId, thread.title.trim().slice(0, 240) || 'New task')
    const row = this.database.prepare('SELECT * FROM threads WHERE id = ?').get(thread.id) as ThreadRow | undefined
    if (!row) throw new Error('The local task thread could not be saved.')
    return mapThread(row)
  }

  listThreads(projectId: string): LocalThread[] {
    const rows = this.database.prepare('SELECT * FROM threads WHERE project_id = ? ORDER BY updated_at DESC, rowid DESC').all(projectId) as ThreadRow[]
    return rows.map(mapThread)
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
  }
}

function mapProject(row: ProjectRow): LocalProject {
  return { id: row.id, path: row.path, name: row.name, createdAt: row.created_at, updatedAt: row.updated_at }
}

function mapThread(row: ThreadRow): LocalThread {
  return { id: row.id, projectId: row.project_id, title: row.title, createdAt: row.created_at, updatedAt: row.updated_at }
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
