/*---------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('../../frontend/node_modules/jsdom');
const { StudioClient, apiUrl, materialDisplay, MATERIAL_ABSENT } = require('./client.cjs');
const { launchPreview } = require('./preview.cjs');

test('sidebar client uses only the configured studio API, bearer account auth and explicit routes', async () => {
	const calls = [], client = new StudioClient({ baseUrl: 'http://localhost:3000/api/v1', getToken: async () => 'account-session', fetcher: async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ dossier: { prompt_original: '  नमस्ते\r\n🌏  ' } }) }; } });
	assert.equal((await client.request('/studio/projects/507f1f77bcf86cd799439011/dossier')).dossier.prompt_original, '  नमस्ते\r\n🌏  ');
	await client.request('/ide/me');
	assert.ok(calls[1].url.endsWith('/ide/me'));
	assert.equal(calls[0].options.headers.Authorization, 'Bearer account-session');
	await assert.rejects(client.request('/completions', 'POST', {}));
	assert.throws(() => apiUrl('http://external.invalid/api/v1'));
	await assert.rejects(new StudioClient({ baseUrl: 'http://localhost:3000/api/v1', getToken: async () => null }).request('/studio/projects'));
});
test('sidebar has the same locked refusal and never displays an uncited or altered material answer', () => {
	assert.equal(materialDisplay({ answer: 'Invented fact', supported: true, citations: [] }).answer, MATERIAL_ABSENT);
	assert.equal(materialDisplay({ answer: 'Different quote', supported: true, citations: [{ material_id: 'f', chunk_id: 'c', page: 1, quote: 'Actual quote' }] }).answer, MATERIAL_ABSENT);
	assert.equal(materialDisplay({ answer: 'Actual quote', supported: true, citations: [{ material_id: 'f', chunk_id: 'c', page: 1, quote: 'Actual quote' }] }).supported, true);
});
test('sidebar DOM shows Codeva account and chat preferences with exact project prompt and review evidence', () => {
	const dom = new JSDOM('<main id="app"></main>', { runScripts: 'outside-only' }), sent = [];
	dom.window.acquireVsCodeApi = () => ({ postMessage: value => sent.push(value) });
	dom.window.codevaBrandIcon = 'data:image/svg+xml;base64,' + fs.readFileSync(__dirname + '/icon.svg').toString('base64');
	dom.window.HTMLElement.prototype.scrollIntoView = () => {};
	dom.window.eval(fs.readFileSync(__dirname + '/view.js', 'utf8'));
	const send = data => dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data }));
	assert.equal(sent[0].action, 'ready', 'The webview must request initial state after registering its listener');
	assert.equal(dom.window.document.querySelector('.brand-mark').src, dom.window.codevaBrandIcon);
	send({ type: 'focusSettings' });
	assert.equal(dom.window.document.querySelector('.settings-panel').hidden, false);
	send({ type: 'focusAccount' });
	assert.equal(dom.window.document.activeElement.textContent, 'Sign in to Codeva');
	send({ type: 'account', value: { email: 'builder@example.test', plan: 'pro' } });
	assert.match(dom.window.document.body.textContent, /builder@example\.test/);
	assert.equal([...dom.window.document.querySelectorAll('button')].find(b => b.textContent === 'Sign out').hidden, false);
	send({ type: 'personas', value: { personas: [{ id: 'backend-architect', name: 'Backend Architect', division: 'Engineering' }] } });
	send({ type: 'preferences', value: { style: 'detailed', language: 'hi', agentId: 'backend-architect' } });
	assert.equal(dom.window.document.querySelector('[aria-label="Response style"]').value, 'detailed');
	assert.equal(dom.window.document.querySelector('[aria-label="Response language"]').value, 'hi');
	assert.equal(dom.window.document.querySelector('[aria-label="Agent persona"]').value, 'backend-architect');
	const original = '  नमस्ते\r\n🌏  ';
	send({ type: 'dossier', value: { meter: { free: 0, mid: 2, frontier: 1 }, dossier: { prompt_original: original, state: 'wait_for_user', events: [], spec: { will_build: [{ id: 'goal', final_text: 'Notes', status: 'pending' }], must_never: [], acceptance: [] }, judge: [{ agent_id: 'Judge', model: 'mid', lines: [{ verdict: 'pass', evidence: 'source A' }] }, { agent_id: 'Judge-cheap', model: 'cheap', lines: [{ verdict: 'fail', evidence: 'source B' }] }] } } });
	assert.equal(dom.window.document.querySelector('pre').textContent, original);
	assert.match(dom.window.document.body.textContent, /mid 2, frontier 1/);
	assert.match(dom.window.document.body.textContent, /Judge-cheap/);
	const accept = [...dom.window.document.querySelectorAll('button')].find(b => b.textContent === 'Accept'); accept.click();
	assert.equal(sent.at(-1).body.status, 'accepted');
	const field = dom.window.document.querySelector('section textarea');
	field.value = 'User edited notes'; field.dispatchEvent(new dom.window.Event('input')); accept.click();
	assert.equal(sent.at(-1).body.status, 'edited'); assert.equal(sent.at(-1).body.text, 'User edited notes');
	send({ type: 'materialQuestion', value: { answer: MATERIAL_ABSENT, citations: [] } });
	assert.match(dom.window.document.body.textContent, /The material does not contain it\./);
	send({ type: 'replay', value: { status: 'failed', steps: [{ seq: 1, tool: 'test', status: 'missing_output' }] } });
	assert.match(dom.window.document.body.textContent, /missing_output/);
	dom.window.close();
});
test('private preview launcher delivers the server token only in a single-use POST page, never in the browser URL', async () => {
	let body, browserUrl;
	const token = 'a'.repeat(64);
	const launcher = await launchPreview({ launch_url: 'http://127.0.0.1:3000/api/v1/studio/preview/507f1f77bcf86cd799439011/session', launch_token: token }, async url => { browserUrl = url; const response = await fetch(url); body = await response.text(); return true; });
	assert.ok(!browserUrl.includes(token)); assert.match(body, /method="post"/); assert.ok(body.includes(token));
	await assert.rejects(fetch(browserUrl)); launcher.dispose();
});
