import mongoose from 'mongoose'

const styleSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  instructions: { type: String, required: true },
  is_default: { type: Boolean, default: false },
}, { timestamps: true })

styleSchema.index({ user_id: 1, updatedAt: -1 })

export default mongoose.model('Style', styleSchema)
