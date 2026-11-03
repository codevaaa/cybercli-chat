import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not configured. Auth features will be degraded.')
}

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
  },
}) : null

export const verifyJWT = async (token) => {
  if (!supabaseUrl || !supabaseKey) {
    return { user: null, error: new Error('Account sign-in is not configured'), unavailable: true }
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error) throw error
    return { user, error: null }
  } catch (error) {
    return { user: null, error, unavailable: error?.name === 'AuthRetryableFetchError' || error?.status >= 500 || /fetch|network|ENOTFOUND/i.test(error?.message || '') }
  }
}

export default supabase
