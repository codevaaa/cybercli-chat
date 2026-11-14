import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { placeComposerPopover } from './appPreferences'

type Props = {
  disabled?: boolean
  attachmentCount: number
  onChooseFiles: () => void
  onChooseFolder: () => void
}

const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, close: () => void) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  const options = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
  if (!options.length) return
  event.preventDefault()
  const current = options.indexOf(document.activeElement as HTMLButtonElement)
  const index = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
  options[index]?.focus()
}

export default function ComposerAddMenu({ disabled = false, attachmentCount, onChooseFiles, onChooseFolder }: Props) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const close = useCallback((restoreFocus = false) => {
    setOpen(false)
    setPosition(null)
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus())
  }, [])

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    setPosition(placeComposerPopover(rect, { width: window.innerWidth, height: window.innerHeight }, 310, 206))
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    const reposition = () => updatePosition()
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close(true)
      }
    }
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [close, open, updatePosition])

  useLayoutEffect(() => {
    if (open && position) menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  }, [open, position])

  const choose = (callback: () => void) => {
    close(true)
    callback()
  }

  return <>
    <button
      ref={triggerRef}
      className="composer-tool composer-add-context"
      type="button"
      onClick={() => { if (!disabled) setOpen((current) => !current) }}
      title="Add prompt context"
      aria-label="Add prompt context"
      aria-haspopup="menu"
      aria-expanded={open}
      disabled={disabled}
    >
      <svg className="composer-add-plus" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
    </button>
    {open && position ? createPortal(<div
      ref={menuRef}
      className="composer-add-popover"
      role="menu"
      aria-label="Add to prompt"
      onKeyDown={(event) => onMenuKeyDown(event, () => close(true))}
      style={position}
    >
      <p className="composer-add-heading">Add</p>
      <div className="composer-add-section-label">Files and folders</div>
      <button type="button" role="menuitem" onClick={() => choose(onChooseFiles)}><span className="composer-add-item-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 12.5 6.9-6.9a3 3 0 0 1 4.2 4.2l-8.7 8.7a5 5 0 0 1-7.1-7.1l8.5-8.5" /></svg></span><span>Choose files…</span><kbd>Text files</kbd></button>
      <button type="button" role="menuitem" onClick={() => choose(onChooseFolder)}><span className="composer-add-item-icon"><span className="composer-add-folder-icon" /></span><span>Choose folder…</span><kbd>Up to 8 files</kbd></button>
      <div className="composer-add-footer" role="status">
        {attachmentCount ? `${attachmentCount} ${attachmentCount === 1 ? 'file' : 'files'} attached` : 'Selected context is sent with your next prompt'}
      </div>
    </div>, document.body) : null}
  </>
}
