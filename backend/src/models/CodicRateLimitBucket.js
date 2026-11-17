import mongoose from 'mongoose'

const codicRateLimitBucketSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  hit_count: { type: Number, required: true, min: 0 },
  reset_at: { type: Date, required: true },
  expires_at: { type: Date, required: true },
}, {
  versionKey: false,
  timestamps: false,
  minimize: true,
})

// MongoDB's TTL worker reclaims expired keys; `_id` provides the unique key
// needed to make each atomic upsert shared across all API instances.
codicRateLimitBucketSchema.index(
  { expires_at: 1 },
  { expireAfterSeconds: 0, name: 'codic_rate_limit_expiry' },
)

export default mongoose.model('CodicRateLimitBucket', codicRateLimitBucketSchema, 'codic_rate_limit_buckets')
