import mongoose from 'mongoose'

const codevaModelSchema = new mongoose.Schema({
  modelId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: 'e.g., brahma-v1'
  },
  name: {
    type: String,
    required: true,
    description: 'e.g., Brahma V1 - The Creator'
  },
  description: {
    type: String,
    default: ''
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  parameters: {
    type: String,
    default: '8B'
  },
  contextWindow: {
    type: Number,
    default: 131072
  },
  inputCostPer1kTokens: {
    type: Number,
    default: 0.0005
  },
  outputCostPer1kTokens: {
    type: Number,
    default: 0.001
  },
  capabilities: {
    type: [String],
    default: ['code-generation', 'reasoning']
  },
  modes: {
    type: [String],
    default: ['create', 'reason', 'cybersec', 'quick', 'teach']
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'deprecated'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

export default mongoose.model('CodevaModel', codevaModelSchema)
