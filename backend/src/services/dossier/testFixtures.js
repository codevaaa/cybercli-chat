// Test doubles only; never imported by the production runtime.
import assert from 'node:assert/strict'

export class MemoryStore {
  constructor() { this.docs = new Map(); this.pending = new Map() }
  async create(data, user_id, plan = 'pro') { const doc = { _id: data.project_id, project_id: data.project_id, user_id, plan, revision: 0, data, lease_until: new Date(0) }; this.docs.set(data.project_id, structuredClone(doc)); return structuredClone(doc) }
  async get(id, userId) { const doc = this.docs.get(String(id)); if (!doc || doc.user_id !== userId) throw Object.assign(new Error('Dossier not found'), { status: 404 }); return structuredClone(doc) }
  async mutate(id, userId, change) {
    const prior = this.pending.get(id) || Promise.resolve()
    let release
    const pending = new Promise(resolve => { release = resolve })
    this.pending.set(id, pending)
    await prior
    try {
    const doc = await this.get(id, userId), original = doc.data.prompt_original, history = JSON.stringify(doc.data.events)
    change(doc.data)
    assert.equal(doc.data.prompt_original, original)
    assert.equal(JSON.stringify(doc.data.events.slice(0, JSON.parse(history).length)), history)
    doc.revision++; this.docs.set(String(id), structuredClone(doc)); return structuredClone(doc)
    } finally { release(); if (this.pending.get(id) === pending) this.pending.delete(id) }
  }
}
export class FakeSandbox {
  constructor() { this.files = []; this.database = { rows: 4 }; this.clicks = []; this.fail = false }
  async ensure() {}
  async contract() { return { exit_code: 0, tests: ['fixture_render_contract'] } }
  async read() { return structuredClone(this.files) }
  async search() { return [] }
  async compare(before, after) { return { previous_screenshot: before, current_screenshot: after, ratio: 0, changed_pixels: 0, screenshot: '00000000-0000-0000-0000-000000000001.png' } }
  async write(id, files) { const diff = files.map(f => ({ path: f.path, before: this.files.find(p => p.path === f.path)?.content || '', after: f.content })); this.files = [...this.files.filter(f => !files.some(v => v.path === f.path)), ...structuredClone(files)]; return diff }
  async migrate() { return { exit_code: 0, version: 1, rows: this.database.rows } }
  async health() { return { exit_code: 0, status: 200 } }
  async logs() { return { output: '' } }
  async security() { return { exit_code: 0, tests: ['owner_isolation'] } }
  async resilience() { return { exit_code: 0, tests: ['duplicate_request'] } }
  async perf() { return { exit_code: 0, elapsed_ms: 1 } }
  async test() { return { exit_code: this.fail ? 1 : 0, tests: ['owner_isolation', 'idempotent_seed'], rows: this.database.rows, output: 'trusted output' } }
  async browser(id, click) { if (click) this.clicks.push(structuredClone(click)); return { screenshot: '00000000-0000-0000-0000-000000000001.png', screenshot_path: 'dossier-artifacts/00000000-0000-0000-0000-000000000001.png', text: 'Rendered owner notes', click: click || null } }
  async snapshot() { return structuredClone({ files: this.files, database: this.database }) }
  async artifact() { return Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) }
  async restore(id, snapshot) { this.files = structuredClone(snapshot.files); this.database = structuredClone(snapshot.database) }
}
export function fakeModels({ disagree = false, omit = false, multipleTasks = false } = {}) {
  const inputs = []
  return { inputs, async call({ role, payload, onRoute, failures }) {
    inputs.push({ role, payload, failures })
    await onRoute?.({ kind: 'provider_attempt', provider: 'fixture', model: role, reason: 'test_fixture' })
    if (role === 'Conductor') return { provider: 'fixture', model: role, value: { will_build: multipleTasks ? ['Show notes', 'Add a note form'] : ['Show notes'], must_never: ['Expose secrets'], acceptance: ['Show owner notes after login'] } }
    if (role === 'Builder') return { provider: 'fixture', model: role, value: { files: [{ path: 'features.py', content: 'def render(user, rows): return "<h1>Notes</h1>"' }], summary: 'BUILDER PRIVATE SELF REPORT' } }
    if (role === 'Designer') return { provider: 'fixture', model: role, value: { proposals: ['Compact list', 'Cards'].map(title => ({ title, summary: 'Owner notes with a clear error state', spec_line_ids: payload.spec.map(l => l.id) })) } }
    if (role.startsWith('Review-')) return { provider: 'fixture', model: role, value: { lines: payload.spec.map(l => ({ id: l.id, verdict: 'pass', evidence: 'Fixture independent diff review' })) } }
    if (role === 'Frontend' && payload.instruction) return { provider: 'fixture', model: role, value: { replacement: 'Edited notes' } }
    const contract = { entity: 'rows', path: '/rows', fields: ['id', 'owner', 'title'], owner_only: true, login_required: true }
    if (role === 'Frontend') return { provider: 'fixture', model: role, value: { files: [{ path: 'frontend/features.py', content: 'def render(user, rows): return "<h1 data-i18n-en=\\"Notes\\" data-i18n-hi=\\"नोट्स\\">Notes</h1>"' }, { path: 'frontend/contract.json', content: JSON.stringify(contract) }] } }
    if (role === 'Backend') return { provider: 'fixture', model: role, value: { files: [{ path: 'backend/contract.json', content: JSON.stringify(contract) }] } }
    if (role === 'Data') return { provider: 'fixture', model: role, value: { files: [{ path: 'data/migration.json', content: JSON.stringify({ version: 1, fields: contract.fields, seed_rows: [] }) }, { path: 'data/down.json', content: JSON.stringify({ version: 1, tables: ['requests', 'sessions', 'rows', 'users', 'schema_versions'] }) }] } }
    return { provider: 'fixture', model: role, value: { lines: payload.spec.filter((_, i) => !omit || i !== payload.spec.length - 1).map(l => ({ id: l.id, verdict: disagree && role === 'Judge-cheap' ? 'fail' : 'pass', evidence: 'Trusted app screen contains notes', source_ids: [payload.running_app.screen.source_id] })) } }
  } }
}
