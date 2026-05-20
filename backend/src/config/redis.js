import Redis from 'ioredis'

let redis = null

const connectRedis = () => {
  const url = process.env.REDIS_URL
  if (!url) {
    console.warn('REDIS_URL not set. Redis cache skipped.')
    return null
  }

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    })

    redis.on('connect', () => console.log('Redis connected'))
    redis.on('error', (err) => console.error('Redis error:', err.message))

    return redis
  } catch (error) {
    console.error('Redis connection failed:', error.message)
    return null
  }
}

export { redis, connectRedis }
