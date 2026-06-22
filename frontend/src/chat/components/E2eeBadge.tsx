/**
 * E2eeBadge — Visual indicator distinguishing E2EE messages from TLS-only messages.
 *
 * When `encrypted` is `true` renders a lock icon indicating the message is
 * end-to-end encrypted. When `encrypted` is `false` renders nothing.
 *
 * REQ-11.5
 */

import React from 'react'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface E2eeBadgeProps {
  /**
   * `true` — message is end-to-end encrypted (show lock icon).
   * `false` — message uses TLS-only encryption (render nothing).
   */
  encrypted: boolean
  /** Optional CSS class applied to the root element. */
  className?: string
}

// ---------------------------------------------------------------------------
// Lock SVG icon
// ---------------------------------------------------------------------------

function LockIcon(): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
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

/**
 * Renders a lock icon badge on E2EE-encrypted messages.
 * Renders nothing for Basic-plan TLS-only messages.
 *
 * Example:
 * ```tsx
 * <E2eeBadge encrypted={message.encryptionStatus === 'e2ee'} />
 * ```
 */
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
        gap: '0.2rem',
        fontSize: '0.6875rem',
        color: '#a6e3a1',
        verticalAlign: 'middle',
        userSelect: 'none',
      }}
    >
      <LockIcon />
      <span style={{ fontSize: '0.6875rem' }}>E2EE</span>
    </span>
  )
}

export default E2eeBadge
