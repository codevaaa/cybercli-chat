import mongoose from 'mongoose'

const apiKeySchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  last_used_at: {
    type: Date,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
})

const ApiKey = mongoose.model('ApiKey', apiKeySchema)
export default ApiKey
