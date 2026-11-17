import type { CodicRuntimeEvent, CompanionActivity } from '../shared/contracts.js'

export function activityFromRuntimeEvent(event: CodicRuntimeEvent): CompanionActivity | null {
  if (event.type === 'run_started') return 'thinking'
  if (event.type === 'approval_required') return 'approval'
  if (event.type === 'tool_blocked') return 'error'
  if (event.type === 'run_finished') {
    if (event.reason === 'error') return 'error'
    if (event.reason === 'cancelled') return 'cancelled'
    return 'completed'
  }
  if (event.type === 'subagent_progress') return event.status === 'error' ? 'error' : 'working'
  if (event.type === 'agent_event') {
    if (event.event.type === 'tool_call' || event.event.type === 'iteration') return 'working'
    if (event.event.type === 'done' && event.event.reason === 'error') return 'error'
  }
  return null
}

export function companionActivityLabel(activity: CompanionActivity): string {
  switch (activity) {
    case 'thinking': return 'Thinking through your task'
    case 'working': return 'Working in your project'
    case 'approval': return 'Waiting for your approval'
    case 'completed': return 'Task completed'
    case 'error': return 'Task needs attention'
    case 'cancelled': return 'Task stopped'
    case 'idle': return 'Here with you'
  }
}
