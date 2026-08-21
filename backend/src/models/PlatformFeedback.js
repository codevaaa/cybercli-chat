import mongoose from 'mongoose'

const platformFeedbackSchema = new mongoose.Schema({
  user_id:     { type: String, required: true, index: true },
  user_email:  { type: String, default: '' },
  type:        { type: String, enum: ['bug', 'feature', 'auth', 'general'], required: true },
  description: { type: String, required: true },
  steps:       { type: String, default: '' },
  attachLogs:  { type: Boolean, default: false },
  status:      { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  metadata:    { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true })

export default mongoose.model('PlatformFeedback', platformFeedbackSchema)
