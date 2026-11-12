import mongoose from 'mongoose'

const codicDeviceSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  device_id: {
    type: String,
    required: true,
    trim: true,
    minlength: 36,
    maxlength: 36,
    match: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  },
  platform: { type: String, required: true, enum: ['macos', 'windows', 'linux'] },
  app_version: {
    type: String,
    required: true,
    trim: true,
    maxlength: 40,
    match: /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/,
  },
  display_name: { type: String, trim: true, maxlength: 80, default: '' },
  last_seen_at: { type: Date, default: Date.now },
  revoked_at: { type: Date, default: null },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  minimize: true,
})

codicDeviceSchema.index({ user_id: 1, device_id: 1 }, { unique: true })

export default mongoose.model('CodicDevice', codicDeviceSchema)
