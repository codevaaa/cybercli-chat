import mongoose from 'mongoose'

const snippetSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  shortcut: { type: String, default: null },
  usage_count: { type: Number, default: 0 },
}, { timestamps: true })

snippetSchema.index({ user_id: 1, shortcut: 1 })

export default mongoose.model('Snippet', snippetSchema)
