import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CodicRuntimeEvent, CodicRuntimeOptions } from '../../../../cybercoder/packages/codic-runtime/src/index.js'
import { CodicRuntimeBridge } from './runtime-bridge.js'

const temporaryRoots: string[] = []

function makeWorkspace(name: string): string {
  const root = mkdtempSync(path.join(os.tmpdir(), `codic-runtime-bridge-${name}-`))
  temporaryRoots.push(root)
  return root
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function createBridge(options: { failNextCreate?: boolean; failNextStart?: boolean } = {}) {
  let sequence = 0
  let failNextCreate = options.failNextCreate ?? false
  let failNextStart = options.failNextStart ?? false
  const events: Array<{ event: CodicRuntimeEvent; taskId: string }> = []
  const createdRuntimes: Array<{
    cancel: ReturnType<typeof vi.fn>
    emit: (event: CodicRuntimeEvent) => void
  }> = []
  const bridge = new CodicRuntimeBridge({
    apiBaseUrl: 'https://api.example.test',
    getAccessToken: async () => 'test-token',
    onEvent: (event, taskId) => events.push({ event, taskId }),
    createRuntime: (runtimeOptions: CodicRuntimeOptions) => {
      if (failNextCreate) {
        failNextCreate = false
        throw new Error('Simulated runtime construction failure')
      }
      let cancelEmitsTerminal = false
      const cancel = vi.fn(() => {
        if (cancelEmitsTerminal) runtimeOptions.onEvent({ type: 'run_finished', runId: 'cancelled-during-cleanup', reason: 'cancelled' })
      })
      const fake = {
        cancel,
        emit: runtimeOptions.onEvent,
        start: vi.fn(() => {
          const runId = `run-${++sequence}`
          runtimeOptions.onEvent({ type: 'run_started', runId })
          if (failNextStart) {
            failNextStart = false
            cancelEmitsTerminal = true
            throw new Error('Simulated startup failure')
          }
          return runId
        }),
        cancelSubagent: vi.fn(() => false),
        resolveApproval: vi.fn(() => false),
        listCheckpoints: vi.fn(() => []),
        restoreCheckpoint: vi.fn(() => ({ restored: 0, deleted: 0 })),
      }
      createdRuntimes.push(fake)
      return fake
    },
  })
  return { bridge, createdRuntimes, events }
}

function request(workspacePath: string, taskId?: string) {
  return { workspacePath, prompt: 'Inspect this project.', model: 'auto', ...(taskId ? { taskId } : {}) }
}

describe('CodicRuntimeBridge parent task admission', () => {
  it('allows one app-wide primary run, keeps same-workspace protection, and releases capacity on finish', () => {
    const { bridge, createdRuntimes } = createBridge()
    const firstWorkspace = makeWorkspace('first')
    const secondWorkspace = makeWorkspace('second')
    const first = bridge.startTask(request(firstWorkspace, 'first-task'))

    expect(bridge.activePrimaryRunCount()).toBe(1)
    expect(() => bridge.startTask(request(firstWorkspace, 'same-project-task')))
      .toThrow('A task is already running in this project')
    expect(() => bridge.startTask(request(secondWorkspace, 'other-project-task')))
      .toThrow('A Codic task is already running in another window')
    expect(createdRuntimes).toHaveLength(1)

    createdRuntimes[0].emit({ type: 'run_finished', runId: 'run-1', reason: 'end_turn' })
    expect(bridge.activePrimaryRunCount()).toBe(0)
    bridge.cancelTask(first.taskId)
    expect(createdRuntimes[0].cancel).not.toHaveBeenCalled()
    expect(bridge.startTask(request(secondWorkspace, 'second-task'))).toEqual({ taskId: 'second-task' })
    expect(first.taskId).toBe('first-task')
    expect(bridge.activePrimaryRunCount()).toBe(1)
  })

  it('emits exactly one terminal error and releases primary-run capacity when runtime startup throws', () => {
    const { bridge, events } = createBridge({ failNextStart: true })
    const firstWorkspace = makeWorkspace('startup-failure')
    const secondWorkspace = makeWorkspace('after-failure')

    expect(() => bridge.startTask(request(firstWorkspace, 'failed-task'))).toThrow('Simulated startup failure')
    const terminalEvents = events.filter(({ event }) => event.type === 'run_finished')
    expect(terminalEvents).toHaveLength(1)
    expect(terminalEvents[0]).toMatchObject({ taskId: 'failed-task', event: { type: 'run_finished', reason: 'error', error: 'Simulated startup failure' } })
    expect(bridge.activePrimaryRunCount()).toBe(0)
    expect(bridge.startTask(request(secondWorkspace, 'next-task'))).toEqual({ taskId: 'next-task' })
    expect(bridge.activePrimaryRunCount()).toBe(1)
  })

  it('emits one terminal error when runtime construction fails before run_started', () => {
    const { bridge, events } = createBridge({ failNextCreate: true })
    const firstWorkspace = makeWorkspace('construction-failure')
    const secondWorkspace = makeWorkspace('after-construction-failure')

    expect(() => bridge.startTask(request(firstWorkspace, 'construction-failed-task')))
      .toThrow('Simulated runtime construction failure')
    expect(events.filter(({ event }) => event.type === 'run_finished')).toEqual([{
      taskId: 'construction-failed-task',
      event: expect.objectContaining({ type: 'run_finished', reason: 'error', error: 'Simulated runtime construction failure' }),
    }])
    expect(bridge.activePrimaryRunCount()).toBe(0)
    expect(bridge.startTask(request(secondWorkspace, 'after-construction-failure'))).toEqual({ taskId: 'after-construction-failure' })
  })

  it('holds the app-wide slot while a scheduled run prepares its window', () => {
    const { bridge, createdRuntimes } = createBridge()
    const scheduledWorkspace = makeWorkspace('scheduled-reservation')
    const otherWorkspace = makeWorkspace('blocked-by-reservation')
    const reservationId = bridge.reservePrimaryRun()

    expect(reservationId).toBeTruthy()
    expect(bridge.activePrimaryRunCount()).toBe(1)
    expect(bridge.reservePrimaryRun()).toBeNull()
    expect(() => bridge.startTask(request(otherWorkspace, 'interactive-task')))
      .toThrow('A Codic task is already running in another window')

    expect(bridge.startTask(request(scheduledWorkspace, 'scheduled-task'), reservationId!))
      .toEqual({ taskId: 'scheduled-task' })
    bridge.releasePrimaryRunReservation(reservationId!)
    expect(bridge.activePrimaryRunCount()).toBe(1)
    expect(createdRuntimes).toHaveLength(1)
  })

  it('releases a scheduled reservation if runtime startup fails', () => {
    const { bridge } = createBridge({ failNextStart: true })
    const failedWorkspace = makeWorkspace('reserved-start-failure')
    const nextWorkspace = makeWorkspace('reserved-start-retry')
    const reservationId = bridge.reservePrimaryRun()!

    expect(() => bridge.startTask(request(failedWorkspace, 'scheduled-failure'), reservationId))
      .toThrow('Simulated startup failure')
    bridge.releasePrimaryRunReservation(reservationId)
    expect(bridge.activePrimaryRunCount()).toBe(0)
    expect(bridge.startTask(request(nextWorkspace, 'after-reserved-failure')))
      .toEqual({ taskId: 'after-reserved-failure' })
  })

  it('does not retain runtime records created only for historical checkpoint access', () => {
    const { bridge, createdRuntimes } = createBridge()
    const workspace = makeWorkspace('history')

    expect(bridge.listCheckpoints('historical-task', workspace)).toEqual([])
    expect(bridge.listCheckpoints('historical-task', workspace)).toEqual([])
    expect(createdRuntimes).toHaveLength(2)
    bridge.cancelTask('historical-task')
    expect(createdRuntimes[0].cancel).not.toHaveBeenCalled()
  })
})
