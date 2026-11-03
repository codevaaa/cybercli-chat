import { Router } from 'express'
import mongoose from 'mongoose'
import { randomBytes, randomUUID } from 'node:crypto'
import Project from '../models/Project.js'
import Dossier from '../models/Dossier.js'
import User from '../models/User.js'
import Classroom from '../models/Classroom.js'
import { requireAuth, isUserBanned } from '../middleware/auth.js'
import { dossierStore, assertDurableStore } from '../services/dossier/store.js'
import { DossierEngine } from '../services/dossier/engine.js'
import { DossierModels } from '../services/dossier/models.js'
import { DockerSandbox, previewPath, PREVIEW_CSP, validateClick } from '../services/dossier/sandbox.js'
import { activeLines, assertNoSecrets, block, digest, event, fault, lintSpec, newDossier, reviewLine, transition, validateVerdicts } from '../services/dossier/domain.js'
import { extractMaterial, materialAnswer } from '../services/dossier/materials.js'
import { projectMeter } from '../services/usage/projectMeter.js'
import { replayEvents } from '../services/dossier/tools.js'
import { localTab } from '../services/dossier/tab.js'
import { assertEditable, initializePhase3, selectDesign, scribeReport } from '../services/dossier/roles.js'
import { proposeInline, decideReview } from '../services/dossier/editorReview.js'
import { studentDossier, validateClassroom } from '../services/dossier/classroom.js'
import { snapshotZip } from '../services/dossier/export.js'

