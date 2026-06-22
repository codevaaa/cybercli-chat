/**
 * TtlSelector — TTL picker for disappearing messages.
 *
 * Renders exactly 5 radio-button options corresponding to the five permitted
 * TTL values (REQ-6.1). On mobile the options are displayed as a scrollable
 * horizontal chip strip; on sm+ screens they stack vertically.
 *
 * REQ-6.1
 */

import React from 'react'

// ---------------------------------------------------------------------------
// TTL options — exactly 5 values as required by REQ-6.1
// ---------------------------------------------------------------------------

export const TTL_OPTIONS = [
  { label: '30s', fullLabel: '30 seconds', value: 30_000 },
  { label: '5m',  fullLabel: '5 minutes',  value: 300_000 },
  { label: '1h',  fullLabel: '1 hour',     value: 3_600_000 },
  { label: '24h', fullLabel: '24 hours',   value: 86_400_000 },
  { label: '7d',  fullLabel: '7 days',     value: 604_800_000 },
] as const

export type TtlValue = (typeof TTL_OPTIONS)[number]['value']

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TtlSelectorProps {
  value: number | undefined
  onChange: (ttl: number) => void
  label?: string
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// TtlSelector component
// ---------------------------------------------------------------------------

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
            fontSize: '0.8125rem',
            fontWeight: 600,
            marginBottom: '0.625rem',
            color: 'inherit',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {label}
        </legend>
      )}

      {/*
        Mobile: horizontal scrollable chip row (overflow-x auto, no wrap)
        sm+: vertical radio list
      */}
      <div
        role="radiogroup"
        aria-label={label}
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
        className="sm:flex-col sm:overflow-x-visible sm:pb-0"
      >
        {TTL_OPTIONS.map((option) => {
          const id = `ttl-option-${option.value}`
          const isSelected = value === option.value

          return (
            <label
              key={option.value}
              htmlFor={id}
              title={option.fullLabel}
              style={{
                /* Chip style on mobile */
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                gap: '0.375rem',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                fontSize: '0.8125rem',
                fontWeight: isSelected ? 600 : 400,
                padding: '0.375rem 0.75rem',
                borderRadius: '999px',
                border: `1.5px solid ${isSelected ? 'rgba(203,166,247,0.9)' : 'rgba(255,255,255,0.12)'}`,
                background: isSelected ? 'rgba(203,166,247,0.12)' : 'transparent',
                color: isSelected ? '#cba6f7' : 'inherit',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
              /* On sm+ show the full label */
              className="sm:rounded-md sm:px-0 sm:py-1 sm:bg-transparent sm:border-0 sm:justify-start sm:font-normal sm:text-sm"
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
                className="sm:block"
              />
              {/* Short label on mobile chip, full label on desktop */}
              <span className="sm:hidden">{option.label}</span>
              <span style={{ display: 'none' }} className="sm:inline">{option.fullLabel}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export default TtlSelector
