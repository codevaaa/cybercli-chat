import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import { writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { localTab } from '../services/dossier/tab.js'
import { newDossier, reviewLine, transition, digest } from '../services/dossier/domain.js'
import { DossierEngine } from '../services/dossier/engine.js'
import { MemoryStore, FakeSandbox, fakeModels } from '../services/dossier/testFixtures.js'
import { initializePhase3 } from '../services/dossier/roles.js'

const auth = (req, res, next) => {
  const userId = req.headers.authorization?.replace(/^Bearer /, '')
  if (!['owner', 'other'].includes(userId)) return res.status(401).json({ error: 'Unauthorized' })
  req.user = { id: userId, plan: 'pro' }; next()
}
mock.module('../middleware/auth.js', { namedExports: { requireAuth: auth, isUserBanned: async () => false } })
const { createDossierRouter } = await import('./dossier.routes.js')
const { StudioClient } = await import('../../../editors/studio-client/client.cjs')
const { pdfFixture } = await import('../services/dossier/testPdfFixture.js')

function setup({ tab, UserModel = { async findOne() { return { under18: false } } }, ClassroomModel } = {}) {
  const store = new MemoryStore(), sandbox = new FakeSandbox(), projects = new Map()
  const ProjectModel = {
    async create(value) { const result = { ...value, _id: String(value._id) }; projects.set(result._id, result); return result },
    async findOne(query) { const doc = projects.get(String(query._id)); return doc?.user_id === query.user_id ? doc : null },
    async deleteOne(query) { projects.delete(String(query._id)) },
  }
  const DossierModel = {
    async updateOne(query, update) { const doc = store.docs.get(String(query.project_id || query._id)); if (doc) Object.assign(doc, update.$set) },
    findOneAndUpdate(query, update) {
      let doc = [...store.docs.values()].find(doc => (!query.project_id || doc.project_id === query.project_id) && (!query._id || doc._id === query._id) && (query.revision === undefined || doc.revision === query.revision) && (!query.lease_until || doc.lease_until <= query.lease_until.$lte) && (!query.preview_launch_hash || doc.preview_launch_hash === query.preview_launch_hash) && (!query.preview_launch_expires || doc.preview_launch_expires > query.preview_launch_expires.$gt))
      if (doc) { Object.assign(doc, update.$set); for (const key of Object.keys(update.$unset || {})) delete doc[key] }
      return { then(resolve) { return Promise.resolve(resolve(doc ? structuredClone(doc) : null)) }, lean: async () => doc ? structuredClone(doc) : null }
    },
    findOne(query) { const doc = [...store.docs.values()].find(d => query['data.classroom.id'] ? d.user_id === query.user_id && d.data.classroom?.id === query['data.classroom.id'] : d.project_id === query.project_id && d.preview_session_hash === query.preview_session_hash && d.preview_session_expires > query.preview_session_expires.$gt); return { lean: async () => doc || null } },
    async deleteOne(query) { const doc = [...store.docs.values()].find(d => d._id === query._id && d.user_id === query.user_id && d.lease_owner === query.lease_owner); if (doc) store.docs.delete(String(doc.project_id)) },
  }
  const engine = new DossierEngine({ store, sandbox, models: fakeModels() })
  const app = express(); app.use(express.json()); app.use(express.urlencoded({ extended: false })); app.use(cookieParser())
  app.use('/api/v1/studio', createDossierRouter({ store, sandbox, engine, auth, ProjectModel, DossierModel, UserModel, ClassroomModel, tab, durable() {} }))
  return { app, store, sandbox, engine, projects }
}
const captured = []
async function capture(f, label, method, path, body, status = 200) {
  const response = await request(f.app)[method](path).set('Authorization', 'owner').send(body).expect(status)
  captured.push({ label, method: method.toUpperCase(), path, request: body, status, response: response.body })
  return response
}
test('HTTP ownership, review, run, listener, fix, judge and preview routes expose real contracts', async () => {
  const f = setup(), prefix = '/api/v1/studio'
  await request(f.app).post(`${prefix}/projects`).send({ name: 'Notes', prompt: 'Build notes' }).expect(401)
  await request(f.app).post(`${prefix}/projects`).set('Authorization', 'owner').send({ name: 'Notes', prompt: 'key sk-' + 'x'.repeat(40) }).expect(422)
  assert.equal(f.store.docs.size, 0)
  const existingId = '507f1f77bcf86cd799439012'
  f.projects.set(existingId, { _id: existingId, user_id: 'owner', name: 'Existing project' })
  await capture(f, 'attach existing project', 'post', `${prefix}/projects/${existingId}/dossier`, { prompt: 'Use this existing project for a notes app', pack: 'cs' }, 201)
  const created = await capture(f, 'create project', 'post', `${prefix}/projects`, { name: 'Notes', prompt: '  Build a notes app\r\n🌏  ', pack: 'general' }, 201)
  const id = created.body.project_id, base = `${prefix}/projects/${id}`
  await request(f.app).get(`${base}/dossier`).set('Authorization', 'other').expect(404)
  await request(f.app).get(`${prefix}/preview/${id}/`).expect(401)
  await capture(f, 'read dossier', 'get', `${base}/dossier`, undefined)
  await f.engine.step(await f.store.get(id, 'owner')); await f.engine.step(await f.store.get(id, 'owner'))
  await request(f.app).post(`${base}/run`).set('Authorization', 'owner').send({}).expect(409)
  let doc = await f.store.get(id, 'owner')
  for (const line of Object.values(doc.data.spec).flat()) await capture(f, 'accept spec line', 'patch', `${base}/spec/${line.id}`, { status: 'accepted' })
  await capture(f, 'select design', 'post', `${base}/design`, { id: '1' })
  await capture(f, 'edit spec line', 'patch', `${base}/spec/${doc.data.spec.acceptance[0].id}`, { status: 'edited', text: 'Show owner notes after a successful login' })
  await capture(f, 'start or resume', 'post', `${base}/run`, {}, 202)
  await capture(f, 'listener question', 'post', `${base}/listener`, { question: 'What is running?' })
  for (let i = 0; i < 20; i++) {
    doc = await f.store.get(id, 'owner'); if (doc.data.state === 'live') break;
    const review = doc.data.editor_reviews?.find(r => r.status === 'pending')
    if (review) await capture(f, 'accept agent diff', 'post', `${base}/reviews/${review.id}`, { decision: 'accept' })
    else await f.engine.step(doc)
  }
  await capture(f, 'judge lines', 'get', `${base}/judges`, undefined)
  await request(f.app).post(`${base}/complete`).set('Authorization', 'owner').send({}).expect(409)
  await request(f.app).post(`${base}/click`).set('Authorization', 'owner').send({ path: 'https://external.invalid', selector: 'button' }).expect(400)
  await capture(f, 'store click', 'post', `${base}/click`, { path: '/', selector: 'button' })
  await capture(f, 'store button click', 'post', `${base}/click`, { path: '/', button_label: 'View notes' })
  await request(f.app).post(`${base}/click`).set('Authorization', 'owner').send({ path: '/' }).expect(400)
  const preview = await capture(f, 'preview URL', 'post', `${base}/preview`, {})
  const sessionPath = `${prefix}/preview/${id}/session`
  await request(f.app).post(sessionPath).send({ token: 'x'.repeat(64) }).expect(401)
  const login = await request(f.app).post(sessionPath).send({ token: preview.body.launch_token }).expect(303)
  assert.match(login.headers['set-cookie'][0], /HttpOnly/)
  await request(f.app).post(sessionPath).send({ token: preview.body.launch_token }).expect(401)
  const cookie = login.headers['set-cookie'][0].split(';')[0]
  f.sandbox.request = async (_id, value) => ({ status: 200, headers: { 'Content-Type': 'text/html', 'Set-Cookie': 'app_session=fixture; HttpOnly; Path=/' }, body_base64: Buffer.from('<h1>Owned preview</h1>').toString('base64') })
  const page = await request(f.app).get(`${prefix}/preview/${id}/`).set('Cookie', cookie).expect(200)
  assert.match(page.headers['content-security-policy'], /connect-src 'self'/)
  assert.match(page.headers['set-cookie'][0], new RegExp(`Path=${prefix}/preview/${id}/`))
  assert.match(page.text, /Owned preview/)
  f.store.docs.get(id).preview_session_expires = new Date(0)
  await request(f.app).get(`${prefix}/preview/${id}/`).set('Cookie', cookie).expect(401)
  f.store.docs.get(id).preview_session_expires = new Date(Date.now() + 300000)
  await capture(f, 'complete', 'post', `${base}/complete`, {})
  await capture(f, 'fix line', 'post', `${base}/fix`, { text: 'Button must open notes' }, 202)
  await request(f.app).get(`${prefix}/preview/${id}/`).set('Cookie', cookie).expect(401)
  assert.equal((await f.store.get(id, 'owner')).data.state, 'wait_for_user')
  await capture(f, 'rollback', 'post', `${base}/rollback`, {})
  assert.equal((await f.store.get(id, 'owner')).data.state, 'live')
  assert.equal((await f.store.get(id, 'owner')).data.spec.acceptance.at(-1).status, 'rejected')
  assert.equal((await f.store.get(id, 'owner')).data.prompts_added.at(-1).type, 'fix')
  await request(f.app).get(`${base}/artifacts/00000000-0000-0000-0000-000000000001.png`).set('Authorization', 'other').expect(404)
  await request(f.app).get(`${base}/artifacts/00000000-0000-0000-0000-000000000001.png`).set('Authorization', 'owner').expect(200)
  await request(f.app).get(`${base}/artifacts/not-owned.png`).set('Authorization', 'owner').expect(404)
  if (process.env.DOSSIER_CAPTURE_CONTRACTS === 'true') await writeFile(new URL('../../../docs/dossier-api-fixtures.json', import.meta.url), JSON.stringify(captured, null, 2))
})
test('SSE authenticates before opening and resumes append-only events without stopping the worker', async () => {
  const f = setup(), created = await request(f.app).post('/api/v1/studio/projects').set('Authorization', 'owner').send({ name: 'Notes', prompt: 'Build notes' })
  const id = created.body.project_id
  await request(f.app).get(`/api/v1/studio/projects/${id}/progress`).expect(401)
  const server = f.app.listen(0)
  try {
    const controller = new AbortController(), response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/studio/projects/${id}/progress?after=0`, { headers: { Authorization: 'owner' }, signal: controller.signal })
    assert.equal(response.status, 200)
    const reader = response.body.getReader(), { value } = await reader.read()
    const frame = new TextDecoder().decode(value)
    assert.match(frame, /prompt_saved/)
    if (process.env.DOSSIER_CAPTURE_CONTRACTS === 'true') await writeFile(new URL('../../../docs/dossier-progress-fixture.txt', import.meta.url), frame)
    controller.abort(); await reader.cancel().catch(() => {})
    assert.equal((await f.store.get(id, 'owner')).data.state, 'listen')
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
})

test('web-created dossier is the same byte-stable project in the actual IDE API client; materials, meter and replay share owned routes', async () => {
  const f = setup(), original = '  Commerce inventory\r\nनमस्ते 🌏  '
  const created = await request(f.app).post('/api/v1/studio/projects').set('Authorization', 'owner').send({ name: 'Commerce', prompt: original, pack: 'commerce' }).expect(201)
  const id = created.body.project_id, base = `/api/v1/studio/projects/${id}`
  const server = f.app.listen(0)
  try {
    const client = new StudioClient({ baseUrl: `http://127.0.0.1:${server.address().port}/api/v1`, getToken: async () => 'owner' })
    assert.equal((await client.request(`/studio/projects/${id}/dossier`)).dossier.prompt_original, original)
    await f.engine.step(await f.store.get(id, 'owner')); await f.engine.step(await f.store.get(id, 'owner'))
    let doc = await client.request(`/studio/projects/${id}/dossier`)
    for (const line of Object.values(doc.dossier.spec).flat()) await client.request(`/studio/projects/${id}/spec/${line.id}`, 'PATCH', { status: 'accepted' })
    await client.request(`/studio/projects/${id}/design`, 'POST', { id: '1' })
    await client.request(`/studio/projects/${id}/run`, 'POST', {})
    for (let i = 0; i < 20; i++) {
      const value = await f.store.get(id, 'owner'); if (value.data.state === 'live') break;
      const review = value.data.editor_reviews?.find(r => r.status === 'pending')
      if (review) await client.request(`/studio/projects/${id}/reviews/${review.id}`, 'POST', { decision: 'accept' })
      else await f.engine.step(value)
    }
    const judges = await client.request(`/studio/projects/${id}/judges`)
    assert.equal(judges.judge.length, 2)
    await client.request(`/studio/projects/${id}/click`, 'POST', { path: '/', button_label: 'View notes' })
    assert.equal((await client.request(`/studio/projects/${id}/complete`, 'POST', {})).dossier.state, 'done')
    doc = await client.request(`/studio/projects/${id}/dossier`)
    assert.equal(doc.dossier.prompt_original, original)
    assert.deepEqual(doc.dossier, (await request(f.app).get(`${base}/dossier`).set('Authorization', 'owner')).body.dossier)
    await capture(f, 'upload notes', 'post', `${base}/materials`, { name: 'Commerce notes', kind: 'notes', text: 'Stock inventory records goods available for sale.' }, 201)
    const answer = await capture(f, 'material cited question', 'post', `${base}/material-question`, { question: 'stock inventory' })
    assert.equal(answer.body.citations[0].kind, 'notes')
    await capture(f, 'upload PDF', 'post', `${base}/materials`, { name: 'Commerce.pdf', kind: 'pdf', data_base64: pdfFixture() }, 201)
    const citedPdf = await capture(f, 'PDF cited question', 'post', `${base}/material-question`, { question: 'stock inventory' })
    assert.ok(citedPdf.body.citations.some(c => c.kind === 'pdf' && c.page === 2))
    const missing = await capture(f, 'material absent question', 'post', `${base}/material-question`, { question: 'quantum zebras' })
    assert.equal(missing.body.answer, 'The material does not contain it.')
    assert.deepEqual(await client.request(`/studio/projects/${id}/material-question`, 'POST', { question: 'quantum zebras' }), missing.body)
    const callCount = f.engine.models.inputs.length
    const replay = await capture(f, 'replay stored tools', 'get', `${base}/replay`, undefined)
    assert.equal(replay.body.status, 'complete'); assert.ok(replay.body.steps.length >= 5)
    assert.equal(f.engine.models.inputs.length, callCount)
    const meter = await capture(f, 'project model meter', 'get', `${base}/meter`, undefined)
    assert.deepEqual(meter.body, (await client.request(`/studio/projects/${id}/dossier`)).meter)
    await request(f.app).get(`${base}/replay`).set('Authorization', 'other').expect(404)
    await request(f.app).post(`${base}/materials`).set('Authorization', 'other').send({ name: 'A', kind: 'notes', text: 'Private' }).expect(404)
    await request(f.app).post(`${base}/materials`).set('Authorization', 'owner').send({ kind: 'notes', name: 'Bad', text: 'gsk_' + 'x'.repeat(28) }).expect(422)
    await request(f.app).post('/api/v1/studio/tab').send({ prefix: 'x' }).expect(401)
    if (process.env.DOSSIER_CAPTURE_CONTRACTS === 'true') await writeFile(new URL('../../../docs/dossier-api-fixtures.json', import.meta.url), JSON.stringify(captured, null, 2))
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
})

test('authenticated tab route reaches only a real loopback inference fixture, never the free chat route', async () => {
  const paths = []
  const model = createServer((req, res) => { paths.push(req.url); req.resume(); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ response: '1;' })) })
  await new Promise(resolve => model.listen(0, '127.0.0.1', resolve))
  try {
    const f = setup({ tab: body => localTab(body, { origin: `http://127.0.0.1:${model.address().port}/api/generate` }) })
    const response = await capture(f, 'local tab completion', 'post', '/api/v1/studio/tab', { prefix: 'const next = ', suffix: '\n' })
    assert.equal(response.body.completion, '1;'); assert.equal(response.body.budget_ms, 100)
    assert.deepEqual(paths, ['/api/generate'])
    assert.equal(f.engine.models.inputs.length, 0)
    if (process.env.DOSSIER_CAPTURE_CONTRACTS === 'true') await writeFile(new URL('../../../docs/dossier-api-fixtures.json', import.meta.url), JSON.stringify(captured, null, 2))
  } finally { model.closeAllConnections(); await new Promise(resolve => model.close(resolve)) }
})

