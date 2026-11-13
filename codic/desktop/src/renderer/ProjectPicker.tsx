import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { WorkspaceInfo } from '../shared/contracts'
import { placeComposerPopover } from './appPreferences'

type Position = ReturnType<typeof placeComposerPopover>

interface ProjectPickerProps {
  projects: WorkspaceInfo[]
  value?: string
  disabled?: boolean
  onSelect: (project: WorkspaceInfo) => void
  onOpenFolder: () => void
  onNewProject: () => void
  className?: string
}

export function filterProjects(projects: WorkspaceInfo[], query: string): WorkspaceInfo[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return projects
  return projects.filter((project) => `${project.name} ${project.path}`.toLocaleLowerCase().includes(needle))
}

export default function ProjectPicker({ projects, value, disabled = false, onSelect, onOpenFolder, onNewProject, className = '' }: ProjectPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activePath, setActivePath] = useState(value ?? '')
  const [position, setPosition] = useState<Position | null>(null)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const rowRefs = useRef(new Map<string, HTMLButtonElement>())
  const visibleProjects = useMemo(() => filterProjects(projects, query), [projects, query])
  const selected = projects.find((project) => project.path === value)

  const updatePosition = useCallback(() => {
    if (!anchorRef.current) return
    setPosition(placeComposerPopover(anchorRef.current.getBoundingClientRect(), {
      width: window.innerWidth,
      height: window.innerHeight,
    }, 336, 390))
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    const focus = window.requestAnimationFrame(() => searchRef.current?.focus())
    const reposition = () => updatePosition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.cancelAnimationFrame(focus)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Node
      if (!popupRef.current?.contains(target) && !anchorRef.current?.contains(target)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
      anchorRef.current?.focus()
    }
    document.addEventListener('pointerdown', dismiss)
    window.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('keydown', escape)
    }
  }, [open])

  useEffect(() => {
    if (!open || !activePath) return
    rowRefs.current.get(activePath)?.scrollIntoView({ block: 'nearest' })
  }, [activePath, open, visibleProjects])

  const choose = (project: WorkspaceInfo) => {
    onSelect(project)
    setOpen(false)
    setQuery('')
    anchorRef.current?.focus()
  }

  const moveActive = (direction: 1 | -1) => {
    if (!visibleProjects.length) return
    const current = visibleProjects.findIndex((project) => project.path === activePath)
    const next = current < 0
      ? direction > 0 ? 0 : visibleProjects.length - 1
      : (current + direction + visibleProjects.length) % visibleProjects.length
    setActivePath(visibleProjects[next]!.path)
  }

  return <>
    <button
      ref={anchorRef}
      className={`project-picker-trigger ${className}`.trim()}
      type="button"
      disabled={disabled}
      aria-label={selected ? `Project: ${selected.name}` : 'Choose project'}
      aria-haspopup="listbox"
      aria-expanded={open}
      title={selected?.path || 'Choose a local project'}
      onClick={() => {
        setQuery('')
        setActivePath(value ?? projects[0]?.path ?? '')
        setOpen((current) => !current)
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5h6l2 2h9v9.1a1.9 1.9 0 0 1-1.9 1.9H5.4a1.9 1.9 0 0 1-1.9-1.9z" /><path d="M3.5 7.5V5.9A1.9 1.9 0 0 1 5.4 4h4.1l2 2h7.1" /></svg>
      <span className="project-picker-trigger-label">{selected?.name || 'Choose project'}</span>
      <span className="project-picker-local">Local</span>
      <svg className="project-picker-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
    </button>
    {open && position && createPortal(
      <div ref={popupRef} className="project-picker-popover" role="dialog" aria-label="Choose a project" style={position}>
        <label className="project-picker-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.4" /><path d="m16 16 4.2 4.2" /></svg>
          <input
            ref={searchRef}
            type="search"
            value={query}
            placeholder="Search projects"
            aria-label="Search projects"
            aria-controls="codic-project-options"
            onChange={(event) => {
              setQuery(event.target.value)
              const matches = filterProjects(projects, event.target.value)
              setActivePath(matches[0]?.path ?? '')
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') { event.preventDefault(); moveActive(1) }
              else if (event.key === 'ArrowUp') { event.preventDefault(); moveActive(-1) }
              else if (event.key === 'Home' && visibleProjects[0]) { event.preventDefault(); setActivePath(visibleProjects[0].path) }
              else if (event.key === 'End' && visibleProjects.length) { event.preventDefault(); setActivePath(visibleProjects[visibleProjects.length - 1]!.path) }
              else if (event.key === 'Enter') {
                event.preventDefault()
                const active = visibleProjects.find((project) => project.path === activePath)
                if (active) choose(active)
              }
            }}
          />
          {query && <button type="button" className="project-picker-clear" aria-label="Clear project search" onClick={() => { setQuery(''); searchRef.current?.focus() }}>×</button>}
        </label>
        <div className="project-picker-results" id="codic-project-options" role="listbox" aria-label="Saved projects">
          {visibleProjects.length ? visibleProjects.map((project) => <button
            key={project.path}
            ref={(element) => { if (element) rowRefs.current.set(project.path, element); else rowRefs.current.delete(project.path) }}
            type="button"
            role="option"
            aria-selected={project.path === value}
            className={`project-picker-option${project.path === activePath ? ' active' : ''}${project.path === value ? ' selected' : ''}`}
            title={project.path}
            onMouseEnter={() => setActivePath(project.path)}
            onClick={() => choose(project)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5h6l2 2h9v9.1a1.9 1.9 0 0 1-1.9 1.9H5.4a1.9 1.9 0 0 1-1.9-1.9z" /><path d="M3.5 7.5V5.9A1.9 1.9 0 0 1 5.4 4h4.1l2 2h7.1" /></svg>
            <span>{project.name}</span>
            {project.path === value && <span className="project-picker-check" aria-hidden="true">✓</span>}
          </button>) : <div className="project-picker-empty" role="status">{query ? `No projects match “${query}”.` : 'No saved projects yet. Open a local folder to begin.'}</div>}
        </div>
        <div className="project-picker-footer">
          <button type="button" onClick={() => { setOpen(false); onOpenFolder() }}><span className="project-picker-footer-icon">+</span><span>Open folder…</span></button>
          <button type="button" onClick={() => { setOpen(false); onNewProject() }}><span className="project-picker-footer-icon">＋</span><span>New project</span></button>
        </div>
        <div className="project-picker-hint"><kbd>↑↓</kbd> move <kbd>Enter</kbd> choose <kbd>Esc</kbd> close</div>
      </div>,
      document.body,
    )}
  </>
}
