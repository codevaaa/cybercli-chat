// Explicit opt-in integration run. Uses an isolated real MongoDB and real Docker
// plus configured paid providers. It does not invent an authenticated account.
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
const require = createRequire(new URL('../../backend/package.json', import.meta.url))
if (process.env.CODEVA_ACCEPTANCE_PROVIDER_CALLS !== '1') throw new Error('Set CODEVA_ACCEPTANCE_PROVIDER_CALLS=1 to authorize this bounded provider integration run')
const mongoose = require('mongoose'), { MongoMemoryServer } = require('mongodb-memory-server')
const mongo = await MongoMemoryServer.create({ instance: { dbName: 'codeva_paid_acceptance' } })
process.env.MONGODB_URI = mongo.getUri()
const functionalTesting = process.env.CODEVA_ACCEPTANCE_FREE_MODELS === '1'
if (functionalTesting) process.env.NODE_ENV = 'test'
await import('../../backend/src/config/env.js')
await mongoose.connect(process.env.MONGODB_URI)
const { DossierStore } = await import('../../backend/src/services/dossier/store.js')
const { DossierModels } = await import('../../backend/src/services/dossier/models.js')
const { DossierEngine } = await import('../../backend/src/services/dossier/engine.js')
const { DockerSandbox } = await import('../../backend/src/services/dossier/sandbox.js')
const { newDossier, reviewLine } = await import('../../backend/src/services/dossier/domain.js')
const { initializePhase3, selectDesign, scribeReport } = await import('../../backend/src/services/dossier/roles.js')
const { decideReview } = await import('../../backend/src/services/dossier/editorReview.js')
const Project = (await import('../../backend/src/models/Project.js')).default
const id = String(new mongoose.Types.ObjectId()), user = randomUUID(), store = new DossierStore(), sandbox = new DockerSandbox()
let calls = 0
class BoundedModels extends DossierModels { async call(input) { if (++calls > 16) throw Object.assign(new Error('Acceptance model-call budget exhausted'), { status: 503 }); try { const result = await super.call(input); await fs.writeFile(`artifacts/codeva-editor/paid-${input.role}.json`, JSON.stringify(result.value, null, 2)); return result } catch (e) { if (e.diagnostic) await fs.writeFile('artifacts/codeva-editor/paid-output-diagnostic.json', JSON.stringify(e.diagnostic, null, 2)); throw e } } }
const engine = new DossierEngine({ store, sandbox, models: new BoundedModels({ functionalTesting }) })
const evidenceFile = `artifacts/codeva-editor/${functionalTesting ? 'apinex-functional-dossier' : 'paid-dossier'}.json`
const evidence = { scope: 'Isolated real MongoDB, real Docker, real configured provider calls. No Supabase login certified.', free_functional_test: functionalTesting, paid_frontier_acceptance_certified: false, project_id: id, authenticated_account: false, executed_at: new Date().toISOString() }
let doc
try {
  await sandbox.ensure(id) // Fail before any provider call when Docker is down.
  await Project.create({ _id: id, user_id: user, name: 'Owned integration acceptance' })
  await store.create(initializePhase3(newDossier(id, 'Build one compact owner-only notes screen as one integrated build goal. Use the supplied demo login and owner-scoped SQLite rows. Show a list and forms to add, edit and delete titles. Use English and Hindi labels. Keep cream text, terracotta buttons, clear nonblank errors and a plain layout. Any necessary layout changes for these forms are explicitly requested. Never add payments, external requests or secrets.')), user, 'max')
  for (let step = 0; step < 35; step++) {
    doc = await store.get(id, user)
    await fs.writeFile('artifacts/codeva-editor/paid-dossier-progress.json', JSON.stringify({ state: doc.data.state, blocked: doc.data.blocked, step, model_calls: calls }))
    if (doc.data.state === 'live') break
    if (doc.data.state === 'wait_for_user' && !doc.data.tasks.length) {
      await store.mutate(id, user, d => { for (const line of Object.values(d.spec).flat()) reviewLine(d, line.id, 'accepted'); selectDesign(d, '1') })
      await engine.start(id, user); continue
    }
    const review = doc.data.editor_reviews?.find(r => r.status === 'pending')
    // A failed independent review requires a human to change/reject the diff.
    // Repeated model calls must not turn a failed review into an apparent pass.
    if (doc.data.state === 'blocked' && !review && doc.data.blocked?.resume_state === 'build' && doc.data.tasks.find(t => t.id === doc.data.current_task)?.attempts < 3 && calls + 3 <= 16) { await engine.start(id, user); continue }
    if (doc.data.state === 'blocked' && (!review || review.risk_reviews?.length)) break
    if (review) { await decideReview(engine, doc, sandbox, review.id, 'accept'); continue }
    await engine.step(doc)
  }
  doc = await store.get(id, user)
  evidence.result = doc.data.state === 'live' ? 'PASS' : 'FAIL'
  evidence.state = doc.data.state; evidence.blocked = doc.data.blocked; evidence.model_calls = calls
  evidence.judges = doc.data.judge; evidence.report = scribeReport(doc.data)
  evidence.reviews = doc.data.editor_reviews; evidence.spec = doc.data.spec; evidence.events = doc.data.events
  await fs.writeFile(evidenceFile, JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify({ result: evidence.result, state: evidence.state, blocked: evidence.blocked, model_calls: calls }))
  if (evidence.result !== 'PASS') process.exitCode = 1
} catch (error) {
  doc = await store.get(id, user).catch(() => doc)
  Object.assign(evidence, { result: 'FAIL', error: error.message, model_calls: calls, state: doc?.data.state, blocked: doc?.data.blocked, reviews: doc?.data.editor_reviews, spec: doc?.data.spec })
  await fs.writeFile(evidenceFile, JSON.stringify(evidence, null, 2))
  console.error(error.message); process.exitCode = 1
} finally {
  const names = doc?.data.events.map(e => e.output?.screenshot).filter(Boolean) || []
  await sandbox.remove(id, names); await mongoose.disconnect(); await mongo.stop()
}
