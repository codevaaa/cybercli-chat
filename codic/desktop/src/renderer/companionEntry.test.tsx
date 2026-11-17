// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mountCompanionWindow } from './companionEntry'

let root: Root
let host: HTMLDivElement
let originalCodic: typeof window.codic | undefined
const hide = vi.fn(async () => undefined)

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  originalCodic = window.codic
  Object.defineProperty(window, 'codic', {
    configurable: true,
    writable: true,
    value: { companion: { hide } } as unknown as typeof window.codic,
  })
  hide.mockClear()
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

it('renders the companion when its lazy entry loads', async () => {
  const Companion = () => <p>Codi is ready</p>
  await act(async () => mountCompanionWindow(root, async () => ({ default: Companion })))
  expect(host.textContent).toContain('Codi is ready')
})

it('renders a recovery action when the lazy entry fails to load', async () => {
  await act(async () => mountCompanionWindow(root, async () => { throw new Error('chunk unavailable') }))
  expect(host.textContent).toContain('Codi couldn’t start')
  expect(host.textContent).toContain('Reopen the companion from Codic to try again.')

  await act(async () => host.querySelector<HTMLButtonElement>('button')?.click())
  expect(hide).toHaveBeenCalledOnce()
})
