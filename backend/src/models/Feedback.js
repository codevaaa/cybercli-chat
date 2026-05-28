import mongoose from 'mongoose'

const feedbackSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  name: { type: String, required: true },
  initials: { type: String, required: true },
  quote: { type: String, required: true },
  role: { type: String, default: 'Developer' },
  company: { type: String, default: '' },
  stars: { type: Number, required: true, min: 1, max: 5 },
  accentColor: { type: String, default: '#D97757' },
  is_public: { type: Boolean, default: true }
}, { timestamps: true })

export default mongoose.model('Feedback', feedbackSchema)
