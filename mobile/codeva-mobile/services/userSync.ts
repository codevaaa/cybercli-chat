import { API_BASE } from '@/constants/config'
import { supabase } from './supabase'

export interface SyncResult {
  ok: boolean
  banned?: boolean
  reason?: string
  plan?: string
}

/**
 * Register/refresh this user in the backend user registry and check ban status.
 * Called right after every successful login/signup. The backend upserts a row
 * keyed by the Supabase user id, records device/last-seen, and returns whether
 * the account is banned so we can refuse entry.
 *
 * Fails open on network errors (so a backend hiccup never locks users out),
 * but a definitive `banned: true` from the server is always enforced.
 */
export async function syncUserToBackend(): Promise<SyncResult> {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return { ok: false }

    const res = await fetch(`${API_BASE}/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ platform: 'mobile' }),
    })

    if (res.status === 403) {
      const body = await res.json().catch(() => ({}))
      return { ok: true, banned: true, reason: body.reason || 'Account suspended' }
    }

    if (!res.ok) return { ok: false }

    const body = await res.json().catch(() => ({}))
    return { ok: true, banned: !!body.banned, reason: body.reason, plan: body.plan }
  } catch {
    // Network/backend down — fail open. Ban is only enforced on an explicit 403.
    return { ok: false }
  }
}

/** Lightweight ban re-check used on app boot for already-logged-in users. */
export async function checkBanStatus(): Promise<SyncResult> {
  return syncUserToBackend()
}
