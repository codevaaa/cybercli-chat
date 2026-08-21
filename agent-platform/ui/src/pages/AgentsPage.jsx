import React from 'react'
import { usePlatformStore } from '../store/platformStore.js'
import { Users } from 'lucide-react'

export default function AgentsPage() {
  const { agents, getPersona } = usePlatformStore()

  const builtIn = [
    { type: 'orchestrator', specialty: 'Master Strategist & Planner' },
    { type: 'coder',        specialty: 'God-Tier Brute Force Coder' },
    { type: 'tester',       specialty: 'Swift Precision Executor & Tester' },
    { type: 'debugger',     specialty: 'Supreme Intelligence Debugger' },
    { type: 'devops',       specialty: 'Bulk Heavy Execution & Infrastructure' },
    { type: 'researcher',   specialty: 'Data & Research Oracle' },
    { type: 'writer',       specialty: 'UI/UX & Documentation Master' },
    { type: 'reviewer',     specialty: 'Rules, Alignment & Code Review' },
    { type: 'security',     specialty: 'Cybersecurity Destroyer' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="font-bold text-lg">Agent Team</h1>
        <p className="text-xs text-muted mt-0.5">Specialized agents that execute tasks in parallel</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-3 max-w-2xl">
          {builtIn.map(({ type, specialty }) => {
            const persona = getPersona(type)
            return (
              <div key={type} className="agent-card" style={{ borderColor: persona.color + '33' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{persona.emoji}</span>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: persona.color }}>{persona.name}</div>
                    <div className="text-xs text-muted capitalize">{type}</div>
                  </div>
                </div>
                <p className="text-xs text-muted leading-relaxed">{specialty}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
