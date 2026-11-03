'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const { browserSignIn } = require('./auth.cjs');
const token = 'fixture.payload.signature';
test('existing-domain browser sign-in verifies the account, binds state and uses a body-only one-shot callback', async () => {
  const checks = [];
  const flow = await browserSignIn({ webUrl: 'https://cybermindcli.info', apiBaseUrl: 'https://cybercli-api.onrender.com/api/v1', fetcher: async (url, options) => { checks.push({ url, options }); return Response.json({ exists: true, banned: false }); } });
  try {
    const url = new URL(flow.url), endpoint = `http://127.0.0.1:${url.searchParams.get('port')}/callback`;
    assert.equal(url.origin, 'https://cybermindcli.info'); assert.equal(url.pathname, '/auth/login'); assert.equal(url.searchParams.get('redirect'), 'ide'); assert.ok(!url.href.includes(token));
    assert.equal((await fetch(endpoint)).status, 400);
    const post = (state, origin) => fetch(endpoint, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ state, access_token: token, refresh_token: 'fixture-refresh' }) });
    assert.equal((await post('wrong', url.origin)).status, 400);
    assert.equal((await post(url.searchParams.get('state'), 'https://other.invalid')).status, 400);
    assert.equal(checks.length, 0);
    const response = await post(url.searchParams.get('state'), url.origin); assert.equal(response.status, 200); assert.ok(!(await response.text()).includes(token));
    assert.deepEqual(await flow.session, { access_token: token, refresh_token: 'fixture-refresh' });
    assert.equal(checks[0].url, 'https://cybercli-api.onrender.com/api/v1/auth/check-user'); assert.equal(checks[0].options.headers.Authorization, `Bearer ${token}`);
    await assert.rejects(post(url.searchParams.get('state'), url.origin));
  } finally { flow.cancel(); }
});
test('banned or unregistered accounts are never accepted; cancellation and timeout close the listener', async () => {
  for (const account of [{ exists: false }, { exists: true, banned: true }]) {
    const flow = await browserSignIn({ webUrl: 'https://cybermindcli.info', apiBaseUrl: 'https://cybercli-api.onrender.com/api/v1', fetcher: async () => Response.json(account) });
    const url = new URL(flow.url);
    const response = await fetch(`http://127.0.0.1:${url.searchParams.get('port')}/callback`, { method: 'POST', headers: { Origin: url.origin, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ state: url.searchParams.get('state'), access_token: token }) });
    assert.equal(response.status, 401); flow.cancel(); await assert.rejects(flow.session, /cancelled/);
  }
  const flow = await browserSignIn({ webUrl: 'https://cybermindcli.info', apiBaseUrl: 'https://cybercli-api.onrender.com/api/v1', timeoutMs: 5 });
  await assert.rejects(flow.session, /timed out/);
});