test('inline selection, reject and accept all round-trip through the owned API without a hidden local write', async () => {
  const f = setup(), id = '507f1f77bcf86cd799439013', base = `/api/v1/studio/projects/${id}`
  f.projects.set(id, { _id: id, user_id: 'owner' })
  const data = newDossier(id, 'Keep the existing notes app')
  data.state = 'live'; data.spec.will_build = [{ id: 'goal', text: 'Notes', final_text: 'Notes', status: 'accepted' }]; data.spec.acceptance = [{ id: 'check', text: 'Show notes', final_text: 'Show notes', status: 'accepted' }]
  data.judge = [{ agent_id: 'Judge', provider: 'fixture', model: 'a', lines: [] }, { agent_id: 'Judge-cheap', provider: 'fixture', model: 'b', lines: [] }]
  data.last_green = { generation: 0, snapshot: {}, judge: data.judge, tasks: [], spec: data.spec }
  await f.store.create(data, 'owner'); f.sandbox.files = [{ path: 'features.py', content: 'Heading' }]
  const body = { path: 'features.py', before_sha256: digest('Heading'), selection: { start: 0, end: 7 }, instruction: 'Improve the heading' }
  await request(f.app).post(`${base}/inline`).set('Authorization', 'other').send(body).expect(404)
  let response = await request(f.app).post(`${base}/inline`).set('Authorization', 'owner').send(body).expect(201)
  let review = response.body.dossier.editor_reviews.at(-1)
  assert.equal(f.sandbox.files[0].content, 'Heading')
  response = await request(f.app).post(`${base}/reviews/${review.id}`).set('Authorization', 'owner').send({ decision: 'reject' }).expect(200)
  assert.equal(response.body.dossier.editor_reviews.at(-1).status, 'rejected'); assert.equal(f.sandbox.files[0].content, 'Heading')
  assert.equal(response.body.dossier.last_green.generation, 0)
  response = await request(f.app).post(`${base}/inline`).set('Authorization', 'owner').send(body).expect(201)
  review = response.body.dossier.editor_reviews.at(-1)
  response = await request(f.app).post(`${base}/reviews/${review.id}`).set('Authorization', 'owner').send({ decision: 'accept' }).expect(200)
  assert.equal(response.body.dossier.editor_reviews.at(-1).status, 'accepted'); assert.equal(f.sandbox.files[0].content, 'Edited notes'); assert.equal(response.body.dossier.state, 'test')
})

