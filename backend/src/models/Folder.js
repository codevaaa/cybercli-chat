import mongoose from 'mongoose'

const folderSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  color: { type: String, default: '#7C3AED' },
  description: { type: String, default: '' },
  custom_instructions: { type: String, default: '' },
  pinned_files: { type: Array, default: [] },
  pinned_chats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Thread' }],
}, { timestamps: true })

folderSchema.index({ user_id: 1, name: 1 })

export default mongoose.model('Folder', folderSchema)
