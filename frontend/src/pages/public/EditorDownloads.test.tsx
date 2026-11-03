import React, { act } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import EditorDownloads from './EditorDownloads'
import { API_BASE } from '@lib/api'
let root: Root, host: HTMLDivElement
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; host = document.createElement('div'); document.body.append(host); root = createRoot(host) })
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals() })
async function render() { await act(async () => root.render(<EditorDownloads />)) }
it('uses anonymous existing-API installer URLs for all OS formats and reports unsigned releases accurately', async () => {
  const filenames = ['MrCodevaa-win-x64-setup.exe', 'MrCodevaa-mac-universal.dmg', 'MrCodevaa-linux-x64.AppImage', 'MrCodevaa-linux-x64.deb']
  const downloads = filenames.map((filename, i) => ({ filename, platform: ['windows', 'macos', 'linux', 'linux'][i], format: ['setup', 'dmg', 'AppImage', 'deb'][i], available: true, signed: false, size: 1048576, version: '1.139.0-codeva.123' }))
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ downloads }) })
  vi.stubGlobal('fetch', fetcher); await render()
  const links = [...host.querySelectorAll('a')]
  expect(links.map(link => link.getAttribute('href'))).toEqual(filenames.map(name => `${API_BASE}/downloads/editor/${name}`))
  expect(links[0].textContent).toBe('Download MrCodevaa · Windows setup.exe')
  expect(host.textContent?.match(/Unsigned installer/g)).toHaveLength(3)
  expect(fetcher.mock.calls[0][1].credentials).toBe('omit')
})
it('does not pretend an unpublished editor artifact is an existing chat desktop build', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ downloads: [] }) })); await render()
  expect((host.querySelector('button') as HTMLButtonElement).disabled).toBe(true)
  expect(host.textContent).toContain('MrCodevaa · Windows release pending')
  expect(host.querySelectorAll('a')).toHaveLength(0)
})
it('shows a failed catalog request without offering invented download files', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false })); await render()
  expect(host.querySelector('[role=alert]')?.textContent).toBe('Editor downloads are unavailable')
  expect(host.querySelectorAll('a')).toHaveLength(0)
})
