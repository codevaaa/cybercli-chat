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
 * Responsive: bottom-sheet on mobile, centered dialog on sm+ screens.
 *
 * REQ-14.4, REQ-14.5
 */

import React, { useEffect, useRef } from 'react'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface KeyBackupModalProps {
  mode: 'export-warning' | 'overwrite-confirm'
  isOpen: boolean
  onConfirm: () => void
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
    body: 'Sharing this backup file will compromise your anonymous identity. Keep it strictly private and never share it.',
    confirmLabel: 'Export',
  },
  'overwrite-confirm': {
    title: 'Overwrite Existing Identity?',
    body: 'An identity already exists on this device. Importing will permanently replace it. This cannot be undone.',
    confirmLabel: 'Proceed',
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KeyBackupModal({
  mode,
  isOpen,
  onConfirm,
  onCancel,
}: KeyBackupModalProps): React.ReactElement | null {
  const titleId = 'key-backup-modal-title'
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const { title, body, confirmLabel } = CONTENT[mode]

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  useEffect(() => {
    if (isOpen) {
      cancelButtonRef.current?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      className="sm:items-center sm:p-4"
      onClick={onCancel}
      data-testid="key-backup-modal-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="key-backup-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1e1e2e',
          color: '#cdd6f4',
          boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
          border: '1px solid rgba(255,255,255,0.08)',
          width: '100%',
          borderRadius: '1rem 1rem 0 0',
          padding: '1.5rem 1.25rem 2rem',
        }}
        className="sm:rounded-xl sm:max-w-md sm:w-full sm:p-8"
      >
        {/* Drag handle (mobile) */}
        <div
          style={{
            width: '2.5rem',
            height: '0.25rem',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '999px',
            margin: '0 auto 1.25rem',
          }}
          className="sm:hidden"
          aria-hidden="true"
        />

        {/* Title */}
        <h2
          id={titleId}
          data-testid="key-backup-modal-title"
          style={{ margin: '0 0 0.625rem', fontSize: '1.125rem', fontWeight: 700 }}
          className="sm:text-xl"
        >
          {title}
        </h2>

        {/* Body */}
        <p
          data-testid="key-backup-modal-body"
          style={{ margin: '0 0 1.75rem', fontSize: '0.9375rem', lineHeight: 1.6, opacity: 0.85 }}
        >
          {body}
        </p>

        {/* Actions — stacked on mobile, row on sm+ */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexDirection: 'column-reverse',
          }}
          className="sm:flex-row sm:justify-end"
        >
          <button
            type="button"
            ref={cancelButtonRef}
            onClick={onCancel}
            data-testid="key-backup-modal-cancel"
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '0.9375rem',
              width: '100%',
            }}
            className="sm:w-auto sm:py-2 sm:text-sm"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            data-testid="key-backup-modal-confirm"
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '0.5rem',
              background: mode === 'overwrite-confirm' ? '#f38ba8' : '#cba6f7',
              color: '#1e1e2e',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.9375rem',
              width: '100%',
            }}
            className="sm:w-auto sm:py-2 sm:text-sm"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default KeyBackupModal
