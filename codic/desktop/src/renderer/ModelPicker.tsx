import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ModelOption } from '../shared/contracts'

type MenuPosition = { top: number; left: number; width: number; maxHeight: number; placement: 'above' | 'below' }

interface ModelPickerProps {
  models: ModelOption[]
  value: string
  disabled?: boolean
  onChange: (modelId: string) => void
  className?: string
  label?: string
}

export function filterModelOptions(models: ModelOption[], query: string): ModelOption[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return models
  return models.filter((model) => `${model.name} ${model.id} ${model.provider || ''}`.toLocaleLowerCase().includes(needle))
}

export function calculateModelMenuPosition(rect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right' | 'width'>, viewport: { width: number; height: number }, desiredWidth = 336, desiredHeight = 420): MenuPosition {
  const margin = Math.max(0, Math.min(8, viewport.width / 2, viewport.height / 2))
  const width = Math.max(0, Math.min(desiredWidth, Math.max(0, viewport.width - margin * 2)))
  const maxHeight = Math.max(0, Math.min(desiredHeight, Math.max(0, viewport.height - margin * 2)))
  const below = viewport.height - rect.bottom - margin
  const above = rect.top - margin
  const placement = below >= Math.min(260, maxHeight) || below >= above ? 'below' : 'above'
  const available = Math.max(0, placement === 'below' ? below : above)
  const height = Math.min(maxHeight, available)
  const left = Math.max(margin, Math.min(rect.left, Math.max(margin, viewport.width - width - margin)))
  const top = placement === 'below'
    ? Math.max(margin, Math.min(rect.bottom + 6, Math.max(margin, viewport.height - height - margin)))
    : Math.max(margin, rect.top - height - 6)
  return { top, left, width, maxHeight: height, placement }
}

function nextEnabledIndex(models: ModelOption[], start: number, direction: 1 | -1): number {
  if (!models.length) return -1
  let index = Math.max(-1, Math.min(models.length, start))
  for (let count = 0; count < models.length; count += 1) {
    index = (index + direction + models.length) % models.length
    if (!models[index]?.locked) return index
  }
  return -1
}

function wheelEnabledIndex(models: ModelOption[], start: number, direction: 1 | -1, steps: number): number {
  if (!models.length) return -1
  let index = Math.max(-1, Math.min(models.length, start))
  for (let count = 0; count < steps; count += 1) {
    let next = index + direction
    while (next >= 0 && next < models.length && models[next]?.locked) next += direction
    if (next < 0 || next >= models.length) break
    index = next
  }
  return index >= 0 && index < models.length ? index : -1
}

