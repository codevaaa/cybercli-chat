/**
 * Desktop Update Notification — full auto-update flow surfaced in the renderer.
 *
 * States: checking → available (downloading) → progress → downloaded (restart)
 *          → error. Driven by real electron-updater events from the main process.
 * Only renders inside the Electron desktop app (window.electronAPI present).
 */
import { useState, useEffect } from 'react'
import { Download, X, RefreshCw, Loader2, AlertCircle, Sparkles, Code2, Shield, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

export default function DesktopUpdateNotification() {
  const [phase, setPhase] = useState(null) // null | 'available' | 'progress' | 'downloaded' | 'error' | 'whatsNew'
  const [percent, setPercent] = useState(0)
  const [version, setVersion] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    const removers = []

    if (api.getAppInfo) {
      api.getAppInfo().then(info => {
        if (!info || !info.version) return
        const currentVersion = info.version
        const lastVersion = localStorage.getItem('codeva_last_version')
        if (lastVersion && currentVersion !== lastVersion) {
          setPhase('whatsNew')
          setVersion(currentVersion)
        }
        localStorage.setItem('codeva_last_version', currentVersion)
      }).catch(console.error)
    }

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
    whatsNew: {
      icon: <RefreshCw className="w-4 h-4 text-green-400" />,
      title: `Successfully updated to v${version}`,
      body: 'Codeva has been updated! Check out the changelog to see what\'s new.',
      actions: (
        <div className="flex items-center gap-2 mt-1">
          <Link to="/changelog" onClick={() => setDismissed(true)} className="px-3 py-1.5 rounded-lg bg-[#C96442] text-white text-xs font-medium hover:bg-[#b9573a] transition-colors">
            View Changelog
          </Link>
          <button onClick={() => setDismissed(true)} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-[#A0A0A0] text-xs hover:bg-white/[0.1] transition-colors">Dismiss</button>
        </div>
      ),
    },
  }[phase]

  if (phase === 'whatsNew') {
    return (
      <AnimatePresence>
        {!dismissed && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDismissed(true)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#08080E] rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: '90vh' }}
            >
              {/* Header */}
              <div className="relative p-8 border-b border-white/[0.04] bg-gradient-to-br from-[#C96442]/10 to-transparent">
                <div className="absolute top-4 right-4">
                  <button onClick={() => setDismissed(true)} className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C96442] to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-[#C96442]/20">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Codeva Update {version}</h2>
                <p className="text-gray-400 text-lg">We've just installed the latest updates and improvements.</p>
              </div>

              {/* Content */}
              <div className="p-8 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                <div className="space-y-8">
                  {/* Feature 1 */}
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Zap className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">Ultra-Fast Voice Agents</h3>
                      <p className="text-gray-400 leading-relaxed">
                        Experience lightning-fast conversational AI with Kushi (female), Rudra (JARVIS-like), and Sankalp. Near-instant response times for deep discussions.
                      </p>
                    </div>
                  </div>
                  
                  {/* Feature 2 */}
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Shield className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">Model Access Tiers</h3>
                      <p className="text-gray-400 leading-relaxed">
                        We've refined our model selection. Abhimanyu remains your trusty default, while Pro and Max users now have exclusive access to our advanced "More Models" directory.
                      </p>
                    </div>
                  </div>

                  {/* Feature 3 */}
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Code2 className="w-5 h-5 text-orange-" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">UI & Stability Fixes</h3>
                      <p className="text-gray-400 leading-relaxed">
                        Resolved bugs with the global search view, fixed the apps and extensions page, removed distracting chat backgrounds, and significantly improved the desktop auto-updater stability.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/[0.04] bg-white/[0.02] flex items-center justify-end gap-3">
                <Link to="/changelog" onClick={() => setDismissed(true)} className="px-4 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 font-medium transition-colors">
                  Read Full Changelog
                </Link>
                <button onClick={() => setDismissed(true)} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C96442] to-[#b9573a] text-white font-medium hover:opacity-90 transition-opacity shadow-lg shadow-[#C96442]/20">
                  Got it, thanks!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    )
  }

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
