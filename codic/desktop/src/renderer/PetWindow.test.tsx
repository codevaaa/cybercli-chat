// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import PetWindow from './PetWindow'
import type { CompanionActivity } from '../shared/contracts'

let root: Root
let host: HTMLDivElement
let activityListener: ((activity: CompanionActivity) => void) | null
let activitySnapshot: Promise<CompanionActivity>
let resolveActivitySnapshot: ((activity: CompanionActivity) => void) | null
let originalCodic: typeof window.codic | undefined
const submitPrompt = vi.fn(async () => undefined)
const focusApp = vi.fn(async () => undefined)
const hide = vi.fn(async () => undefined)

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  activityListener = null
  activitySnapshot = Promise.resolve('idle')
  resolveActivitySnapshot = null
  submitPrompt.mockClear()
  focusApp.mockClear()
  hide.mockClear()
  originalCodic = window.codic
  Object.defineProperty(window, 'codic', {
    configurable: true,
    writable: true,
    value: {
      companion: {
        onActivityChange: (callback: (activity: CompanionActivity) => void) => {
          activityListener = callback
          return () => { activityListener = null }
        },
        getActivity: () => activitySnapshot,
        submitPrompt,
        focusApp,
        hide,
      },
    } as unknown as typeof window.codic,
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  if (originalCodic === undefined) Reflect.deleteProperty(window, 'codic')
  else Object.defineProperty(window, 'codic', { configurable: true, writable: true, value: originalCodic })
  vi.restoreAllMocks()
})

it('falls back when WebGL is unavailable and reflects actual runtime activity', async () => {
  await act(async () => root.render(<PetWindow />))
  await act(async () => Promise.resolve())

  expect(host.querySelector('.companion-fallback')).not.toBeNull()
  expect(host.textContent).toContain('Here with you')
  expect(activityListener).toBeTypeOf('function')

  await act(async () => activityListener?.('approval'))
  expect(host.textContent).toContain('Waiting for your approval')
})

it('keeps a newer activity event when the initial activity snapshot arrives late', async () => {
  activitySnapshot = new Promise((resolve) => { resolveActivitySnapshot = resolve })
  await act(async () => root.render(<PetWindow />))
  await act(async () => Promise.resolve())
  await act(async () => activityListener?.('working'))
  await act(async () => resolveActivitySnapshot?.('idle'))

  expect(host.textContent).toContain('Working in your project')
})

it('places a draft in Codic for review without sending it from the companion', async () => {
  await act(async () => root.render(<PetWindow />))
  await act(async () => Promise.resolve())

  const input = host.querySelector<HTMLInputElement>('#companion-prompt')!
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, 'Explain this project')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const form = host.querySelector<HTMLFormElement>('.companion-prompt')!
  await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))

  expect(submitPrompt).toHaveBeenCalledOnce()
  expect(submitPrompt).toHaveBeenCalledWith('Explain this project')
  await act(async () => Promise.resolve())
  expect(host.textContent).toContain('Draft placed in Codic for review')
  expect(host.querySelector<HTMLInputElement>('#companion-prompt')?.value).toBe('')
})

it('routes the explicit open and hide controls through the preload bridge', async () => {
  await act(async () => root.render(<PetWindow />))

  const buttons = [...host.querySelectorAll<HTMLButtonElement>('button')]
  await act(async () => buttons.find((button) => button.textContent === 'Open Codic')?.click())
  await act(async () => buttons.find((button) => button.textContent === 'Hide Codi')?.click())

  expect(focusApp).toHaveBeenCalledOnce()
  expect(hide).toHaveBeenCalledOnce()
})