export function publicDossier(doc) {
  const d = structuredClone(doc.data)
  if (d.last_green) d.last_green = { generation: d.last_green.generation, time: d.last_green.time }
  if (d.deadline_snapshot) d.deadline_snapshot = { frozen: true, deadline: d.classroom?.deadline }
  return { project_id: String(doc.project_id), revision: doc.revision, dossier: d, lint: lintSpec(d.spec), meter: projectMeter(d.events) }
}
export function createDossierRouter({ store = dossierStore, sandbox = new DockerSandbox(), engine, auth = requireAuth, ProjectModel = Project, DossierModel = Dossier, UserModel = User, ClassroomModel = Classroom, durable = assertDurableStore, banned = isUserBanned, tab = localTab } = {}) {
  engine ||= new DossierEngine({ store, sandbox, models: new DossierModels() })
  const router = Router()
  const wrap = handler => (req, res, next) => Promise.resolve(handler(req, res)).catch(error => res.status(error.status || (error.code === 11000 ? 409 : 500)).json({ error: error.status ? error.message : 'Dossier operation failed' }))
  const owned = async req => {
    durable()
    if (!mongoose.isValidObjectId(req.params.id)) throw fault('Project not found', 404)
    if (!await ProjectModel.findOne({ _id: req.params.id, user_id: req.user.id })) throw fault('Project not found', 404)
    return store.get(req.params.id, req.user.id)
  }
  const lockedEdit = async (req, run, { readonly = false } = {}) => {
    const doc = await owned(req); if (!readonly) assertEditable(doc.data)
    if (new Date(doc.lease_until).getTime() > Date.now()) throw fault('Wait for the worker safe point')
    const owner = randomUUID()
    const locked = await DossierModel.findOneAndUpdate({ _id: doc._id, revision: doc.revision, lease_until: { $lte: new Date() } }, { $set: { lease_owner: owner, lease_until: new Date(Date.now() + 60000) } }, { new: true })
    if (!locked) throw fault('Concurrent project operation; retry')
    const heartbeat = setInterval(() => { DossierModel.updateOne({ _id: doc._id, lease_owner: owner }, { $set: { lease_until: new Date(Date.now() + 60000) } }).catch(() => {}) }, 15000)
    try { return await run(new DossierEngine({ store, sandbox, models: engine.models, leaseOwner: owner }), doc) }
    finally { clearInterval(heartbeat); await DossierModel.updateOne({ _id: doc._id, lease_owner: owner }, { $set: { lease_owner: null, lease_until: new Date(0) } }) }
  }
  router.get('/account', auth, wrap(async (req, res) => {
    const account = await UserModel.findOne({ supabase_id: req.user.id })
    res.json({ teacher_enabled: account?.teacher_enabled === true, under18: account?.under18 === true, training_opt_in: false })
  }))
  router.get('/classrooms', auth, wrap(async (req, res) => {
    durable()
    const classrooms = await ClassroomModel.find({ $or: [{ teacher_id: req.user.id }, { student_ids: req.user.id }] }).sort({ createdAt: -1 }).limit(100).lean()
    res.json({ classrooms: classrooms.map(c => ({ id: String(c._id), teacher_id: c.teacher_id, deadline: c.deadline, prompt_original: c.prompt_original, locked_spec: c.locked_spec, consent: c.consent, ...(c.teacher_id === req.user.id ? { student_ids: c.student_ids } : {}) })) })
  }))
  router.get('/projects', auth, wrap(async (req, res) => {
    durable()
    const docs = await DossierModel.find({ user_id: req.user.id, 'data.deleting': { $ne: true } }).sort({ updatedAt: -1 }).limit(100).lean()
    res.json({ projects: docs.map(publicDossier) })
  }))
  router.post('/projects/:id/design', auth, wrap(async (req, res) => {
    await owned(req)
    res.json(publicDossier(await store.mutate(req.params.id, req.user.id, d => selectDesign(d, req.body.id))))
  }))
  router.get('/projects/:id/report', auth, wrap(async (req, res) => res.json(scribeReport((await owned(req)).data))))
  router.post('/classrooms', auth, wrap(async (req, res) => {
    durable()
    const teacher = await UserModel.findOne({ supabase_id: req.user.id })
    if (teacher?.teacher_enabled !== true) throw fault('An approved teacher account is required', 403)
    const doc = await store.get(req.body.project_id, req.user.id)
    const value = validateClassroom(doc, req.body)
    const students = await UserModel.countDocuments({ supabase_id: { $in: value.student_ids } })
    if (students !== value.student_ids.length) throw fault('Every student must use an existing Codeva account', 400)
    res.status(201).json(await ClassroomModel.create({ ...value, teacher_id: req.user.id }))
  }))
  router.post('/classrooms/:classroomId/projects', auth, wrap(async (req, res) => {
    durable()
    if (!mongoose.isValidObjectId(req.params.classroomId)) throw fault('Classroom not found', 404)
    const classroom = await ClassroomModel.findById(req.params.classroomId)
    const studentId = req.body.student_id || req.user.id
    if (!classroom || req.user.id !== classroom.teacher_id && req.user.id !== studentId) throw fault('Classroom not found', 404)
    const student = await UserModel.findOne({ supabase_id: studentId })
    if (!student) throw fault('Student account not found', 404)
    const existing = await DossierModel.findOne({ user_id: studentId, 'data.classroom.id': String(classroom._id) }).lean()
    if (existing) return res.json(publicDossier(existing))
    const id = new mongoose.Types.ObjectId(), data = studentDossier(id, classroom, student)
    await ProjectModel.create({ _id: id, name: 'Classroom project', user_id: studentId })
    try { res.status(201).json(publicDossier(await store.create(data, studentId, student.plan))) }
    catch (error) { await ProjectModel.deleteOne({ _id: id, user_id: studentId }); throw error }
  }))
  router.get('/projects/:id/export', auth, wrap(async (req, res) => {
    const zip = await lockedEdit(req, async (lockedEngine, doc) => {
      let frozen = doc.data.deadline_snapshot
      if (!frozen) {
        const snapshot = await sandbox.snapshot(req.params.id)
        frozen = { snapshot, spec: doc.data.spec, judge: doc.data.judge, prompt_original: doc.data.prompt_original }
        if (doc.data.classroom?.deadline && Date.parse(doc.data.classroom.deadline) <= Date.now()) await lockedEngine.mutate(doc, d => { d.deadline_snapshot = structuredClone(frozen); event(d, 'Scribe', { kind: 'deadline_snapshot' }) })
      }
      return snapshotZip({ ...doc.data, ...frozen }, frozen.snapshot)
    }, { readonly: true })
    res.set('Content-Disposition', `attachment; filename="codeva-${req.params.id}-snapshot.zip"`).type('application/zip').send(zip)
  }))
  router.delete('/projects/:id/dossier', auth, wrap(async (req, res) => {
    const doc = await owned(req)
    if (new Date(doc.lease_until).getTime() > Date.now()) throw fault('Wait for the worker safe point before deleting')
    const owner = randomUUID()
    if (!await DossierModel.findOneAndUpdate({ _id: doc._id, revision: doc.revision, lease_until: { $lte: new Date() } }, { $set: { lease_owner: owner, lease_until: new Date(Date.now() + 60000) } }, { new: true })) throw fault('Concurrent project operation; retry')
    try {
      await store.mutate(req.params.id, req.user.id, d => { d.deleting = true; block(d, 'Deleting owned generated project data', 'wait_for_user') }, owner)
      const names = doc.data.events.flatMap(e => [e.output?.screenshot, e.output?.screen?.screenshot]).concat(doc.data.tasks.flatMap(t => [t.screen?.screenshot, t.screen?.visual_diff?.screenshot]), doc.data.live.map(l => l.result?.screenshot), doc.data.sources.filter(s => s.type === 'screen').map(s => s.path?.split('/').at(-1)))
      await sandbox.remove(req.params.id, names)
      await DossierModel.deleteOne({ _id: doc._id, user_id: req.user.id, lease_owner: owner })
      res.json({ deleted: true, project_id: req.params.id })
    } finally { await DossierModel.updateOne({ _id: doc._id, lease_owner: owner }, { $set: { lease_owner: null, lease_until: new Date(0) } }) }
  }))
  router.post('/projects/:id/inline', auth, wrap(async (req, res) => {
    const result = await lockedEdit(req, (lockedEngine, doc) => proposeInline(lockedEngine, doc, sandbox, req.body))
    res.status(201).json(publicDossier(result))
  }))
  router.post('/projects/:id/reviews/:reviewId', auth, wrap(async (req, res) => {
    const result = await lockedEdit(req, (lockedEngine, doc) => decideReview(lockedEngine, doc, sandbox, req.params.reviewId, req.body.decision))
    res.json(publicDossier(result))
  }))
  router.post('/projects', auth, wrap(async (req, res) => {
    durable()
    const { name, prompt, pack = 'general' } = req.body
    if (typeof name !== 'string' || !name.trim() || name.length > 100) throw fault('Project name is required', 400)
    const id = new mongoose.Types.ObjectId()
    const account = await UserModel.findOne({ supabase_id: req.user.id })
    if (account?.under18 === true) throw fault('Under-18 projects must be created through a consented classroom', 403)
    const data = initializePhase3(newDossier(id, prompt, pack))
    assertNoSecrets(name)
    const project = await ProjectModel.create({ _id: id, name, user_id: req.user.id })
    try {
      const doc = await store.create(data, req.user.id, req.user.plan)
      res.status(201).json({ project: { id: String(project._id), name: project.name }, ...publicDossier(doc) })
    } catch (error) { await ProjectModel.deleteOne({ _id: id, user_id: req.user.id }); throw error }
  }))
  router.post('/tab', auth, wrap(async (req, res) => res.json(await tab(req.body))))
  router.post('/projects/:id/materials', auth, wrap(async (req, res) => {
    const doc = await owned(req); assertEditable(doc.data)
    if ((doc.data.materials || []).length >= 20) throw fault('At most 20 material files per dossier', 400)
    const material = await extractMaterial(req.body)
    res.status(201).json(publicDossier(await store.mutate(req.params.id, req.user.id, d => {
      d.materials ||= []
      if (d.materials.some(file => file.sha256 === material.sha256 && file.kind === material.kind)) return
      if (d.materials.length >= 20 || JSON.stringify(d.materials).length + JSON.stringify(material).length > 2000000) throw fault('Dossier material index exceeds limits', 400)
      d.materials.push(material)
      event(d, 'Listener', { kind: 'material_indexed' })
    })))
  }))
  router.post('/projects/:id/material-question', auth, wrap(async (req, res) => {
    const doc = await owned(req)
    res.json(materialAnswer(doc.data, req.body.question))
  }))
  router.get('/projects/:id/meter', auth, wrap(async (req, res) => res.json(projectMeter((await owned(req)).data.events))))
  router.get('/projects/:id/replay', auth, wrap(async (req, res) => res.json(replayEvents((await owned(req)).data.events))))
  router.get('/projects/:id/dossier', auth, wrap(async (req, res) => res.json(publicDossier(await owned(req)))))
  router.post('/projects/:id/dossier', auth, wrap(async (req, res) => {
    durable()
    if (!mongoose.isValidObjectId(req.params.id) || !await ProjectModel.findOne({ _id: req.params.id, user_id: req.user.id })) throw fault('Project not found', 404)
    const account = await UserModel.findOne({ supabase_id: req.user.id })
    if (account?.under18 === true) throw fault('Under-18 projects require a consented classroom', 403)
    res.status(201).json(publicDossier(await store.create(initializePhase3(newDossier(req.params.id, req.body.prompt, req.body.pack)), req.user.id, req.user.plan)))
  }))
  router.patch('/projects/:id/spec/:lineId', auth, wrap(async (req, res) => {
    await owned(req)
    const doc = await store.mutate(req.params.id, req.user.id, d => { assertEditable(d); reviewLine(d, req.params.lineId, req.body.status, req.body.text) })
    res.json(publicDossier(doc))
  }))
  router.post('/projects/:id/run', auth, wrap(async (req, res) => {
    await owned(req)
    await DossierModel.updateOne({ project_id: req.params.id, user_id: req.user.id }, { $set: { plan: req.user.plan || 'free' } })
    res.status(202).json(publicDossier(await engine.start(req.params.id, req.user.id)))
  }))
  router.post('/projects/:id/listener', auth, wrap(async (req, res) => {
    await owned(req)
    res.json(await engine.listener(req.params.id, req.user.id, req.body.question))
  }))
  router.post('/projects/:id/fix', auth, wrap(async (req, res) => {
    await owned(req)
    res.status(202).json(publicDossier(await engine.fix(req.params.id, req.user.id, req.body.text)))
  }))
  router.get('/projects/:id/judges', auth, wrap(async (req, res) => {
    const doc = await owned(req)
    res.json({ state: doc.data.state, judge: doc.data.judge })
  }))
  router.post('/projects/:id/complete', auth, wrap(async (req, res) => {
    await owned(req)
    const doc = await store.mutate(req.params.id, req.user.id, d => {
      if (d.state !== 'live' || !validateVerdicts(d, d.judge) || !d.live.some(l => l.type === 'click' && l.generation === d.generation)) throw fault('Green judges and a current verified live click are required')
      transition(d, 'done', 'Conductor')
    })
    res.json(publicDossier(doc))
  }))
  router.post('/projects/:id/click', auth, wrap(async (req, res) => {
    const doc = await owned(req)
    if (doc.data.state !== 'live') throw fault('Live preview is not ready')
    const click = validateClick(req.body)
    const result = await sandbox.browser(req.params.id, click)
    res.json(publicDossier(await store.mutate(req.params.id, req.user.id, d => {
      if (d.state !== 'live' || d.generation !== doc.data.generation) throw fault('Project changed during click; retry')
      d.live.push({ id: randomUUID(), type: 'click', generation: d.generation, click, result })
      event(d, 'Tester', { kind: 'live_click' })
    })))
  }))
  router.post('/projects/:id/rollback', auth, wrap(async (req, res) => {
    const doc = await owned(req)
    assertEditable(doc.data)
    if (!['live', 'done', 'blocked', 'wait_for_user'].includes(doc.data.state) || new Date(doc.lease_until).getTime() > Date.now()) throw fault('Wait for the worker safe point before rollback')
    if (!doc.data.last_green) throw fault('No last-green snapshot exists')
    // Acquire the same worker lease before touching code/database.
    const owner = randomUUID()
    const locked = await DossierModel.findOneAndUpdate({ _id: doc._id, revision: doc.revision, lease_until: { $lte: new Date() } }, { $set: { lease_owner: owner, lease_until: new Date(Date.now() + 60000) } }, { new: true })
    if (!locked) throw fault('Concurrent project operation; retry')
    try {
      await store.mutate(req.params.id, req.user.id, d => block(d, 'Restoring last green', 'live'), owner)
      await sandbox.restore(req.params.id, doc.data.last_green.snapshot)
      const result = await store.mutate(req.params.id, req.user.id, d => {
        d.generation = doc.data.last_green.generation; d.judge = doc.data.last_green.judge; d.tasks = doc.data.last_green.tasks
        const later = d.spec
        d.spec = structuredClone(doc.data.last_green.spec)
        const existingIds = new Set(Object.values(d.spec).flat().map(l => l.id))
        for (const group of Object.keys(d.spec)) d.spec[group].push(...later[group].filter(l => !existingIds.has(l.id)).map(l => ({ ...l, status: 'rejected' })))
        // Later fix lines remain visible but rejected; they cannot inherit an earlier pass.
        const greenIds = new Set(d.judge.flatMap(j => j.lines.map(l => l.id)))
        for (const group of Object.keys(d.spec)) for (const line of d.spec[group]) if (!greenIds.has(line.id)) line.status = 'rejected'
        transition(d, 'live', 'Conductor', { kind: 'rollback' })
      }, owner)
      res.json(publicDossier(result))
    } finally { await DossierModel.updateOne({ _id: doc._id, lease_owner: owner }, { $set: { lease_owner: null, lease_until: new Date(0) } }) }
  }))
  router.get('/projects/:id/progress', auth, wrap(async (req, res) => {
    await owned(req)
    let cursor = Math.max(0, Number(req.query.after || req.headers['last-event-id']) || 0), closed = false, busy = false
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
    res.flushHeaders()
    const poll = async () => {
      if (busy || closed) return
      busy = true
      try {
        const doc = await owned(req)
        for (const entry of doc.data.events.filter(e => e.seq > cursor)) { if (closed) break; res.write(`id: ${entry.seq}\ndata: ${JSON.stringify(entry)}\n\n`); cursor = entry.seq }
        if (!closed) res.write(': heartbeat\n\n')
      } catch { if (!closed) res.end() } finally { busy = false }
    }
    const timer = setInterval(poll, 1000)
    req.on('close', () => { closed = true; clearInterval(timer) })
    await poll()
  }))
  router.get('/projects/:id/artifacts/:name', auth, wrap(async (req, res) => {
    const doc = await owned(req)
    const allowed = [...doc.data.tasks.flatMap(t => [t.screen?.screenshot, t.screen?.visual_diff?.screenshot]), ...doc.data.live.map(l => l.result?.screenshot), ...doc.data.sources.filter(s => s.type === 'screen').map(s => s.path?.split('/').at(-1)), ...doc.data.events.filter(e => e.kind === 'tool_result' && ['browser', 'visual_compare'].includes(e.tool)).map(e => e.output?.screenshot)]
    if (!allowed.includes(req.params.name)) throw fault('Artifact not found', 404)
    res.type('png').send(await sandbox.artifact(req.params.name))
  }))
  router.post('/projects/:id/preview', auth, wrap(async (req, res) => {
    const doc = await owned(req)
    if (!['live', 'done'].includes(doc.data.state) || !validateVerdicts(doc.data, doc.data.judge)) throw fault('Preview requires current green judges')
    const origin = process.env.DOSSIER_PREVIEW_ORIGIN || `${req.protocol}://${req.get('host')}`
    let parsedOrigin, shellOrigins
    try {
      parsedOrigin = new URL(origin)
      shellOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(url => new URL(url.trim()).origin)
    } catch { throw fault('Preview origin configuration is invalid', 503) }
    if (!['https:', 'http:'].includes(parsedOrigin.protocol) || parsedOrigin.username || parsedOrigin.password || parsedOrigin.pathname !== '/' || parsedOrigin.search || parsedOrigin.hash) throw fault('Preview origin must be one HTTP origin', 503)
    if (shellOrigins.includes(parsedOrigin.origin)) throw fault('Preview must use an origin separate from the Codeva web shell', 503)
    const token = randomBytes(32).toString('hex')
    await DossierModel.updateOne({ _id: doc._id }, { $set: { preview_launch_hash: digest(token), preview_launch_expires: new Date(Date.now() + 30000) } })
    res.json({ preview_url: `${parsedOrigin.origin}/api/v1/studio/preview/${req.params.id}/`, launch_url: `${parsedOrigin.origin}/api/v1/studio/preview/${req.params.id}/session`, launch_token: token, expires_in: 30 })
  }))
  router.post('/preview/:id/session', wrap(async (req, res) => {
    durable()
    if (!mongoose.isValidObjectId(req.params.id) || typeof req.body.token !== 'string' || req.body.token.length !== 64) throw fault('Project login required', 401)
    const token = randomBytes(32).toString('hex')
    const doc = await DossierModel.findOneAndUpdate({ project_id: req.params.id, preview_launch_hash: digest(req.body.token), preview_launch_expires: { $gt: new Date() } },
      { $set: { preview_session_hash: digest(token), preview_session_expires: new Date(Date.now() + 300000) }, $unset: { preview_launch_hash: 1, preview_launch_expires: 1 } }, { new: true }).lean()
    if (!doc) throw fault('Project login required', 401)
    res.cookie('codeva_project_preview', token, { httpOnly: true, secure: req.secure, sameSite: 'lax', maxAge: 300000, path: `/api/v1/studio/preview/${req.params.id}` })
    res.redirect(303, `/api/v1/studio/preview/${req.params.id}/`)
  }))
  router.all('/preview/:id/*', wrap(async (req, res) => {
    durable()
    if (!mongoose.isValidObjectId(req.params.id) || !['GET', 'POST'].includes(req.method)) throw fault('Project login required', 401)
    const token = req.cookies?.codeva_project_preview
    if (typeof token !== 'string') throw fault('Project login required', 401)
    const doc = await DossierModel.findOne({ project_id: req.params.id, preview_session_hash: digest(token), preview_session_expires: { $gt: new Date() } }).lean()
    if (!doc || !['live', 'done'].includes(doc.data.state) || !await ProjectModel.findOne({ _id: req.params.id, user_id: doc.user_id }) || await banned(doc.user_id)) throw fault('Project login required', 401)
    if (req.method === 'POST') assertEditable(doc.data)
    const subpath = '/' + req.params[0] + (req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?').slice(1).join('?') : '')
    const result = await sandbox.request(req.params.id, { path: previewPath(subpath), method: req.method, headers: { cookie: req.cookies?.app_session ? `app_session=${req.cookies.app_session}` : '', 'content-type': 'application/json', ...(req.headers['idempotency-key'] ? { 'idempotency-key': req.headers['idempotency-key'] } : {}) }, body: req.method === 'POST' ? JSON.stringify(req.body) : '' })
    const type = result.headers['Content-Type'] || result.headers['content-type'] || 'text/plain'
    const cookie = result.headers['Set-Cookie'] || result.headers['set-cookie']
    if (cookie) res.set('Set-Cookie', cookie.replace(/Path=\//i, `Path=/api/v1/studio/preview/${req.params.id}/`))
    res.set({ 'Cache-Control': 'no-store', 'Content-Type': type, 'Content-Security-Policy': PREVIEW_CSP, 'X-Content-Type-Options': 'nosniff' })
    const body = Buffer.from(result.body_base64, 'base64')
    if (/text\/html/.test(type)) assertNoSecrets(body.toString('utf8'))
    res.status(result.status).send(body)
  }))
  return router
}
export default createDossierRouter()
