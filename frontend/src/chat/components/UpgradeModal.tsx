/**
 * UpgradeModal — Upgrade-to-MAX plan prompt.
 *
 * Displayed when a non-MAX plan user attempts an advanced feature.
 * Shows the feature name and links to the MAX plan subscription page.
 *
 * Accessibility:
 *   - role="dialog" + aria-modal="true" (WAI-ARIA dialog pattern)
 *   - aria-labelledby pointing at the title
 *   - Focus management: close on Escape key
 *
 * REQ-11.1
 */

import React, { useEffect, useRef } from 'react'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface UpgradeModalProps {
  /** Name of the feature that requires an upgrade (e.g. "enableE2EE"). */
  feature: string
  /** Whether the modal is visible. */
  isOpen: boolean
  /** Called when the user dismisses the modal (close button or Escape key). */
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Friendly feature labels
// ---------------------------------------------------------------------------

const FEATURE_LABELS: Record<string, string> = {
  enableE2EE: 'End-to-End Encryption',
  enableDisappearing: 'Disappearing Messages',
  sendFile: 'File Sharing',
  sendVoice: 'Voice Messages',
}

function getFeatureLabel(feature: string): string {
  return FEATURE_LABELS[feature] ?? feature
}

// ---------------------------------------------------------------------------
// UpgradeModal component
// ---------------------------------------------------------------------------

/**
 * Modal that informs the user their current plan does not include a feature
 * and provides a link to the MAX plan subscription page.
 *
 * Example:
 * ```tsx
 * <UpgradeModal
 *   feature="enableE2EE"
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 * />
 * ```
 */
export function UpgradeModal({
  feature,
  isOpen,
  onClose,
}: UpgradeModalProps): React.ReactElement | null {
  const titleId = 'upgrade-modal-title'
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Auto-focus the close button when the modal opens
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const featureLabel = getFeatureLabel(feature)

  return (
    /* Backdrop */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
      data-testid="upgrade-modal-backdrop"
    >
      {/* Dialog panel — stop click propagation so clicking inside doesn't close */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="upgrade-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1e1e2e',
          borderRadius: '0.75rem',
          padding: '2rem',
          maxWidth: '28rem',
          width: '90%',
          color: '#cdd6f4',
          boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Title */}
        <h2
          id={titleId}
          style={{ margin: '0 0 0.75rem', fontSize: '1.25rem', fontWeight: 700 }}
        >
          MAX Plan Required
        </h2>

        {/* Body */}
        <p style={{ margin: '0 0 1.5rem', fontSize: '0.9375rem', lineHeight: 1.6, opacity: 0.85 }}>
          <strong>{featureLabel}</strong> is available exclusively on the Codeva MAX plan.
          Upgrade to unlock end-to-end encryption, disappearing messages, file sharing, and voice
          messages.
        </p>

        {/* Feature badge */}
        <p
          style={{
            fontSize: '0.8125rem',
            marginBottom: '1.5rem',
            opacity: 0.6,
            fontFamily: 'monospace',
          }}
          data-testid="upgrade-modal-feature"
        >
          Feature: {featureLabel}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            ref={closeButtonRef}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '0.375rem',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
            data-testid="upgrade-modal-close"
          >
            Not now
          </button>

          <a
            href="/subscription"
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '0.375rem',
              background: '#cba6f7',
              color: '#1e1e2e',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
            }}
            data-testid="upgrade-modal-cta"
          >
            Upgrade to MAX
          </a>
        </div>
      </div>
    </div>
  )
}

export default UpgradeModal
