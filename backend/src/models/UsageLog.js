import mongoose from 'mongoose'

const usageLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  apiKeyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApiKey',
    required: false,
  },
  model: {
    type: String,
    required: true,
    index: true
  },
  endpoint: {
    type: String,
    required: true,
  },
  inputTokens: {
    type: Number,
    default: 0
  },
  outputTokens: {
    type: Number,
    default: 0
  },
  totalTokens: {
    type: Number,
    default: 0
  },
  cost: {
    type: Number,
    default: 0,
    description: 'Cost in credits'
  },
  latencyMs: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['success', 'error'],
    default: 'success'
  },
  errorMessage: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
})

export default mongoose.model('UsageLog', usageLogSchema)
