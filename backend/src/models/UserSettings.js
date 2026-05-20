import mongoose from 'mongoose'

const userSettingsSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true, index: true },
  theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
  accent_color: { type: String, default: '#7C3AED' },
  density: { type: String, enum: ['compact', 'comfortable', 'spacious'], default: 'comfortable' },
  default_model: { type: String, default: 'auto' },
  tts_enabled: { type: Boolean, default: true },
  tts_voice_id: { type: String, default: 'ava' },
  tts_speed: { type: Number, default: 1.0 },
  auto_send_voice: { type: Boolean, default: false },
  show_chain_of_thought: { type: Boolean, default: true },
  show_confidence: { type: Boolean, default: true },
  language: { type: String, default: 'en' },
}, { timestamps: true })

export default mongoose.model('UserSettings', userSettingsSchema)
