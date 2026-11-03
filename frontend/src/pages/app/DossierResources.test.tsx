import React, { act } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import DossierResources from './DossierResources.jsx'
import { MATERIAL_ABSENT, materialDisplay } from '../../lib/materialAnswer.js'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('../../lib/api.js', () => ({ default: mocks }))
let root: Root, host: HTMLDivElement
const id = '507f1f77bcf86cd799439011', base = `/studio/projects/${id}`, onRecord = vi.fn()
const record = { meter: { free: 1, mid: 3, frontier: 0 }, dossier: { prompt_original: '  नमस्ते\r\n🌏  ', materials: [{ id: 'file', name: 'Commerce', chunks: [1] }], tasks: [{ id: 'task', screenshot: 'current.png', screen: { visual_diff: { ratio: .02, path: 'diff.png' } } }] } }
async function render() { await act(async () => root.render(<DossierResources projectId={id} record={record} onRecord={onRecord} />)) }
async function change(label: string, value: string) {
  const input = host.querySelector(`[aria-label="${label}"]`) as HTMLTextAreaElement
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })) })
}
async function submit(index: number) { await act(async () => host.querySelectorAll('form')[index].dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))) }
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; mocks.get.mockReset(); mocks.post.mockReset(); onRecord.mockReset(); host = document.createElement('div'); document.body.append(host); root = createRoot(host) })
afterEach(async () => { await act(async () => root.unmount()); host.remove() })
it('shows stored prompt bytes, reload meter and screenshot comparison', async () => {
  await render(); expect(host.querySelector('pre')!.textContent).toBe(record.dossier.prompt_original)
  expect(host.textContent).toContain('Mid 3'); expect(host.textContent).toContain('2.00%'); expect(host.textContent).toContain('Commerce')
})
it('refuses missing citations or an altered quote, and renders a valid exact excerpt with its PDF page', async () => {
  await render(); await change('Material question', 'stock inventory')
  mocks.post.mockResolvedValueOnce({ data: { supported: true, answer: 'invented stock fact', citations: [] } })
  await submit(1); expect(host.textContent).toContain(MATERIAL_ABSENT); expect(host.textContent).not.toContain('invented stock fact')
  mocks.post.mockResolvedValueOnce({ data: { supported: true, answer: 'Stock records goods.', citations: [{ material_id: 'f', chunk_id: 'c', page: 2, quote: 'Stock records goods.', name: 'Commerce.pdf' }] } })
  await submit(1); expect(host.textContent).toContain('Stock records goods.'); expect(host.textContent).toContain('page 2')
  expect(mocks.post).toHaveBeenCalledWith(`${base}/material-question`, { question: 'stock inventory' })
  expect(materialDisplay({ supported: true, answer: 'different', citations: [{ material_id: 'f', chunk_id: 'c', note_id: 'n', quote: 'actual' }] }).answer).toBe(MATERIAL_ABSENT)
})
it('notes are uploaded onto the same owned dossier and update the authoritative envelope', async () => {
  await render(); mocks.post.mockResolvedValue({ data: record }); await change('Notes', 'Stock inventory is recorded.'); await submit(0)
  expect(mocks.post).toHaveBeenCalledWith(`${base}/materials`, { kind: 'notes', name: 'Notes', text: 'Stock inventory is recorded.' }); expect(onRecord).toHaveBeenCalledWith(record)
})
it('PDF upload sends file bytes through the same studio API', async () => {
  await render(); mocks.post.mockResolvedValue({ data: record })
  const input = host.querySelector('[aria-label="Upload PDF"]') as HTMLInputElement
  const file = new File(['%PDF-1.4'], 'Commerce.pdf', { type: 'application/pdf' }); Object.defineProperty(file, 'arrayBuffer', { value: async () => new TextEncoder().encode('%PDF-1.4').buffer }); Object.defineProperty(input, 'files', { value: [file] })
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(resolve => setTimeout(resolve, 10)) })
  expect(mocks.post).toHaveBeenCalledWith(`${base}/materials`, { name: 'Commerce.pdf', kind: 'pdf', data_base64: btoa('%PDF-1.4') })
})
it('stored replay displays a missing-output failure and calls no model route', async () => {
  await render(); mocks.get.mockResolvedValue({ data: { status: 'failed', steps: [{ tool_call_id: 'call', seq: 1, tool: 'read', status: 'missing_output', input: {} }] } })
  await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent!.startsWith('Replay stored'))!.click())
  expect(host.textContent).toContain('missing_output'); expect(mocks.get).toHaveBeenCalledWith(`${base}/replay`); expect(mocks.post).not.toHaveBeenCalled()
})
it('failed material requests show their error instead of an unsupported answer', async () => {
  await render(); mocks.post.mockRejectedValue({ response: { data: { error: 'Secret detected' } } }); await change('Material question', 'bad input'); await submit(1)
  expect(host.querySelector('[role=alert]')!.textContent).toBe('Secret detected')
})
