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
})
