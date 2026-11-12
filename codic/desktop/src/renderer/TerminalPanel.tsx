import { useState, type FormEvent } from 'react'
import type { TerminalCommandResult, WorkspaceInfo } from '../shared/contracts'

type TerminalTab = { id: string; title: string; history: Array<{ command: string; result: TerminalCommandResult | null; error?: string }> }

interface TerminalPanelProps {
  workspace: WorkspaceInfo
}

export default function TerminalPanel({ workspace }: TerminalPanelProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([{ id: 'terminal-1', title: 'Terminal 1', history: [] }])
  const [activeTabId, setActiveTabId] = useState('terminal-1')
  const [command, setCommand] = useState('')
  const [running, setRunning] = useState(false)
  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0]

  const addTab = () => {
    if (tabs.length >= 5) return
    const id = `terminal-${Date.now()}`
    setTabs((current) => [...current, { id, title: `Terminal ${current.length + 1}`, history: [] }])
    setActiveTabId(id)
  }

  const closeTab = (id: string) => {
    if (tabs.length <= 1) return
    const nextTabs = tabs.filter((tab) => tab.id !== id)
    setTabs(nextTabs)
    if (activeTabId === id) setActiveTabId(nextTabs[nextTabs.length - 1].id)
  }

  const run = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const entered = command.trim()
    if (!entered || running || !activeTab) return
    setCommand('')
    const entryIndex = activeTab.history.length
    setTabs((current) => current.map((tab) => tab.id === activeTab.id
      ? { ...tab, history: [...tab.history, { command: entered, result: null }] }
      : tab))
    setRunning(true)
    try {
      const result = await window.codic.terminal.run(workspace.path, entered)
      setTabs((current) => current.map((tab) => tab.id === activeTab.id
        ? { ...tab, history: tab.history.map((item, index) => index === entryIndex ? { command: entered, result } : item) }
        : tab))
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'The command could not be run.'
      setTabs((current) => current.map((tab) => tab.id === activeTab.id
        ? { ...tab, history: tab.history.map((item, index) => index === entryIndex ? { command: entered, result: null, error: message } : item) }
        : tab))
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="terminal-panel" aria-label="Project command terminals">
      <div className="terminal-tab-strip" role="tablist" aria-label="Terminal tabs">
        {tabs.map((tab) => <div className="terminal-tab-wrap" key={tab.id}>
          <button type="button" role="tab" aria-selected={tab.id === activeTabId} className={`terminal-tab${tab.id === activeTabId ? ' active' : ''}`} onClick={() => setActiveTabId(tab.id)}>{tab.title}</button>
          {tabs.length > 1 && <button type="button" className="terminal-tab-close" onClick={() => closeTab(tab.id)} aria-label={`Close ${tab.title}`}>×</button>}
        </div>)}
        <button type="button" className="terminal-add" onClick={addTab} disabled={tabs.length >= 5} aria-label="Open terminal tab">+</button>
      </div>
      <div className="terminal-output" aria-live="polite">
        {activeTab?.history.length ? activeTab.history.map((item, index) => <div className="terminal-entry" key={`${activeTab.id}-${index}`}>
          <div className="terminal-command"><span>›</span><code>{item.command}</code></div>
          {item.result && <><pre>{item.result.output || (item.result.exitCode === 0 ? '(no output)' : '(no output)')}</pre><div className={`terminal-result${item.result.exitCode === 0 ? '' : ' error'}`}>Exit code {item.result.exitCode}{item.result.timedOut ? ' · stopped after 60 seconds' : ''}{item.result.truncated ? ' · output limit reached' : ''}</div></>}
          {item.error && <p className="terminal-result error">{item.error}</p>}
        </div>) : <div className="terminal-empty"><strong>{activeTab?.title || 'Terminal'}</strong><p>Run a command in <code>{workspace.name}</code>. Codic starts a fresh shell for each command.</p></div>}
        <div className="terminal-running-note" aria-live="polite">{running ? 'Command is running…' : ''}</div>
      </div>
      <form className="terminal-command-form" onSubmit={(event) => void run(event)}>
        <label className="terminal-input-prefix" htmlFor="codic-terminal-command">›</label>
        <input id="codic-terminal-command" value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Enter a project command…" autoComplete="off" spellCheck={false} disabled={running} />
        <button type="submit" disabled={running || !command.trim()}>{running ? 'Running…' : 'Run'}</button>
      </form>
      <p className="terminal-caption">Commands you enter run on this device with a limited environment, in the selected project folder.</p>
    </section>
  )
}
