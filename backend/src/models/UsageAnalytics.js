import mongoose from 'mongoose'

const DailyUsageSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  requests_count: { type: Number, default: 0 },
  tokens_input: { type: Number, default: 0 },
  tokens_output: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  models_used: [{
    model: String,
    count: Number,
    tokens: Number
  }],
  commands_executed: { type: Number, default: 0 },
  files_modified: { type: Number, default: 0 }
})

const UsageAnalyticsSchema = new mongoose.Schema({
  user_id: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  
  // Current period tracking
  current_period_start: { type: Date, default: Date.now },
  current_period_end: Date,
  
  // Aggregated stats
  total_requests: { type: Number, default: 0 },
  total_tokens_input: { type: Number, default: 0 },
  total_tokens_output: { type: Number, default: 0 },
  total_cost: { type: Number, default: 0 },
  total_commands: { type: Number, default: 0 },
  total_sessions: { type: Number, default: 0 },
  
  // Model breakdown
  model_usage: [{
    model: String,
    provider: String,
    total_requests: Number,
    total_tokens: Number,
    total_cost: Number,
    avg_response_time_ms: Number,
    last_used: Date
  }],
  
  // Daily breakdown (last 90 days)
  daily_usage: [DailyUsageSchema],
  
  // Feature usage
  features_used: [{
    feature: String,
    count: { type: Number, default: 0 },
    last_used: { type: Date, default: Date.now }
  }],
  
  // Quota tracking
  quota: {
    plan: { type: String, default: 'free' },
    monthly_limit: { type: Number, default: 100 },
    used_this_month: { type: Number, default: 0 },
    remaining: { type: Number, default: 100 },
    resets_at: Date
  },
  
  // Performance metrics
  performance: {
    avg_response_time_ms: { type: Number, default: 0 },
    satisfaction_score: { type: Number, default: 0 },
    error_rate: { type: Number, default: 0 }
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})

// Indexes
UsageAnalyticsSchema.index({ user_id: 1, 'daily_usage.date': -1 })
UsageAnalyticsSchema.index({ 'quota.resets_at': 1 })

// Method to track usage
UsageAnalyticsSchema.methods.trackUsage = async function(model, provider, tokensIn, tokensOut, cost, responseTimeMs) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Update totals
  this.total_requests += 1
  this.total_tokens_input += tokensIn
  this.total_tokens_output += tokensOut
  this.total_cost += cost
  this.quota.used_this_month += 1
  this.quota.remaining = Math.max(0, this.quota.monthly_limit - this.quota.used_this_month)
  
  // Update model usage
  const modelEntry = this.model_usage.find(m => m.model === model)
  if (modelEntry) {
    modelEntry.total_requests += 1
    modelEntry.total_tokens += (tokensIn + tokensOut)
    modelEntry.total_cost += cost
    modelEntry.last_used = now
    // Update rolling average
    const oldAvg = modelEntry.avg_response_time_ms || 0
    modelEntry.avg_response_time_ms = oldAvg + (responseTimeMs - oldAvg) / modelEntry.total_requests
  } else {
    this.model_usage.push({
      model,
      provider,
      total_requests: 1,
      total_tokens: tokensIn + tokensOut,
      total_cost: cost,
      avg_response_time_ms: responseTimeMs,
      last_used: now
    })
  }
  
  // Update daily usage
  const dailyEntry = this.daily_usage.find(d => 
    d.date.getTime() === today.getTime()
  )
  
  if (dailyEntry) {
    dailyEntry.requests_count += 1
    dailyEntry.tokens_input += tokensIn
    dailyEntry.tokens_output += tokensOut
    dailyEntry.cost += cost
    
    const modelDaily = dailyEntry.models_used.find(m => m.model === model)
    if (modelDaily) {
      modelDaily.count += 1
      modelDaily.tokens += (tokensIn + tokensOut)
    } else {
      dailyEntry.models_used.push({
        model,
        count: 1,
        tokens: tokensIn + tokensOut
      })
    }
  } else {
    // Keep only last 90 days
    if (this.daily_usage.length >= 90) {
      this.daily_usage = this.daily_usage.slice(-89)
    }
    
    this.daily_usage.push({
      date: today,
      requests_count: 1,
      tokens_input: tokensIn,
      tokens_output: tokensOut,
      cost,
      models_used: [{
        model,
        count: 1,
        tokens: tokensIn + tokensOut
      }]
    })
  }
  
  // Update performance metrics
  const oldPerfAvg = this.performance.avg_response_time_ms || 0
  this.performance.avg_response_time_ms = oldPerfAvg + (responseTimeMs - oldPerfAvg) / this.total_requests
  
  this.updated_at = now
  return this.save()
}

// Method to track feature usage
UsageAnalyticsSchema.methods.trackFeature = async function(featureName) {
  const feature = this.features_used.find(f => f.feature === featureName)
  
  if (feature) {
    feature.count += 1
    feature.last_used = new Date()
  } else {
    this.features_used.push({
      feature: featureName,
      count: 1,
      last_used: new Date()
    })
  }
  
  return this.save()
}

// Method to reset quota
UsageAnalyticsSchema.methods.resetQuota = async function(newPlan, monthlyLimit) {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  
  this.quota.plan = newPlan
  this.quota.monthly_limit = monthlyLimit
  this.quota.used_this_month = 0
  this.quota.remaining = monthlyLimit
  this.quota.resets_at = nextMonth
  this.current_period_start = now
  this.current_period_end = nextMonth
  
  return this.save()
}

// Static method to get or create analytics
UsageAnalyticsSchema.statics.getOrCreate = async function(userId) {
  let analytics = await this.findOne({ user_id: userId })
  
  if (!analytics) {
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    
    analytics = new this({
      user_id: userId,
      current_period_start: now,
      current_period_end: nextMonth,
      quota: {
        plan: 'free',
        monthly_limit: 100,
        used_this_month: 0,
        remaining: 100,
        resets_at: nextMonth
      }
    })
    await analytics.save()
  }
  
  return analytics
}

const UsageAnalytics = mongoose.model('UsageAnalytics', UsageAnalyticsSchema)

export default UsageAnalytics
