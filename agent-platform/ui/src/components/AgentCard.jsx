import React from 'react'
import { motion } from 'framer-motion'
import { usePlatformStore } from '../store/platformStore.js'
import { Loader, CheckCircle, XCircle, Clock } from 'lucide-react'
import clsx from 'clsx'

export default function AgentCard({ agentType }) {
  const { tasks, agentLogs, agentTokens, getPersona } = usePlatformStore()

  const persona     = getPersona(agentType)
  const agentTasks  = Object.values(tasks).filter(t => t.agentType === agentType)
  const runningTask = agentTasks.find(t => t.status === 'running')
  const completed   = agentTasks.filter(t => t.status === 'completed').length
  const failed      = agentTasks.filter(t => t.status === 'failed').length
  const isActive    = !!runningTask

  const tokens = runningTask ? agentTokens[runningTask.id] || '' : ''
  const logs   = runningTask ? agentLogs[runningTask.id]   || [] : []

  return (
    <motion.div
      className={clsx(
        'agent-card relative overflow-hidden',
        isActive && `glow-${agentType}`
      )}
      animate={isActive ? { scale: [1, 1.005, 1] } : {}}
      transition={isActive ? { repeat: Infinity, duration: 2 } : {}}
    >
      {/* Active pulse ring */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-xl opacity-20 animate-pulse"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${persona.color}44, transparent 70%)` }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          <span className="text-xl">{persona.emoji}</span>
          <div>
            <div className="font-semibold text-sm text-white">{persona.name}</div>
            <div className="text-xs text-muted capitalize">{agentType}</div>
          </div>
        </div>
        {/* Status indicator */}
        <div className={clsx(
          'w-2.5 h-2.5 rounded-full',
          isActive ? 'bg-accent animate-pulse' : 'bg-border'
        )} />
      </div>

      {/* Stats row */}
      <div className="flex gap-3 mt-2">
        <div className="text-xs text-muted">
          <span className="text-success font-medium">{completed}</span> done
        </div>
        {failed > 0 && (
          <div className="text-xs text-muted">
            <span className="text-danger font-medium">{failed}</span> failed
          </div>
        )}
        <div className="text-xs text-muted">
          {agentTasks.length} tasks
        </div>
      </div>

      {/* Current task */}
      {runningTask && (
        <div className="mt-2 border-t border-border/50 pt-2">
          <div className="flex items-center gap-1.5 text-xs">
            <Loader size={10} className="text-accent animate-spin" />
            <span className="text-accent truncate">{runningTask.title}</span>
          </div>
          {tokens && (
            <div className="mt-1.5 text-xs font-mono text-white/50 line-clamp-2 leading-relaxed">
              {tokens.slice(-200)}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
