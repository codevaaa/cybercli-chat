/**
 * Desktop Update Notification — full auto-update flow surfaced in the renderer.
 *
 * States: checking → available (downloading) → progress → downloaded (restart)
 *          → error. Driven by real electron-updater events from the main process.
 * Only renders inside the Electron desktop app (window.electronAPI present).
 */
import { useState, useEffect } from 'react'
import { Download, X, RefreshCw, Loader2, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function DesktopUpdateNotification() {
  const [phase, setPhase] = useState(null) // null | 'available' | 'progress' | 'downloaded' | 'error'
  const [percent, setPercent] = useState(0)
  const [version, setVersion] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    const removers = []

    if (api.onUpdateAvailable) removers.push(api.onUpdateAvailable((info) => {
      setPhase('available'); setVersion(info?.version || ''); setDismissed(false)
    }))
    if (api.onUpdateProgress) removers.push(api.onUpdateProgress((p) => {
      setPhase('progress'); setPercent(p?.percent ?? 0)
    }))
    if (api.onUpdateDownloaded) removers.push(api.onUpdateDownloaded((info) => {
      setPhase('downloaded'); setVersion(info?.version || ''); setDismissed(false)
    }))
    if (api.onUpdateError) removers.push(api.onUpdateError((msg) => {
      setPhase('error'); setErrorMsg(msg || 'Update failed')
    }))

    return () => removers.forEach((r) => r?.())
  }, [])

  if (!phase || dismissed) return null

  const handleRestart = () => window.electronAPI?.restartToUpdate?.()

  const content = {
    available: {
      icon: <Loader2 className="w-4 h-4 text-[#C96442] animate-spin" />,
      title: `Update available${version ? ` · v${version}` : ''}`,
      body: 'Downloading the latest version of Codeva in the background…',
      actions: null,
    },
    progress: {
      icon: <Loader2 className="w-4 h-4 text-[#C96442] animate-spin" />,
      title: `Downloading update… ${Math.round(percent)}%`,
      body: null,
      actions: null,
    },
    downloaded: {
      icon: <Download className="w-4 h-4 text-[#C96442]" />,
      title: `Update ready${version ? ` · v${version}` : ''}`,
      body: 'A new version of Codeva has been downloaded. Restart to install.',
      actions: (
        <div className="flex items-center gap-2">
          <button onClick={handleRestart} className="px-3 py-1.5 rounded-lg bg-[#C96442] text-white text-xs font-medium hover:bg-[#b9573a] transition-colors flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" /> Restart now
          </button>
          <button onClick={() => setDismissed(true)} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-[#A0A0A0] text-xs hover:bg-white/[0.1] transition-colors">Later</button>
        </div>
      ),
    },
    error: {
      icon: <AlertCircle className="w-4 h-4 text-rose-400" />,
      title: 'Update failed',
      body: errorMsg,
      actions: (
        <button onClick={() => window.electronAPI?.checkForUpdates?.()} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-[#A0A0A0] text-xs hover:bg-white/[0.1] transition-colors">Retry</button>
      ),
    },
  }[phase]

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm">
      <div className="p-4 rounded-2xl bg-[#211f1c] border border-[#C96442]/30 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#C96442]/10 flex items-center justify-center flex-shrink-0">
            {content.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-[#f5f4ef] mb-1">{content.title}</h4>
            {content.body && <p className="text-xs text-[#A0A0A0] mb-2">{content.body}</p>}

            {phase === 'progress' && (
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-2">
                <div className="h-full bg-[#C96442] transition-all" style={{ width: `${Math.round(percent)}%` }} />
              </div>
            )}

            {content.actions}

            {(phase === 'downloaded' || phase === 'available') && (
              <Link to="/changelog" onClick={() => setDismissed(true)} className="inline-block mt-2 text-[11px] text-[#C96442] hover:underline">
                See what's new
              </Link>
            )}
          </div>
          <button onClick={() => setDismissed(true)} className="text-[#707070] hover:text-[#ECECEC] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
