import Dossier from '../../models/Dossier.js'
import { useFallbackMode } from '../../utils/fallbackDb.js'
import { fault } from './domain.js'
import { assertEditable } from './roles.js'

export function assertDurableStore() {
  // Existing JSON fallback does not provide cross-process compare-and-swap.
  if (useFallbackMode()) throw fault('Dossier worker requires the existing MongoDB connection; chat fallback remains available.', 503)
}
export class DossierStore {
  async get(projectId, userId) {
    assertDurableStore()
    const doc = await Dossier.findOne({ project_id: projectId, user_id: userId }).lean()
    if (!doc) throw fault('Dossier not found', 404)
    return doc
  }
  async create(data, userId, plan) {
    assertDurableStore()
    return Dossier.create({ project_id: data.project_id, user_id: userId, plan, data })
  }
  async mutate(projectId, userId, mutate, leaseOwner) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const doc = await this.get(projectId, userId)
      if (leaseOwner && (doc.lease_owner !== leaseOwner || new Date(doc.lease_until).getTime() <= Date.now())) throw fault('Worker lease expired')
      const data = structuredClone(doc.data)
      mutate(data)
      // In-flight model/review work cannot commit an edit after the deadline.
      const editableFields = ['spec', 'editor_reviews', 'materials', 'prompts_added', 'design', 'tasks', 'judge', 'last_green', 'generation']
      if (editableFields.some(key => JSON.stringify(data[key]) !== JSON.stringify(doc.data[key]))) assertEditable(doc.data)
      if (data.prompt_original !== doc.data.prompt_original || JSON.stringify(data.events.slice(0, doc.data.events.length)) !== JSON.stringify(doc.data.events)) throw fault('Original prompt and previous events are immutable')
      const result = await Dossier.findOneAndUpdate({ _id: doc._id, revision: doc.revision, ...(leaseOwner ? { lease_owner: leaseOwner, lease_until: { $gt: new Date() } } : {}) },
        { $set: { data }, $inc: { revision: 1 } }, { new: true }).lean()
      if (result) return result
    }
    throw fault('Concurrent dossier update; retry', 409)
  }
}
export const dossierStore = new DossierStore()
