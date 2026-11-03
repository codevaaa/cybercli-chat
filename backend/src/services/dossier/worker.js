import '../../config/env.js'
import connectMongoDB from '../../config/database.js'
import { randomUUID } from 'node:crypto'
import Dossier from '../../models/Dossier.js'
import { dossierStore, assertDurableStore } from './store.js'
import { DossierEngine } from './engine.js'
import { DossierModels } from './models.js'
import { DockerSandbox } from './sandbox.js'
import { resolveUserPlan, isUserBanned } from '../../middleware/auth.js'
import Project from '../../models/Project.js'
import { block } from './domain.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export async function workerTick({ owner, engine, store = dossierStore, DossierModel = Dossier, ProjectModel = Project, resolvePlan = resolveUserPlan, resolveBan = isUserBanned }) {
  const now = new Date()
  const doc = await DossierModel.findOneAndUpdate({ 'data.state': { $in: ['listen', 'spec', 'tasks', 'build', 'test', 'judge'] }, lease_until: { $lt: now } },
    { $set: { lease_owner: owner, lease_until: new Date(Date.now() + 60000) } }, { new: true }).lean()
  if (!doc) return false
  const heartbeat = setInterval(() => {
    DossierModel.updateOne({ _id: doc._id, lease_owner: owner }, { $set: { lease_until: new Date(Date.now() + 60000) } }).catch(() => {})
  }, 15000)
  try {
    if (!await ProjectModel.findOne({ _id: doc.project_id, user_id: doc.user_id })) {
      await store.mutate(doc.project_id, doc.user_id, d => block(d, 'Project no longer exists'), owner)
    } else if (await resolveBan(doc.user_id)) {
      await store.mutate(doc.project_id, doc.user_id, d => block(d, 'Account suspended'), owner)
    } else { doc.plan = await resolvePlan(doc.user_id); await engine.step(doc) }
  }
  finally {
    clearInterval(heartbeat)
    await DossierModel.updateOne({ _id: doc._id, lease_owner: owner }, { $set: { lease_owner: null, lease_until: new Date(0) } })
  }
  return true
}

export async function runWorker({ signal, connect = connectMongoDB, durable = assertDurableStore, tick = workerTick, idle = () => new Promise(resolve => setTimeout(resolve, 1000)), ...dependencies }) {
  await connect()
  durable()
  const owner = randomUUID()
  const engine = new DossierEngine({ store: dossierStore, models: new DossierModels(), sandbox: new DockerSandbox(), leaseOwner: owner })
  while (!signal.aborted) {
    try { if (!await tick({ owner, engine, ...dependencies })) await idle() }
    catch { await idle() } // State and lease remain authoritative after a dependency failure.
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const controller = new AbortController()
  for (const name of ['SIGTERM', 'SIGINT', 'disconnect']) process.on(name, () => controller.abort())
  try { await runWorker({ signal: controller.signal }); process.exit(0) }
  catch { console.error('Dossier worker requires the existing durable Mongo connection'); process.exit(1) }
}
