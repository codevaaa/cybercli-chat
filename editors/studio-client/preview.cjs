/*---------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
const http = require('node:http');
const { randomBytes } = require('node:crypto');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function launchPreview(value, openExternal) {
	const launch = new URL(value.launch_url);
	if (!/^[a-f0-9]{64}$/.test(value.launch_token) || !['https:', 'http:'].includes(launch.protocol) || launch.username || launch.password || launch.search || launch.hash || !/^\/api\/v1\/studio\/preview\/[a-f0-9]{24}\/session$/.test(launch.pathname)) { throw new Error('Invalid private preview launcher'); }
	const nonce = randomBytes(20).toString('hex'); let used = false;
	const server = http.createServer((req, res) => {
		if (used || req.method !== 'GET' || req.url !== `/${nonce}` || req.headers.host !== `127.0.0.1:${server.address().port}`) { res.writeHead(404); res.end(); return; }
		used = true;
		res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; form-action ${launch.origin}; base-uri 'none'` });
		res.end(`<!doctype html><title>Codeva Private Preview</title><form id="launch" method="post" action="${escape(launch.href)}"><input type="hidden" name="token" value="${escape(value.launch_token)}"><button>Open Private Preview</button></form><script nonce="${nonce}">document.getElementById('launch').submit()</script>`);
		server.close(); clearTimeout(timer);
	});
	const timer = setTimeout(() => server.close(), 30000); timer.unref();
	await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
	try { if (!await openExternal(`http://127.0.0.1:${server.address().port}/${nonce}`)) { throw new Error('Could not open preview browser'); } }
	catch (error) { clearTimeout(timer); server.close(); throw error; }
	return { dispose() { clearTimeout(timer); server.close(); } };
}
module.exports = { launchPreview };
