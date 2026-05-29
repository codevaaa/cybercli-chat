import { CYBERMIND_VERSION } from '@cybermind/shared';

let cachedLatest: string | null = null;
let lastCheck = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Check npm registry for the latest version of @cybercli_chat/cli.
 * Returns the latest version string or null if check fails.
 */
export async function checkLatestVersion(): Promise<string | null> {
  const now = Date.now();
  if (cachedLatest && now - lastCheck < CACHE_TTL) {
    return cachedLatest;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      'https://registry.npmjs.org/@cybercli_chat%2Fcli',
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = (await res.json()) as { 'dist-tags': { latest: string } };
    const latest = data['dist-tags']?.latest ?? null;

    if (latest) {
      cachedLatest = latest;
      lastCheck = now;
    }
    return latest;
  } catch {
    return null;
  }
}

/**
 * Compare two semver strings. Returns:
 *  -1 if a < b
 *   0 if a == b
 *   1 if a > b
 */
function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na > nb ? 1 : -1;
  }
  return 0;
}

/**
 * Check if a newer version is available and return an update message.
 */
export async function getUpdateMessage(): Promise<string | null> {
  const latest = await checkLatestVersion();
  if (!latest) return null;
  if (compareSemver(CYBERMIND_VERSION, latest) < 0) {
    return `A new version of ${CYBERMIND_VERSION} is available: ${latest}. Run "npm install -g @cybercli_chat/cli@${latest}" to update.`;
  }
  return null;
}
