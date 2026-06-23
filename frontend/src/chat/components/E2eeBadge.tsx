/**
 * E2eeBadge — Visual indicator distinguishing E2EE messages from TLS-only messages.
 *
 * When `encrypted` is `true` renders a lock icon + "E2EE" label.
 * Scales cleanly across all screen sizes via em units.
 *
 * REQ-11.5
 */

import React from 'react'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface E2eeBadgeProps {
  encrypted: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// Lock SVG icon
// ---------------------------------------------------------------------------

function LockIcon(): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// E2eeBadge component
// ---------------------------------------------------------------------------

export function E2eeBadge({ encrypted, className }: E2eeBadgeProps): React.ReactElement | null {
  if (!encrypted) return null

  return (
    <span
      data-testid="e2ee-badge"
      className={className}
      title="End-to-end encrypted"
      aria-label="End-to-end encrypted"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.2em',
        /* em-based so it scales with parent font-size on all devices */
        fontSize: '0.75em',
        color: '#a6e3a1',
        verticalAlign: 'middle',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <LockIcon />
      <span>E2EE</span>
    </span>
  )
}

export default E2eeBadge
