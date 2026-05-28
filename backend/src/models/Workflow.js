import mongoose from 'mongoose'

const workflowSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  prompt: { type: String, required: true },
  model: { type: String, default: 'Madhav' },
}, { timestamps: true })

workflowSchema.index({ user_id: 1, updatedAt: -1 })

export default mongoose.model('Workflow', workflowSchema)
