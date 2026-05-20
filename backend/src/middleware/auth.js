import { verifyJWT } from '../config/supabase.js'

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]
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

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
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
