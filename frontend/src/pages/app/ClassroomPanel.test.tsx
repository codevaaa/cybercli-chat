import React, { act } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ClassroomPanel from './ClassroomPanel.jsx'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn(), token: vi.fn() }))
vi.mock('../../lib/api.js', () => ({ default: mocks, API_BASE: 'http://localhost/api/v1', getFreshToken: mocks.token }))
let root: Root, host: HTMLDivElement
const record = { dossier: { classroom: { deadline: '2099-01-01T00:00:00Z' } } }
const createURL = URL.createObjectURL, revokeURL = URL.revokeObjectURL
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  for (const mock of Object.values(mocks)) mock.mockReset()
  mocks.token.mockResolvedValue('fixture-account-token')
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks()
  URL.createObjectURL = createURL; URL.revokeObjectURL = revokeURL
})
async function render(teacher = false, classrooms: any[] = []) {
  mocks.get.mockImplementation(async path => ({ data: path.endsWith('account') ? { teacher_enabled: teacher } : { classrooms } }))
  await act(async () => root.render(<MemoryRouter><Routes><Route path='/' element={<ClassroomPanel projectId='project' record={record} />} /><Route path='/projects' element={<p>Existing projects</p>} /><Route path='/projects/studio/:id' element={<p>Assigned student project</p>} /></Routes></MemoryRouter>))
}
async function click(text: string) { await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent!.includes(text))!.click()) }
async function change(input: HTMLInputElement, value: string) {
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })) })
}
it('only the server-approved teacher sees the form; assigned students open their own API project', async () => {
  await render(false, [{ id: 'class', prompt_original: 'Locked notes', deadline: '2099', teacher_id: 'teacher' }])
  expect(host.querySelector('form')).toBeNull(); expect(host.textContent).toContain('Training opt-in: off')
  mocks.post.mockResolvedValue({ data: { project_id: 'student-project' } })
  await click('Open my classroom project')
  expect(mocks.post).toHaveBeenCalledWith('/studio/classrooms/class/projects', {})
  expect(host.textContent).toContain('Assigned student project')
})
it('teacher creation records explicit consent and assignment goes through the existing API', async () => {
  await render(true)
  const inputs = host.querySelectorAll('input')
  await change(inputs[0], 'student-a, student-b'); await change(inputs[1], '2099-01-01T12:00')
  await act(async () => inputs[2].click())
  mocks.post.mockResolvedValue({ data: { _id: 'class', student_ids: ['student-a'], prompt_original: 'Locked notes', deadline: '2099' } })
  await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  expect(mocks.post).toHaveBeenCalledWith('/studio/classrooms', expect.objectContaining({ project_id: 'project', student_ids: ['student-a', 'student-b'], consent: { teacher: true } }))
  await click('Assign isolated project')
  expect(mocks.post).toHaveBeenCalledWith('/studio/classrooms/class/projects', { student_id: 'student-a' })
})
it('export uses the account bearer and a real response blob, and errors stay visible', async () => {
  await render()
  const blob = new Blob(['zip fixture']), fetcher = vi.fn(async () => ({ ok: true, blob: async () => blob }))
  vi.stubGlobal('fetch', fetcher); URL.createObjectURL = vi.fn(() => 'blob:fixture'); URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  await click('Export snapshot')
  expect(fetcher).toHaveBeenCalledWith('http://localhost/api/v1/studio/projects/project/export', { headers: { Authorization: 'Bearer fixture-account-token' } })
  expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
  fetcher.mockImplementation(async () => ({ ok: false, json: async () => ({ error: 'Snapshot unavailable' }) }) as any)
  await click('Export snapshot'); expect(host.querySelector('[role=alert]')?.textContent).toContain('Snapshot unavailable')
})
it('deletion requires an explicit choice and navigates only after the owned API confirms', async () => {
  await render(); const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  await click('Delete generated'); expect(mocks.delete).not.toHaveBeenCalled()
  confirm.mockReturnValue(true); mocks.delete.mockRejectedValue({ response: { data: { error: 'Worker is busy' } } })
  await click('Delete generated'); expect(host.querySelector('[role=alert]')?.textContent).toContain('Worker is busy')
  mocks.delete.mockResolvedValue({ data: { deleted: true } }); await click('Delete generated')
  expect(mocks.delete).toHaveBeenCalledWith('/studio/projects/project/dossier'); expect(host.textContent).toContain('Existing projects')
})
it('permission lookup failure is visible and cannot enable teacher controls', async () => {
  mocks.get.mockRejectedValue({ response: { data: { error: 'Account unavailable' } } })
  await act(async () => root.render(<MemoryRouter><ClassroomPanel projectId='project' record={record} /></MemoryRouter>))
  expect(host.querySelector('[role=alert]')?.textContent).toContain('Account unavailable'); expect(host.querySelector('form')).toBeNull()
})
