import { activeLines, assertNoSecrets, event, fault } from './domain.js'

// Roles authorize tools before executing them. Model output cannot grant a tool.
export const ROLE_TOOLS = Object.freeze({
  Conductor: ['read'], Builder: ['read', 'write', 'search', 'test', 'browser', 'visual_compare'],
  Frontend: ['read', 'write'], Backend: ['read', 'write'], Data: ['read', 'write'],
  Contract: ['read', 'contract'], Tester: ['read', 'search', 'test', 'browser', 'visual_compare'],
  DevOps: ['boot', 'health', 'logs', 'migrate', 'rollback'],
  Resilience: ['resilience'], 'App-security': ['security'],
  'Crypto-steward': ['read', 'crypto'], Perf: ['perf'], Scribe: ['report'],
  Judge: [], 'Judge-cheap': [], 'Review-1': [], 'Review-2': [], Designer: [],
})
export function authorizeTool(agent, tool) {
  if (!ROLE_TOOLS[agent]?.includes(tool)) throw fault(`Tool ${tool} is not allowed for ${agent}`, 403)
}
export function initializePhase3(d) {
  d.pipeline_version = 3
  d.design = { proposals: [], selected: null }
  d.editor_reviews = []
  d.training_opt_in = false
  return d
}
export function assertEditable(d, now = Date.now()) {
  if (d.deleting) throw fault('Project deletion is in progress', 410)
  if (d.classroom?.deadline && Date.parse(d.classroom.deadline) <= now) throw fault('The classroom deadline has passed; this snapshot is locked', 423)
}
export function installDesigns(d, proposals) {
  const ids = new Set(activeLines(d).map(l => l.id))
  if (!Array.isArray(proposals) || proposals.length !== 2) throw fault('Exactly two design proposals are required', 422)
  d.design ||= { proposals: [], selected: null }
  d.design.proposals = proposals.map((p, index) => {
    if (typeof p.title !== 'string' || !p.title.trim() || p.title.length > 80 || typeof p.summary !== 'string' || !p.summary.trim() || p.summary.length > 800 || !Array.isArray(p.spec_line_ids) || !p.spec_line_ids.length || p.spec_line_ids.some(id => !ids.has(id))) throw fault('Design proposals must be short and cite existing spec lines', 422)
    assertNoSecrets(p.title + p.summary)
    return { id: String(index + 1), title: p.title, summary: p.summary, spec_line_ids: [...new Set(p.spec_line_ids)] }
  })
  d.design.selected = null
  event(d, 'Designer', { kind: 'design_proposals' })
}
export function selectDesign(d, id) {
  assertEditable(d)
  if (d.state !== 'wait_for_user' || d.tasks.some(t => ['built', 'tested'].includes(t.status))) throw fault('Choose a design before coding')
  const proposal = d.design?.proposals.find(p => p.id === id)
  if (!proposal) throw fault('Design proposal not found', 404)
  d.design.selected = { id, spec_line_ids: [...proposal.spec_line_ids], selected_by: 'user', time: new Date().toISOString() }
  event(d, 'Listener', { kind: 'design_selected', spec_line_ids: proposal.spec_line_ids })
}
export function contractCheck(frontend, backend, data) {
  const fail = reason => ({ exit_code: 1, output: reason, tests: ['ui_api_contract'] })
  const canonical = value => JSON.stringify(Object.keys(value || {}).sort().map(key => [key, value[key]]))
  if (!frontend || !backend || !data || canonical(frontend) !== canonical(backend)) return fail('UI/API names or permission rules disagree')
  if (JSON.stringify(Object.keys(backend).sort()) !== JSON.stringify(['entity', 'fields', 'login_required', 'owner_only', 'path']) || JSON.stringify(backend.fields) !== JSON.stringify(data.fields) || backend.owner_only !== true || backend.login_required !== true || backend.path !== '/rows' || backend.entity !== 'rows' || JSON.stringify(backend.fields) !== JSON.stringify(['id', 'owner', 'title'])) return fail('Schema or permission contract is outside the supported owner-scoped runtime')
  return { exit_code: 0, output: 'UI/API/schema names and owner-only permission rules agree', tests: ['ui_api_contract'] }
}
export function riskLines(d, diff) {
  const text = diff.map(f => `${f.path}\n${f.before}\n${f.after}`).join('\n')
  const risky = /login|password|permission|owner|payment|checkout|billing|session|auth/i.test(text)
  return risky ? activeLines(d).map(l => l.id) : []
}
export function riskPassed(reviews, ids) {
  return Array.isArray(reviews) && reviews.length === 2 && new Set(reviews.map(r => r.model)).size === 2 && reviews.every(r => r.provider && r.model && Array.isArray(r.lines) && ids.every(id => r.lines.filter(l => l.id === id).length === 1 && r.lines.find(l => l.id === id).verdict === 'pass' && typeof r.lines.find(l => l.id === id).evidence === 'string' && r.lines.find(l => l.id === id).evidence.trim()))
}
export function scribeReport(d) {
  // No model calls, generated explanations, or invented evidence.
  return { project_id: d.project_id, prompt_original: d.prompt_original,
    entries: d.events.map(e => ({ seq: e.seq, spec_line_ids: e.spec_line_ids, agent_id: e.agent_id, file: e.file || null, test_id: e.test_id || null, provider: e.provider, model: e.model, verdict: e.verdict || null, kind: e.kind })),
    missing_evidence: d.tasks.filter(t => !t.test_id).map(t => t.id) }
}
