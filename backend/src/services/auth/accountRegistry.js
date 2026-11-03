export async function syncAccountRegistry({ store, identity, platform = 'web', ip = '', now = new Date() }) {
  if (!identity?.id) throw Object.assign(new Error('Unauthorized'), { status: 401 })
  const profile = identity.auth_profile || {}
  const query = { supabase_id: identity.id, status: { $nin: ['banned', 'suspended'] } }
  const update = {
    $setOnInsert: { supabase_id: identity.id, email: identity.email || '',
      name: String(profile.name || '').slice(0, 200), avatar_url: String(profile.avatar_url || '').slice(0, 2000),
      provider: String(profile.provider || 'email').slice(0, 30), signup_ip: ip },
    $set: { last_ip: ip, last_seen_at: now },
    $inc: { login_count: 1 }, $addToSet: { platforms: String(platform).slice(0, 20) },
  }
  try {
    return await store.findOneAndUpdate(query, update, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true })
  } catch (error) {
    if (error.code !== 11000) throw error
    // A concurrent first login may have created the unique Supabase id. A ban
    // can also make the guarded upsert collide; never reactivate that account.
    const current = await store.findOne({ supabase_id: identity.id })
    if (['banned', 'suspended'].includes(current?.status)) throw Object.assign(new Error(current.ban_reason || 'This account has been suspended.'), { status: 403 })
    const user = await store.findOneAndUpdate(query, update, { new: true, runValidators: true })
    if (!user) throw Object.assign(new Error('Could not connect your account. Please try again.'), { status: 503 })
    return user
  }
}
