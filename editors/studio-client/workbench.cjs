'use strict';
const { createHash } = require('node:crypto');
const hash = value => createHash('sha256').update(value, 'utf8').digest('hex');
async function ghost(client, body, cancellation) {
  if (cancellation?.isCancellationRequested) { return ''; }
	const started = performance.now(), abort = new AbortController();
	const timer = setTimeout(() => abort.abort(), 100);
	const cancelled = cancellation?.onCancellationRequested?.(() => abort.abort());
	try {
		// Includes token lookup, API transport and decoding in the client deadline.
		const result = await Promise.race([client.request('/studio/tab', 'POST', body, abort.signal), new Promise(resolve => abort.signal.addEventListener('abort', () => resolve(null), { once: true }))]);
		return !abort.signal.aborted && !cancellation?.isCancellationRequested && performance.now() - started < 100 && result?.timed_out !== true && result?.budget_ms === 100 && typeof result.completion === 'string' ? result.completion.slice(0, 512) : '';
	} catch { return ''; } finally { clearTimeout(timer); abort.abort(); cancelled?.dispose(); }
}
function dossierStatus(d) {
	const task = d?.tasks?.find(t => t.id === d.current_task) || d?.tasks?.at(-1);
	if (d?.blocked || task?.status === 'failed') { return 'FAIL'; }
	if (task?.status === 'tested') { return 'PASS'; }
	return task?.status || d?.state || 'Open a project';
}
function registerWorkbench(vscode, context, { client, controller, refresh, openProject }) {
	const content = new Map();
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('mrcodevaa-diff', { provideTextDocumentContent: uri => content.get(uri.toString()) || '' }));
	const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
	status.command = 'codeva.openAgents'; status.text = 'MrCodevaa: Open a project'; status.show(); context.subscriptions.push(status);
	controller.updateStatus = d => { status.text = `MrCodevaa: ${dossierStatus(d)}`; status.tooltip = 'Stored dossier task status'; };
	const command = (id, fn) => context.subscriptions.push(vscode.commands.registerCommand(id, async (...args) => { try { return await fn(...args); } catch (error) { vscode.window.showErrorMessage(error.message); return { error: error.message }; } }));
	command('codeva.inlineEdit', async (providedInstruction) => {
		const editor = vscode.window.activeTextEditor;
		if (!controller.projectId || !editor || editor.selection.isEmpty || editor.document.uri.scheme !== 'file') { throw new Error('Open a dossier project and select code first'); }
		const instruction = typeof providedInstruction === 'string' ? providedInstruction : await vscode.window.showInputBox({ prompt: 'Tell MrCodevaa how to change this selection', ignoreFocusOut: true });
		if (!instruction) { return; }
		const file = vscode.workspace.asRelativePath(editor.document.uri, false).replace(/\\/g, '/');
		const record = await client().request(`/studio/projects/${controller.projectId}/inline`, 'POST', { path: file, before_sha256: hash(editor.document.getText()), selection: { start: editor.document.offsetAt(editor.selection.start), end: editor.document.offsetAt(editor.selection.end) }, instruction });
		await showReview(record.dossier.editor_reviews.at(-1)); await refresh();
	});
	async function showReview(review) {
		controller.activeReview = review;
		controller.lastSeenReview = review.id;
		await vscode.commands.executeCommand('setContext', 'codeva.hasReview', review.status === 'pending');
		for (const file of review.diff) {
			const before = vscode.Uri.parse(`mrcodevaa-diff:/${review.id}/before/${file.path}`), after = vscode.Uri.parse(`mrcodevaa-diff:/${review.id}/after/${file.path}`);
			content.set(before.toString(), file.before); content.set(after.toString(), file.after);
			await vscode.commands.executeCommand('vscode.diff', before, after, `MrCodevaa · ${file.path}`, { preview: false });
		}
	}
	controller.showReview = showReview;
	command('codeva.reviewChanges', async () => {
		if (!controller.projectId) { throw new Error('Open a project first'); }
		const record = await client().request(`/studio/projects/${controller.projectId}/dossier`);
		const reviews = (record.dossier.editor_reviews || []).filter(r => r.status === 'pending');
		if (!reviews.length) { throw new Error('No pending agent changes'); }
		const picked = await vscode.window.showQuickPick(reviews.map(r => ({ label: `${r.agent_id}: ${r.diff.map(f => f.path).join(', ')}`, review: r })));
		if (picked) { await showReview(picked.review); }
	});
	for (const decision of ['accept', 'reject']) { command(`codeva.${decision}Changes`, async () => {
		const review = controller.activeReview;
		if (!review || !controller.projectId) { throw new Error('Open a pending diff first'); }
		const record = await client().request(`/studio/projects/${controller.projectId}/reviews/${review.id}`, 'POST', { decision });
		const stored = record.dossier.editor_reviews.find(r => r.id === review.id);
		if (stored.status !== `${decision}ed` && !(decision === 'reject' && stored.status === 'rejected')) { throw new Error(record.dossier.blocked?.reason || 'The API did not approve this diff'); }
		const edit = new vscode.WorkspaceEdit();
		for (const file of stored.diff) {
			for (const document of vscode.workspace.textDocuments.filter(d => d.uri.scheme === 'file' && vscode.workspace.asRelativePath(d.uri, false).replace(/\\/g, '/') === file.path)) {
				const text = document.getText();
				if (text !== file.before && text !== file.after) { vscode.window.showWarningMessage('The local buffer has other edits. Refresh it from the reviewed project before saving.'); continue; }
				edit.replace(document.uri, new vscode.Range(document.positionAt(0), document.positionAt(text.length)), decision === 'accept' ? file.after : file.before);
			}
		}
		await vscode.workspace.applyEdit(edit); await vscode.commands.executeCommand('setContext', 'codeva.hasReview', false); await refresh();
	}); }
	command('codeva.checkpoint', async () => {
		if (!controller.projectId) { throw new Error('Open a project first'); }
		await client().request(`/studio/projects/${controller.projectId}/rollback`, 'POST', {}); await refresh();
	});
	command('codeva.openAgents', async () => {
		const { projects } = await client().request('/studio/projects');
		const chosen = await vscode.window.showQuickPick(projects.map(p => ({ label: p.project_id, description: p.dossier.state, detail: p.dossier.prompt_original, id: p.project_id })));
		if (chosen) { await openProject(chosen.id); await vscode.commands.executeCommand('codeva.dossier.focus'); }
	});
	context.subscriptions.push(vscode.languages.registerInlineCompletionItemProvider({ scheme: 'file' }, {
		async provideInlineCompletionItems(document, position, _, token) {
			if (!vscode.workspace.getConfiguration('codeva').get('localTabEnabled') || !controller.projectId) { return []; }
			const offset = document.offsetAt(position), text = document.getText();
			const completion = await ghost(client(), { prefix: text.slice(Math.max(0, offset - 8000), offset), suffix: text.slice(offset, offset + 2000) }, token);
			return completion ? [new vscode.InlineCompletionItem(completion, new vscode.Range(position, position))] : [];
		}
	}));
}
module.exports = { ghost, hash, dossierStatus, registerWorkbench };
