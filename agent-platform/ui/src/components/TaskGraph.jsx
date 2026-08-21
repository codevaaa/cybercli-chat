/**
 * TaskGraph — Visual dependency graph of all tasks in the current session.
 * Shows each task as a node with status colour, agent persona, and live progress.
 */
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlatformStore } from '../store/platformStore.js'
import clsx from 'clsx'
import { CheckCircle, XCircle, Clock, Loader, AlertCircle } from 'lucide-react'

const STATUS_ICON = {
  pending:   <Clock    size={12} className="text-muted" />,
  ready:     <Clock    size={12} className="text-warning" />,
  running:   <Loader   size={12} className="text-accent animate-spin" />,
  completed: <CheckCircle size={12} className="text-success" />,
  failed:    <XCircle  size={12} className="text-danger" />,
  cancelled: <AlertCircle size={12} className="text-muted" />,
}

export default function TaskGraph() {
  const { tasks, agentTokens, getPersona } = usePlatformStore()
  const taskList = Object.values(tasks)

  if (taskList.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted text-sm">
        No tasks yet — enter a goal to start
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {taskList.map((task) => {
          const persona  = getPersona(task.agentType)
          const tokens   = agentTokens[task.id] || ''
          const isRunning = task.status === 'running'

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity:0 }}
              transition={{ duration: 0.2 }}
              className={clsx('task-node', task.status || 'pending')}
              style={isRunning ? { borderColor: persona.color + '60', boxShadow: `0 0 12px ${persona.color}20` } : {}}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {STATUS_ICON[task.status] || STATUS_ICON.pending}
                  <span className="font-medium text-white truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Agent badge */}
                  <span
                    className="badge text-white/80"
                    style={{ background: persona.color + '22', border: `1px solid ${persona.color}44` }}
                  >
                    {persona.emoji} {persona.name}
                  </span>
                  {/* Priority */}
                  <span className="badge bg-white/5 text-muted">P{task.priority}</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-muted mt-1 line-clamp-2">{task.description}</p>

              {/* Dependencies */}
              {task.dependencies?.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {task.dependencies.map(dep => (
                    <span key={dep} className="text-xs bg-white/5 text-muted px-1.5 py-0.5 rounded">
                      ← {tasks[dep]?.title?.slice(0, 20) || dep.slice(0, 8)}
                    </span>
                  ))}
                </div>
              )}

              {/* Live token stream */}
              {isRunning && tokens && (
                <div className="mt-2 bg-black/30 rounded-md p-2 text-xs font-mono text-white/70 max-h-24 overflow-y-auto streaming-cursor">
                  {tokens.slice(-800)}
                </div>
              )}

              {/* Duration */}
              {task.durationMs && (
                <div className="text-xs text-muted mt-1">
                  {(task.durationMs / 1000).toFixed(1)}s
                </div>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
