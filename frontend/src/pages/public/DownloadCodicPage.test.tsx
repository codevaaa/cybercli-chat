import React, { act } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it } from 'vitest'
import DownloadCodicPage from './DownloadCodicPage'

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

it('shows a detailed Codic preview without offering a public installer', async () => {
  await act(async () => root.render(<MemoryRouter><DownloadCodicPage /></MemoryRouter>))
  expect(host.textContent).toContain('Coming soon')
  expect(host.textContent).toContain('A coding workspace built around your project.')
  expect(host.textContent).toContain('Coordinate sub-agents')
  expect(host.textContent).toContain('Your project stays on your machine.')
  expect(host.textContent).toContain('No installer is available yet.')
  expect([...host.querySelectorAll('a')].some(link => /downloads\/codic\/windows|\.exe/i.test(link.href))).toBe(false)
})