test('teacher authorization, consent before storage, locked assignments, deadline export and owned deletion use existing routes', async () => {
  // External auth/Mongo are doubles here; actual Docker isolation has its own integration run.
  const users = new Map([['owner', { supabase_id: 'owner', teacher_enabled: true }], ['other', { supabase_id: 'other', under18: true }]])
  const classrooms = new Map(), classId = '507f1f77bcf86cd799439099'
  const f = setup({
    UserModel: { async findOne(q) { return users.get(q.supabase_id) }, async countDocuments(q) { return q.supabase_id.$in.filter(id => users.has(id)).length } },
    ClassroomModel: {
      async create(c) { const result = { ...c, _id: classId }; classrooms.set(classId, result); return result },
      async findById(id) { return classrooms.get(id) },
      find(q) { const values = [...classrooms.values()].filter(c => c.teacher_id === q.$or[0].teacher_id || c.student_ids.includes(q.$or[1].student_ids)); return { sort() { return this }, limit() { return this }, lean: async () => values } },
    },
  })
  const prefix = '/api/v1/studio', id = '507f1f77bcf86cd799439055'
  f.projects.set(id, { _id: id, user_id: 'owner' })
  await f.store.create(initializePhase3(newDossier(id, '  Locked teacher prompt\r\n🌏  ')), 'owner')
  await f.engine.step(await f.store.get(id, 'owner')); await f.engine.step(await f.store.get(id, 'owner'))
  await f.store.mutate(id, 'owner', d => { for (const line of Object.values(d.spec).flat()) reviewLine(d, line.id, 'accepted'); d.design.selected = { id: '1', spec_line_ids: [d.spec.will_build[0].id] } })
  await request(f.app).post(`${prefix}/classrooms`).set('Authorization', 'other').send({ project_id: id }).expect(403)
  await request(f.app).post(`${prefix}/projects`).set('Authorization', 'other').send({ name: 'Without consent', prompt: 'Notes' }).expect(403)
  const created = await request(f.app).post(`${prefix}/classrooms`).set('Authorization', 'owner').send({ project_id: id, student_ids: ['owner', 'other'], deadline: new Date(Date.now() + 60000).toISOString(), consent: {} }).expect(201)
  const count = f.store.docs.size
  await request(f.app).post(`${prefix}/classrooms/${classId}/projects`).set('Authorization', 'other').send({}).expect(403)
  assert.equal(f.store.docs.size, count); assert.equal(f.projects.size, count)
  classrooms.get(classId).consent.teacher = true
  const a = await request(f.app).post(`${prefix}/classrooms/${classId}/projects`).set('Authorization', 'owner').send({ student_id: 'owner' }).expect(201)
  const b = await request(f.app).post(`${prefix}/classrooms/${classId}/projects`).set('Authorization', 'owner').send({ student_id: 'other' }).expect(201)
  assert.notEqual(a.body.project_id, b.body.project_id); assert.equal(a.body.dossier.prompt_original, created.body.prompt_original)
  assert.equal(b.body.dossier.training_opt_in, false)
  await request(f.app).get(`${prefix}/projects/${b.body.project_id}/dossier`).set('Authorization', 'owner').expect(404)
  await request(f.app).get(`${prefix}/projects/${a.body.project_id}/dossier`).set('Authorization', 'other').expect(404)
  const studentClasses = await request(f.app).get(`${prefix}/classrooms`).set('Authorization', 'other').expect(200)
  assert.equal(studentClasses.body.classrooms[0].student_ids, undefined)
  const base = `${prefix}/projects/${b.body.project_id}`, specId = b.body.dossier.spec.will_build[0].id
  const locked = await request(f.app).patch(`${base}/spec/${specId}`).set('Authorization', 'other').send({ status: 'edited', text: 'Other prompt' }).expect(423)
  assert.match(locked.body.error, /locked/)
  await f.store.mutate(b.body.project_id, 'other', d => { d.classroom.deadline = new Date(Date.now() - 1000).toISOString(); d.judge = [{ agent_id: 'Judge', lines: [{ id: specId, verdict: 'fail', evidence: 'Stored deadline fixture line' }] }] })
  await request(f.app).post(`${base}/fix`).set('Authorization', 'other').send({ text: 'Late change' }).expect(423)
  await request(f.app).post(`${base}/run`).set('Authorization', 'other').send({}).expect(423)
  f.sandbox.files = [{ path: 'frontend/features.py', content: 'def render(user, rows): return "Deadline fixture"' }]
  const zip = await request(f.app).get(`${base}/export`).set('Authorization', 'other').buffer(true).parse((res, done) => { const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => done(null, Buffer.concat(chunks))) }).expect(200).expect('Content-Type', /application\/zip/)
  for (const file of ['README.md', 'run.py', 'judge-lines.json', '.git/HEAD']) assert.ok(zip.body.includes(Buffer.from(file)))
  assert.ok((await f.store.get(b.body.project_id, 'other')).data.deadline_snapshot)
  const removals = []; f.sandbox.remove = async (project, objects) => removals.push({ project, objects })
  await request(f.app).delete(`${base}/dossier`).set('Authorization', 'owner').expect(404)
  await request(f.app).delete(`${base}/dossier`).set('Authorization', 'other').expect(200)
  await assert.rejects(f.store.get(b.body.project_id, 'other'), /not found/)
  assert.equal(removals.length, 1); assert.equal(removals[0].project, b.body.project_id)
  assert.equal((await f.store.get(id, 'owner')).data.prompt_original, '  Locked teacher prompt\r\n🌏  ')
  assert.equal((await f.store.get(a.body.project_id, 'owner')).data.training_opt_in, false)
})
