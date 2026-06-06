import mongoose from 'mongoose'

/**
 * Authoritative user registry — one row per Supabase user, keyed by the
 * Supabase auth id. This is what lets us track accounts and enforce bans,
 * similar to how OpenAI/Anthropic keep a moderation record per user.
 *
 * We deliberately store only what's needed for safety/abuse handling and
 * support — no message content lives here.
 */
const userSchema = new mongoose.Schema({
  // Supabase auth user id (uuid)
  supabase_id: { type: String, required: true, unique: true, index: true },

  email: { type: String, index: true },
  name: { type: String, default: '' },
  avatar_url: { type: String, default: '' },
  provider: { type: String, default: 'email' }, // email | google | etc.

  plan: { type: String, enum: ['free', 'pro', 'max', 'team', 'enterprise'], default: 'free' },

  // Moderation / abuse handling
  status: { type: String, enum: ['active', 'banned', 'suspended'], default: 'active', index: true },
  ban_reason: { type: String, default: '' },
  banned_at: { type: Date, default: null },
  banned_by: { type: String, default: '' },

  // Strike system — accumulate before a hard ban.
  strikes: { type: Number, default: 0 },
  flags: [{
    reason: { type: String },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    at: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed },
  }],

  // Activity / device fingerprint (for abuse correlation, not tracking)
  platforms: { type: [String], default: [] }, // mobile | web | cli | extension
  signup_ip: { type: String, default: '' },
  last_ip: { type: String, default: '' },
  last_seen_at: { type: Date, default: Date.now },
  login_count: { type: Number, default: 0 },
  
  // E2B Sandbox Usage tracking
  sandbox_executions_count: { type: Number, default: 0 },
  sandbox_last_execution_date: { type: Date, default: null },

  // Kali Kal Usage tracking (daily reset)
  kali_usage_count: { type: Number, default: 0 },
  kali_last_usage_date: { type: Date, default: null },
}, { timestamps: true })

userSchema.methods.isBanned = function isBanned() {
  return this.status === 'banned' || this.status === 'suspended'
}

export default mongoose.model('User', userSchema)
