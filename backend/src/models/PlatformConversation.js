import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  role:      { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content:   { type: String, required: true },
  model:     { type: String, default: '' },
  agentType: { type: String, default: '' },
  tokens:    { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
}, { _id: true })

const platformConversationSchema = new mongoose.Schema({
  user_id:     { type: String, required: true, index: true },
  title:       { type: String, default: 'New Session' },
  messages:    { type: [messageSchema], default: [] },
  model:       { type: String, default: 'auto' },
  autonomous:  { type: Boolean, default: false },
  session_id:  { type: String, default: '' },
  project:     { type: String, default: '' },
  status:      { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
  task_stats:  { type: { total: Number, completed: Number, failed: Number }, default: { total: 0, completed: 0, failed: 0 } },
  pinned:      { type: Boolean, default: false },
}, { timestamps: true })

platformConversationSchema.index({ user_id: 1, updatedAt: -1 })

export default mongoose.model('PlatformConversation', platformConversationSchema)
