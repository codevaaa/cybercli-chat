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
