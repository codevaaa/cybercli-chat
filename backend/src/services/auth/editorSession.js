import { createClient } from '@supabase/supabase-js'
import User from '../../models/User.js'
// Refresh has no account-changing side effects. Use an isolated Supabase
// client so a desktop session never replaces the API's shared auth client.
export async function refreshEditorSession(req, res) {
  const token = req.body?.refresh_token
  if (typeof token !== 'string' || token.length < 16 || token.length > 2048 || /\s/.test(token)) return res.status(400).json({ error: 'A valid account refresh session is required' })
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'Account authentication is unavailable' })
  try {
    const auth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data, error } = await auth.auth.refreshSession({ refresh_token: token })
    if (error || !data?.session || !data.user) return res.status(401).json({ error: 'Sign in to Codeva again' })
    const account = await User.findOne({ supabase_id: data.user.id }).select('status').lean()
    if (!account || ['banned', 'suspended'].includes(account.status)) return res.status(403).json({ error: 'This account cannot access Codeva' })
    res.setHeader('Cache-Control', 'no-store')
    res.json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_at: data.session.expires_at })
  } catch { res.status(503).json({ error: 'Could not refresh this Codeva session' }) }
}