export default function ModelPicker({ models, value, disabled = false, onChange, className = '', label = 'Select model' }: ModelPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState(value)
  const [position, setPosition] = useState<MenuPosition | null>(null)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef(new Map<string, HTMLButtonElement>())
  const popupRef = useRef<HTMLDivElement>(null)
  const visibleModels = useMemo(() => filterModelOptions(models, query), [models, query])
  const selected = models.find((model) => model.id === value)
  const activeIndex = visibleModels.findIndex((model) => model.id === activeId && !model.locked)

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    setPosition(calculateModelMenuPosition(anchor.getBoundingClientRect(), {
      width: window.innerWidth,
      height: window.innerHeight,
    }))
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    const animation = window.requestAnimationFrame(() => searchRef.current?.focus())
    const onViewportChange = () => updatePosition()
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, true)
    return () => {
      window.cancelAnimationFrame(animation)
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('scroll', onViewportChange, true)
    }
  }, [open, models.length, updatePosition])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    optionRefs.current.get(visibleModels[activeIndex]!.id)?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex, visibleModels])

  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Node
      if (!popupRef.current?.contains(target) && !anchorRef.current?.contains(target)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        anchorRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', dismiss)
    window.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('keydown', escape)
    }
  }, [open])

  const choose = (model: ModelOption) => {
    if (model.locked) return
    onChange(model.id)
    setOpen(false)
    setQuery('')
    anchorRef.current?.focus()
  }

  const moveActive = (direction: 1 | -1) => {
    const next = nextEnabledIndex(visibleModels, activeIndex < 0 ? direction === 1 ? -1 : visibleModels.length : activeIndex, direction)
    if (next >= 0) setActiveId(visibleModels[next]!.id)
  }

  return <>
    <button
      ref={anchorRef}
      className={`model-picker-trigger ${className}`.trim()}
      type="button"
      aria-label={label}
      aria-haspopup="listbox"
      aria-expanded={open}
      disabled={disabled}
      onClick={() => {
        setQuery('')
        setActiveId(value)
        setOpen((current) => !current)
      }}
    >
      <span className="model-picker-status-dot" aria-hidden="true" />
      <span className="model-picker-value">{selected?.name || 'Codeva Auto'}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
    </button>
    {open && position && createPortal(
      <div
        ref={popupRef}
        className="model-picker-popover"
        data-placement={position.placement}
        style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }}
      >
        <div className="model-picker-title">Select model</div>
        <label className="model-picker-search-wrap">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.4" /><path d="m16 16 4.2 4.2" /></svg>
          <input
            ref={searchRef}
            type="search"
            value={query}
            placeholder="Search models"
            aria-label="Search models"
            aria-controls="codic-model-options"
            onChange={(event) => {
              setQuery(event.target.value)
              const match = filterModelOptions(models, event.target.value).find((model) => !model.locked)
              if (match) setActiveId(match.id)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') { event.preventDefault(); moveActive(1) }
              else if (event.key === 'ArrowUp') { event.preventDefault(); moveActive(-1) }
              else if (event.key === 'PageDown') { event.preventDefault(); for (let i = 0; i < 8; i += 1) moveActive(1) }
              else if (event.key === 'PageUp') { event.preventDefault(); for (let i = 0; i < 8; i += 1) moveActive(-1) }
              else if (event.key === 'Home' && visibleModels.length) { event.preventDefault(); const first = visibleModels.find((model) => !model.locked); if (first) setActiveId(first.id) }
              else if (event.key === 'End' && visibleModels.length) { event.preventDefault(); const last = [...visibleModels].reverse().find((model) => !model.locked); if (last) setActiveId(last.id) }
              else if (event.key === 'Enter' && activeIndex >= 0) { event.preventDefault(); choose(visibleModels[activeIndex]!) }
            }}
          />
          {query && <button type="button" className="model-picker-clear" aria-label="Clear model search" onClick={() => { setQuery(''); searchRef.current?.focus() }}>×</button>}
        </label>
        <div
          className="model-picker-results"
          id="codic-model-options"
          role="listbox"
          aria-label="Available models"
          aria-activedescendant={activeIndex >= 0 ? `codic-model-${visibleModels[activeIndex]!.id}` : undefined}
          onWheel={(event) => {
            const direction = Math.sign(event.deltaY)
            if (!direction || !visibleModels.length) return
            event.preventDefault()
            const steps = Math.max(1, Math.round(Math.abs(event.deltaY) / 40))
            const next = wheelEnabledIndex(visibleModels, activeIndex < 0 ? (direction > 0 ? -1 : visibleModels.length) : activeIndex, direction > 0 ? 1 : -1, steps)
            if (next >= 0) setActiveId(visibleModels[next]!.id)
          }}
        >
          {visibleModels.length ? visibleModels.map((model) => <button
            key={model.id}
            id={`codic-model-${model.id}`}
            ref={(element) => { if (element) optionRefs.current.set(model.id, element); else optionRefs.current.delete(model.id) }}
            type="button"
            role="option"
            aria-selected={model.id === value}
            aria-disabled={model.locked === true}
            className={`model-picker-option${model.id === activeId ? ' active' : ''}${model.id === value ? ' selected' : ''}${model.locked ? ' locked' : ''}`}
            onMouseEnter={() => { if (!model.locked) setActiveId(model.id) }}
            onClick={() => choose(model)}
          >
            <span className="model-picker-option-copy"><strong>{model.name}</strong>{model.provider && <small>{model.provider}</small>}</span>
            {model.id === value ? <span className="model-picker-check" aria-hidden="true">✓</span> : model.locked ? <small className="model-picker-locked">Plan locked</small> : null}
          </button>) : <div className="model-picker-empty" role="status">No models match “{query}”.</div>}
        </div>
        <div className="model-picker-footer"><span>{visibleModels.length} {visibleModels.length === 1 ? 'model' : 'models'}</span><kbd>↑↓ select · Enter choose · Esc close</kbd></div>
      </div>,
      document.body,
    )}
  </>
}
