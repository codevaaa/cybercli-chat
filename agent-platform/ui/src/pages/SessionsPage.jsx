import React, { useEffect, useState } from 'react'
import { usePlatformStore } from '../store/platformStore.js'
import { RefreshCw, Clock } from 'lucide-react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'

export default function SessionsPage() {
  const { sessions, checkPlatformHealth } = usePlatformStore()
  const [apiSessions, setApiSessions] = useState([])

  const load = async () => {
    try {
      const res  = await fetch('http://localhost:4000/api/sessions')
      const data = await res.json()
      setApiSessions(data.sessions || [])
    } catch {}
  }

  useEffect(() => { load() }, [])

  const all = apiSessions

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">Sessions</h1>
          <p className="text-xs text-muted mt-0.5">{all.length} total sessions</p>
        </div>
        <button className="btn-ghost text-xs flex items-center gap-1.5" onClick={load}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {all.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <Clock size={40} className="mx-auto mb-3 opacity-20" />
            No sessions yet
          </div>
        ) : all.map(s => (
          <div key={s.sessionId} className="agent-card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-xs text-muted">{s.sessionId}</div>
                <div className="text-sm text-white mt-0.5 line-clamp-2">{s.goal || '—'}</div>
              </div>
              <span className={clsx(
                'badge flex-shrink-0',
                s.status === 'completed' && 'bg-success/10 text-success',
                s.status === 'running'   && 'bg-accent/10  text-accent',
                s.status === 'failed'    && 'bg-danger/10  text-danger',
                s.status === 'idle'      && 'bg-white/5    text-muted',
              )}>
                {s.status}
              </span>
            </div>
            {s.graph?.stats && (
              <div className="flex gap-3 mt-2 text-xs text-muted">
                <span>{s.graph.stats.completed}/{s.graph.stats.total} tasks</span>
                {s.startedAt && <span>{formatDistanceToNow(new Date(s.startedAt), { addSuffix: true })}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
