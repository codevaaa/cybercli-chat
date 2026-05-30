/**
 * Desktop Title Bar — Custom window chrome for Electron
 * Shows on macOS (hiddenInset) and Windows (frameless)
 */
import { useState, useEffect } from 'react'
import { Minus, Square, X } from 'lucide-react'

export default function DesktopTitleBar() {
  const [isDesktop, setIsDesktop] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    setIsDesktop(!!window.electronAPI)
  }, [])

  if (!isDesktop) return null

  return (
    <div
      className="h-9 flex items-center justify-between px-3 select-none"
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Left: traffic lights on macOS, app icon on Windows */}
      <div className="flex items-center gap-2">
        {window.electronAPI?.platform === 'darwin' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.electronAPI?.closeWindow?.()}
              className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF5F57]/80 transition-colors"
              style={{ WebkitAppRegion: 'no-drag' }}
            />
            <button
              onClick={() => window.electronAPI?.minimizeWindow?.()}
              className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:bg-[#FFBD2E]/80 transition-colors"
              style={{ WebkitAppRegion: 'no-drag' }}
            />
            <button
              onClick={() => window.electronAPI?.maximizeWindow?.()}
              className="w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#28C840]/80 transition-colors"
              style={{ WebkitAppRegion: 'no-drag' }}
            />
          </div>
        ) : (
          <span className="text-xs text-[#A0A0A0] font-medium ml-1">Codeva</span>
        )}
      </div>

      {/* Center: draggable area */}
      <div className="flex-1" />

      {/* Right: window controls on Windows/Linux */}
      {window.electronAPI?.platform !== 'darwin' && (
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={() => window.electronAPI?.minimizeWindow?.()}
            className="p-1.5 rounded hover:bg-white/10 text-[#A0A0A0] hover:text-[#ECECEC] transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.electronAPI?.maximizeWindow?.()}
            className="p-1.5 rounded hover:bg-white/10 text-[#A0A0A0] hover:text-[#ECECEC] transition-colors"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.electronAPI?.closeWindow?.()}
            className="p-1.5 rounded hover:bg-red-500/20 text-[#A0A0A0] hover:text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
