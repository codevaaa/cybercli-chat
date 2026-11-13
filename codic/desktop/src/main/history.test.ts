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

  it('loads a fork with its parent context and keeps new task history on the fork', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'codic-history-fork-'))
    const store = CodicLocalStore.open(path.join(directory, 'codic.sqlite'))
    try {
      const project = store.addProject({ id: randomUUID(), path: directory, name: 'Fork project' })
      const parent = store.createThread({ id: randomUUID(), projectId: project.id, title: 'Parent task' })
      const parentTaskId = randomUUID()
      store.createTask({ id: parentTaskId, threadId: parent.id, model: 'auto', prompt: 'Build the first version' })
      store.appendTaskEvent({ id: randomUUID(), taskId: parentTaskId, type: 'agent_event', payload: { type: 'agent_event', event: { type: 'text', text: 'The first version is ready.' } } })
      store.finishTask(parentTaskId, 'completed')

      const fork = store.createThread({ id: randomUUID(), projectId: project.id, title: 'Fork: Parent task', parentThreadId: parent.id })
      const forkTaskId = randomUUID()
      store.createTask({ id: forkTaskId, threadId: fork.id, model: 'auto', prompt: 'Try another approach' })
      store.appendTaskEvent({ id: randomUUID(), taskId: forkTaskId, type: 'agent_event', payload: { type: 'agent_event', event: { type: 'text', text: 'The alternate approach is ready.' } } })
      store.finishTask(forkTaskId, 'completed')

      const restored = loadThreadHistory(store, project.id, fork.id)
      expect(restored.thread.id).toBe(fork.id)
      expect(restored.messages.map((message) => message.content)).toEqual([
        'Build the first version',
        'The first version is ready.',
        'Try another approach',
        'The alternate approach is ready.',
      ])
      expect(restored.lastTaskId).toBe(forkTaskId)
    } finally {
      store.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
