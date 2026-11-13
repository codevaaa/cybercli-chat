import { useEffect, useRef, useState } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal as XTerm } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import type { WorkspaceInfo } from '../shared/contracts'

type TerminalTab = { id: string; title: string }

interface TerminalPanelProps {
  workspace: WorkspaceInfo
}

function TerminalSurface({ workspace, active }: { workspace: WorkspaceInfo; active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const [shellName, setShellName] = useState('Starting shell…')
  const [error, setError] = useState('')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const terminal = new XTerm({
      cursorBlink: true,
      convertEol: false,
      fontFamily: 'Cascadia Code, SFMono-Regular, Consolas, monospace',
      fontSize: 12,
      lineHeight: 1.3,
      scrollback: 5000,
      theme: {
        background: '#10110f',
        foreground: '#d9dad3',
        cursor: '#df9878',
        selectionBackground: '#82564080',
        black: '#181916', red: '#e47f76', green: '#8fbd91', yellow: '#e1bf76',
        blue: '#8caed5', magenta: '#bb99cb', cyan: '#86bdb6', white: '#d9dad3',
        brightBlack: '#74776f', brightRed: '#ef968d', brightGreen: '#a8d5aa', brightYellow: '#f0d28e',
        brightBlue: '#a6c5e7', brightMagenta: '#d1b1e1', brightCyan: '#a0d4cd', brightWhite: '#f5f5f0',
      },
    })
    const fit = new FitAddon()
    terminal.loadAddon(fit)
    terminal.open(container)
    terminalRef.current = terminal
    fitRef.current = fit

    let disposed = false
    const fitTerminal = () => {
      if (!containerRef.current || containerRef.current.clientWidth < 20 || containerRef.current.clientHeight < 20) return
      try {
        fit.fit()
        const sessionId = sessionIdRef.current
        if (sessionId) void window.codic.terminal.resize(sessionId, terminal.cols, terminal.rows).catch(() => undefined)
      } catch { /* Ignore the brief layout period before the terminal gets measurable bounds. */ }
    }
    const observer = new ResizeObserver(fitTerminal)
    observer.observe(container)
    const onTerminalEvent = window.codic.terminal.onEvent((event) => {
      if (event.sessionId !== sessionIdRef.current) return
      if (event.type === 'data') terminal.write(event.data)
      else terminal.writeln(`\r\n\x1b[90m[Shell exited with code ${event.exitCode}${event.signal ? `, signal ${event.signal}` : ''}]\x1b[0m`)
    })
    const onInput = terminal.onData((data) => {
      const sessionId = sessionIdRef.current
      if (sessionId) void window.codic.terminal.write(sessionId, data).catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'Terminal input could not be sent.')
      })
    })

    void window.codic.terminal.open(workspace.path).then(({ sessionId, shell }) => {
      if (disposed) {
        void window.codic.terminal.close(sessionId).catch(() => undefined)
        return
      }
      sessionIdRef.current = sessionId
      setShellName(shell)
      requestAnimationFrame(fitTerminal)
    }).catch((caught) => {
      const message = caught instanceof Error ? caught.message : 'Codic could not start a terminal in this project.'
      setError(message)
      terminal.writeln(`\x1b[31m${message}\x1b[0m`)
    })

    return () => {
      disposed = true
      observer.disconnect()
      onTerminalEvent()
      onInput.dispose()
      const sessionId = sessionIdRef.current
      sessionIdRef.current = null
      if (sessionId) void window.codic.terminal.close(sessionId).catch(() => undefined)
      terminal.dispose()
      terminalRef.current = null
      fitRef.current = null
    }
  }, [workspace.path])

  useEffect(() => {
    if (!active) return
    requestAnimationFrame(() => {
      const fit = fitRef.current
      const terminal = terminalRef.current
      const container = containerRef.current
      if (!fit || !terminal || !container || container.clientWidth < 20 || container.clientHeight < 20) return
      try {
        fit.fit()
        const sessionId = sessionIdRef.current
        if (sessionId) void window.codic.terminal.resize(sessionId, terminal.cols, terminal.rows).catch(() => undefined)
        terminal.focus()
      } catch { /* Wait until the active terminal pane has a measurable size. */ }
    })
  }, [active])

  return <div className="terminal-surface-wrap" hidden={!active}>
    <div className="terminal-surface" ref={containerRef} role="region" aria-label={`${workspace.name} terminal`} />
    <div className="terminal-surface-status"><span className="status-mini-dot" />{shellName}{error && <span className="terminal-surface-error">{error}</span>}</div>
  </div>
}

export default function TerminalPanel({ workspace }: TerminalPanelProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([{ id: crypto.randomUUID(), title: 'Terminal 1' }])
  const [activeTabId, setActiveTabId] = useState(tabs[0].id)
  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0]

  const addTab = () => {
    if (tabs.length >= 5) return
    const tab = { id: crypto.randomUUID(), title: `Terminal ${tabs.length + 1}` }
    setTabs((current) => [...current, tab])
    setActiveTabId(tab.id)
  }

  const closeTab = (id: string) => {
    if (tabs.length <= 1) return
    const nextTabs = tabs.filter((tab) => tab.id !== id)
    setTabs(nextTabs)
    if (activeTabId === id) setActiveTabId(nextTabs[nextTabs.length - 1].id)
  }

  return <section className="terminal-panel" aria-label="Project terminals">
    <div className="terminal-tab-strip" role="tablist" aria-label="Terminal tabs">
      {tabs.map((tab) => <div className="terminal-tab-wrap" key={tab.id}>
        <button type="button" role="tab" aria-selected={tab.id === activeTabId} className={`terminal-tab${tab.id === activeTabId ? ' active' : ''}`} onClick={() => setActiveTabId(tab.id)}>{tab.title}</button>
        {tabs.length > 1 && <button type="button" className="terminal-tab-close" onClick={() => closeTab(tab.id)} aria-label={`Close ${tab.title}`}>×</button>}
      </div>)}
      <button type="button" className="terminal-add" onClick={addTab} disabled={tabs.length >= 5} aria-label="Open terminal tab">+</button>
      <span className="terminal-tab-project">{workspace.name}</span>
    </div>
    <div className="terminal-surfaces">
      {tabs.map((tab) => <TerminalSurface key={tab.id} workspace={workspace} active={tab.id === activeTab?.id} />)}
    </div>
    <p className="terminal-caption">Live shell in the selected project folder. Commands run on this device using the current user account.</p>
  </section>
}
