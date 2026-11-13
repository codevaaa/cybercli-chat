import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { CodicLocalStore } from './local-store.ts'

describe('CodicLocalStore', () => {
it('persists project, thread, task, review comments, and ordered event metadata', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'codic-store-'))
  const databasePath = path.join(directory, 'codic.sqlite')
  const projectId = randomUUID()
  const threadId = randomUUID()
  const taskId = randomUUID()
  try {
    const store = CodicLocalStore.open(databasePath)
    const project = store.addProject({ id: projectId, path: directory, name: 'Example Project' })
    expect(store.findProjectByPath(directory)?.id).toBe(projectId)
    expect(project.name).toBe('Example Project')
    store.addReviewComment({ id: randomUUID(), projectId, filePath: 'src/index.ts', lineNumber: 12, side: 'new', body: 'Please keep this branch covered.' })
    expect(store.listReviewComments(projectId)[0]?.lineNumber).toBe(12)

    store.createThread({ id: threadId, projectId, title: 'Add a feature' })
    const task = store.createTask({ id: taskId, threadId, model: 'auto', prompt: 'Add a feature' })
    expect(task.state).toBe('running')

    store.appendTaskEvent({ id: randomUUID(), taskId, type: 'run_started', payload: { runId: 'run-1' } })
    store.appendTaskEvent({ id: randomUUID(), taskId, type: 'text', payload: { text: 'Done' } })
    expect(store.listTaskEvents(taskId).map((event) => event.seq)).toEqual([1, 2])
    store.finishTask(taskId, 'completed')
    store.close()

    const reopened = CodicLocalStore.open(databasePath)
    expect(reopened.listProjects()).toHaveLength(1)
    expect(reopened.listThreads(projectId)[0]?.id).toBe(threadId)
    expect(reopened.listTasks(threadId)[0]?.state).toBe('completed')
    expect(reopened.listTaskEvents(taskId).map((event) => event.type)).toEqual(['run_started', 'text'])
    reopened.close()
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

it('marks active tasks as interrupted after restart', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'codic-store-restart-'))
  const databasePath = path.join(directory, 'codic.sqlite')
  try {
    const store = CodicLocalStore.open(databasePath)
    const project = store.addProject({ id: randomUUID(), path: directory, name: 'Restart project' })
    const thread = store.createThread({ id: randomUUID(), projectId: project.id, title: 'Resume me' })
    store.createTask({ id: randomUUID(), threadId: thread.id, model: 'auto', prompt: 'Make a change' })
    store.close()

    const restarted = CodicLocalStore.open(databasePath)
    expect(restarted.listTasks(thread.id)[0]?.state).toBe('interrupted')
    restarted.close()
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

it('persists thread organization, archive state, parent links, and local profile totals', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'codic-store-threads-'))
  const databasePath = path.join(directory, 'codic.sqlite')
  try {
    const store = CodicLocalStore.open(databasePath)
    const project = store.addProject({ id: randomUUID(), path: directory, name: 'Organization project' })
    const parent = store.createThread({ id: randomUUID(), projectId: project.id, title: 'Initial title' })
    const task = store.createTask({ id: randomUUID(), threadId: parent.id, model: 'auto', prompt: 'First task' })
    store.appendTaskEvent({ id: randomUUID(), taskId: task.id, type: 'agent_event', payload: { type: 'agent_event', event: { type: 'usage', inputTokens: 12, outputTokens: 8, estimated: true } } })
    store.finishTask(task.id, 'completed')

    const renamed = store.renameThread(project.id, parent.id, 'Renamed task')
    expect(renamed.title).toBe('Renamed task')
    expect(store.setThreadPinned(project.id, parent.id, true).pinned).toBe(true)
    const child = store.createThread({ id: randomUUID(), projectId: project.id, title: 'Fork: Renamed task', parentThreadId: parent.id })
    expect(child.parentThreadId).toBe(parent.id)
    expect(store.setThreadArchived(project.id, parent.id, true).archived).toBe(true)
    expect(store.listThreads(project.id).map((thread) => thread.id)).toEqual([child.id])
    expect(store.listThreads(project.id, true).map((thread) => thread.id)).toContain(parent.id)

    expect(store.getProfileStats()).toMatchObject({ taskCount: 1, completedRuns: 1, totalTokens: 20, tokensEstimated: true })
    store.close()
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

it('persists schedules and claims each due occurrence once', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'codic-store-schedules-'))
  const databasePath = path.join(directory, 'codic.sqlite')
  try {
    const store = CodicLocalStore.open(databasePath)
    const project = store.addProject({ id: randomUUID(), path: directory, name: 'Scheduled project' })
    const source = store.createThread({ id: randomUUID(), projectId: project.id, title: 'Source task' })
    const due = new Date(Date.now() - 60_000)
    const schedule = store.createScheduledTask({
      id: randomUUID(), projectId: project.id, sourceThreadId: source.id, title: 'Daily review',
      prompt: 'Review changed files', model: 'auto', reasoningEffort: 'medium', recurrence: 'daily', nextRunAt: due.toISOString(),
    })
    expect(store.listScheduledTasks(project.id)).toMatchObject([{ id: schedule.id, enabled: true, recurrence: 'daily' }])
    const claimed = store.claimScheduledTask(project.id, schedule.id, new Date())
    expect(claimed?.lastRunAt).toBeTruthy()
    expect(claimed && Date.parse(claimed.nextRunAt)).toBeGreaterThan(Date.now())
    expect(store.claimScheduledTask(project.id, schedule.id, new Date())).toBeNull()
    expect(store.listDueScheduledTasks()).toEqual([])

    const once = store.createScheduledTask({
      id: randomUUID(), projectId: project.id, sourceThreadId: null, title: 'One time',
      prompt: 'Summarize the project', model: 'auto', reasoningEffort: 'low', recurrence: 'once', nextRunAt: due.toISOString(),
    })
    expect(store.claimScheduledTask(project.id, once.id, new Date())?.enabled).toBe(false)
    expect(store.claimScheduledTask(project.id, once.id, new Date())).toBeNull()
    expect(() => store.setScheduledTaskEnabled(project.id, once.id, true)).toThrow(/already run/i)
    store.close()
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
})
