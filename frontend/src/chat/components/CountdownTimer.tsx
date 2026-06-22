/**
 * CountdownTimer — Remaining-TTL display for disappearing messages.
 *
 * Renders the time remaining until `disappearsAt` formatted as
 * "Xd Xh Xm Xs", updating every second via setInterval. Cleans up the
 * interval on unmount. (REQ-6.4)
 *
 * REQ-6.4
 */

import React, { useState, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Pure formatting helper (exported for unit-testing)
// ---------------------------------------------------------------------------

/**
 * Format a non-negative millisecond duration as "Xd Xh Xm Xs".
 * Zero-components are included so the display is stable.
 *
 * Examples:
 *   formatRemaining(0)          → "0d 0h 0m 0s"
 *   formatRemaining(90_000)     → "0d 0h 1m 30s"
 *   formatRemaining(3_661_000)  → "0d 1h 1m 1s"
 *   formatRemaining(86_400_000) → "1d 0h 0m 0s"
 */
export function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1_000))

  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60

  return `${days}d ${hours}h ${minutes}m ${seconds}s`
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

export interface CountdownTimerProps {
  /**
   * Unix millisecond timestamp at which this message disappears.
   * When this value is in the past the timer shows "0d 0h 0m 0s".
   */
  disappearsAt: number
  /** Optional CSS class applied to the root span. */
  className?: string
  /** Optional inline styles applied to the root span. */
  style?: React.CSSProperties
}

// ---------------------------------------------------------------------------
// CountdownTimer component
// ---------------------------------------------------------------------------

/**
 * Displays a live countdown to the moment a disappearing message expires.
 *
 * The timer ticks every second. The interval is cleared on component unmount
 * to avoid memory leaks and stale-closure issues. (REQ-6.4)
 *
 * Example:
 * ```tsx
 * <CountdownTimer disappearsAt={message.disappearsAt} />
 * ```
 */
export function CountdownTimer({
  disappearsAt,
  className,
  style,
}: CountdownTimerProps): React.ReactElement {
  // Compute initial remaining time so the display is correct on first render
  const [remaining, setRemaining] = useState<number>(() =>
    Math.max(0, disappearsAt - Date.now()),
  )

  useEffect(() => {
    // Recompute immediately in case `disappearsAt` changed
    setRemaining(Math.max(0, disappearsAt - Date.now()))

    const id = setInterval(() => {
      const diff = disappearsAt - Date.now()
      setRemaining(Math.max(0, diff))

      // Stop ticking once expired — no need to keep firing
      if (diff <= 0) {
        clearInterval(id)
      }
    }, 1_000)

    // Cleanup on unmount or when `disappearsAt` changes
    return () => clearInterval(id)
  }, [disappearsAt])

  return (
    <span
      className={className}
      style={{
        fontSize: '0.75rem',
        fontVariantNumeric: 'tabular-nums',
        opacity: 0.7,
        ...style,
      }}
      aria-label={`Message disappears in ${formatRemaining(remaining)}`}
      data-testid="countdown-timer"
    >
      {formatRemaining(remaining)}
    </span>
  )
}

export default CountdownTimer
