import { describe, expect, it } from 'vitest'
import { activityFromRuntimeEvent, companionActivityLabel } from './companionActivity.js'

describe('companion activity', () => {
  it('maps real runtime lifecycle and approval events to honest states', () => {
    expect(activityFromRuntimeEvent({ type: 'run_started', runId: 'run-1' })).toBe('thinking')
    expect(activityFromRuntimeEvent({ type: 'approval_required', runId: 'run-1', approvalId: 'approval-1', toolName: 'run_command', input: {}, summary: 'Run a command', unsandboxed: false })).toBe('approval')
    expect(activityFromRuntimeEvent({ type: 'agent_event', runId: 'run-1', event: { type: 'tool_call', id: 'tool-1', name: 'read_file', input: {} } })).toBe('working')
    expect(activityFromRuntimeEvent({ type: 'run_finished', runId: 'run-1', reason: 'end_turn' })).toBe('completed')
    expect(activityFromRuntimeEvent({ type: 'run_finished', runId: 'run-1', reason: 'error' })).toBe('error')
    expect(activityFromRuntimeEvent({ type: 'run_finished', runId: 'run-1', reason: 'cancelled' })).toBe('cancelled')
  })

  it('does not invent activity for unrelated events and has useful labels', () => {
    expect(activityFromRuntimeEvent({ type: 'checkpoint_created', runId: 'run-1', checkpoint: { seq: 1, label: 'Before edit', createdAt: 1, files: [] } })).toBeNull()
    expect(companionActivityLabel('approval')).toBe('Waiting for your approval')
    expect(companionActivityLabel('idle')).toBe('Here with you')
  })
})
