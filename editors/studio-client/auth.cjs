'use strict';
const http = require('node:http');
const { randomBytes, timingSafeEqual } = require('node:crypto');
const { apiUrl } = require('./client.cjs');
const jwt = value => typeof value === 'string' && value.length < 12000 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
async function browserSignIn({ webUrl, apiBaseUrl, fetcher = fetch, timeoutMs = 300000 }) {
  const website = new URL(apiUrl(webUrl)), api = apiUrl(apiBaseUrl);
  const state = randomBytes(32).toString('base64url');
  let resolve, reject, timer, finished = false, processing = false;
  const session = new Promise((yes, no) => { resolve = yes; reject = no; });
  // The owner attaches an await after opening the browser. Cancellation before
  // then must not create an unhandled rejection.
  void session.catch(() => {});
  const complete = (error, value) => {
    if (finished) return;
    finished = true; clearTimeout(timer); server.close(); server.closeAllConnections();
    error ? reject(error) : resolve(value);
  };
  const server = http.createServer(async (req, res) => {
    const respond = (status, message) => { res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'" }); res.end(message); };
    if (finished || processing) return respond(409, 'Sign-in request already used.');
    if (req.method !== 'POST' || req.url !== '/callback' || req.headers.origin !== website.origin || !/^application\/x-www-form-urlencoded(?:;|$)/i.test(req.headers['content-type'] || '')) return respond(400, 'Invalid editor sign-in request.');
    try {
      const pieces = []; let size = 0;
      for await (const piece of req) { size += piece.length; if (size > 20000) return respond(413, 'Sign-in request is too large.'); pieces.push(piece); }
      const form = new URLSearchParams(Buffer.concat(pieces).toString('utf8')), supplied = form.get('state') || '';
      if (supplied.length !== state.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(state)) || !jwt(form.get('access_token'))) return respond(400, 'Invalid editor sign-in state or session.');
      processing = true;
      const token = form.get('access_token');
      const check = await fetcher(`${api}/auth/check-user`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' });
      const account = await check.json();
      if (!check.ok || !account.exists || account.banned) throw new Error('The Codeva API did not authorize this account.');
      // Refresh credentials never appear in a URL, response, log or workspace.
      const refresh = form.get('refresh_token') || '';
      if (refresh.length > 2048) throw new Error('Invalid account refresh session.');
      respond(200, 'Signed in to MrCodevaa. You can return to the editor and close this tab.');
      setImmediate(() => complete(null, { access_token: token, refresh_token: refresh }));
    } catch { processing = false; respond(401, 'Codeva could not verify this account. Please sign in again.'); }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  await new Promise((yes, no) => { server.once('error', no); server.listen(0, '127.0.0.1', yes); });
  const url = new URL('/auth/login', website);
  url.search = new URLSearchParams({ redirect: 'ide', port: String(server.address().port), state }).toString();
  timer = setTimeout(() => complete(new Error('Editor sign-in timed out. Please try again.')), timeoutMs);
  return { url: url.href, session, cancel: () => complete(new Error('Editor sign-in cancelled.')) };
}
module.exports = { browserSignIn };
