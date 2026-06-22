/**
 * TtlSelector — TTL picker for disappearing messages.
 *
 * Renders exactly 5 radio-button options corresponding to the five permitted
 * TTL values (REQ-6.1). Passes the selected TTL in milliseconds to the
 * `onChange` callback. A value of `undefined` means "no TTL" (permanent).
 *
 * REQ-6.1
 */

import React from 'react'

// ---------------------------------------------------------------------------
// TTL options — exactly 5 values as required by REQ-6.1
// ---------------------------------------------------------------------------

/**
 * The 5 permitted TTL values in milliseconds.
 * Exported for use in tests and other components.
 */
export const TTL_OPTIONS = [
  { label: '30 seconds', value: 30_000 },
  { label: '5 minutes', value: 300_000 },
  { label: '1 hour', value: 3_600_000 },
  { label: '24 hours', value: 86_400_000 },
  { label: '7 days', value: 604_800_000 },
] as const

export type TtlValue = (typeof TTL_OPTIONS)[number]['value']

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

export interface TtlSelectorProps {
  /** Currently selected TTL in milliseconds, or undefined if TTL is disabled. */
  value: number | undefined
  /** Called with the newly selected TTL value in milliseconds. */
  onChange: (ttl: number) => void
  /** Optional label prefix rendered above the options. */
  label?: string
  /** Whether the selector is disabled (e.g. while saving). */
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// TtlSelector component
// ---------------------------------------------------------------------------

/**
 * Renders exactly 5 radio-button TTL options (REQ-6.1).
 *
 * Example:
 * ```tsx
 * <TtlSelector value={300_000} onChange={(ttl) => updateSession(ttl)} />
 * ```
 */
export function TtlSelector({
  value,
  onChange,
  label = 'Messages disappear after',
  disabled = false,
}: TtlSelectorProps): React.ReactElement {
  return (
    <fieldset
      aria-label={label}
      style={{ border: 'none', margin: 0, padding: 0 }}
      disabled={disabled}
    >
      {label && (
        <legend
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
            color: 'inherit',
          }}
        >
          {label}
        </legend>
      )}

      <div
        role="radiogroup"
        aria-label={label}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}
      >
        {TTL_OPTIONS.map((option) => {
          const id = `ttl-option-${option.value}`
          const isSelected = value === option.value

          return (
            <label
              key={option.value}
              htmlFor={id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                fontSize: '0.875rem',
              }}
            >
              <input
                id={id}
                type="radio"
                name="ttl-selector"
                value={option.value}
                checked={isSelected}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                aria-checked={isSelected}
                data-testid={`ttl-option-${option.value}`}
                style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
              />
              {option.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export default TtlSelector
