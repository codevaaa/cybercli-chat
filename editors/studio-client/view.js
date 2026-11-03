/*---------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
(() => {
	const host = acquireVsCodeApi(), app = document.getElementById('app');
	const t = value => window.codevaStrings?.[value] || value;
	const drafts = new Map(); let projectId, preferences = { style: 'balanced', language: 'auto', agentId: '' }, personas = [];
	const send = (action, body = {}, extra = {}) => host.postMessage({ action, body, ...extra });
	const el = (tag, text, parent = app) => { const node = document.createElement(tag); if (text !== undefined) { node.textContent = text; } parent.appendChild(node); return node; };
	const button = (text, run, parent, secondary = false) => { const node = el('button', text, parent); node.type = 'button'; if (secondary) { node.className = 'secondary'; } node.onclick = run; return node; };
	const input = (label, parent, multiline = false, key = label) => { const node = el(multiline ? 'textarea' : 'input', undefined, parent); node.setAttribute('aria-label', label); node.placeholder = label; node.value = drafts.get(key) || ''; node.oninput = () => drafts.set(key, node.value); return node; };
	const brand = el('header'); brand.className = 'brand';
	const brandIcon = el('img', undefined, brand); brandIcon.className = 'brand-mark'; brandIcon.alt = 'Prism M'; brandIcon.src = window.codevaBrandIcon;
	const brandText = el('div', undefined, brand); el('h1', 'MrCodevaa', brandText); el('div', 'Your Codeva workspace', brandText).className = 'muted';
	const accountCard = el('section'); accountCard.className = 'account-card';
	const accountHead = el('div', undefined, accountCard); accountHead.className = 'account-head';
	const accountText = el('div', undefined, accountHead); el('strong', 'Codeva account', accountText);
	const planBadge = el('span', 'Signed out', accountHead); planBadge.className = 'badge';
	const accountSummary = el('p', 'Sign in with your existing Codeva account to use chat and projects.', accountCard); accountSummary.className = 'muted';
	const accountActions = el('div', undefined, accountCard); accountActions.className = 'actions';
	const signInButton = button('Sign in to Codeva', () => send('signIn'), accountActions);
	const signOutButton = button('Sign out', () => send('signOut'), accountActions, true); signOutButton.hidden = true;
	const settingsPanel = el('section'); settingsPanel.className = 'settings-panel'; settingsPanel.hidden = true;
	el('h2', 'Chat preferences', settingsPanel);
	const personaLabel = el('label', 'Agent persona', settingsPanel), personaSelect = el('select', undefined, personaLabel); personaSelect.setAttribute('aria-label', 'Agent persona');
	const styleLabel = el('label', 'Response style', settingsPanel), styleSelect = el('select', undefined, styleLabel); styleSelect.setAttribute('aria-label', 'Response style');
	for (const [value, label] of [['concise', 'Concise'], ['balanced', 'Balanced'], ['detailed', 'Detailed']]) { const option = el('option', label, styleSelect); option.value = value; }
	const languageLabel = el('label', 'Response language', settingsPanel), languageSelect = el('select', undefined, languageLabel); languageSelect.setAttribute('aria-label', 'Response language');
	for (const [value, label] of [['auto', 'Match the conversation'], ['en', 'English'], ['hi', 'Hindi']]) { const option = el('option', label, languageSelect); option.value = value; }
	el('p', 'Persona instructions come from Codeva’s curated library. Response controls apply to new answers.', settingsPanel).className = 'field-hint';
	const toggleSettings = () => { settingsPanel.hidden = !settingsPanel.hidden; };
	button('Preferences', toggleSettings, accountActions, true);
	button('Editor settings', () => send('openSettings'), settingsPanel, true);
	const openProjects = button('Your projects', () => send('projects')); openProjects.className = 'secondary';
	const openChat = button('Open chat', () => send('openChat'), accountActions, true);
	const open = el('section'); el('h2', 'Open a project', open);
	const id = input('Project ID', open); button('Open project', () => send('open', {}, { id: id.value }), open);
	const create = el('details', undefined, app); el('summary', 'Create a project', create);
	const name = input('Project name', create), prompt = input('Original request', create, true);
	const pack = el('select', undefined, create); pack.setAttribute('aria-label', 'Project template');
	for (const [value, label] of [['general', 'General'], ['cs', 'Computer science'], ['commerce', 'Commerce']]) { const option = el('option', label, pack); option.value = value; }
	button('Create project', () => send('create', {}, { name: name.value, prompt: prompt.value, pack: pack.value }), create);
	const status = el('section'), dossier = el('section'), extras = el('section');
	const alert = el('p'); alert.setAttribute('role', 'alert');
	const applyPreferences = () => { preferences = { style: styleSelect.value, language: languageSelect.value, agentId: personaSelect.value }; send('preferences', preferences); };
	styleSelect.onchange = applyPreferences; languageSelect.onchange = applyPreferences; personaSelect.onchange = applyPreferences;
	const showAccount = (profile, expired = false) => {
		signInButton.hidden = Boolean(profile); signOutButton.hidden = !profile;
		planBadge.textContent = profile?.plan || (expired ? 'Session expired' : 'Signed out');
		accountSummary.textContent = profile?.email || (expired ? 'Your Codeva session expired. Sign in again to continue.' : 'Sign in with your existing Codeva account to use chat and projects.');
	};
	const renderPersonas = () => {
		personaSelect.replaceChildren();
		const automatic = el('option', 'Codeva assistant', personaSelect); automatic.value = '';
		for (const persona of personas) { const option = el('option', `${persona.name} · ${persona.division}`, personaSelect); option.value = persona.id; }
		personaSelect.value = personas.some(persona => persona.id === preferences.agentId) ? preferences.agentId : '';
	};
	window.addEventListener('message', ({ data }) => {
		if (data.type === 'error' || data.type === 'accountError') { alert.textContent = data.text; return; }
		if (data.type === 'account') { alert.textContent = ''; showAccount(data.value, data.expired); return; }
		if (data.type === 'preferences') {
			preferences = { style: data.value.style || 'balanced', language: data.value.language || 'auto', agentId: data.value.agentId || '' };
			styleSelect.value = preferences.style; languageSelect.value = preferences.language; renderPersonas(); return;
		}
		if (data.type === 'personas') { personas = data.value?.personas || []; renderPersonas(); return; }
		if (data.type === 'focusSettings') { settingsPanel.hidden = false; settingsPanel.scrollIntoView({ block: 'start' }); return; }
		if (data.type === 'focusAccount') { accountCard.scrollIntoView({ block: 'start' }); signInButton.hidden ? signOutButton.focus() : signInButton.focus(); return; }
		alert.textContent = '';
		if (data.type === 'signedOut') { showAccount(null); dossier.replaceChildren(); status.replaceChildren(); extras.replaceChildren(); drafts.clear(); return; }
		if (data.type === 'projects') {
			extras.replaceChildren(); el('h2', 'Your projects', extras);
			for (const project of data.value.projects) {
				const card = el('section', undefined, extras);
				button((project.dossier.prompt_original || 'Untitled project').slice(0, 72), () => send('open', {}, { id: project.project_id }), card);
				el('p', `Project ${project.project_id}`, card).className = 'muted'; el('span', project.dossier.state, card).className = 'badge';
				for (const judge of project.dossier.judge) { el('h3', judge.agent_id, card); for (const line of judge.lines) { el('p', `${line.id}: ${line.verdict} — ${line.evidence}`, card); } }
			}
			return;
		}
		if (data.type === 'dossier') {
			if (projectId !== data.value.project_id) { drafts.clear(); extras.replaceChildren(); projectId = data.value.project_id; }
			dossier.replaceChildren(); status.replaceChildren();
			const d = data.value.dossier;
			el('h2', 'Original request', dossier); el('pre', d.prompt_original, dossier);
			el('h2', 'Project status', status); el('span', d.state, status).className = 'badge';
			if (d.blocked) { el('p', d.blocked.reason, status); }
			el('p', `Attempts: free ${data.value.meter.free}, mid ${data.value.meter.mid}, frontier ${data.value.meter.frontier}`, status).className = 'muted';
			for (const event of d.events.slice(-10)) { const item = el('div', `${event.seq}. ${event.kind === 'tool_start' && event.tool === 'read' ? 'MrCodevaa is reading project files' : event.kind === 'tool_start' && event.tool === 'test' ? 'MrCodevaa is running project tests' : event.kind}`, status); item.className = 'event'; }
			if (d.design?.proposals.length) {
				el('h2', 'Review a design', dossier);
				for (const proposal of d.design.proposals) { el('h3', proposal.title, dossier); el('p', proposal.summary, dossier); el('small', `Specification: ${proposal.spec_line_ids.join(', ')}`, dossier); button(d.design.selected?.id === proposal.id ? 'Selected' : 'Choose design', () => send('design', { id: proposal.id }), dossier); }
			}
			if (d.editor_reviews?.some(r => r.status === 'pending')) { button('Review proposed changes', () => send('reviewChanges'), dossier); }
			for (const [key, label] of [['will_build', 'What the project will build'], ['must_never', 'Requirements to avoid'], ['acceptance', 'Acceptance checks']]) {
				const section = el('section', undefined, dossier); el('h2', label, section);
				for (const line of d.spec[key]) {
					const field = input(label, section, true, line.id); field.value = drafts.has(line.id) ? drafts.get(line.id) : line.final_text; field.disabled = d.state !== 'wait_for_user';
					el('small', line.status, section);
					if (d.state === 'wait_for_user') {
						button('Accept', () => send('accept', field.value === line.final_text ? { status: 'accepted' } : { status: 'edited', text: field.value }, { id: line.id }), section);
						button('Save edit', () => send('edit', { status: 'edited', text: field.value }, { id: line.id }), section, true);
						button('Reject', () => send('reject', { status: 'rejected' }, { id: line.id }), section, true);
					}
				}
			}
			button('Run accepted project', () => send('run'), dossier); button('Refresh', () => send('refresh'), dossier, true);
			const question = input('Ask about project progress', dossier, true); button('Ask', () => send('listener', { question: question.value }), dossier, true);
			const fix = input('Describe a proposed fix', dossier, true); button('Propose fix', () => send('fix', { text: fix.value }), dossier, true);
			el('h2', 'Independent reviews', dossier);
			for (const judge of d.judge) { el('h3', `${judge.agent_id} · ${judge.model}`, dossier); for (const line of judge.lines) { el('p', `${line.verdict}: ${line.evidence}`, dossier); } }
			if (['live', 'done'].includes(d.state)) { button('Open private preview', () => send('preview'), dossier); }
			button('Restore last checkpoint', () => send('rollback'), dossier, true); button('View run record', () => send('replay'), dossier, true);
			el('h2', 'Project materials', dossier);
			const file = el('input', undefined, dossier); file.type = 'file'; file.accept = '.pdf'; file.setAttribute('aria-label', 'Upload PDF');
			button('Upload PDF', async () => { const selected = file.files[0]; if (!selected || selected.size > 5000000) { alert.textContent = 'Choose a PDF smaller than 5 MB.'; return; } const bytes = new Uint8Array(await selected.arrayBuffer()); let binary = ''; for (const byte of bytes) { binary += String.fromCharCode(byte); } send('materials', { name: selected.name, kind: 'pdf', data_base64: btoa(binary) }); }, dossier);
			const notes = input('Project notes', dossier, true); button('Save notes', () => send('materials', { name: 'Notes', kind: 'notes', text: notes.value }), dossier, true);
			const materialQuestion = input('Ask a question about project materials', dossier, true); button('Ask about materials', () => send('materialQuestion', { question: materialQuestion.value }), dossier, true);
			return;
		}
		extras.replaceChildren();
		if (data.value?.dossier) { if (data.id) { drafts.delete(data.id); } return; }
		if (data.type === 'materialQuestion') {
			el('p', data.value.answer, extras);
			for (const citation of data.value.citations) { el('small', `${citation.name}: ${citation.page ? `page ${citation.page}` : `note ${citation.note_id}`}`, extras); }
		} else if (data.type === 'listener') { el('p', data.value.answer, extras); el('small', `Project revision ${data.value.source.revision}`, extras); }
		else { const result = el('pre', JSON.stringify(data.value, null, 2), extras); result.setAttribute('aria-label', 'Project result'); }
	});
	send('ready');
})();
