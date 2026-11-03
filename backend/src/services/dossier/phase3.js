import { randomUUID } from 'node:crypto'
import { activeLines, assertNoSecrets, block, event, fault } from './domain.js'
import { contractCheck } from './roles.js'
import { cryptoCheck, performanceBudget } from './gates.js'
import { stageReview } from './editorReview.js'
import { recordedTool } from './tools.js'
import { validateFiles } from './sandbox.js'

export const APP_CONTRACT = Object.freeze({ entity: 'rows', path: '/rows', fields: ['id', 'owner', 'title'], owner_only: true, login_required: true })
function jsonFile(files, path) {
  const file = files.find(f => f.path === path)
  if (!file) throw fault(`${path} is required`, 422)
  try { return JSON.parse(file.content) } catch { throw fault(`${path} must contain valid JSON`, 422) }
}
export function validateRoleFiles(role, files) {
  validateFiles(files)
  const prefix = { Frontend: 'frontend/', Backend: 'backend/', Data: 'data/' }[role]
  if (!prefix || files.some(f => !f.path.startsWith(prefix))) throw fault(`${role} can write only its own directory`, 403)
  const supported = { Frontend: ['frontend/features.py', 'frontend/contract.json'], Backend: ['backend/contract.json'], Data: ['data/migration.json', 'data/down.json'] }[role]
  if (files.some(f => !supported.includes(f.path))) throw fault(`${role} proposed files that the approved runtime cannot execute`, 422)
  if (role === 'Backend' && files.some(f => /CREATE\s+TABLE|DROP\s+TABLE/i.test(f.content))) throw fault('Data owns schema changes; Backend cannot create tables', 403)
}
export async function buildWithRoles(engine, doc, task) {
  const d = doc.data
  await recordedTool(engine, doc, 'boot', {}, () => engine.sandbox.ensure(d.project_id), 'DevOps')
  const read = await recordedTool(engine, doc, 'read', {}, () => engine.sandbox.read(d.project_id), 'Conductor')
  if (read.error) throw fault(read.error)
  const shared = { prompt_original: d.prompt_original, pack: d.pack, spec: activeLines(d), task_spec_line_ids: task.spec_line_ids, design: d.design.proposals.find(p => p.id === d.design.selected.id), existing_files: read.value, previous_test_output: task.output, approved_schema: APP_CONTRACT,
    constraints: 'Use only Python 3.12.8 stdlib and owner-scoped SQLite rows supplied by this trusted runtime. No dependencies, external targets or secrets. Return {files:[{path,content}]}; return {blocked:reason} when the accepted requirement cannot be implemented on this stack. Do not report your own tests as passed.' }
  const contracts = {
    Frontend: 'Return EXACTLY two files: frontend/features.py and frontend/contract.json. features.py exports def render(user, rows) returning a complete HTML STRING with inline CSS/JS and literal English/Hindi data-i18n-en/hi labels. Only Python stdlib is installed; Flask, Jinja, templates, render_template, third-party imports and external assets cannot run. Escape user titles with html.escape. The rows argument is a list of dicts with id,owner,title. Use relative fetch("rows") POST {action:create|update|delete,id,title} / GET {rows}. On retry use the same Idempotency-Key. Show nonblank loading/error/recovery states. contract.json is the exact approved_schema object. The runtime supplies login and window.codevaSetLanguage; do not implement a second login.',
    Backend: 'Read the approved Data schema in the payload. Write backend/contract.json describing the immutable runtime API (the exact approved_schema). Backend owns this API contract and validates names/permissions; it does not create tables. Do not invent a route or a service which the trusted runtime cannot execute.',
    Data: 'Write data/migration.json: {version:1,fields:["id","owner","title"],seed_rows:[{id:integer>=100,owner:1|2,title:string<=200}]}. Seeds are demo rows for the accepted app. Write data/down.json: {version:1,tables:["requests","sessions","rows","users","schema_versions"]}. The Data migration runner applies both directions transactionally and idempotently; never include passwords.' }
  await engine.mutate(doc, data => event(data, 'Conductor', { kind: 'parallel_build', task_id: task.id, reason: 'Frontend, Backend and Data use separate directories' }))
  // Same result composition pattern as Council; the roles cannot merge their own output.
  const completed = await Promise.allSettled(Object.keys(contracts).map(async role => {
    const result = await engine.model(doc, role, { ...shared, contract: contracts[role] }, { failures: task.attempts })
    if (result.value.blocked) throw fault(`${role} cannot satisfy this spec in the approved runtime`, 422)
    validateRoleFiles(role, result.value.files)
    return { role, ...result }
  }))
  // Finish every sibling call before releasing the worker lease or retrying.
  const failure = completed.find(r => r.status === 'rejected')
  if (failure) throw failure.reason
  const results = completed.map(r => r.value)
  const files = results.flatMap(r => r.value.files)
  const frontend = jsonFile(files, 'frontend/contract.json'), backend = jsonFile(files, 'backend/contract.json'), migration = jsonFile(files, 'data/migration.json')
  const contract = contractCheck(frontend, backend, migration)
  // A declared name cannot hide a literal different route in the actual UI.
  const ui = files.find(f => f.path === 'frontend/features.py')
  if (!ui || [...ui.content.matchAll(/fetch\s*\(\s*["']([^"']+)["']/g)].some(m => !['rows', '/rows', 'login', '/login'].includes(m[1]))) { contract.exit_code = 1; contract.output = 'UI fetch route disagrees with the approved API' }
  const down = jsonFile(files, 'data/down.json')
  if (down.version !== 1 || JSON.stringify(down.tables) !== JSON.stringify(['requests', 'sessions', 'rows', 'users', 'schema_versions'])) { contract.exit_code = 1; contract.output = 'Down migration does not match the Data schema' }
  const test_id = randomUUID()
  if (!contract.exit_code) {
    const program = await recordedTool(engine, doc, 'contract', {}, () => engine.sandbox.contract(d.project_id, files), 'Contract')
    if (program.error || program.value?.exit_code !== 0) { contract.exit_code = 1; contract.output = program.value?.output || program.error || 'Missing render contract evidence' }
  }
  await engine.mutate(doc, data => event(data, 'Contract', { kind: 'contract_result', test_id, task_id: task.id, verdict: contract.exit_code ? 'fail' : 'pass', output: contract }))
  if (contract.exit_code) throw fault(contract.output, 422)
  const crypto = cryptoCheck(files)
  if (crypto.exit_code) throw fault('Crypto steward rejected plaintext credentials or a committed secret', 422)
  const diff = files.map(f => ({ path: f.path, before: read.value.find(v => v.path === f.path)?.content || '', after: f.content }))
  return engine.mutate(doc, data => {
    const t = data.tasks.find(t => t.id === task.id); t.status = 'review'; t.builders = results.map(r => ({ agent_id: r.role, provider: r.provider, model: r.model })); t.contract_test_id = test_id
    for (const r of results) for (const file of r.value.files) event(data, r.role, { kind: 'file_proposed', file: file.path, task_id: task.id, provider: r.provider, model: r.model, spec_line_ids: task.spec_line_ids })
    stageReview(data, diff, { task_id: task.id })
    block(data, 'Review agent changes in the diff editor before applying them', 'test')
  })
}
export async function phase3Gates(engine, doc, task) {
  const call = async (agent, tool, input, run) => {
    const result = await recordedTool(engine, doc, tool, input, run, agent)
    const test_id = randomUUID()
    await engine.mutate(doc, d => {
      const findings = { agent_id: agent, test_id, spec_line_ids: task.spec_line_ids, verdict: result.error || result.value?.exit_code ? 'fail' : 'pass' }
      d.sources.push({ type: 'gate', ...findings, output: result.value }); event(d, agent, { kind: 'gate_result', ...findings, output: result.value, task_id: task.id })
    })
    if (result.error || result.value?.exit_code) throw fault(`${agent} gate failed`, 422)
    return result.value
  }
  await call('DevOps', 'boot', {}, () => engine.sandbox.ensure(doc.project_id))
  const first = await call('DevOps', 'migrate', {}, () => engine.sandbox.migrate(doc.project_id))
  const second = await call('DevOps', 'migrate', {}, () => engine.sandbox.migrate(doc.project_id))
  if (first.rows !== second.rows || first.version !== second.version) throw fault('Repeated migration changed rows or schema', 422)
  await call('DevOps', 'health', {}, () => engine.sandbox.health(doc.project_id))
  const logs = await call('DevOps', 'logs', {}, () => engine.sandbox.logs(doc.project_id)); assertNoSecrets(JSON.stringify(logs))
  await call('App-security', 'security', {}, () => engine.sandbox.security(doc.project_id))
  await call('Crypto-steward', 'crypto', {}, async () => cryptoCheck(await engine.sandbox.read(doc.project_id)))
  await call('Resilience', 'resilience', {}, () => engine.sandbox.resilience(doc.project_id))
  const budget = performanceBudget(doc.data)
  if (budget) await call('Perf', 'perf', budget, () => engine.sandbox.perf(doc.project_id, budget.ms))
}
