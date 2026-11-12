import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { CodicLocalStore } from './local-store.js'
import { listThreadSummaries, loadThreadHistory } from './history.js'

describe('local thread history', () => {
  it('restores the project thread transcript from persisted task events', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'codic-history-'))
    const store = CodicLocalStore.open(path.join(directory, 'codic.sqlite'))
    try {
      const project = store.addProject({ id: randomUUID(), path: directory, name: 'History project' })
      const thread = store.createThread({ id: randomUUID(), projectId: project.id, title: 'Explain this project' })
      const firstTaskId = randomUUID()
      const secondTaskId = randomUUID()
      store.createTask({ id: firstTaskId, threadId: thread.id, model: 'auto', prompt: 'Explain this project' })
      store.appendTaskEvent({ id: randomUUID(), taskId: firstTaskId, type: 'agent_event', payload: { type: 'agent_event', runId: 'run-1', event: { type: 'text', text: 'It is a local app.' } } })
      store.finishTask(firstTaskId, 'completed')
      store.createTask({ id: secondTaskId, threadId: thread.id, model: 'auto', prompt: 'How does it authenticate?' })
      store.appendTaskEvent({ id: randomUUID(), taskId: secondTaskId, type: 'agent_event', payload: { type: 'agent_event', runId: 'run-2', event: { type: 'text', text: 'It uses Codeva sign-in.' } } })
      store.finishTask(secondTaskId, 'completed')

      const restored = loadThreadHistory(store, project.id, thread.id)
      expect(restored.messages.map(({ role, content }) => `${role}: ${content}`)).toEqual([
        'user: Explain this project',
        'assistant: It is a local app.',
        'user: How does it authenticate?',
        'assistant: It uses Codeva sign-in.',
      ])
      expect(restored.lastTaskId).toBe(secondTaskId)
      expect(listThreadSummaries(store, project.id)[0]?.lastTaskState).toBe('completed')
      expect(() => loadThreadHistory(store, randomUUID(), thread.id)).toThrow('does not belong')
    } finally {
      store.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('keeps recent context within limits and marks when older turns were omitted', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'codic-history-limit-'))
    const store = CodicLocalStore.open(path.join(directory, 'codic.sqlite'))
    try {
      const project = store.addProject({ id: randomUUID(), path: directory, name: 'History project' })
      const thread = store.createThread({ id: randomUUID(), projectId: project.id, title: 'Long conversation' })
      const taskId = randomUUID()
      store.createTask({ id: taskId, threadId: thread.id, model: 'auto', prompt: 'x'.repeat(181_000) })
      const restored = loadThreadHistory(store, project.id, thread.id)
      expect(restored.messages).toHaveLength(1)
      expect(restored.truncated).toBe(true)
    } finally {
      store.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
