import React, { act } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { API_BASE } from '@lib/api'
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
  vi.unstubAllGlobals()
})

async function render() {
  await act(async () => root.render(<MemoryRouter><DownloadCodicPage /></MemoryRouter>))
}

it('shows live availability cards and enables only artifacts published by the catalog', async () => {
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ windows: { available: true, url: '/api/v1/downloads/codic/windows', version: '0.1.7', arch: 'x64', signed: false, size: 10_485_760 } }),
  })
  vi.stubGlobal('fetch', fetcher)
  await render()

  expect(fetcher).toHaveBeenCalledWith(`${API_BASE}/downloads/codic`, expect.objectContaining({ credentials: 'omit', cache: 'no-store' }))
  expect(host.querySelectorAll('#codic-downloads article')).toHaveLength(3)
  expect(host.textContent).toContain('1 platform currently has a published installer.')
  expect(host.textContent).toContain('Windows')
  expect(host.textContent).toContain('macOS')
  expect(host.textContent).toContain('Linux')
  const links = [...host.querySelectorAll('a[href*="/downloads/codic/"]')]
  expect(links).toHaveLength(1)
  expect(links[0].getAttribute('href')).toBe(`${API_BASE}/downloads/codic/windows`)
  expect(host.textContent).toContain('Version 0.1.7')
  expect(host.textContent).toContain('Unsigned preview installer')
  expect(host.textContent).toContain('Coming soon')
})

it('keeps every platform unavailable when the catalog has no published artifacts', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ windows: { available: false } }) }))
  await render()

  expect(host.textContent).toContain('No Codic installers are currently published.')
  expect(host.querySelectorAll('a[href*="/downloads/codic/"]')).toHaveLength(0)
  expect([...host.querySelectorAll('button[disabled]')]).toHaveLength(3)
  expect(host.textContent).toContain('A Windows installer will appear here after it is published.')
  expect(host.textContent).toContain('A macOS installer will appear here after it is published.')
  expect(host.textContent).toContain('A Linux installer will appear here after it is published.')
})

it('fails closed and offers no download link when availability cannot be checked', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
  await render()

  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Downloads are disabled until the catalog responds.')
  expect(host.textContent).toContain('Release availability could not be checked.')
  expect(host.querySelectorAll('a[href*="/downloads/codic/"]')).toHaveLength(0)
  expect([...host.querySelectorAll('button[disabled]')]).toHaveLength(3)
})

it('rejects a catalog download URL that points outside the expected Codic endpoint', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ windows: { available: true, url: 'https://example.com/installer.exe', version: '9.9.9' } }),
  }))
  await render()

  expect(host.querySelectorAll('a[href*="/downloads/codic/"]')).toHaveLength(0)
  expect(host.textContent).toContain('Download link unavailable')
  expect(host.textContent).toContain('A catalog entry needs a valid Codic download link before it can be offered.')
  expect(host.textContent).not.toContain('Version 9.9.9')
})

it('omits structured or oversized artifact metadata without breaking a valid download', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      windows: {
        available: true,
        url: '/api/v1/downloads/codic/windows',
        version: { current: '0.1.8' },
        arch: ['x64', 'arm64'],
        size: 10_485_760,
      },
      macos: {
        available: true,
        url: '/api/v1/downloads/codic/macos',
        version: 'x'.repeat(49),
        arch: 'universal',
      },
    }),
  }))
  await render()

  expect(host.querySelectorAll('a[href*="/downloads/codic/"]')).toHaveLength(2)
  expect(host.textContent).not.toContain('[object Object]')
  expect(host.textContent).not.toContain('x64,arm64')
  expect(host.textContent).not.toContain(`Version ${'x'.repeat(49)}`)
  expect(host.textContent).toContain('universal')
  expect(host.textContent).toContain('10.0 MB')
})
