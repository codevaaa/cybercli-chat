import mongoose from 'mongoose'

const supportMessageSchema = new mongoose.Schema({
  thread_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportThread', required: true, index: true },
  sender: { type: String, enum: ['user', 'agent'], required: true },
  content: { type: String, required: true }
}, { timestamps: true })

export default mongoose.model('SupportMessage', supportMessageSchema)
