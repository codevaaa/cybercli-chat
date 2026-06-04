import mongoose from 'mongoose'

const threadSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  title: { type: String, default: 'New Chat' },
  model_id: { type: String, default: 'auto' },
  mode: { type: String, enum: ['standard', 'kalikal', 'kali_kal'], default: 'standard' },
  folder_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  style_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Style', default: null },
  is_pinned: { type: Boolean, default: false },
  is_archived: { type: Boolean, default: false },
  tags: [{ type: String }],
  message_count: { type: Number, default: 0 },
  last_message_at: { type: Date, default: Date.now },
}, { timestamps: true })

threadSchema.index({ user_id: 1, updatedAt: -1 })
threadSchema.index({ user_id: 1, is_pinned: -1, updatedAt: -1 })

export default mongoose.model('Thread', threadSchema)
