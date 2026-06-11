import ApiKey from '../models/ApiKey.js'
import User from '../models/User.js'

/**
 * Middleware to authenticate API requests using sk-codeva-xxx keys.
 */
export const requireApiKey = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          message: "Missing or invalid Authorization header. Expected 'Bearer sk-codeva-...'",
          type: "invalid_request_error",
          code: "missing_api_key"
        }
      })
    }

    const rawKey = authHeader.split(' ')[1]
    
    // Hash the raw key to look it up in the database
    const keyHash = ApiKey.hashKey(rawKey)
    
    const apiKeyDoc = await ApiKey.findOne({ key_hash: keyHash })
    if (!apiKeyDoc || !apiKeyDoc.is_active) {
      return res.status(401).json({
        error: {
          message: "Invalid or revoked API key.",
          type: "invalid_request_error",
          code: "invalid_api_key"
        }
      })
    }

    // Optional: check expiration
    if (apiKeyDoc.expires_at && apiKeyDoc.expires_at < new Date()) {
      return res.status(401).json({
        error: {
          message: "API key has expired.",
          type: "invalid_request_error",
          code: "expired_api_key"
        }
      })
    }

    // Attach user to request
    const user = await User.findOne({ supabase_id: apiKeyDoc.user_id })
    if (!user || user.isBanned()) {
      return res.status(403).json({
        error: {
          message: "Account is suspended or banned.",
          type: "invalid_request_error",
          code: "account_suspended"
        }
      })
    }

    // Update last used asynchronously
    ApiKey.updateOne(
      { _id: apiKeyDoc._id },
      { $set: { last_used_at: new Date() }, $inc: { usage_count: 1 } }
    ).exec()

    req.user = user
    req.apiKey = apiKeyDoc
    next()
  } catch (error) {
    console.error('API Key Auth Error:', error)
    res.status(500).json({
      error: {
        message: "Internal server error during authentication.",
        type: "api_error"
      }
    })
  }
}
