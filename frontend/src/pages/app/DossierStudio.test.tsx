import React, { act } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DossierStudio, { studioLabels } from './DossierStudio.jsx'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }))
vi.mock('../../lib/api.js', () => ({ default: mocks, API_BASE: 'http://localhost/api/v1', getFreshToken: async () => 'test-session' }))

let root: Root, host: HTMLDivElement
function record(status = 'pending', lint: object[] = []) {
  return { project_id: '507f1f77bcf86cd799439011', revision: 1, lint, dossier: {
    state: 'wait_for_user', spec: Object.fromEntries(['will_build', 'must_never', 'acceptance'].map(group => [group, [{ id: group, text: `${group} line`, final_text: `${group} line`, status }]])),
    tasks: [], events: [], judge: [] as any[], live: [], last_green: null as null | { generation: number, time: string }, blocked: null as null | { reason: string, resume_state: string },
  } }
}
async function render(value: ReturnType<typeof record>, projectId = '507f1f77bcf86cd799439011') {
  mocks.get.mockResolvedValue({ data: value })
  await act(async () => {
    root.render(<MemoryRouter initialEntries={[`/projects/studio/${projectId}`]}><Routes><Route path='/projects/studio/:projectId' element={<DossierStudio />} /></Routes></MemoryRouter>)
  })
}
async function change(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  await act(async () => {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function click(text: string) { await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent === text)!.click()) }
async function submit(form: HTMLFormElement) { await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))) }
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  mocks.get.mockReset(); mocks.post.mockReset(); mocks.patch.mockReset()
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, body: new ReadableStream() })))
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals() })

