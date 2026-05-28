import mongoose from 'mongoose'

const supportThreadSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  accepted_terms: { type: Boolean, default: false },
  assigned_agent: { type: String, default: 'CyberCli AI Assistant' }
}, { timestamps: true })

export default mongoose.model('SupportThread', supportThreadSchema)
