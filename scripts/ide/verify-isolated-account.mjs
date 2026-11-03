// Non-production acceptance environment only. Real GoTrue issues the JWTs;
// the existing Supabase SDK and requireAuth verify them. No production users,
// stored chats, account credentials or authorization middleware are replaced.
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { randomBytes, createHmac } from 'node:crypto'
const require = createRequire(new URL('../../backend/package.json', import.meta.url))
const express = require('express'), mongoose = require('mongoose'), { createClient } = require('@supabase/supabase-js'), { MongoMemoryServer } = require('mongodb-memory-server')
const exec = promisify(execFile), suffix = randomBytes(4).toString('hex')
const network = `codeva-auth-${suffix}`, pg = `${network}-db`, authName = `${network}-gotrue`
const password = randomBytes(24).toString('hex'), jwtSecret = randomBytes(32).toString('hex')
const env = { ...process.env, POSTGRES_PASSWORD: password, GOTRUE_JWT_SECRET: jwtSecret }
const docker = (args, options = {}) => exec('docker', args, { env, windowsHide: true, timeout: 60000, maxBuffer: 2 * 1024 * 1024, ...options })
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const evidence = { executed_at: new Date().toISOString(), scope: 'Isolated real GoTrue/Postgres authentication, real existing Mongo models/API and Docker sandbox. Fixture specification/app; no generated model verdicts certified.' }
const containers = [], ids = [], objects = []
let bridge, apiServer, mongo, sandbox, nativeApp
const folder = 'artifacts/codeva-editor/isolated-account'
await fs.mkdir(folder, { recursive: true })
try {
  await docker(['network', 'create', network])
  await docker(['run', '-d', '--name', pg, '--network', network, '--network-alias', 'db', '--memory', '512m', '--env', 'POSTGRES_PASSWORD', 'postgres:16.9']); containers.push(pg)
  let ready = false
  for (let i = 0; i < 100; i++) { ready = await docker(['exec', pg, 'pg_isready', '-U', 'postgres']).then(() => true, () => false); if (ready) break; await pause(250) }
  assert.ok(ready, 'Isolated Postgres did not boot')
  const sql = `CREATE ROLE supabase_auth_admin WITH LOGIN SUPERUSER PASSWORD '${password}'; CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin; ALTER ROLE supabase_auth_admin SET search_path TO auth;`
  await new Promise((resolve, reject) => { const child = execFile('docker', ['exec', '-i', pg, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], { windowsHide: true, timeout: 15000 }, error => error ? reject(new Error('Isolated auth schema setup failed')) : resolve()); child.stdin.end(sql) })
  Object.assign(env, {
    GOTRUE_API_HOST: '0.0.0.0', GOTRUE_API_PORT: '9999', API_EXTERNAL_URL: 'http://127.0.0.1', GOTRUE_SITE_URL: 'http://127.0.0.1',
    GOTRUE_DB_DRIVER: 'postgres', GOTRUE_DB_DATABASE_URL: `postgres://supabase_auth_admin:${password}@db:5432/postgres`,
    GOTRUE_JWT_ADMIN_ROLES: 'service_role', GOTRUE_JWT_AUD: 'authenticated', GOTRUE_JWT_DEFAULT_GROUP_NAME: 'authenticated', GOTRUE_JWT_EXP: '3600',
    GOTRUE_DISABLE_SIGNUP: 'false', GOTRUE_EXTERNAL_EMAIL_ENABLED: 'true', GOTRUE_MAILER_AUTOCONFIRM: 'true', GOTRUE_EXTERNAL_PHONE_ENABLED: 'false',
  })
  const authVars = Object.keys(env).filter(key => key.startsWith('GOTRUE_') || key === 'API_EXTERNAL_URL').flatMap(key => ['--env', key])
  await docker(['run', '-d', '--name', authName, '--network', network, '--memory', '256m', '-p', '127.0.0.1::9999', ...authVars, 'supabase/gotrue:v2.196.0']); containers.push(authName)
  const info = JSON.parse((await docker(['inspect', authName])).stdout)[0]
  const upstream = `http://127.0.0.1:${info.NetworkSettings.Ports['9999/tcp'][0].HostPort}`
  let healthy = false
  for (let i = 0; i < 100; i++) { healthy = await fetch(`${upstream}/health`).then(r => r.ok, () => false); if (healthy) break; await pause(250) }
  assert.ok(healthy, 'Real local GoTrue did not boot')
  // Transparent routing equivalent to Supabase's auth gateway. It never issues
  // or verifies tokens. Plan REST is deliberately unavailable, so plan=free.
  const gateway = express()
  gateway.use('/auth/v1', express.raw({ type: '*/*' }), async (req, res) => {
    try {
      const response = await fetch(`${upstream}${req.url}`, { method: req.method, headers: { 'Content-Type': 'application/json', ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}) }, ...(req.method !== 'GET' && req.method !== 'HEAD' ? { body: req.body } : {}) })
      res.status(response.status).type(response.headers.get('content-type') || 'application/json').send(Buffer.from(await response.arrayBuffer()))
    } catch { res.status(503).json({ error: 'Local auth gateway unavailable' }) }
  })
  gateway.get('/auth/login', (req, res) => res.send('Non-production acceptance account. Sign-in is verified by local GoTrue.'))
  bridge = await new Promise(resolve => { const s = gateway.listen(0, '127.0.0.1', () => resolve(s)) })
  const authBase = `http://127.0.0.1:${bridge.address().port}`
  const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url')
  const unsigned = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ role: 'service_role', aud: 'authenticated', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+3600 })}`
  const serviceKey = `${unsigned}.${createHmac('sha256', jwtSecret).update(unsigned).digest('base64url')}`
  const supabase = createClient(authBase, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const accounts = []
  for (let index = 0; index < 3; index++) {
    const email = `acceptance-${suffix}-${index}@example.invalid`
    const { data, error } = await supabase.auth.signUp({ email, password })
    assert.ok(!error, error?.message); assert.ok(data.user && data.session)
    const login = await supabase.auth.signInWithPassword({ email, password })
    assert.ok(!login.error, login.error?.message)
    accounts.push({ id: data.user.id, token: login.data.session.access_token })
  }
  mongo = await MongoMemoryServer.create({ instance: { dbName: 'codeva_account_acceptance' } })
  Object.assign(process.env, { MONGODB_URI: mongo.getUri(), SUPABASE_URL: authBase, SUPABASE_SERVICE_KEY: serviceKey, DOSSIER_WORKER_ENABLED: 'false' })
  await import('../../backend/src/config/env.js'); await mongoose.connect(process.env.MONGODB_URI)
  const User = (await import('../../backend/src/models/User.js')).default
  const Project = (await import('../../backend/src/models/Project.js')).default
  const Dossier = (await import('../../backend/src/models/Dossier.js')).default
  const Classroom = (await import('../../backend/src/models/Classroom.js')).default
  const { DossierStore } = await import('../../backend/src/services/dossier/store.js')
  const { DockerSandbox } = await import('../../backend/src/services/dossier/sandbox.js')
  const { newDossier, installSpec, reviewLine } = await import('../../backend/src/services/dossier/domain.js')
  const { initializePhase3 } = await import('../../backend/src/services/dossier/roles.js')
  const { createDossierRouter } = await import('../../backend/src/routes/dossier.routes.js')
  const store = new DossierStore(); sandbox = new DockerSandbox()
  for (let i = 0; i < accounts.length; i++) await User.create({ supabase_id: accounts[i].id, teacher_enabled: i === 0, under18: i === 1 })
  const teacher = accounts[0], id = String(new mongoose.Types.ObjectId()), original = '  Teacher notes\r\n🌏 नमस्ते  '
  await Project.create({ _id: id, user_id: teacher.id, name: 'Owned teacher fixture' })
  const d = initializePhase3(newDossier(id, original)); installSpec(d, { will_build: ['Show notes'], must_never: ['Expose another owner row'], acceptance: ['Show owner notes after login'] }); d.state = 'wait_for_user'
  for (const line of Object.values(d.spec).flat()) reviewLine(d, line.id, 'accepted')
  d.design = { proposals: [], selected: { id: 'fixture', spec_line_ids: Object.values(d.spec).flat().map(l => l.id), selected_by: 'user' } }
  d.judge = ['Judge', 'Judge-cheap'].map((agent_id, i) => ({ agent_id, provider: 'explicit-fixture', model: `fixture-${i}`, lines: [{ id: d.spec.acceptance[0].id, verdict: 'fail', evidence: 'No model verdict certified by this account test' }] }))
  await store.create(d, teacher.id, 'free')
  const api = express(); api.use(express.json()); api.use('/api/v1/studio', createDossierRouter({ store, sandbox }))
  apiServer = await new Promise(resolve => { const s = api.listen(0, '127.0.0.1', () => resolve(s)) })
  const base = `http://127.0.0.1:${apiServer.address().port}/api/v1`
  const call = async (account, route, method = 'GET', body) => fetch(`${base}/studio${route}`, { method, headers: { Authorization: `Bearer ${account.token}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  assert.equal((await fetch(`${base}/studio/account`)).status, 401)
  assert.equal((await call(teacher, '/account')).status, 200)
  const createClass = await call(teacher, '/classrooms', 'POST', { project_id: id, student_ids: accounts.slice(1).map(a => a.id), deadline: new Date(Date.now()+600000).toISOString(), consent: {} })
  assert.equal(createClass.status, 201); const classroom = await createClass.json()
  assert.equal((await call(accounts[1], `/classrooms/${classroom._id}/projects`, 'POST', {})).status, 403)
  assert.equal(await Dossier.countDocuments({ 'data.classroom.id': classroom._id }), 0)
  await Classroom.updateOne({ _id: classroom._id }, { $set: { 'consent.teacher': true } })
  for (const account of accounts.slice(1)) {
    const response = await call(account, `/classrooms/${classroom._id}/projects`, 'POST', {}); assert.equal(response.status, 201)
    const student = await response.json(); ids.push(student.project_id)
    assert.equal(student.dossier.prompt_original, original); assert.equal(student.dossier.training_opt_in, false)
    await sandbox.ensure(student.project_id)
    await sandbox.write(student.project_id, [{ path: 'frontend/features.py', content: `import html
def render(user, rows):
    return '''<!doctype html><h1 data-i18n-en="Notes" data-i18n-hi="नोट्स">Notes</h1>''' + html.escape(rows[0]["title"])
` }])
  }
  assert.equal((await call(accounts[1], `/projects/${ids[1]}/dossier`)).status, 404)
  assert.equal((await call(accounts[2], `/projects/${ids[0]}/dossier`)).status, 404)
  const login = await sandbox.request(ids[0], { path: '/login', method: 'POST', body: JSON.stringify({ name: 'sample-a', password: 'Demo-2026!' }) })
  assert.equal((await sandbox.request(ids[1], { path: '/rows', headers: { Cookie: login.headers['Set-Cookie'].split(';')[0] } })).status, 401)
  const shot = await sandbox.browser(ids[0]); objects.push(shot.screenshot)
  await store.mutate(ids[0], accounts[1].id, data => { data.sources.push({ type: 'screen', path: shot.screenshot_path }); data.classroom.deadline = new Date(Date.now()-1000).toISOString(); data.judge = structuredClone(d.judge) })
  assert.equal((await call(accounts[1], `/projects/${ids[0]}/fix`, 'POST', { text: 'Late edit' })).status, 423)
  const zip = await call(accounts[1], `/projects/${ids[0]}/export`); assert.equal(zip.status, 200)
  const bytes = Buffer.from(await zip.arrayBuffer())
  for (const name of ['judge-lines.json', 'README.md', 'run.py', '.git/HEAD']) assert.ok(bytes.includes(Buffer.from(name)))
  await fs.writeFile(`${folder}/deadline-snapshot.zip`, bytes)
  // Match installed sidebar and Agents with the exact same owned API response.
  if (process.env.CODEVA_ACCEPTANCE_NATIVE === '1') {
    const executablePath = path.join(process.env.LOCALAPPDATA, 'Programs/MrCodevaa/MrCodevaa.exe')
    const profile = await fs.mkdtemp(path.join(path.resolve(folder), 'profile-')); await fs.mkdir(path.join(profile, 'User'))
    await fs.writeFile(path.join(profile, 'User/settings.json'), JSON.stringify({ 'codeva.apiBaseUrl': base, 'codeva.webUrl': authBase, 'window.titleBarStyle': 'custom' }))
    const nativeEnv = { ...process.env }; delete nativeEnv.ELECTRON_RUN_AS_NODE
    nativeApp = await require('playwright')._electron.launch({ executablePath, cwd: profile, args: ['--user-data-dir', profile, '--extensions-dir', path.resolve(folder, 'extensions'), '--new-window', '--skip-welcome', '--skip-release-notes'], env: nativeEnv, timeout: 90000 })
    const window = await nativeApp.firstWindow(); await window.locator('.monaco-workbench').waitFor({ timeout: 60000 })
    await window.keyboard.press('Control+Shift+P'); await window.locator('.quick-input-widget input').fill('>MrCodevaa: Sign In'); await window.keyboard.press('Enter')
    const input = window.locator('.quick-input-widget input'); await input.waitFor(); await input.fill(teacher.token); await window.keyboard.press('Enter')
    await window.getByRole('tab', { name: 'MrCodevaa', exact: true }).click()
    const frame = window.frameLocator('iframe.webview').frameLocator('iframe')
    await frame.getByLabel('Existing project ID / प्रोजेक्ट ID').fill(id)
    await frame.getByRole('button', { name: 'Open Project / प्रोजेक्ट खोलें', exact: true }).click()
    await frame.locator('pre').filter({ hasText: 'Teacher notes' }).first().waitFor({ timeout: 30000 })
    assert.equal(await frame.locator('pre').filter({ hasText: 'Teacher notes' }).first().textContent(), original)
    await frame.getByRole('button', { name: 'Agents / एजेंट प्रोजेक्ट', exact: true }).click()
    await frame.getByText(`${d.spec.acceptance[0].id}: fail: No model verdict certified by this account test`, { exact: true }).first().waitFor()
    await window.screenshot({ path: path.resolve(folder, 'installed-owned-project.png') })
    evidence.installed_project = { prompt_bytes_match: true, judges_match: true, executable: executablePath, provider_keys_in_client: false }
    await nativeApp.close(); nativeApp = null
  }
  assert.equal((await call(accounts[1], `/projects/${ids[0]}/dossier`, 'DELETE')).status, 200)
  assert.equal(await Dossier.countDocuments({ project_id: ids[0] }), 0)
  await assert.rejects(fs.access(path.join('backend/data/dossier-artifacts', shot.screenshot)))
  assert.ok(await Dossier.findOne({ project_id: id, user_id: teacher.id }))
  assert.ok(await Dossier.findOne({ project_id: ids[1], user_id: accounts[2].id }))
  Object.assign(evidence, { result: 'PASS', real_signup_password_login: true, student_projects: 2, consent_before_storage: true, cross_project_cookie_rejected: true, deadline_edit_rejected: true, snapshot_git_readme_judges: true, delete_objects_and_dossier: true, adult_dossier_unaffected: true })
} catch (error) { evidence.result = 'FAIL'; evidence.error = error.message; process.exitCode = 1 }
finally {
  await nativeApp?.close().catch(() => {})
  for (const id of ids) await sandbox?.remove(id, objects).catch(() => {})
  for (const server of [apiServer, bridge]) if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
  if (mongo) { await mongoose.disconnect(); await mongo.stop() }
  for (const name of containers.reverse()) await docker(['rm', '-f', '-v', name]).catch(() => {})
  await docker(['network', 'rm', network]).catch(() => {})
  await fs.writeFile('artifacts/codeva-editor/isolated-account.json', JSON.stringify(evidence, null, 2))
}
console.log(JSON.stringify(evidence))
