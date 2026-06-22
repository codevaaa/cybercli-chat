/**
 * KeyBackupModal — Identity key backup/restore confirmation dialogs.
 *
 * Two modes:
 *  - `export-warning`: warns the user that sharing the backup file compromises
 *    their anonymous identity (REQ-14.4)
 *  - `overwrite-confirm`: requires explicit user confirmation before overwriting
 *    an existing identity with an imported backup (REQ-14.5)
 *
 * Accessibility:
 *   - role="dialog" + aria-modal="true" (WAI-ARIA dialog pattern)
 *   - aria-labelledby pointing at the title heading
 *   - Escape key closes the modal (calls onCancel)
 *   - Auto-focuses the cancel button on open
 *
 * REQ-14.4, REQ-14.5
 */

import React, { useEffect, useRef } from 'react'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface KeyBackupModalProps {
  /**
   * `export-warning`: user is about to export their identity key backup.
   * `overwrite-confirm`: user is about to overwrite an existing stored identity.
   */
  mode: 'export-warning' | 'overwrite-confirm'
  /** Whether the modal is currently visible. */
  isOpen: boolean
  /** Called when the user confirms the action (Export / Proceed). */
  onConfirm: () => void
  /** Called when the user dismisses the modal (Cancel / Escape). */
  onCancel: () => void
}

// ---------------------------------------------------------------------------
// Per-mode content
// ---------------------------------------------------------------------------

interface ModalContent {
  title: string
  body: string
  confirmLabel: string
}

const CONTENT: Record<KeyBackupModalProps['mode'], ModalContent> = {
  'export-warning': {
    title: 'Export Identity Key',
    body: 'Sharing this backup file will compromise your anonymous identity. Keep it private.',
    confirmLabel: 'Export',
  },
  'overwrite-confirm': {
    title: 'Overwrite Existing Identity?',
    body: 'An identity already exists on this device. Importing will permanently replace it.',
    confirmLabel: 'Proceed',
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Modal dialog used for identity key backup (export warning) and identity
 * import overwrite confirmation.
 *
 * Returns `null` when `isOpen` is false so the component can be mounted
 * unconditionally in a parent and toggled via the `isOpen` prop.
 *
 * Example — export warning:
 * ```tsx
 * <KeyBackupModal
 *   mode="export-warning"
 *   isOpen={showExport}
 *   onConfirm={handleExport}
 *   onCancel={() => setShowExport(false)}
 * />
 * ```
 *
 * Example — overwrite confirmation:
 * ```tsx
 * <KeyBackupModal
 *   mode="overwrite-confirm"
 *   isOpen={showOverwrite}
 *   onConfirm={handleImport}
 *   onCancel={() => setShowOverwrite(false)}
 * />
 * ```
 */
export function KeyBackupModal({
  mode,
  isOpen,
  onConfirm,
  onCancel,
}: KeyBackupModalProps): React.ReactElement | null {
  const titleId = 'key-backup-modal-title'
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const { title, body, confirmLabel } = CONTENT[mode]

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  // Auto-focus the cancel button when the modal opens (safer default)
  useEffect(() => {
    if (isOpen) {
      cancelButtonRef.current?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

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
      onClick={onCancel}
      data-testid="key-backup-modal-backdrop"
    >
      {/* Dialog panel — stop propagation so clicking inside doesn't close */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="key-backup-modal"
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
          data-testid="key-backup-modal-title"
          style={{ margin: '0 0 0.75rem', fontSize: '1.25rem', fontWeight: 700 }}
        >
          {title}
        </h2>

        {/* Body */}
        <p
          data-testid="key-backup-modal-body"
          style={{ margin: '0 0 1.5rem', fontSize: '0.9375rem', lineHeight: 1.6, opacity: 0.85 }}
        >
          {body}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          {/* Cancel — focused by default (safe action) */}
          <button
            type="button"
            ref={cancelButtonRef}
            onClick={onCancel}
            data-testid="key-backup-modal-cancel"
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '0.375rem',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Cancel
          </button>

          {/* Confirm (Export / Proceed) */}
          <button
            type="button"
            onClick={onConfirm}
            data-testid="key-backup-modal-confirm"
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '0.375rem',
              background: mode === 'overwrite-confirm' ? '#f38ba8' : '#cba6f7',
              color: '#1e1e2e',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default KeyBackupModal
