import { describe, expect, it } from 'vitest'
import type { CodicRuntimeEvent } from './contracts'

describe('Codic runtime event contract', () => {
  it('models a text event with the run identity', () => {
    const event: CodicRuntimeEvent = { type: 'agent_event', runId: 'run-1', event: { type: 'text', text: 'Hello' } }
    expect(event).toEqual({ type: 'agent_event', runId: 'run-1', event: { type: 'text', text: 'Hello' } })
  })

  it('models approval requests with explicit scope and unsandboxed status', () => {
    const event: CodicRuntimeEvent = {
      type: 'approval_required', runId: 'run-2', approvalId: 'approval-1', toolName: 'run_command',
      input: { command: 'npm test' }, summary: 'Run project tests', unsandboxed: false,
    }
    expect(event.unsandboxed).toBe(false)
  })
})
