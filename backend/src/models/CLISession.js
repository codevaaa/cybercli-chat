import mongoose from 'mongoose'

const CommandHistorySchema = new mongoose.Schema({
  command: { type: String, required: true },
  args: [String],
  cwd: String,
  exit_code: { type: Number, default: 0 },
  duration_ms: Number,
  output_preview: String,
  executed_at: { type: Date, default: Date.now }
})

const CLISessionSchema = new mongoose.Schema({
  session_id: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  user_id: { 
    type: String, 
    required: true, 
    index: true 
  },
  api_key_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ApiKey',
    index: true 
  },
  
  // Session metadata
  machine_id: { type: String, required: true },
  machine_name: String,
  os: { type: String, enum: ['macos', 'windows', 'linux'] },
  shell: String,
  working_directory: String,
  
  // Connection info
  ip_address: String,
  user_agent: String,
  
  // Session state
  status: { 
    type: String, 
    enum: ['active', 'idle', 'disconnected', 'closed'], 
    default: 'active',
    index: true 
  },
  
  // Activity tracking
  started_at: { type: Date, default: Date.now },
  last_activity_at: { type: Date, default: Date.now },
  ended_at: Date,
  
  // Command history
  commands: [CommandHistorySchema],
  total_commands: { type: Number, default: 0 },
  
  // AI interactions in this session
  ai_interactions: [{
    type: { type: String, enum: ['chat', 'code', 'debug', 'explain', 'refactor'] },
    prompt: String,
    model_used: String,
    tokens_input: Number,
    tokens_output: Number,
    cost: { type: Number, default: 0 },
    response_time_ms: Number,
    created_at: { type: Date, default: Date.now }
  }],
  
  // File operations
  files_accessed: [{
    path: String,
    operation: { type: String, enum: ['read', 'write', 'delete', 'execute'] },
    accessed_at: { type: Date, default: Date.now }
  }],
  
  // Environment
  env_vars_hash: String,
  installed_tools: [String],
  
  // Session metrics
  metrics: {
    total_tokens_used: { type: Number, default: 0 },
    total_cost: { type: Number, default: 0 },
    avg_response_time_ms: { type: Number, default: 0 },
    files_modified: { type: Number, default: 0 },
    lines_of_code_generated: { type: Number, default: 0 }
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})

// TTL index for auto-cleanup of old sessions (90 days)
CLISessionSchema.index({ ended_at: 1 }, { 
  expireAfterSeconds: 90 * 24 * 60 * 60,
  partialFilterExpression: { status: 'closed' }
})

// Indexes for queries
CLISessionSchema.index({ user_id: 1, status: 1 })
CLISessionSchema.index({ user_id: 1, started_at: -1 })
CLISessionSchema.index({ machine_id: 1 })
CLISessionSchema.index({ last_activity_at: -1 })

// Method to add command to history
CLISessionSchema.methods.addCommand = async function(command, args, cwd, exitCode, outputPreview, durationMs) {
  this.commands.push({
    command,
    args: args || [],
    cwd,
    exit_code: exitCode,
    output_preview: outputPreview?.substring(0, 500),
    duration_ms: durationMs,
    executed_at: new Date()
  })
  this.total_commands += 1
  this.last_activity_at = new Date()
  return this.save()
}

// Method to add AI interaction
CLISessionSchema.methods.addAIInteraction = async function(type, prompt, modelUsed, tokensIn, tokensOut, cost, responseTimeMs) {
  this.ai_interactions.push({
    type,
    prompt: prompt?.substring(0, 1000),
    model_used: modelUsed,
    tokens_input: tokensIn,
    tokens_output: tokensOut,
    cost,
    response_time_ms: responseTimeMs,
    created_at: new Date()
  })
  
  this.metrics.total_tokens_used += (tokensIn + tokensOut)
  this.metrics.total_cost += cost
  this.last_activity_at = new Date()
  
  return this.save()
}

// Method to end session
CLISessionSchema.methods.endSession = async function() {
  this.status = 'closed'
  this.ended_at = new Date()
  
  // Calculate average response time
  if (this.ai_interactions.length > 0) {
    const totalTime = this.ai_interactions.reduce((sum, i) => sum + (i.response_time_ms || 0), 0)
    this.metrics.avg_response_time_ms = totalTime / this.ai_interactions.length
  }
  
  return this.save()
}

// Static method to get active sessions for user
CLISessionSchema.statics.getActiveSessions = function(userId) {
  return this.find({ 
    user_id: userId, 
    status: { $in: ['active', 'idle'] }
  }).sort({ last_activity_at: -1 })
}

// Static method to cleanup stale sessions
CLISessionSchema.statics.cleanupStaleSessions = async function(maxIdleMinutes = 30) {
  const cutoff = new Date(Date.now() - maxIdleMinutes * 60 * 1000)
  
  const result = await this.updateMany(
    { 
      status: { $in: ['active', 'idle'] },
      last_activity_at: { $lt: cutoff }
    },
    {
      $set: { 
        status: 'disconnected',
        ended_at: new Date()
      }
    }
  )
  
  return result.modifiedCount
}

const CLISession = mongoose.model('CLISession', CLISessionSchema)

export default CLISession
