/*---------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * Codeva dossier sidebar: API client only.
 *--------------------------------------------------------------------------------------------*/
'use strict';
const vscode = require('vscode');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { StudioClient, apiUrl } = require('./client.cjs');
const { launchPreview } = require('./preview.cjs');
const { registerWorkbench } = require('./workbench.cjs');
const { browserSignIn } = require('./auth.cjs');
const { ChatClient, registerChat } = require('./chat.cjs');
const { accountSession } = require('./session.cjs');
const { chatPreferences } = require('./features.cjs');

function activate(context) {
	const t = vscode.l10n.t;
	const tokenKey = 'codeva.supabase.accessToken';
	const controller = { stream: null, view: null, projectId: context.workspaceState.get('codeva.projectId'), after: 0 };
	const settings = () => vscode.workspace.getConfiguration('codeva');
  const account = accountSession(context.secrets, () => settings().get('apiBaseUrl'));
	const client = () => new StudioClient({ baseUrl: settings().get('apiBaseUrl'), getToken: () => account.token() });
	const chatClient = () => new ChatClient({ baseUrl: settings().get('apiBaseUrl'), getToken: () => account.token() });
	const send = value => controller.view?.webview.postMessage(value);
	const focusView = async target => {
		controller.pendingFocus = target;
		await vscode.commands.executeCommand('workbench.view.extension.codeva');
		if (controller.viewReady) { send({ type: target }); controller.pendingFocus = null; }
	};
	const syncAccount = async () => {
		const token = await account.token();
		if (!token) {
			controller.profile = null;
			await vscode.commands.executeCommand('setContext', 'codeva.signedIn', false);
			send({ type: 'account', value: null }); return null;
		}
		try {
			const profile = await client().request('/ide/me');
			controller.profile = profile;
			await vscode.commands.executeCommand('setContext', 'codeva.signedIn', true);
			send({ type: 'account', value: profile }); return profile;
		} catch (error) {
			if (/401|session expired/i.test(error.message)) {
				await vscode.commands.executeCommand('setContext', 'codeva.signedIn', false);
				send({ type: 'account', value: null, expired: true }); return null;
			}
			throw error;
		}
	};
	const disposeStream = () => { controller.stream?.abort(); controller.stream = null; };
	context.subscriptions.push({ dispose() { disposeStream(); controller.preview?.dispose(); controller.signIn?.cancel(); } });
	const refresh = async () => {
		if (controller.projectId) {
			const id = controller.projectId, signal = controller.stream?.signal;
			const value = await client().request(`/studio/projects/${id}/dossier`, 'GET', undefined, signal);
			if (id === controller.projectId && !signal?.aborted) {
        controller.updateStatus?.(value.dossier); send({ type: 'dossier', value });
        const pending = value.dossier.editor_reviews?.find(r => r.status === 'pending');
        if (pending && controller.lastSeenReview !== pending.id) { await controller.showReview?.(pending); }
      }
		}
	};
	const openProject = async id => {
		if (!/^[a-f0-9]{24}$/.test(id)) { throw new Error(t('Enter an existing project ID')); }
		await client().request(`/studio/projects/${id}/dossier`);
		controller.activeReview = null; controller.lastSeenReview = null;
		await vscode.commands.executeCommand('setContext', 'codeva.hasReview', false);
		controller.projectId = id; controller.after = 0; await context.workspaceState.update('codeva.projectId', id); void connect();
	};
	registerWorkbench(vscode, context, { client, controller, refresh, openProject });
  registerChat(vscode, context, { client, chatClient, controller, refresh, openProject, getPreferences: () => chatPreferences(settings()) });
  if (!context.globalState.get('mrcodevaa.firstLaunch')) {
    void context.globalState.update('mrcodevaa.firstLaunch', true);
    void vscode.commands.executeCommand('workbench.view.extension.codeva');
  }
	const connect = async () => {
		disposeStream();
		const abort = new AbortController(); controller.stream = abort;
		while (!abort.signal.aborted && controller.projectId) {
			try { await refresh(); await client().progress(controller.projectId, controller.after, abort.signal, async event => { controller.after = event.seq; await refresh(); }); }
			catch (error) { if (abort.signal.aborted) { return; } send({ type: 'error', text: error.message }); }
			await new Promise(resolve => {
				const done = () => { clearTimeout(timer); abort.signal.removeEventListener('abort', done); resolve(); };
				const timer = setTimeout(done, 3000); abort.signal.addEventListener('abort', done, { once: true });
				if (abort.signal.aborted) { done(); }
			});
		}
	};
	context.subscriptions.push(vscode.commands.registerCommand('codeva.signIn', async () => {
		try {
			controller.signIn?.cancel();
			const flow = await browserSignIn({ webUrl: settings().get('webUrl'), apiBaseUrl: settings().get('apiBaseUrl') }); controller.signIn = flow;
			try {
				await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Sign in on the Codeva website to continue in MrCodevaa', cancellable: true }, async (_, cancellation) => {
					const subscription = cancellation.onCancellationRequested(() => flow.cancel());
					try {
						if (!await vscode.env.openExternal(vscode.Uri.parse(flow.url))) throw new Error('Could not open the Codeva sign-in page.');
						const session = await flow.session;
						await account.save(session);
						await syncAccount();
						vscode.window.showInformationMessage('Signed in to your Codeva account.'); void connect();
					} finally { subscription.dispose(); }
				});
			} finally { flow.cancel(); if (controller.signIn === flow) controller.signIn = null; }
		} catch (error) { vscode.window.showErrorMessage(error.message); }
	}));
	context.subscriptions.push(vscode.commands.registerCommand('codeva.signOut', async () => { controller.signIn?.cancel(); disposeStream(); await account.clear(); controller.profile = null; await vscode.commands.executeCommand('setContext', 'codeva.signedIn', false); send({ type: 'signedOut' }); }));
	context.subscriptions.push(vscode.commands.registerCommand('codeva.openSettings', () => focusView('focusSettings')));
	context.subscriptions.push(vscode.commands.registerCommand('codeva.openAccount', () => focusView('focusAccount')));
	void syncAccount().catch(error => send({ type: 'accountError', text: error.message }));
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => { if (event.affectsConfiguration('codeva')) { void connect(); } }));
	context.subscriptions.push(vscode.window.registerWebviewViewProvider('codeva.dossier', {
		resolveWebviewView(view) {
			controller.view = view; controller.viewReady = false;
			view.webview.options = { enableScripts: true, localResourceRoots: [] };
			const nonce = randomBytes(20).toString('hex');
			const script = fs.readFileSync(path.join(context.extensionPath, 'view.js'), 'utf8');
			const style = fs.readFileSync(path.join(context.extensionPath, 'view.css'), 'utf8');
			const brandIcon = `data:image/svg+xml;base64,${fs.readFileSync(path.join(context.extensionPath, 'icon.svg')).toString('base64')}`;
			const strings = Object.fromEntries(Object.keys(JSON.parse(fs.readFileSync(path.join(context.extensionPath, 'view.nls.json'), 'utf8'))).map(key => [key, t(key)]));
			view.webview.html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'none'; img-src data:"><style nonce="${nonce}">${style}</style></head><body><main id="app"></main><script nonce="${nonce}">window.codevaBrandIcon=${JSON.stringify(brandIcon)};window.codevaStrings=${JSON.stringify(strings).replace(/</g, '\\u003c')};${script}</script></body></html>`;
			const viewDisposables = [];
			viewDisposables.push(view.onDidDispose(() => { disposeStream(); controller.view = null; for (const disposable of viewDisposables) { disposable.dispose(); } }));
			viewDisposables.push(view.webview.onDidReceiveMessage(async message => {
				try {
					if (message.action === 'ready') {
						controller.viewReady = true;
						send({ type: 'preferences', value: chatPreferences(settings()) });
						if (controller.pendingFocus) { send({ type: controller.pendingFocus }); controller.pendingFocus = null; }
						await syncAccount();
						const personas = await chatClient().json('/agents'); send({ type: 'personas', value: personas });
						await refresh(); return;
					}
					if (message.action === 'openSettings') { await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:codeva.codeva-studio'); return; }
					if (message.action === 'openChat') { await vscode.commands.executeCommand('codeva.openChat'); return; }
					if (message.action === 'preferences') {
						const target = vscode.ConfigurationTarget.Global;
						await settings().update('chat.responseStyle', message.body.style, target);
						await settings().update('chat.responseLanguage', message.body.language, target);
						await settings().update('chat.agentId', message.body.agentId || '', target);
						return;
					}
					if (message.action === 'refreshAccount') { await syncAccount(); return; }
					if (message.action === 'signIn' || message.action === 'signOut') { await vscode.commands.executeCommand(`codeva.${message.action}`); return; }
					if (message.action === 'open') {
						await openProject(message.id); return;
					}
					if (message.action === 'projects') { send({ type: 'projects', value: await client().request('/studio/projects') }); return; }
					if (message.action === 'reviewChanges') { await vscode.commands.executeCommand('codeva.reviewChanges'); return; }
					if (message.action === 'create') {
						const value = await client().request('/studio/projects', 'POST', { name: message.name, prompt: message.prompt, pack: message.pack });
						controller.projectId = value.project_id; controller.after = 0; await context.workspaceState.update('codeva.projectId', value.project_id); void connect(); return;
					}
					if (!controller.projectId) { throw new Error(t('Open a project first')); }
					const actions = { refresh: ['dossier', 'GET'], accept: [`spec/${message.id}`, 'PATCH'], edit: [`spec/${message.id}`, 'PATCH'], reject: [`spec/${message.id}`, 'PATCH'], run: ['run', 'POST'], listener: ['listener', 'POST'], fix: ['fix', 'POST'], judges: ['judges', 'GET'], preview: ['preview', 'POST'], rollback: ['rollback', 'POST'], materials: ['materials', 'POST'], materialQuestion: ['material-question', 'POST'], meter: ['meter', 'GET'], replay: ['replay', 'GET'], design: ['design', 'POST'], report: ['report', 'GET'] };
					if (!Object.hasOwn(actions, message.action)) { throw new Error(t('Unsupported project action')); }
					const [route, method] = actions[message.action];
					const value = await client().request(`/studio/projects/${controller.projectId}/${route}`, method, message.body);
					if (message.action === 'preview') {
						// Private launch is a POST, never a credential in a URL.
						const launch = new URL(value.launch_url), base = new URL(client().baseUrl);
						if (!['https:', 'http:'].includes(launch.protocol) || launch.username || launch.password || launch.search || launch.hash || launch.pathname !== `/api/v1/studio/preview/${controller.projectId}/session` || (launch.protocol === 'http:' && launch.hostname !== base.hostname)) { throw new Error(t('Invalid preview launcher')); }
						controller.preview?.dispose();
						controller.preview = await launchPreview(value, url => vscode.env.openExternal(vscode.Uri.parse(url))); return;
					}
					send({ type: message.action, id: message.id, value }); await refresh();
				} catch (error) { send({ type: 'error', text: error.message }); }
			}));
			void connect();
		}
	}));
}
module.exports = { activate };
