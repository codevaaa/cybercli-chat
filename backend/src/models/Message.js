import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  thread_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: true, index: true },
  user_id: { type: String, required: true, index: true },
  role: { type: String, enum: ['user', 'assistant', 'system', 'tool'], required: true },
  content: { type: String, required: true },
  model: { type: String, default: '' },
  provider: { type: String, default: '' },
  tokens_in: { type: Number, default: 0 },
  tokens_out: { type: Number, default: 0 },
  latency_ms: { type: Number, default: 0 },
  is_fork_point: { type: Boolean, default: false },
  forked_thread_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', default: null },
  attachments: [{
    type: { type: String },
    url: { type: String },
    name: { type: String },
  }],
  expiresAt: { type: Date, index: { expires: 0 } } // TTL index for auto-deletion
}, { timestamps: true })

messageSchema.index({ thread_id: 1, createdAt: -1 })

export default mongoose.model('Message', messageSchema)
