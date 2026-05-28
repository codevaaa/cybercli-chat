import mongoose from 'mongoose'

const projectSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  model: { type: String, default: 'Madhav' },
}, { timestamps: true })

projectSchema.index({ user_id: 1, updatedAt: -1 })

export default mongoose.model('Project', projectSchema)
