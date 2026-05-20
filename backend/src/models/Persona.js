import mongoose from 'mongoose'

const personaSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  system_prompt: { type: String, required: true },
  temperature: { type: Number, default: 0.7, min: 0, max: 2 },
  max_tokens: { type: Number, default: 4096 },
  icon: { type: String, default: 'brain' },
  is_public: { type: Boolean, default: false },
  usage_count: { type: Number, default: 0 },
}, { timestamps: true })

personaSchema.index({ user_id: 1, usage_count: -1 })

export default mongoose.model('Persona', personaSchema)
