import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { Platform } from 'react-native'
import { supabase } from './supabase'
import { syncUserToBackend } from './userSync'

WebBrowser.maybeCompleteAuthSession()

export interface AuthResult {
  ok: boolean
  error?: string
  banned?: boolean
  user?: { id: string; email: string; name?: string }
}

/**
 * Build the OAuth redirect target.
 * - Web: our own /callback route on the SAME origin the app runs on, so we
 *   never bounce to the Supabase project's marketing Site URL.
 * - Native: the codeva:// deep link, handled by the in-app browser session.
 *
 * NOTE: These exact URLs must be whitelisted in Supabase →
 * Authentication → URL Configuration → Redirect URLs. See AUTH_SETUP.md.
 */
function getRedirectTo(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/callback`
  }
  return makeRedirectUri({ scheme: 'codeva', path: 'callback' })
}

/** Email + password sign in via Supabase. */
export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false, error: error.message }
  return finalizeUser(data.user)
}

/** Email + password sign up via Supabase. */
export async function signUpWithEmail(name: string, email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name }, emailRedirectTo: getRedirectTo() },
  })
  if (error) return { ok: false, error: error.message }
  if (!data.user) return { ok: true } // email confirmation required
  return finalizeUser(data.user, name)
}

/**
 * Google OAuth (PKCE).
 * - Web: redirect flow on our own origin; supabase-js exchanges the ?code on return.
 * - Native: open an in-app browser, capture the codeva:// redirect, exchange the
 *   ?code for a session manually.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const redirectTo = getRedirectTo()

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        // Web: let supabase-js do the browser redirect itself.
        // Native: we open the URL ourselves in a controlled in-app browser.
        skipBrowserRedirect: Platform.OS !== 'web',
        queryParams: { prompt: 'select_account' },
      },
    })

    if (error) return { ok: false, error: error.message }

    // Web: the page is now redirecting to Google → back to /callback. Nothing
    // more to do here; the callback screen finishes the sign-in.
    if (Platform.OS === 'web') return { ok: true }

    if (!data?.url) return { ok: false, error: 'No OAuth URL returned' }

    // Native: open Google in an in-app browser and wait for the codeva:// return.
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
    if (result.type !== 'success' || !result.url) {
      return { ok: false, error: 'Sign in cancelled' }
    }

    // PKCE returns ?code=… — exchange it for a real session.
    const code = extractParam(result.url, 'code')
    if (!code) {
      // Some providers still return tokens in the hash — handle that too.
      const access_token = extractParam(result.url, 'access_token')
      const refresh_token = extractParam(result.url, 'refresh_token')
      if (access_token && refresh_token) {
        const { data: s, error: e } = await supabase.auth.setSession({ access_token, refresh_token })
        if (e) return { ok: false, error: e.message }
        return finalizeUser(s.user)
      }
      return { ok: false, error: 'No authorization code in redirect' }
    }

    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) return { ok: false, error: exchangeError.message }
    return finalizeUser(sessionData.user)
  } catch (err: any) {
    return { ok: false, error: err.message || 'Google sign in failed' }
  }
}

/** Sign out everywhere. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

/** Current session user (used on app boot and by the web callback poller). */
export async function getCurrentUser(): Promise<AuthResult['user'] | null> {
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) return null
  return {
    id: user.id,
    email: user.email!,
    name: user.user_metadata?.full_name || user.user_metadata?.name,
  }
}

/** Send password reset email. */
export async function resetPassword(email: string): Promise<AuthResult> {
  const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined'
    ? `${window.location.origin}/callback`
    : makeRedirectUri({ scheme: 'codeva', path: 'callback' })
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Shared post-auth step: register/sync the user in our backend (for the
 * moderation + ban registry) and refuse entry if the account is banned.
 */
async function finalizeUser(user: any, fallbackName?: string): Promise<AuthResult> {
  if (!user) return { ok: false, error: 'No user returned' }
  const name = user.user_metadata?.full_name || user.user_metadata?.name || fallbackName

  const sync = await syncUserToBackend()
  if (sync.banned) {
    // Banned accounts get no session.
    await supabase.auth.signOut().catch(() => {})
    return { ok: false, banned: true, error: sync.reason || 'This account has been suspended.' }
  }

  return { ok: true, user: { id: user.id, email: user.email, name } }
}

/** Extract a query/hash param from a redirect URL. */
function extractParam(url: string, key: string): string | undefined {
  const params: Record<string, string> = {}
  const hashIndex = url.indexOf('#')
  const queryIndex = url.indexOf('?')
  const grab = (str: string) => {
    str.split('&').forEach((pair) => {
      const [k, v] = pair.split('=')
      if (k && v) params[k] = decodeURIComponent(v)
    })
  }
  if (queryIndex !== -1) {
    const end = hashIndex !== -1 && hashIndex > queryIndex ? hashIndex : url.length
    grab(url.slice(queryIndex + 1, end))
  }
  if (hashIndex !== -1) grab(url.slice(hashIndex + 1))
  return params[key]
}
