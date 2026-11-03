import { useEffect, useState } from 'react'
import { API_BASE } from '@lib/api'

const platforms = [{ platform: 'windows', label: 'Windows', format: 'setup' }, { platform: 'macos', label: 'macOS', format: 'dmg' }, { platform: 'linux', label: 'Linux', format: 'AppImage' }]
export default function EditorDownloads() {
  const [downloads, setDownloads] = useState([]), [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    fetch(`${API_BASE}/downloads/editor`, { signal: controller.signal, credentials: 'omit' })
      .then(async response => { if (!response.ok) throw new Error('Editor downloads are unavailable'); return response.json() })
      .then(value => { if (!Array.isArray(value.downloads)) throw new Error('Editor downloads are unavailable'); setDownloads(value.downloads) })
      .catch(error => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [])
  const href = file => `${API_BASE}/downloads/editor/${encodeURIComponent(file.filename)}`
  return (
    <section className="mb-16" aria-label="MrCodevaa installers">
      <h2 className="text-2xl font-serif mb-2 text-[#f5f4ef]">MrCodevaa</h2>
      <p className="text-sm text-gray-400 mb-7">Install MrCodevaa and open your existing Codeva projects. Your account connects to the Codeva API on first launch.</p>
      {error && <p role="alert" className="text-sm text-gray-400 mb-4">{error}</p>}
      <div className="grid md:grid-cols-3 gap-5">
        {platforms.map(os => {
          const file = downloads.find(item => item.platform === os.platform && item.format === os.format)
          const deb = os.platform === 'linux' && downloads.find(item => item.format === 'deb')
          return (
            <article key={os.platform} className="p-7 rounded-2xl border border-white/10 bg-[#211f1c] text-[#f5f4ef]">
              <h3 className="text-lg font-semibold mb-3">{os.label}</h3>
              <p className="text-sm text-gray-400 mb-4">{os.platform === 'windows' ? 'Current-user setup with a Start Menu shortcut and uninstaller.' : os.platform === 'macos' ? 'Universal app inside a DMG. Drag MrCodevaa into Applications.' : 'Install the Debian package or run the AppImage.'}</p>
              {file?.available ? <a className="inline-block px-4 py-3 rounded-xl bg-white/5 focus-visible:outline" href={href(file)} download>Download MrCodevaa · {os.label} {os.format === 'setup' ? 'setup.exe' : os.format.toUpperCase()}</a> : <button disabled className="px-4 py-3 rounded-xl bg-white/5 text-gray-500">MrCodevaa · {os.label} release pending</button>}
              {deb?.available && <a className="block text-sm underline mt-4" href={href(deb)} download>Download MrCodevaa · Linux .deb</a>}
              {file?.available && <p className="text-xs text-gray-400 mt-4">{file.signed ? 'Signed installer' : 'Unsigned installer'} · {file.version} · {(file.size / 1048576).toFixed(1)} MB</p>}
            </article>
          )
        })}
      </div>
    </section>
  )
}
