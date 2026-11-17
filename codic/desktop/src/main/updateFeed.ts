export type CodicReleaseCatalog = {
  windows?: {
    available?: unknown
    version?: unknown
    sha512?: unknown
  }
}

export type CodicUpdateFeedReadiness = {
  ready: boolean
  version: string | null
}

/**
 * Auto-updates must fail closed when electron-builder did not record an
 * expected Windows publisher. HTTPS and a sha512 manifest hash authenticate
 * transport and bytes, but cannot authenticate who published the installer.
 */
export function hasTrustedUpdatePublisher(configText: string): boolean {
  const lines = configText.split(/\r?\n/)
  const publisherLine = lines.findIndex((line) => /^\s*publisherName\s*:/i.test(line))
  if (publisherLine < 0) return false

  const inlineValue = lines[publisherLine].replace(/^\s*publisherName\s*:\s*/i, '').trim()
  const publisherValue = inlineValue.replace(/^(["'])(.*)\1$/, '$2').trim().toLowerCase()
  if (publisherValue && !publisherValue.startsWith('#') && !['null', 'false', '[]'].includes(publisherValue)) return true

  for (const line of lines.slice(publisherLine + 1)) {
    if (line.trim() && !/^\s/.test(line)) break
    if (/^\s+-\s*(?:"[^"\r\n]+"|'[^'\r\n]+'|[^#\s][^\r\n]*)\s*$/.test(line)) return true
  }
  return false
}

const isVersion = (value: unknown): value is string =>
  typeof value === 'string' && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value)

const isSha512 = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9+/]{86}==$/.test(value) && Buffer.from(value, 'base64').length === 64

export function inspectCodicUpdateCatalog(catalog: CodicReleaseCatalog): CodicUpdateFeedReadiness {
  const release = catalog?.windows
  const version = isVersion(release?.version) ? release.version : null
  return {
    ready: release?.available === true && version !== null && isSha512(release?.sha512),
    version,
  }
}

export async function fetchCodicUpdateFeedReadiness(
  catalogUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<CodicUpdateFeedReadiness> {
  const response = await fetcher(catalogUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) throw new Error(`Release catalog request failed (${response.status}).`)
  const catalog = await response.json() as CodicReleaseCatalog
  return inspectCodicUpdateCatalog(catalog)
}
