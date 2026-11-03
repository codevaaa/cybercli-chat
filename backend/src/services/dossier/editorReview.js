import { randomUUID } from 'node:crypto'
import { activeLines, addFix, assertNoSecrets, block, digest, event, fault, queueTasks, reviewLine, transition } from './domain.js'
import { assertEditable, riskLines, riskPassed } from './roles.js'
import { validateFiles } from './sandbox.js'

export function stageReview(d, diff, { origin = 'agent', task_id, fix_line_id, agent_id = 'Frontend' } = {}) {
  assertEditable(d)
  validateFiles(diff.map(f => ({ path: f.path, content: f.after })))
  if (diff.some(f => typeof f.before !== 'string')) throw fault('Diff needs the stored before content', 422)
  if (d.editor_reviews?.some(r => r.status === 'pending')) throw fault('Decide the pending diff before creating another')
  const review = { id: randomUUID(), origin, task_id, fix_line_id, agent_id, generation: d.generation, spec_sha256: digest(JSON.stringify(activeLines(d).map(l => ({ id: l.id, group: l.group, final_text: l.final_text })))), status: 'pending', diff, risk_spec_line_ids: riskLines(d, diff), risk_reviews: [], created_at: new Date().toISOString() }
  d.editor_reviews ||= []; d.editor_reviews.push(review)
  event(d, agent_id, { kind: 'diff_staged', review_id: review.id, task_id, spec_line_ids: fix_line_id ? [fix_line_id] : activeLines(d).map(l => l.id) })
  return review
}
export async function proposeInline(engine, doc, sandbox, input) {
  assertEditable(doc.data)
  if (!['live', 'done', 'wait_for_user'].includes(doc.data.state)) throw fault('Wait for a worker safe point before an inline edit')
  if (!doc.data.design?.selected && doc.data.pipeline_version === 3) throw fault('Choose a design before coding')
  const { path, instruction, selection, before_sha256 } = input
  if (typeof instruction !== 'string' || !instruction.trim() || instruction.length > 2000) throw fault('An inline instruction is required', 400)
  assertNoSecrets(instruction)
  const file = (await sandbox.read(doc.project_id)).find(f => f.path === path)
  if (!file || digest(file.content) !== before_sha256) throw fault('The editor buffer differs from the sandbox; refresh before editing')
  if (!selection || !Number.isInteger(selection.start) || !Number.isInteger(selection.end) || selection.start < 0 || selection.end <= selection.start || selection.end > file.content.length) throw fault('Select an existing range', 400)
  const result = await engine.model(doc, 'Frontend', { instruction, file, selection, spec: activeLines(doc.data), format: { replacement: 'replace only the selected characters; no other file changes' } })
  if (typeof result.value.replacement !== 'string') throw fault('Inline edit did not return a replacement', 422)
  const after = file.content.slice(0, selection.start) + result.value.replacement + file.content.slice(selection.end)
  validateFiles([{ path, content: after }])
  return engine.mutate(doc, d => {
    addFix(d, instruction)
    const fix_line_id = d.spec.acceptance.at(-1).id
    stageReview(d, [{ path, before: file.content, after }], { origin: 'inline', fix_line_id })
  })
}
export async function reviewRisk(engine, doc, review) {
  if (!review.risk_spec_line_ids.length) return []
  const payload = { spec: activeLines(doc.data), diff: review.diff, format: { lines: [{ id: 'each supplied spec id', verdict: 'pass|fail|outside_spec', evidence: 'what this diff does to the accepted requirement' }] } }
  const first = await engine.model(doc, 'Review-1', payload)
  const second = await engine.model(doc, 'Review-2', payload, { excludeModels: [first.model] })
  return [first, second].map((r, i) => ({ agent_id: `Review-${i + 1}`, provider: r.provider, model: r.model, lines: Array.isArray(r.value.lines) ? r.value.lines : [] }))
}
export async function decideReview(engine, doc, sandbox, id, decision) {
  assertEditable(doc.data)
  if (!['accept', 'reject'].includes(decision)) throw fault('Choose accept or reject', 400)
  const review = doc.data.editor_reviews?.find(r => r.id === id)
  if (!review || review.status !== 'pending') throw fault('Pending diff not found', 404)
  if (review.generation !== doc.data.generation) throw fault('The dossier changed; refresh the diff')
  if (decision === 'reject') return engine.mutate(doc, d => {
    const r = d.editor_reviews.find(r => r.id === id); r.status = 'rejected'
    if (r.fix_line_id) reviewLine(d, r.fix_line_id, 'rejected')
    if (r.origin === 'inline' && d.last_green) { d.judge = structuredClone(d.last_green.judge); d.state = 'live'; d.blocked = null }
    if (r.origin === 'agent') { const task = d.tasks.find(t => t.id === r.task_id); if (task) task.status = 'failed'; block(d, 'Agent changes rejected; review the specification before retrying', 'wait_for_user') }
    event(d, 'Listener', { kind: 'diff_rejected', review_id: id, spec_line_ids: r.fix_line_id ? [r.fix_line_id] : [] })
  })
  const current = await sandbox.read(doc.project_id)
  if (review.spec_sha256 !== digest(JSON.stringify(activeLines(doc.data).map(l => ({ id: l.id, group: l.group, final_text: l.final_text }))))) throw fault('Specification changed; request a new diff before accepting')
  if (review.origin === 'agent' && !doc.data.tasks.some(t => t.id === review.task_id && t.status === 'review')) throw fault('Diff task is no longer awaiting review')
  if (review.diff.some(f => (current.find(c => c.path === f.path)?.content || '') !== f.before)) throw fault('Sandbox changed since this diff was proposed')
  if (review.risk_reviews?.length && !riskPassed(review.risk_reviews, review.risk_spec_line_ids)) throw fault('This diff failed independent review; reject it and request a corrected diff', 409)
  const reviews = await reviewRisk(engine, doc, review)
  if (review.risk_spec_line_ids.length && !riskPassed(reviews, review.risk_spec_line_ids)) return engine.mutate(doc, d => {
    const r = d.editor_reviews.find(r => r.id === id); r.risk_reviews = reviews
    block(d, reviews.some(j => j.lines.some(l => l.verdict === 'outside_spec')) ? 'Risk review found a change outside the spec; user review is required' : 'Two different model ids must pass this sensitive diff', 'wait_for_user')
    event(d, 'Contract', { kind: 'diff_blocked', review_id: id, verdict: 'fail' })
  })
  // The route holds the worker lease while writing. A write cannot preserve stale green judges.
  const latest = (await engine.store.get(doc.project_id, doc.user_id)).data
  assertEditable(latest)
  if (review.spec_sha256 !== digest(JSON.stringify(activeLines(latest).map(l => ({ id: l.id, group: l.group, final_text: l.final_text }))))) throw fault('Specification changed during review')
  await engine.mutate(doc, d => { d.judge = []; block(d, 'Applying the reviewed diff', 'test') })
  await sandbox.write(doc.project_id, review.diff.map(f => ({ path: f.path, content: f.after })))
  return engine.mutate(doc, d => {
    const r = d.editor_reviews.find(r => r.id === id); r.status = 'accepted'; r.risk_reviews = reviews
    if (r.fix_line_id) {
      transition(d, 'wait_for_user'); reviewLine(d, r.fix_line_id, 'accepted'); d.generation++; queueTasks(d)
      const task = d.tasks.find(t => t.spec_line_ids.includes(r.fix_line_id)); d.current_task = task.id
      transition(d, 'build'); task.diff = r.diff; task.status = 'built'; transition(d, 'test', 'Tester')
    } else { const task = d.tasks.find(t => t.id === r.task_id); if (!task) throw fault('Diff task is missing'); task.diff = r.diff; task.status = 'built'; transition(d, 'test', 'Tester') }
    for (const file of r.diff) {
      const agent = r.origin === 'inline' ? r.agent_id : { frontend: 'Frontend', backend: 'Backend', data: 'Data' }[file.path.split('/')[0]]
      const builder = d.tasks.find(t => t.id === r.task_id)?.builders?.find(b => b.agent_id === agent)
      event(d, agent || r.agent_id, { kind: 'file_written', file: file.path, task_id: r.task_id, spec_line_ids: r.fix_line_id ? [r.fix_line_id] : d.tasks.find(t => t.id === r.task_id)?.spec_line_ids || [], provider: builder?.provider, model: builder?.model })
    }
    event(d, 'Listener', { kind: 'diff_accepted', review_id: id, spec_line_ids: r.fix_line_id ? [r.fix_line_id] : [] })
  })
}
