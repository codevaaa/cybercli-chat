/**
 * AudioPlayer — Inline audio player with play, pause, and seek controls.
 *
 * Available in the UI before any voice message is received (renders even with no src).
 * Uses the HTML5 <audio> element.
 *
 * REQ-8.5
 */

import React, { useRef, useState, useCallback, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface AudioPlayerProps {
  /** Object URL or data URL for the audio source. Optional — renders in idle state when absent. */
  src?: string
  /** Optional label for accessibility. */
  label?: string
  /** Callback fired when playback reaches the end. */
  onEnded?: () => void
  className?: string
}

// ---------------------------------------------------------------------------
// Helper: format seconds → mm:ss
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

  // Reset state when src changes
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
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    setIsPlaying(false)
  }, [])

  const handleToggle = useCallback(() => {
    if (isPlaying) {
      handlePause()
    } else {
      handlePlay()
    }
  }, [isPlaying, handlePlay, handlePause])

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    setCurrentTime(audio.currentTime)
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    setDuration(audio.duration)
  }, [])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    if (audioRef.current) {
      audioRef.current.currentTime = 0
    }
    onEnded?.()
  }, [onEnded])

  const handleError = useCallback(() => {
    setIsPlaying(false)
    setHasError(true)
  }, [])

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const audio = audioRef.current
      if (!audio) return
      const value = parseFloat(e.target.value)
      audio.currentTime = value
      setCurrentTime(value)
    },
    [],
  )

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className={`flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 ${className}`}
      role="region"
      aria-label={label}
    >
      {/* Hidden native audio element */}
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

      {/* Play / Pause button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={!src || hasError}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white disabled:opacity-40 hover:bg-indigo-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        {isPlaying ? (
          /* Pause icon */
          <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
            <rect x="0" y="0" width="4" height="14" rx="1" />
            <rect x="8" y="0" width="4" height="14" rx="1" />
          </svg>
        ) : (
          /* Play icon */
          <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
            <path d="M0 0 L12 7 L0 14 Z" />
          </svg>
        )}
      </button>

      {/* Seek bar */}
      <div className="flex flex-1 flex-col gap-0.5">
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
            background: `linear-gradient(to right, #6366f1 ${progress}%, #374151 ${progress}%)`,
          }}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        />
      </div>

      {/* Time display */}
      <span className="min-w-[3.5rem] text-right font-mono text-xs text-gray-300">
        {src && duration > 0
          ? `${formatTime(currentTime)} / ${formatTime(duration)}`
          : '0:00'}
      </span>

      {/* Error state */}
      {hasError && (
        <span className="text-xs text-red-400" role="alert">
          Error
        </span>
      )}
    </div>
  )
}

export default AudioPlayer
