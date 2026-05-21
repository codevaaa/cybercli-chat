import { verifyJWT } from '../config/supabase.js'
import ApiKey from '../models/ApiKey.js'

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  // Check if it's a CyberCli API key
  let token = authHeader
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  }

  if (token.startsWith('sk_cyber_')) {
    try {
      const apiKeyDoc = await ApiKey.findOne({ key: token, is_active: true })
      if (!apiKeyDoc) {
        return res.status(401).json({ error: 'Invalid or deactivated API key' })
      }
      // Update last used time asynchronously
      ApiKey.updateOne({ _id: apiKeyDoc._id }, { $set: { last_used_at: new Date() } }).catch(console.error)
      
      req.user = {
        id: apiKeyDoc.user_id,
        email: `api-user-${apiKeyDoc.user_id.substring(0, 8)}@cybercli.local`,
        plan: 'pro', // API Key users are treated as Pro
      }
      return next()
    } catch (err) {
      return next(err)
    }
  }

  // Fallback to Supabase JWT verification
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Invalid authorization header format' })
  }

  const { user, error } = await verifyJWT(token)

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  req.user = {
    id: user.id,
    email: user.email,
    plan: user.user_metadata?.plan_tier || 'free',
  }

  next()
}

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return next()
  }

  let token = authHeader
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  }

  if (token.startsWith('sk_cyber_')) {
    try {
      const apiKeyDoc = await ApiKey.findOne({ key: token, is_active: true })
      if (apiKeyDoc) {
        ApiKey.updateOne({ _id: apiKeyDoc._id }, { $set: { last_used_at: new Date() } }).catch(console.error)
        req.user = {
          id: apiKeyDoc.user_id,
          email: `api-user-${apiKeyDoc.user_id.substring(0, 8)}@cybercli.local`,
          plan: 'pro',
        }
      }
    } catch (err) {
      // Ignore errors for optional authentication
    }
    return next()
  }

  // Fallback to Supabase JWT
  if (authHeader.startsWith('Bearer ')) {
    const { user } = await verifyJWT(token)
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        plan: user.user_metadata?.plan_tier || 'free',
      }
    }
  }

  next()
}
