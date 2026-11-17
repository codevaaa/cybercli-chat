import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CodicRateLimitStore } from './CodicRateLimitStore.js'

function createSharedMongoModel(now) {
  const rows = new Map()
  return {
    rows,
    collection: { createIndex: async () => 'codic_rate_limit_expiry' },
    async findOneAndUpdate(filter, update, options = {}) {
      const id = filter._id
      const current = rows.get(id)
      if (!current && options.upsert === false) return null
      const fields = update[0].$set
      const windowStillOpen = current?.reset_at > new Date(now())
      const nextReset = fields.reset_at.$cond[2]
      const bucket = windowStillOpen
        ? { ...current, hit_count: current.hit_count + 1 }
        : { _id: id, hit_count: 1, reset_at: nextReset, expires_at: fields.expires_at.$cond[2] }
      rows.set(id, bucket)
      return bucket
    },
    findById(id) {
      return { lean: async () => rows.get(id) ?? null }
    },
    async updateOne(filter, update) {
      const row = rows.get(filter._id)
      if (row) row.hit_count = Math.max(0, row.hit_count - 1)
    },
    async deleteOne(filter) { rows.delete(filter._id) },
    async deleteMany(filter) {
      const prefix = filter._id.$regex.slice(1, -1).replaceAll('\\:', ':')
      for (const id of rows.keys()) if (id.startsWith(prefix)) rows.delete(id)
    },
  }
}

test('Mongo rate-limit buckets are shared across store instances and reset after their window', async () => {
  let now = Date.UTC(2026, 0, 1)
  const model = createSharedMongoModel(() => now)
  const firstInstance = new CodicRateLimitStore({ prefix: 'codic-turns', model, now: () => now })
  const secondInstance = new CodicRateLimitStore({ prefix: 'codic-turns', model, now: () => now })
  firstInstance.init({ windowMs: 1_000 })
  secondInstance.init({ windowMs: 1_000 })

  const first = await firstInstance.increment('account-123')
  now += 250
  const second = await secondInstance.increment('account-123')
  assert.equal(first.totalHits, 1)
  assert.equal(second.totalHits, 2)
  assert.equal(second.resetTime.getTime(), first.resetTime.getTime())

  now = first.resetTime.getTime()
  const afterWindow = await secondInstance.increment('account-123')
  assert.equal(afterWindow.totalHits, 1)
  assert.equal(afterWindow.resetTime.getTime(), now + 1_000)
})

test('Mongo rate-limit keys do not persist account identifiers or IP addresses', () => {
  const store = new CodicRateLimitStore({ prefix: 'codic-handoff-redeem', model: createSharedMongoModel(Date.now) })
  const id = store.keyFor('203.0.113.4')
  assert.equal(id.includes('203.0.113.4'), false)
  assert.equal(id.includes('account-123'), false)
})
