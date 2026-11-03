'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const { ghost, dossierStatus } = require('./workbench.cjs');
test('tab only calls the local studio endpoint and paints nothing when off, slow, malformed or cancelled', async () => {
  const calls = [];
  assert.equal(await ghost({ async request(path) { calls.push(path); return { completion: 'return value;', budget_ms: 100 }; } }, { prefix: 'return' }), 'return value;');
  assert.deepEqual(calls, ['/studio/tab']);
  assert.equal(await ghost({ async request() { throw new Error('A pre-cancelled request must never start'); } }, {}, { isCancellationRequested: true }), '');
  assert.equal(await ghost({ async request() { throw new Error('Off'); } }, {}), '');
  assert.equal(await ghost({ async request() { return { completion: 'wrong route', budget_ms: 200 }; } }, {}), '');
  assert.equal(await ghost({ async request() { return { completion: 'late', timed_out: true, budget_ms: 100 }; } }, {}), '');
  const start = performance.now();
  assert.equal(await ghost({ async request() { await new Promise(r => setTimeout(r, 120)); return { completion: 'late', budget_ms: 100 }; } }, {}), '');
  assert.ok(performance.now() - start < 115);
});
test('status uses stored task evidence, never a guessed success', () => {
  assert.equal(dossierStatus({ state: 'live', tasks: [] }), 'live');
  assert.equal(dossierStatus({ tasks: [{ id: 'a', status: 'tested' }], current_task: 'a' }), 'PASS');
  assert.equal(dossierStatus({ tasks: [{ status: 'failed' }] }), 'FAIL');
  assert.equal(dossierStatus({ blocked: { reason: 'Missing proof' }, tasks: [{ status: 'tested' }] }), 'FAIL');
});
