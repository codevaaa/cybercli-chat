/**
 * Desktop Update Notification — Shows when a new version is downloaded
 */
import { useState, useEffect } from 'react'
import { Download, X, RefreshCw } from 'lucide-react'

export default function DesktopUpdateNotification() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!window.electronAPI?.onUpdateAvailable) return
    const remove = window.electronAPI.onUpdateAvailable(() => {
      setVisible(true)
    })
    return () => remove?.()
  }, [])

  if (!visible) return null

  const handleRestart = () => {
    window.electronAPI?.restartToUpdate?.()
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm">
      <div className="p-4 rounded-2xl bg-[#14141A] border border-[#D97757]/30 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#D97757]/10 flex items-center justify-center flex-shrink-0">
            <Download className="w-4 h-4 text-[#D97757]" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-[#ECECEC] mb-1">Update Available</h4>
            <p className="text-xs text-[#A0A0A0] mb-3">
              A new version of CyberCli has been downloaded. Restart to install.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRestart}
                className="px-3 py-1.5 rounded-lg bg-[#D97757] text-white text-xs font-medium hover:bg-[#D97757]/90 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                Restart Now
              </button>
              <button
                onClick={() => setVisible(false)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-[#A0A0A0] text-xs hover:bg-white/[0.1] transition-colors"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="text-[#707070] hover:text-[#ECECEC] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
