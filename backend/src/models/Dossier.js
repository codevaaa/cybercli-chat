import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
  user_id: { type: String, required: true, index: true },
  revision: { type: Number, default: 0 },
  plan: { type: String, default: 'free' },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  lease_owner: { type: String, default: null },
  lease_until: { type: Date, default: () => new Date(0) },
  preview_launch_hash: String,
  preview_launch_expires: Date,
  preview_session_hash: String,
  preview_session_expires: Date,
}, { timestamps: true })
schema.index({ user_id: 1, 'data.classroom.id': 1 }, { unique: true, partialFilterExpression: { 'data.classroom.id': { $type: 'string' } } })
export default mongoose.model('Dossier', schema)
