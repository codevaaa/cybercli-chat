import rateLimit from 'express-rate-limit'

/**
 * Basic in-memory rate limiter per IP/Key. 
 * For a distributed environment (100k users), this should be backed by RedisStore.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req) => {
    // Return limits based on API key tier or user plan
    if (req.apiKey && req.apiKey.rateLimit) {
      return req.apiKey.rateLimit
    }
    if (req.user && req.user.plan === 'enterprise') return 1000
    if (req.user && req.user.plan === 'pro') return 600
    return 60 // Free tier default: 60 requests per minute
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        message: "Rate limit exceeded. Please slow down your requests.",
        type: "rate_limit_error",
        code: "rate_limit_exceeded"
      }
    })
  },
  keyGenerator: (req) => {
    // If using API key, rate limit by key. Otherwise fallback to IP.
    return req.apiKey ? req.apiKey.key_hash : req.ip
  }
})
