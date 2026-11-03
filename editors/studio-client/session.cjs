'use strict';
const { apiUrl } = require('./client.cjs');
const sessionKey = 'codeva.supabase.session';
function accountSession(secrets, baseUrl, fetcher = fetch) {
  let refreshing, generation = 0;
  return {
    async save(session) { generation++; await secrets.store(sessionKey, JSON.stringify(session)); },
    async clear() { generation++; await secrets.delete(sessionKey); await secrets.delete('codeva.supabase.accessToken'); await secrets.delete('codeva.supabase.refreshToken'); },
    async token() {
      const encoded = await secrets.get(sessionKey);
      if (!encoded) return secrets.get('codeva.supabase.accessToken'); // Existing signed-in profiles remain usable.
      const session = JSON.parse(encoded);
      let expiry;
      try { expiry = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64url').toString()).exp; } catch { throw new Error('Sign in to Codeva again'); }
      if (Number.isFinite(expiry) && expiry * 1000 > Date.now() + 60000) return session.access_token;
      if (!session.refresh_token) throw new Error('Your Codeva session expired. Sign in again.');
      if (!refreshing) refreshing = (async () => {
        const currentGeneration = generation;
        const response = await fetcher(`${apiUrl(baseUrl())}/auth/ide-refresh`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: session.refresh_token }) });
        if (!response.ok) throw new Error('Your Codeva session expired. Sign in again.');
        const next = await response.json(); if (!next.access_token || !next.refresh_token) throw new Error('Codeva returned an invalid refreshed session');
        if (currentGeneration !== generation) throw new Error('The Codeva account changed during refresh');
        await secrets.store(sessionKey, JSON.stringify(next)); return next.access_token;
      })().finally(() => { refreshing = null; });
      return refreshing;
    },
  };
}
module.exports = { accountSession };
