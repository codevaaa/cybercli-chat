import mongoose from 'mongoose'
import crypto from 'crypto'

/**
 * API keys are never stored in plaintext. We persist:
 *   - key_hash:   SHA-256 of the full key (used for O(1) lookup on auth)
 *   - key_prefix: the human-visible start, e.g. "sk_cyber_a1b2c"
 *   - last4:      last 4 chars, for "…7b41" style display
 *
 * The full key is shown to the user exactly once, at creation time.
 */
const apiKeySchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
  },
  key_hash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  key_prefix: {
    type: String,
    required: true,
  },
  last4: {
    type: String,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  last_used_at: {
    type: Date,
  },
  usage_count: {
    type: Number,
    default: 0,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  permissions: {
    type: [String],
    default: ['chat', 'completions']
  },
  rateLimit: {
    type: Number,
    default: 60 // requests per minute
  },
  expires_at: {
    type: Date,
    default: null
  }
})

/** Hash a raw API key into its stored representation. */
apiKeySchema.statics.hashKey = function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

/**
 * Generate a fresh key, returning both the one-time plaintext value and the
 * persisted metadata fields. Format: sk_codeva_<48 hex chars>.
 */
apiKeySchema.statics.generate = function generate() {
  const randomHex = crypto.randomBytes(24).toString('hex')
  const rawKey = `sk-codeva-${randomHex}`
  return {
    rawKey,
    key_hash: this.hashKey(rawKey),
    key_prefix: rawKey.slice(0, 15), // sk-codeva- + 5 chars
    last4: rawKey.slice(-4),
  }
}

/** Masked, display-safe representation: "sk_cyber_a1b2c…7b41". */
apiKeySchema.methods.masked = function masked() {
  return `${this.key_prefix}…${this.last4}`
}

const ApiKey = mongoose.model('ApiKey', apiKeySchema)
export default ApiKey
