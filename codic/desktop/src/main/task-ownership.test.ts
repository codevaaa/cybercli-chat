import { expect, it, vi } from 'vitest'
import { cancelTasksForOwner } from './task-ownership.js'

it('cancels and releases every task owned by the closing window', () => {
  const firstWindow = {}
  const secondWindow = {}
  const owners = new Map([['task-1', firstWindow], ['task-2', secondWindow], ['task-3', firstWindow]])
  const cancelTask = vi.fn()

  expect(cancelTasksForOwner(owners, firstWindow, cancelTask)).toEqual(['task-1', 'task-3'])
  expect(cancelTask.mock.calls).toEqual([['task-1'], ['task-3']])
  expect([...owners]).toEqual([['task-2', secondWindow]])
})

it('continues releasing task ownership if one runtime cancel throws', () => {
  const owner = {}
  const owners = new Map([['task-1', owner], ['task-2', owner]])
  const cancelTask = vi.fn((taskId: string) => { if (taskId === 'task-1') throw new Error('already stopped') })

  expect(cancelTasksForOwner(owners, owner, cancelTask)).toEqual(['task-1', 'task-2'])
  expect(cancelTask).toHaveBeenCalledTimes(2)
  expect(owners.size).toBe(0)
})