describe('dossier within the current projects shell', () => {
  it('renders Hindi and English labels on all three spec columns and progress; never auto-accepts', async () => {
    await render(record())
    for (const label of ['spec', 'progress', 'will_build', 'must_never', 'acceptance']) expect(host.textContent).toContain(studioLabels[label])
    const button = [...host.querySelectorAll('button')].find(b => b.textContent === studioLabels.run)!
    expect(button.disabled).toBe(true)
    expect(mocks.post).not.toHaveBeenCalled(); expect(mocks.patch).not.toHaveBeenCalled()
    expect(mocks.get).toHaveBeenCalledWith('/studio/projects/507f1f77bcf86cd799439011/dossier')
  })
  it('enables only an accepted consistent spec, and a linter finding disables build', async () => {
    mocks.post.mockResolvedValue({ data: record('accepted') })
    await render(record('accepted'))
    const button = [...host.querySelectorAll('button')].find(b => b.textContent === studioLabels.run)!
    expect(button.disabled).toBe(false)
    await act(async () => button.click())
    expect(mocks.post).toHaveBeenCalledWith('/studio/projects/507f1f77bcf86cd799439011/run', {})
  })
  it('shows a contradictory-spec block and an all-rejected spec cannot build', async () => {
    await render(record('accepted', [{ reason: 'Public and owner-only access conflict' }]))
    expect(host.querySelector('[role=alert]')?.textContent).toContain('conflict')
    expect([...host.querySelectorAll('button')].find(b => b.textContent === studioLabels.run)?.disabled).toBe(true)
  })
  it('rejecting every line leaves the build button disabled', async () => {
    await render(record('rejected'))
    expect([...host.querySelectorAll('button')].find(b => b.textContent === studioLabels.run)?.disabled).toBe(true)
  })
  it('a blocked spec preparation can retry even when no acceptance lines have been generated yet', async () => {
    const data = record()
    data.dossier.state = 'blocked'; data.dossier.blocked = { reason: 'No provider configured', resume_state: 'spec' }
    for (const group of Object.keys(data.dossier.spec)) data.dossier.spec[group] = []
    mocks.post.mockResolvedValue({ data })
    await render(data)
    const button = [...host.querySelectorAll('button')].find(b => b.textContent === 'Retry from checkpoint / फिर प्रयास करें')!
    expect(button.disabled).toBe(false)
    await act(async () => button.click())
    expect(mocks.post).toHaveBeenCalledWith('/studio/projects/507f1f77bcf86cd799439011/run', {})
  })
  it('accepting an already edited line keeps the visible user text', async () => {
    const data = record()
    data.dossier.spec.will_build[0].final_text = 'User edited goal'
    data.dossier.spec.will_build[0].status = 'edited'
    mocks.patch.mockResolvedValue({ data })
    await render(data)
    await click('Accept / स्वीकार')
    expect(mocks.patch).toHaveBeenCalledWith('/studio/projects/507f1f77bcf86cd799439011/spec/will_build', { status: 'edited', text: 'User edited goal' })
    await change(host.querySelector('textarea')!, 'New goal')
    await click('Save edit / बदलाव')
    expect(mocks.patch).toHaveBeenLastCalledWith('/studio/projects/507f1f77bcf86cd799439011/spec/will_build', { status: 'edited', text: 'New goal' })
    await click('Reject / अस्वीकार')
    expect(mocks.patch).toHaveBeenLastCalledWith('/studio/projects/507f1f77bcf86cd799439011/spec/will_build', { status: 'rejected' })
  })
  it('submits the exact prompt through the studio API and keeps the current projects route', async () => {
    const data = record()
    mocks.post.mockResolvedValue({ data })
    await render(data, 'new')
    await change(host.querySelector('input')!, 'My project')
    const prompt = '  Original request 🌏\n  keep whitespace  '
    await change(host.querySelector('textarea')!, prompt)
    await submit(host.querySelector('form')!)
    expect(mocks.post).toHaveBeenCalledWith('/studio/projects', { name: 'My project', prompt, pack: 'general' })
    expect(host.querySelector('a')?.getAttribute('href')).toBe('/projects')
    expect(host.textContent).toContain(studioLabels.progress)
  })
  it('listener and fix use the same project APIs while progress remains connected', async () => {
    const data = record('accepted')
    await render(data)
    mocks.post.mockResolvedValueOnce({ data: { answer: 'Stored state: build', source: { revision: 7 } } })
    const forms = host.querySelectorAll('form')
    await change(forms[0].querySelector('textarea')!, 'What is running?')
    await submit(forms[0])
    expect(host.textContent).toContain('Stored state: build')
    expect(mocks.post).toHaveBeenCalledWith('/studio/projects/507f1f77bcf86cd799439011/listener', { question: 'What is running?' })
    mocks.post.mockResolvedValueOnce({ data })
    await change(forms[1].querySelector('textarea')!, 'Add an open button')
    await submit(forms[1])
    expect(mocks.post).toHaveBeenLastCalledWith('/studio/projects/507f1f77bcf86cd799439011/fix', { text: 'Add an open button' })
    expect(vi.mocked(fetch).mock.calls.length).toBe(1)
  })
  it('live preview uses a private POST launch, a named button click, and the rollback API', async () => {
    const data = record('accepted')
    data.dossier.state = 'live'; data.dossier.last_green = { generation: 1, time: 'fixture' }
    data.dossier.judge = [{ agent_id: 'Judge', model: 'mid', lines: [{ id: 'acceptance', verdict: 'pass', evidence: 'Source test' }] }]
    await render(data)
    const popup = { close: vi.fn() }
    const opened = vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
    const formSubmit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function () {
      expect(this.action).toBe('http://preview.test/session')
      expect(this.method).toBe('post')
      expect(this.querySelector('input')!.value).toBe('one-time-test-token')
    })
    mocks.post.mockResolvedValueOnce({ data: { launch_url: 'http://preview.test/session', launch_token: 'one-time-test-token' } })
    await click('Open private preview / निजी प्रीव्यू खोलें')
    expect(formSubmit).toHaveBeenCalledOnce(); expect(opened).toHaveBeenCalledOnce()
    mocks.post.mockResolvedValue({ data })
    const form = host.querySelectorAll('form')[2]
    await change(form.querySelector('input')!, 'View notes')
    await submit(form)
    expect(mocks.post).toHaveBeenLastCalledWith('/studio/projects/507f1f77bcf86cd799439011/click', { path: '/', button_label: 'View notes' })
    await click('Restore last green / अंतिम सही स्थिति लौटाएं')
    expect(mocks.post).toHaveBeenLastCalledWith('/studio/projects/507f1f77bcf86cd799439011/rollback', {})
    await click('Confirm completion / पूर्णता पुष्टि')
    expect(mocks.post).toHaveBeenLastCalledWith('/studio/projects/507f1f77bcf86cd799439011/complete', {})
    formSubmit.mockRestore(); opened.mockRestore()
  })
})
