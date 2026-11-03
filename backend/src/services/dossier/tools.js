import { randomUUID } from 'node:crypto'
import { assertNoSecrets, event, fault } from './domain.js'
import { authorizeTool } from './roles.js'

export async function recordedTool(engine, doc, name, input, run, agent = 'Builder') {
  authorizeTool(agent, name)
  const id = randomUUID()
  await engine.mutate(doc, d => event(d, agent, { kind: 'tool_start', tool_call_id: id, tool: name, input, task_id: d.current_task }))
  let value, error
  try { value = await run(); assertNoSecrets(JSON.stringify(value)); if (value?.exit_code) error = 'Trusted tool returned a nonzero exit code' }
  catch (failure) { error = failure.status ? failure.message : 'Tool operation failed'; value = { exit_code: Number.isInteger(value?.exit_code) ? value.exit_code : 1, output: error, tests: [], redacted: true } }
  await engine.mutate(doc, d => event(d, agent, { kind: error ? 'tool_error' : 'tool_result', tool_call_id: id, tool: name, output: value, reason: error, task_id: d.current_task }))
  return { value, error }
}
export function replayEvents(events) {
  const starts = events.filter(e => e.kind === 'tool_start')
  const steps = starts.map(start => {
    const results = events.filter(e => ['tool_result', 'tool_error'].includes(e.kind) && e.tool_call_id === start.tool_call_id)
    return { seq: start.seq, time: start.time, tool_call_id: start.tool_call_id, task_id: start.task_id, tool: start.tool, input: start.input, ...(results.length === 1 && Object.hasOwn(results[0], 'output') ? { output: results[0].output, result_seq: results[0].seq, status: results[0].kind === 'tool_error' ? 'error' : 'complete' } : { status: 'missing_output' }) }
  })
  if (!steps.length) return { status: 'failed', reason: 'No stored tool calls exist for this project', steps: [] }
  return { status: steps.some(s => s.status === 'missing_output') ? 'failed' : 'complete', steps }
}
