// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ProjectPicker, { filterProjects } from './ProjectPicker'
import type { WorkspaceInfo } from '../shared/contracts'

let root: Root
let host: HTMLDivElement
const projects: WorkspaceInfo[] = [
  { name: 'Codeva', path: 'C:\\work\\codeva' },
  { name: 'Codic', path: 'C:\\work\\codic' },
]

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

it('shows saved folders, filters them, and opens the selected project', async () => {
  const onSelect = vi.fn()
  await act(async () => root.render(<ProjectPicker projects={projects} value={projects[0]!.path} onSelect={onSelect} onOpenFolder={vi.fn()} onNewProject={vi.fn()} />))
  const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Project: Codeva"]')!
  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({ top: 520, bottom: 554, left: 100, right: 260, width: 160, height: 34, x: 100, y: 520, toJSON: () => ({}) } as DOMRect)
  await act(async () => trigger.click())
  const menu = document.body.querySelector<HTMLElement>('.project-picker-popover')!
  expect(menu).toBeTruthy()
  const search = menu.querySelector<HTMLInputElement>('input[type="search"]')!
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(search, 'codic')
    search.dispatchEvent(new Event('input', { bubbles: true }))
  })
  expect(menu.querySelectorAll('[role="option"]')).toHaveLength(1)
  const row = menu.querySelector<HTMLButtonElement>('[role="option"]')!
  expect(row.textContent).toContain('Codic')
  await act(async () => row.click())
  expect(onSelect).toHaveBeenCalledWith(projects[1])
  expect(document.body.querySelector('.project-picker-popover')).toBeNull()
})

it('offers separate actions to open an existing folder or create a project', async () => {
  const onOpenFolder = vi.fn()
  const onNewProject = vi.fn()
  await act(async () => root.render(<ProjectPicker projects={[]} onSelect={vi.fn()} onOpenFolder={onOpenFolder} onNewProject={onNewProject} />))
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Choose project"]')!.click())
  const menu = document.body.querySelector<HTMLElement>('.project-picker-popover')!
  expect(menu.querySelector('[role="status"]')?.textContent).toContain('No saved projects yet')
  await act(async () => menu.querySelector<HTMLButtonElement>('button')!.click())
  expect(onOpenFolder).toHaveBeenCalledOnce()

  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Choose project"]')!.click())
  const actions = [...document.body.querySelectorAll<HTMLButtonElement>('.project-picker-footer button')]
  await act(async () => actions[1]!.click())
  expect(onNewProject).toHaveBeenCalledOnce()
})

it('supports moving through projects with the keyboard and opening the active project', async () => {
  const onSelect = vi.fn()
  await act(async () => root.render(<ProjectPicker projects={projects} onSelect={onSelect} onOpenFolder={vi.fn()} onNewProject={vi.fn()} />))
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Choose project"]')!.click())
  const menu = document.body.querySelector<HTMLElement>('.project-picker-popover')!
  const search = menu.querySelector<HTMLInputElement>('input[type="search"]')!
  await act(async () => search.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })))
  const second = menu.querySelector<HTMLButtonElement>('[role="option"]:nth-child(2)')!
  expect(second.classList.contains('active')).toBe(true)
  await act(async () => search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
  expect(onSelect).toHaveBeenCalledWith(projects[1])
})

it('matches a project by its name or path', () => {
  expect(filterProjects(projects, 'CODEVA')).toEqual([projects[0]])
  expect(filterProjects(projects, 'work\\codic')).toEqual([projects[1]])
})
