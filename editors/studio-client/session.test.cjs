'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const { accountSession } = require('./session.cjs');
const jwt = exp => `fixture.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.signature`;
const secrets = () => { const values = new Map(); return { get: async key => values.get(key), store: async (key, value) => values.set(key, value), delete: async key => values.delete(key) }; };
test('valid sessions stay local; expired sessions serialize refresh rotation and persist both tokens together', async () => {
  const storage = secrets(); let calls = 0;
  const next = jwt(Math.floor(Date.now()/1000)+3600);
  const session = accountSession(storage, () => 'https://cybercli-api.onrender.com/api/v1', async (url, options) => {
    calls++; assert.equal(url, 'https://cybercli-api.onrender.com/api/v1/auth/ide-refresh'); assert.equal(JSON.parse(options.body).refresh_token, 'fixture-refresh');
    await new Promise(resolve => setTimeout(resolve, 10)); return Response.json({ access_token: next, refresh_token: 'rotated-refresh' });
  });
  const current = jwt(Math.floor(Date.now()/1000)+3600); await session.save({ access_token: current, refresh_token: 'fixture-refresh' });
  assert.equal(await session.token(), current); assert.equal(calls, 0);
  await session.save({ access_token: jwt(1), refresh_token: 'fixture-refresh' });
  assert.deepEqual(await Promise.all([session.token(), session.token(), session.token()]), [next,next,next]); assert.equal(calls, 1);
  assert.equal(await session.token(), next); await session.clear(); assert.equal(await session.token(), undefined);
});
test('legacy profiles remain usable; invalid, unrefreshable and unauthorized sessions fail visibly', async () => {
  const storage = secrets(); await storage.store('codeva.supabase.accessToken','legacy-fixture');
  const session = accountSession(storage, () => 'https://cybercli-api.onrender.com/api/v1', async () => Response.json({}, { status: 401 }));
  assert.equal(await session.token(), 'legacy-fixture');
  await session.save({ access_token: 'invalid' }); await assert.rejects(session.token(), /Sign in/);
  await session.save({ access_token: jwt(1) }); await assert.rejects(session.token(), /expired/);
  await session.save({ access_token: jwt(1), refresh_token: 'fixture-refresh' }); await assert.rejects(session.token(), /expired/);
});
test('a refresh cannot restore credentials after sign out or overwrite a different signed-in account', async () => {
  for (const action of ['clear', 'save']) {
    const storage = secrets(); let finish, started;
    const ready = new Promise(resolve => started = resolve);
    const session = accountSession(storage, () => 'https://cybercli-api.onrender.com/api/v1', async () => {
      started(); return new Promise(resolve => finish = () => resolve(Response.json({ access_token: jwt(Math.floor(Date.now()/1000)+3600), refresh_token: 'old-rotated' })));
    });
    await session.save({ access_token: jwt(1), refresh_token: 'old-refresh' });
    const pending = assert.rejects(session.token(), /account changed/);
    await ready;
    const next = jwt(Math.floor(Date.now()/1000)+7200);
    if (action === 'clear') await session.clear();
    else await session.save({ access_token: next, refresh_token: 'new-account-refresh' });
    finish(); await pending;
    assert.equal(await session.token(), action === 'clear' ? undefined : next);
  }
});
