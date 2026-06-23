/**
 * CountdownTimer — Remaining-TTL display for disappearing messages.
 *
 * Renders the time remaining until `disappearsAt` formatted as a compact
 * "Xh Xm Xs" string (days omitted when 0), updating every second.
 * On very small screens (<360 px) the font shrinks further via the
 * `compact` prop pattern so it fits inside a message bubble.
 *
 * REQ-6.4
 */

import React, { useState, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Pure formatting helper
// ---------------------------------------------------------------------------

export function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1_000))

  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CountdownTimerProps {
  disappearsAt: number
  className?: string
  style?: React.CSSProperties
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CountdownTimer({
  disappearsAt,
  className,
  style,
}: CountdownTimerProps): React.ReactElement {
  const [remaining, setRemaining] = useState<number>(() =>
    Math.max(0, disappearsAt - Date.now()),
  )

  useEffect(() => {
    setRemaining(Math.max(0, disappearsAt - Date.now()))

    const id = setInterval(() => {
      const diff = disappearsAt - Date.now()
      setRemaining(Math.max(0, diff))
      if (diff <= 0) clearInterval(id)
    }, 1_000)

    return () => clearInterval(id)
  }, [disappearsAt])

  return (
    <span
      className={className}
      style={{
        /* Fluid font: 0.65rem on tiny screens, 0.75rem on normal */
        fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)',
        fontVariantNumeric: 'tabular-nums',
        opacity: 0.65,
        letterSpacing: '0.01em',
        lineHeight: 1,
        ...style,
      }}
      aria-label={`Message disappears in ${formatRemaining(remaining)}`}
      data-testid="countdown-timer"
    >
      ⏱ {formatRemaining(remaining)}
    </span>
  )
}

export default CountdownTimer
