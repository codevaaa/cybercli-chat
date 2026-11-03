import { randomUUID, createHash } from 'node:crypto'
import { SECRET_PATTERNS } from '../secretScanner.js'

export const STATES = Object.freeze({
  listen: ['spec', 'blocked'], spec: ['wait_for_user', 'blocked'],
  wait_for_user: ['tasks', 'blocked'], tasks: ['build', 'judge', 'blocked'],
  build: ['test', 'blocked'], test: ['tasks', 'blocked'],
  judge: ['live', 'blocked'], live: ['fix', 'done', 'blocked'],
  fix: ['wait_for_user', 'blocked'], done: ['fix', 'live'],
  blocked: ['spec', 'wait_for_user', 'tasks', 'build', 'test', 'judge', 'live'],
})
export const GROUPS = ['will_build', 'must_never', 'acceptance']
export const fault = (message, status = 409) => Object.assign(new Error(message), { status })
export const digest = text => createHash('sha256').update(text, 'utf8').digest('hex')
export function assertNoSecrets(text) {
  for (const { name, regex } of SECRET_PATTERNS) {
    if (new RegExp(regex.source, regex.flags).test(text)) throw fault(`Secret detected (${name}); remove it before submitting.`, 422)
  }
  if (/-----BEGIN (?:EC |OPENSSH |)PRIVATE KEY-----|(?:password|api_key|secret)\s*[:=]\s*["'][^"']{16,}["']/i.test(text)) throw fault('Secret detected; remove it before submitting.', 422)
  if (/\b(?:\w*api_key\d*|(?:access_|auth_)?token|secret(?:_key)?|password)\b["']?\s*[:=]\s*["']?[A-Za-z0-9+/=_-]{16,}/i.test(text) || /\b(?:gsk_[A-Za-z0-9]{20,}|hf_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/.test(text)) throw fault('Secret detected; remove it before submitting.', 422)
}
export function event(d, agent, detail = {}) {
  const allowed = Object.fromEntries(Object.entries(detail).filter(([key]) => ['provider', 'model', 'reason', 'spec_line_ids', 'kind', 'task_id', 'verdict', 'tier', 'tool_call_id', 'tool', 'input', 'output', 'file', 'test_id', 'review_id'].includes(key)))
  d.events.push({ seq: d.events.length + 1, time: new Date().toISOString(), project_id: d.project_id, state: d.state, agent_id: agent, provider: null, model: null, spec_line_ids: d.spec ? activeLines(d).map(line => line.id) : [], ...allowed })
}
export function transition(d, state, agent = 'Conductor', detail = {}) {
  if (!STATES[d.state]?.includes(state)) throw fault(`Illegal transition: ${d.state} → ${state}`)
  d.state = state
  d.blocked = null
  event(d, agent, { kind: 'transition', ...detail })
}
export function block(d, reason, resumeState = d.state) {
  if (d.state !== 'blocked') transition(d, 'blocked')
  d.blocked = { reason, resume_state: resumeState }
  event(d, 'Conductor', { kind: 'blocked', reason })
}
export function lines(d) { return GROUPS.flatMap(group => d.spec[group].map(line => ({ ...line, group }))) }
export function activeLines(d) { return lines(d).filter(line => line.status !== 'rejected') }
export function ready(d) {
  const active = activeLines(d)
  if (!active.length || !active.some(line => line.group === 'acceptance')) throw fault('At least one acceptance line is required')
  if (!active.some(line => line.group === 'will_build')) throw fault('At least one build goal is required')
  if (active.some(line => !['accepted', 'edited'].includes(line.status))) throw fault('Every remaining spec line needs user acceptance')
  const errors = lintSpec(d.spec)
  if (errors.length) throw fault(`Contradictory spec: ${errors.map(e => e.reason).join('; ')}`, 422)
  return active
}
const normal = text => text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
export function lintSpec(spec) {
  const all = GROUPS.flatMap(group => (spec[group] || []).filter(l => l.status !== 'rejected').map(l => ({ ...l, group, n: normal(l.final_text || l.text) })))
  const errors = []
  const publicLine = l => /everyone|anyone|public|all users|सब|सभी/.test(l.n)
  const privateLine = l => /only (i|me|myself|the owner)|private|सिर्फ|केवल/.test(l.n)
  const entity = l => l.n.split(/see|read|view|access|देख|पढ़/).at(-1).replace(/\b(can|only|i|me|everyone|anyone|must|never|not)\b/g, '').trim()
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i], b = all[j]
    if (publicLine(a) && privateLine(b) || publicLine(b) && privateLine(a)) {
      const x = entity(a), y = entity(b)
      if (!x || !y || x.includes(y) || y.includes(x)) errors.push({ ids: [a.id, b.id], reason: 'Public and owner-only access conflict' })
    }
  }
  for (const prohibited of all.filter(l => l.group === 'must_never')) {
    const action = prohibited.n.replace(/\b(must|never|not|do|no|should|be|allow|the|app)\b/g, '').replace(/\s+/g, ' ').trim()
    for (const build of all.filter(l => l.group === 'will_build')) {
      if (action.length > 3 && build.n.includes(action) && !/\b(not|never|prevent|deny)\b/.test(build.n)) errors.push({ ids: [prohibited.id, build.id], reason: 'Build line violates must-never line' })
    }
  }
  return errors
}
export function newDossier(projectId, prompt, pack = 'general') {
  if (typeof prompt !== 'string' || !prompt.trim() || Buffer.byteLength(prompt, 'utf8') > 16000) throw fault('Prompt must contain 1–16000 UTF-8 bytes', 400)
  if (!['general', 'cs', 'commerce'].includes(pack)) throw fault('Only general, cs and commerce packs are supported', 400)
  assertNoSecrets(prompt)
  const d = { project_id: String(projectId), prompt_original: prompt, prompt_sha256: digest(prompt), prompts_added: [], pack,
    state: 'listen', spec: { will_build: [], must_never: [], acceptance: [] }, tasks: [], judge: [], live: [], sources: [], events: [], blocked: null, generation: 0, last_green: null }
  event(d, 'Listener', { kind: 'prompt_saved' })
  return d
}
export function installSpec(d, spec) {
  const pendingFixes = d.spec.acceptance.filter(line => d.prompts_added.some(p => p.type === 'fix' && p.text === line.text))
  for (const group of GROUPS) {
    if (!Array.isArray(spec[group]) || spec[group].length > 30) throw fault('Invalid spec response', 422)
    d.spec[group] = spec[group].map(value => {
      const text = typeof value === 'string' ? value : value.text
      if (typeof text !== 'string' || !text.trim() || text.length > 2000) throw fault('Invalid spec line', 422)
      assertNoSecrets(text)
      return { id: randomUUID(), text, final_text: text, status: 'pending' }
    })
  }
  d.spec.acceptance.push(...pendingFixes)
  if (!d.spec.acceptance.length || !d.spec.will_build.length) throw fault('Spec needs build and acceptance lines', 422)
}
export function reviewLine(d, id, status, text) {
  if (d.classroom?.locked_spec_line_ids.includes(id)) throw fault('The teacher specification is locked', 423)
  if (d.state !== 'wait_for_user') throw fault('Spec review requires wait_for_user')
  if (!['accepted', 'rejected', 'edited'].includes(status)) throw fault('Invalid line status', 400)
  const line = lines(d).find(l => l.id === id)
  if (!line) throw fault('Spec line not found', 404)
  if (status === 'edited' && (typeof text !== 'string' || !text.trim() || text.length > 2000)) throw fault('Edited line text is required', 400)
  if (text !== undefined) assertNoSecrets(text)
  const target = d.spec[line.group].find(l => l.id === id)
  target.status = status
  // A later accept/reject decision must not discard the user's preceding edit.
  if (status === 'edited') target.final_text = text
  d.judge = []
  for (const task of d.tasks.filter(t => t.spec_line_ids.includes(id))) { task.status = 'queued'; task.attempts = 0 }
  event(d, 'Listener', { kind: 'spec_review', spec_line_ids: [id] })
}
export function queueTasks(d) {
  const active = ready(d)
  const newLines = active.filter(l => !d.tasks.some(t => t.spec_line_ids.includes(l.id)))
  const newGoals = newLines.filter(l => l.group === 'will_build')
  // Phase 3 schedules one coordinated app build, with three parallel owners.
  // Separate complete-app builds per goal would overwrite each other's files.
  const bindings = d.pipeline_version === 3 && newGoals.length ? [active.map(l => l.id)] : newGoals.length ? newGoals.map(goal => [goal.id, ...active.filter(l => l.group !== 'will_build').map(l => l.id)]) : newLines.length ? [newLines.map(l => l.id)] : []
  for (const ids of bindings) d.tasks.push({ id: randomUUID(), spec_line_ids: ids, status: 'queued', attempts: 0, diff: [], command: null, output: null, screenshot: null, ui: true })
  const goalIds = new Set(d.spec.will_build.map(line => line.id))
  d.tasks = d.tasks.filter(t => t.spec_line_ids.some(id => active.some(l => l.id === id)) && (!t.spec_line_ids.some(id => goalIds.has(id)) || t.spec_line_ids.some(id => goalIds.has(id) && active.some(l => l.id === id))))
  for (const task of d.tasks) task.spec_line_ids = task.spec_line_ids.filter(id => active.some(l => l.id === id))
  transition(d, 'tasks')
}
export function addFix(d, text) {
  if (typeof text !== 'string' || !text.trim() || text.length > 2000) throw fault('Fix text is required', 400)
  assertNoSecrets(text)
  d.prompts_added.push({ id: randomUUID(), type: 'fix', text, time: new Date().toISOString() })
  const id = randomUUID()
  d.spec.acceptance.push({ id, text, final_text: text, status: 'pending' })
  d.judge = []
  if (['live', 'done'].includes(d.state)) { transition(d, 'fix', 'Listener', { spec_line_ids: [id] }); transition(d, 'wait_for_user') }
  else if (d.state === 'blocked') transition(d, 'wait_for_user', 'Listener', { spec_line_ids: [id] })
  else event(d, 'Listener', { kind: 'fix_pending', spec_line_ids: [id] })
  return id
}
export function judgeInput(d, evidence) {
  return { prompt_original: d.prompt_original, spec: activeLines(d).map(({ id, group, final_text }) => ({ id, group, text: final_text })),
    prompts_added: d.prompts_added, running_app: evidence }
}
export function validateVerdicts(d, responses) {
  const required = activeLines(d)
  if (responses.length !== 2 || new Set(responses.map(r => `${r.provider}/${r.model}`)).size !== 2) return false
  return responses.every(r => r.lines?.length === required.length && required.every(l => r.lines.filter(v => v.id === l.id).length === 1 && r.lines.find(v => v.id === l.id).verdict === 'pass'))
}
