import { useEffect, useState } from 'react'

export default function ResponseActivity({ active, hasContent, details }) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!active) return
    setSeconds(0)
    const started = Date.now()
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [active])

  if (!active && !details) return null
  return (
    <div className="mb-4 text-sm text-foreground-muted not-italic">
      {active && (
        <div role="status" aria-live="polite" className="flex items-center gap-2.5 py-1 text-accent">
          <span className="response-activity-dots" aria-hidden="true"><i /><i /><i /></span>
          <span>{hasContent ? 'Writing response' : 'Thinking'}</span>
          <span aria-hidden="true" className="text-xs tabular-nums text-foreground-muted">{seconds}s</span>
        </div>
      )}
      {details && (
        <details className="mt-2">
          <summary className="cursor-pointer select-none text-xs">Response activity</summary>
          <div className="mt-2 border-l-2 border-accent/30 pl-3 text-xs leading-relaxed whitespace-pre-wrap">{details}</div>
        </details>
      )}
    </div>
  )
}
