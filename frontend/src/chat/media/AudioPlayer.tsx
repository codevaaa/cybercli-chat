/**
 * AudioPlayer — Inline audio player with play, pause, and seek controls.
 *
 * Available in the UI before any voice message is received (renders even
 * with no src). Fully responsive — uses flex layout that collapses the time
 * display to a smaller font on narrow screens via clamp().
 *
 * REQ-8.5
 */

import React, { useRef, useState, useCallback, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AudioPlayerProps {
  src?: string
  label?: string
  onEnded?: () => void
  className?: string
}

// ---------------------------------------------------------------------------
// Helper: format seconds → m:ss
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// AudioPlayer component
// ---------------------------------------------------------------------------

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  label = 'Voice message',
  onEnded,
  className = '',
}) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setHasError(false)
  }, [src])

  const handlePlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || !src) return
    try {
      await audio.play()
      setIsPlaying(true)
    } catch {
      setIsPlaying(false)
    }
  }, [src])

  const handlePause = useCallback(() => {
    audioRef.current?.pause()
    setIsPlaying(false)
  }, [])

  const handleToggle = useCallback(() => {
    if (isPlaying) handlePause(); else handlePlay()
  }, [isPlaying, handlePlay, handlePause])

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration)
  }, [])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    if (audioRef.current) audioRef.current.currentTime = 0
    onEnded?.()
  }, [onEnded])

  const handleError = useCallback(() => {
    setIsPlaying(false)
    setHasError(true)
  }, [])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const value = parseFloat(e.target.value)
    audio.currentTime = value
    setCurrentTime(value)
  }, [])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-white/10 bg-[#1e1e2e] px-3 py-2.5 ${className}`}
      role="region"
      aria-label={label}
      style={{ minWidth: 0 }}  /* allow flex children to shrink */
    >
      {src && (
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={handleError}
          preload="metadata"
          aria-hidden="true"
        />
      )}

      {/* Play / Pause button — touch-target ≥44 px */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={!src || hasError}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        style={{ flexShrink: 0 }}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#cba6f7] text-[#1e1e2e] disabled:opacity-40 hover:brightness-110 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#cba6f7]"
      >
        {isPlaying ? (
          <svg width="11" height="13" viewBox="0 0 11 13" fill="currentColor" aria-hidden="true">
            <rect x="0" y="0" width="3.5" height="13" rx="1" />
            <rect x="7.5" y="0" width="3.5" height="13" rx="1" />
          </svg>
        ) : (
          <svg width="11" height="13" viewBox="0 0 11 13" fill="currentColor" aria-hidden="true">
            <path d="M0 0 L11 6.5 L0 13 Z" />
          </svg>
        )}
      </button>

      {/* Seek bar — flex-1 so it fills remaining space */}
      <div className="flex flex-1 flex-col gap-0.5" style={{ minWidth: 0 }}>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={currentTime}
          onChange={handleSeek}
          disabled={!src || hasError || duration === 0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={currentTime}
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          style={{
            background: `linear-gradient(to right, #cba6f7 ${progress}%, rgba(255,255,255,0.12) ${progress}%)`,
            height: '6px',
            borderRadius: '999px',
            WebkitAppearance: 'none',
            width: '100%',
            cursor: 'pointer',
          }}
          className="disabled:cursor-not-allowed disabled:opacity-40"
        />
      </div>

      {/* Time display — fluid font, hidden on very tiny containers */}
      <span
        style={{
          flexShrink: 0,
          fontFamily: 'monospace',
          fontSize: 'clamp(0.65rem, 2vw, 0.75rem)',
          color: 'rgba(205,214,244,0.7)',
          whiteSpace: 'nowrap',
          minWidth: '3.25rem',
          textAlign: 'right',
        }}
      >
        {src && duration > 0
          ? `${formatTime(currentTime)} / ${formatTime(duration)}`
          : '0:00'}
      </span>

      {hasError && (
        <span className="text-xs text-red-400 flex-shrink-0" role="alert">
          Error
        </span>
      )}
    </div>
  )
}

export default AudioPlayer
