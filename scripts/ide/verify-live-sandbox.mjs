// Real Docker/Chromium, with explicitly fixed fixture source. This script does
// not certify a model-generated app, an account login, or a deployed release.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { DockerSandbox } from '../../backend/src/services/dossier/sandbox.js'
const ids = [randomBytes(12).toString('hex'), randomBytes(12).toString('hex')]
const sandbox = new DockerSandbox(), artifacts = []
const evidence = { source: 'trusted fixture', mock_docker: false, mock_browser: false, projects: ids, tests: [], executed_at: new Date().toISOString() }
const source = ['import html', 'def render(user, rows):', ` notes = ''.join('<li>' + html.escape(r['title']) + '</li>' for r in rows)`, ` return '''<!doctype html><title>Owner notes</title><h1 data-i18n-en="Owner notes" data-i18n-hi="मेरे नोट्स">Owner notes</h1><button data-i18n-en="View notes" data-i18n-hi="नोट्स देखें" onclick="document.getElementById('result').textContent='Opened notes'">View notes</button><p id="result" data-i18n-en="Ready" data-i18n-hi="तैयार">Ready</p><ul>''' + notes + '</ul>'`].join('\n')
try {
  for (const id of ids) {
    await sandbox.ensure(id)
    await sandbox.write(id, [{ path: 'frontend/features.py', content: source }, { path: 'data/migration.json', content: JSON.stringify({ version: 1, fields: ['id', 'owner', 'title'], seed_rows: [] }) }, { path: 'data/down.json', content: JSON.stringify({ version: 1, tables: ['requests', 'sessions', 'rows', 'users', 'schema_versions'] }) }])
    const first = await sandbox.migrate(id), second = await sandbox.migrate(id)
    assert.deepEqual(first, second); assert.equal(first.rows, 4)
    assert.equal((await sandbox.test(id)).exit_code, 0)
    assert.equal((await sandbox.security(id)).exit_code, 0)
    assert.equal((await sandbox.perf(id, 0.00001)).exit_code, 1)
    assert.equal((await sandbox.perf(id, 1000)).exit_code, 0)
    const snapshot = await sandbox.snapshot(id)
    await sandbox.write(id, [{ path: 'frontend/features.py', content: 'broken' }]); await sandbox.restore(id, snapshot)
    const screen = await sandbox.browser(id); artifacts.push(screen.screenshot); assert.match(screen.text, /sample-a row/); assert.ok(!screen.text.includes('sample-b row'))
    const resilience = await sandbox.resilience(id); artifacts.push(resilience.screenshot); assert.equal(resilience.exit_code, 0)
    evidence.tests.push({ project_id: id, migrations: first, security: 'pass', perf_over_budget: 'fail as required', rollback: 'pass code/database/preview', resilience })
  }
  const login = await sandbox.request(ids[0], { path: '/login', method: 'POST', body: JSON.stringify({ name: 'sample-a', password: 'Demo-2026!' }) })
  const cookie = login.headers['Set-Cookie'].split(';')[0]
  assert.equal((await sandbox.request(ids[1], { path: '/rows', headers: { Cookie: cookie } })).status, 401)
  const a = await sandbox.snapshot(ids[0]), b = await sandbox.snapshot(ids[1]); assert.notEqual(a.database_base64, b.database_base64)
  evidence.result = 'PASS'; await fs.writeFile('artifacts/codeva-editor/live-sandbox.json', JSON.stringify(evidence, null, 2)); console.log(JSON.stringify(evidence))
} finally { for (const id of ids) await sandbox.remove(id, artifacts) }
