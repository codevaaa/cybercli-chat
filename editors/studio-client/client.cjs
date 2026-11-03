/*---------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * Codeva API client additions.
 *--------------------------------------------------------------------------------------------*/
'use strict';
const MATERIAL_ABSENT = 'The material does not contain it.';
function apiUrl(value) {
	const url = new URL(value);
	if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) { throw new Error('Use HTTPS or a loopback Codeva API URL'); }
	return url.href.replace(/\/$/, '');
}
function materialDisplay(value) {
	const valid = value?.supported === true && Array.isArray(value.citations) && value.citations.length > 0 && value.citations.every(c => typeof c.quote === 'string' && c.quote.length && c.chunk_id && c.material_id && (Number.isInteger(c.page) && c.page > 0 || typeof c.note_id === 'string' && c.note_id.length));
	return valid && value.answer === value.citations.map(c => c.quote).join('\n\n') ? value : { answer: MATERIAL_ABSENT, citations: [], supported: false };
}
class StudioClient {
	constructor({ baseUrl, getToken, fetcher = fetch }) { this.baseUrl = apiUrl(baseUrl); this.getToken = getToken; this.fetcher = fetcher; }
	async request(path, method = 'GET', body, signal) {
		if (!/^\/(?:ide\/me|studio\/(?:projects(?:\/[a-f0-9]{24}(?:\/(?:dossier|run|listener|fix|preview|judges|rollback|complete|click|meter|replay|materials|material-question|design|report|inline|reviews\/[a-f0-9-]{36}|spec\/[a-f0-9-]{36}))?)?|tab))$/.test(path)) { throw new Error('Unsupported studio action'); }
		const token = await this.getToken();
		if (!token) { throw new Error('Sign in to your existing Codeva account'); }
		const response = await this.fetcher(this.baseUrl + path, { method, redirect: 'error', signal, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
		const value = await response.json();
		if (!response.ok) { throw new Error(value.error || 'Codeva API operation failed'); }
		return path.endsWith('/material-question') ? materialDisplay(value) : value;
	}
	async progress(id, after, signal, onEvent) {
		if (!/^[a-f0-9]{24}$/.test(id)) { throw new Error('Invalid project id'); }
		const token = await this.getToken();
		if (!token) { throw new Error('Sign in to your existing Codeva account'); }
		const response = await this.fetcher(`${this.baseUrl}/studio/projects/${id}/progress?after=${Math.max(0, after)}`, { redirect: 'error', headers: { Authorization: `Bearer ${token}` }, signal });
		if (!response.ok || !response.body) { throw new Error('Progress stream unavailable'); }
		const decoder = new TextDecoder(); let buffer = '';
		for await (const bytes of response.body) {
			buffer += decoder.decode(bytes, { stream: true }).replace(/\r/g, '');
			if (buffer.length > 1000000) { throw new Error('Progress frame exceeds limits'); }
			let index;
			while ((index = buffer.indexOf('\n\n')) >= 0) {
				const frame = buffer.slice(0, index); buffer = buffer.slice(index + 2);
				const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n');
				if (data) { await onEvent(JSON.parse(data)); }
			}
		}
	}
}
module.exports = { StudioClient, apiUrl, materialDisplay, MATERIAL_ABSENT };
