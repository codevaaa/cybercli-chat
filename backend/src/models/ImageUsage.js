import mongoose from 'mongoose'

const imageUsageSchema = new mongoose.Schema({
  identifier: { type: String, required: true, unique: true, index: true }, // user_id or IP address
  date: { type: String, required: true }, // 'YYYY-MM-DD'
  count: { type: Number, default: 0 }
}, { timestamps: true })

export default mongoose.model('ImageUsage', imageUsageSchema)
