import mongoose from 'mongoose'

const folderSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  color: { type: String, default: '#7C3AED' },
}, { timestamps: true })

folderSchema.index({ user_id: 1, name: 1 })

export default mongoose.model('Folder', folderSchema)
