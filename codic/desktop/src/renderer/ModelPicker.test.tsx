// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ModelPicker, { calculateModelMenuPosition, filterModelOptions } from './ModelPicker'
import type { ModelOption } from '../shared/contracts'

let root: Root
let host: HTMLDivElement

const makeModels = (count: number): ModelOption[] => Array.from({ length: count }, (_, index) => ({
  id: `pretend-model-${String(index).padStart(3, '0')}`,
  name: `Pretend model ${String(index).padStart(3, '0')}`,
  provider: index % 2 ? 'Test provider B' : 'Test provider A',
}))

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  HTMLElement.prototype.scrollIntoView = vi.fn()
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

it('keeps a long model list searchable, scrolls to its last keyboard option, and selects it', async () => {
  const onChange = vi.fn()
  const models = makeModels(120)
  await act(async () => root.render(<ModelPicker models={[models[0]!]} value={models[0]!.id} onChange={onChange} />))

  const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Select model"]')!
  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
    top: 530, bottom: 566, left: 740, right: 900, width: 160, height: 36,
    x: 740, y: 530, toJSON: () => ({}),
  } as DOMRect)
  await act(async () => trigger.click())

  // The model catalog can arrive after the menu opens. Its anchor position is
  // recomputed against the current viewport when the long list is installed.
  await act(async () => root.render(<ModelPicker models={models} value={models[0]!.id} onChange={onChange} />))
  const menu = document.body.querySelector<HTMLElement>('.model-picker-popover')!
  expect(menu.dataset.placement).toBe('above')
  expect(Number.parseFloat(menu.style.left)).toBeLessThanOrEqual(window.innerWidth - Number.parseFloat(menu.style.width) - 8)

  const search = menu.querySelector<HTMLInputElement>('input[type="search"]')!
  await act(async () => search.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })))
  const last = menu.querySelector<HTMLButtonElement>('[role="option"][id="codic-model-pretend-model-119"]')!
  expect(last.classList.contains('active')).toBe(true)
  expect(last.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })

  await act(async () => search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
  expect(onChange).toHaveBeenCalledWith('pretend-model-119')
  expect(document.body.querySelector('.model-picker-popover')).toBeNull()
})

it('filters by model name, id, or provider and clamps menus to the visible window', () => {
  const models = makeModels(120)
  expect(filterModelOptions(models, 'model-119')).toHaveLength(1)
  expect(filterModelOptions(models, 'provider b')).toHaveLength(60)
  const position = calculateModelMenuPosition(
    { top: 5, bottom: 35, left: 890, right: 1010, width: 120 },
    { width: 900, height: 600 },
  )
  expect(position.left).toBe(556)
  expect(position.width).toBe(336)
  expect(position.top).toBeGreaterThanOrEqual(8)
  expect(position.top + position.maxHeight).toBeLessThanOrEqual(592)
  const tiny = calculateModelMenuPosition(
    { top: 3, bottom: 8, left: 8, right: 18, width: 10 },
    { width: 24, height: 24 },
  )
  expect(tiny.left).toBeGreaterThanOrEqual(0)
  expect(tiny.left + tiny.width).toBeLessThanOrEqual(24)
  expect(tiny.top).toBeGreaterThanOrEqual(0)
  expect(tiny.top + tiny.maxHeight).toBeLessThanOrEqual(24)
})

it('mouse-wheel scrolls a long catalog to its final model and selects it', async () => {
  const onChange = vi.fn()
  const models = makeModels(120)
  await act(async () => root.render(<ModelPicker models={models} value={models[0]!.id} onChange={onChange} />))
  const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Select model"]')!
  await act(async () => trigger.click())

  const menu = document.body.querySelector<HTMLElement>('.model-picker-popover')!
  const results = menu.querySelector<HTMLDivElement>('.model-picker-results')!
  for (let i = 0; i < 39; i += 1) {
    await act(async () => results.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })))
  }
  await act(async () => results.dispatchEvent(new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true })))

  const last = menu.querySelector<HTMLButtonElement>('[role="option"][id="codic-model-pretend-model-119"]')!
  expect(last.classList.contains('active')).toBe(true)
  expect(last.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
  await act(async () => results.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })))
  expect(last.classList.contains('active')).toBe(true)
  const search = menu.querySelector<HTMLInputElement>('input[type="search"]')!
  await act(async () => search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
  expect(onChange).toHaveBeenCalledWith('pretend-model-119')
})
