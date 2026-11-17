// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import TaskRecoveryNotice from './TaskRecoveryNotice'

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

it('offers a safe new-run continuation for interrupted work', async () => {
  const onContinue = vi.fn()
  await act(async () => root.render(<TaskRecoveryNotice state="interrupted" onContinue={onContinue} />))
  expect(host.textContent).toContain('The previous run was interrupted.')
  expect(host.textContent).toContain('Earlier tool actions are not replayed')
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
  expect(onContinue).toHaveBeenCalledOnce()
})

it('does not show a recovery action for a completed or active run and respects disabled state', async () => {
  await act(async () => root.render(<TaskRecoveryNotice state="completed" onContinue={vi.fn()} />))
  expect(host.querySelector('.task-recovery-notice')).toBeNull()
  await act(async () => root.render(<TaskRecoveryNotice state="failed" onContinue={vi.fn()} disabled />))
  expect(host.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true)
})
