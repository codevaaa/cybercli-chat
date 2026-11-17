import { createHash } from 'node:crypto'
import CodicRateLimitBucket from '../models/CodicRateLimitBucket.js'

const isDuplicateKey = error => error?.code === 11000 || error?.cause?.code === 11000

/**
 * A Mongo-backed express-rate-limit store. Counts survive process restarts and
 * are shared across API instances. Client identifiers are hashed before they
 * are persisted so Redis-like keys never contain user IDs or IP addresses.
 */
export class CodicRateLimitStore {
  constructor({ prefix, model = CodicRateLimitBucket, now = Date.now } = {}) {
    if (!prefix) throw new TypeError('Codic rate-limit store prefix is required.')
    this.prefix = prefix
    this.model = model
    this.now = now
    this.windowMs = 60_000
    this.indexReady = null
  }

  init(options) {
    if (Number.isFinite(options?.windowMs) && options.windowMs > 0) this.windowMs = options.windowMs
  }

  async ensureIndex() {
    if (!this.indexReady) {
      this.indexReady = this.model.collection.createIndex(
        { expires_at: 1 },
        { expireAfterSeconds: 0, name: 'codic_rate_limit_expiry' },
      ).catch(error => {
        this.indexReady = null
        throw error
      })
    }
    return this.indexReady
  }

  keyFor(key) {
    const digest = createHash('sha256').update(String(key)).digest('hex')
    return `${this.prefix}:${digest}`
  }

  async increment(key) {
    await this.ensureIndex()
    const now = new Date(this.now())
    const nextReset = new Date(now.getTime() + this.windowMs)
    const update = [{
      $set: {
        hit_count: {
          $cond: [
            { $gt: [{ $ifNull: ['$reset_at', new Date(0)] }, now] },
            { $add: [{ $ifNull: ['$hit_count', 0] }, 1] },
            1,
          ],
        },
        reset_at: {
          $cond: [
            { $gt: [{ $ifNull: ['$reset_at', new Date(0)] }, now] },
            '$reset_at',
            nextReset,
          ],
        },
        expires_at: {
          $cond: [
            { $gt: [{ $ifNull: ['$reset_at', new Date(0)] }, now] },
            '$expires_at',
            nextReset,
          ],
        },
      },
    }]
    const filter = { _id: this.keyFor(key) }
    const options = { upsert: true, new: true, returnDocument: 'after' }
    let bucket
    try {
      bucket = await this.model.findOneAndUpdate(filter, update, options)
    } catch (error) {
      // Two app instances can race the very first upsert. `_id` guarantees one
      // bucket; the loser retries against the winner's row without upserting.
      if (!isDuplicateKey(error)) throw error
      bucket = await this.model.findOneAndUpdate(filter, update, { ...options, upsert: false })
    }
    if (!bucket) throw new Error('Codic shared rate-limit counter was not returned by MongoDB.')
    return { totalHits: bucket.hit_count, resetTime: bucket.reset_at }
  }

  async get(key) {
    await this.ensureIndex()
    const bucket = await this.model.findById(this.keyFor(key)).lean()
    if (!bucket || bucket.reset_at <= new Date(this.now())) return undefined
    return { totalHits: bucket.hit_count, resetTime: bucket.reset_at }
  }

  async decrement(key) {
    await this.ensureIndex()
    await this.model.updateOne({ _id: this.keyFor(key) }, [{
      $set: { hit_count: { $max: [0, { $subtract: [{ $ifNull: ['$hit_count', 0] }, 1] }] } },
    }])
  }

  async resetKey(key) {
    await this.ensureIndex()
    await this.model.deleteOne({ _id: this.keyFor(key) })
  }

  async resetAll() {
    await this.ensureIndex()
    const escapedPrefix = this.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    await this.model.deleteMany({ _id: { $regex: `^${escapedPrefix}:` } })
  }

  shutdown() {}
}
