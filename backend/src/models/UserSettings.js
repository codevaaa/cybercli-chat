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
  
  // Custom power capabilities
  memories: { type: [String], default: [] },
  custom_instructions: { type: String, default: '' },
  web_search_enabled: { type: Boolean, default: false },
  code_execution_enabled: { type: Boolean, default: false },
  image_generation_enabled: { type: Boolean, default: false },
  council_mode_enabled: { type: Boolean, default: false },

  // Frontend settings fields
  display_name: { type: String, default: '' },
  nickname: { type: String, default: '' },
  appearance: { type: String, enum: ['dark', 'light', 'system'], default: 'system' },
  chat_font: { type: String, default: 'inter' },
  voice: { type: String, default: 'ava' },
  voice_speed: { type: String, default: 'normal' },
  notifications_responses: { type: Boolean, default: true },
  notifications_dispatch: { type: Boolean, default: false },
  memory_enabled: { type: Boolean, default: false },
}, { timestamps: true })

export default mongoose.model('UserSettings', userSettingsSchema)
