/**
 * Codevaa theme helpers.
 * Brand dark (#0A0A0F + #D97757) is the default site theme.
 * Light mode is opt-in for the in-app workspace only via the `.light` class.
 */

export const CODEVAA_DARK = 'dark'
export const CODEVAA_LIGHT = 'light'

/**
 * Apply appearance theme to <html>.
 * @param {'dark'|'light'|'system'} theme
 * @param {{ forceDark?: boolean }} [opts]
 */
export function applyAppearanceTheme(theme = 'dark', opts = {}) {
  const root = document.documentElement
  const forceDark = Boolean(opts.forceDark)
  const preferred = (theme || 'dark').toLowerCase()

  let resolved = preferred
  if (forceDark) {
    resolved = 'dark'
  } else if (preferred === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  if (resolved === 'light') {
    root.classList.remove(CODEVAA_DARK)
    root.classList.add(CODEVAA_LIGHT)
  } else {
    root.classList.remove(CODEVAA_LIGHT)
    root.classList.add(CODEVAA_DARK)
  }

  root.style.colorScheme = resolved === 'light' ? 'light' : 'dark'
  return resolved
}

export function isPublicMarketingPath(pathname = '') {
  if (!pathname) return true
  if (pathname.startsWith('/app') || pathname.startsWith('/chat') || pathname.startsWith('/settings')) {
    return false
  }
  if (pathname.startsWith('/auth')) return true
  return true
}
