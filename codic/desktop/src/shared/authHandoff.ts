const ticketPattern = /^[A-Za-z0-9_-]{43}$/

export function parseCodicAuthCallback(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    if (url.protocol.toLowerCase() !== 'codic:' || url.hostname.toLowerCase() !== 'auth' || url.pathname !== '/callback') return null
    if (url.username || url.password || url.port || url.hash) return null
    const entries = [...url.searchParams.entries()]
    if (entries.length !== 1 || entries[0][0] !== 'ticket' || !ticketPattern.test(entries[0][1])) return null
    return `codic://auth/callback?ticket=${encodeURIComponent(entries[0][1])}`
  } catch {
    return null
  }
}

export function findCodicAuthCallback(arguments_: unknown): string | null {
  if (!Array.isArray(arguments_)) return null
  for (const value of arguments_) {
    const callback = parseCodicAuthCallback(value)
    if (callback) return callback
  }
  return null
}
