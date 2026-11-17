// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ComposerAddMenu from './ComposerAddMenu'

let root: Root
let host: HTMLDivElement
let originalWidth: number
let originalHeight: number

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  originalWidth = window.innerWidth
  originalHeight = window.innerHeight
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 700 })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  document.body.querySelector('.composer-add-popover')?.remove()
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight })
  vi.restoreAllMocks()
})

it('opens above the plus button, stays within the viewport, and invokes the file picker', async () => {
  const onChooseFiles = vi.fn()
  const onChooseFolder = vi.fn()
  await act(async () => root.render(<ComposerAddMenu attachmentCount={0} onChooseFiles={onChooseFiles} onChooseFolder={onChooseFolder} />))
  const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Add prompt context"]')!
  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({ top: 610, bottom: 646, left: 18, right: 54, width: 36, height: 36, x: 18, y: 610, toJSON: () => ({}) } as DOMRect)
  await act(async () => trigger.click())

  const menu = document.body.querySelector<HTMLElement>('.composer-add-popover')!
  expect(menu).toBeTruthy()
  const top = Number.parseFloat(menu.style.top)
  const left = Number.parseFloat(menu.style.left)
  const width = Number.parseFloat(menu.style.width)
  const maxHeight = Number.parseFloat(menu.style.maxHeight)
  expect(top).toBeLessThan(610)
  expect(left).toBeGreaterThanOrEqual(0)
  expect(left + width).toBeLessThanOrEqual(window.innerWidth)
  expect(top + maxHeight).toBeLessThanOrEqual(window.innerHeight)

  await act(async () => menu.querySelector<HTMLButtonElement>('[role="menuitem"]')!.click())
  expect(onChooseFiles).toHaveBeenCalledOnce()
  expect(onChooseFolder).not.toHaveBeenCalled()
  expect(document.body.querySelector('.composer-add-popover')).toBeNull()
})

it('supports keyboard navigation, Escape, and the folder picker', async () => {
  const onChooseFolder = vi.fn()
  await act(async () => root.render(<ComposerAddMenu attachmentCount={2} onChooseFiles={vi.fn()} onChooseFolder={onChooseFolder} />))
  const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Add prompt context"]')!
  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({ top: 540, bottom: 576, left: 100, right: 136, width: 36, height: 36, x: 100, y: 540, toJSON: () => ({}) } as DOMRect)
  await act(async () => trigger.click())
  const menu = document.body.querySelector<HTMLElement>('.composer-add-popover')!
  expect(menu.textContent).toContain('2 files attached')
  const items = menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
  await act(async () => items[0]!.focus())
  await act(async () => menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })))
  expect(document.activeElement).toBe(items[1])
  await act(async () => items[1]!.click())
  expect(onChooseFolder).toHaveBeenCalledOnce()
  expect(document.body.querySelector('.composer-add-popover')).toBeNull()
})
