'use strict';
const { apiUrl } = require('./client.cjs');
const { terminalSelectionPrompt, secretText } = require('./features.cjs');
const path = require('node:path');
const secretFile = file => /(^|[\\/])(?:\.env(?:\..*)?|\.git|node_modules|credentials(?:\.[^\\/]*)?|secrets?(?:\.[^\\/]*)?)(?:[\\/]|$)|\.(?:pem|pfx|key)$/i.test(file);
class ChatClient {
  constructor({ baseUrl, getToken, fetcher = fetch }) { this.baseUrl = apiUrl(baseUrl); this.getToken = getToken; this.fetcher = fetcher; }
  async request(route, method = 'GET', body, signal) {
    if (!/^\/(?:models|agents|ide\/complete|ide\/me|chat(?:\/[a-f0-9]{24}(?:\/messages)?)?)$/.test(route)) throw new Error('Unsupported Codeva chat action');
    const token = await this.getToken(); if (!token && route !== '/models' && route !== '/agents') throw new Error('Sign in on the Codeva website first');
    const response = await this.fetcher(this.baseUrl + route, { method, redirect: 'error', signal, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (!response.ok) throw new Error(response.status === 401 ? 'Your Codeva session expired. Sign in again.' : `Codeva API request failed (${response.status})`);
    return response;
  }
  async json(...args) { return (await this.request(...args)).json(); }
  async reply(threadId, messages, model, signal, output, preferences = {}) {
    const response = await this.request(`/chat/${threadId}/messages`, 'POST', { messages, model, effort: 'medium', responsePreferences: { style: preferences.style, language: preferences.language }, ...(preferences.agentId ? { agentId: preferences.agentId } : {}) }, signal);
    if (!response.body || !/text\/event-stream/.test(response.headers.get('content-type') || '')) throw new Error('Codeva did not return a chat stream');
    const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = '', done = false;
    try {
      while (!done) {
        const part = await reader.read(); if (part.done) break;
        buffer += decoder.decode(part.value, { stream: true });
        if (buffer.length > 1000000) throw new Error('Chat event is too large');
        let newline;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline).replace(/\r$/, ''); buffer = buffer.slice(newline+1);
          if (!line.startsWith('data: ')) continue;
          if (line.slice(6) === '[DONE]') { done = true; break; }
          const event = JSON.parse(line.slice(6));
          if (event.type === 'error') throw new Error('Codeva could not complete this response. Please retry.');
          if (event.type === 'token') output(event.content);
        }
      }
      if (!done && !signal?.aborted) throw new Error('The chat stream ended before completion');
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
}
async function referenceContext(vscode, references = []) {
  const entries = [];
  for (const reference of references.slice(0, 5)) {
    const uri = reference.value?.uri || reference.value;
    if (!uri || uri.scheme !== 'file' || !vscode.workspace.isTrusted || !vscode.workspace.getWorkspaceFolder(uri)) continue;
    const file = vscode.workspace.asRelativePath(uri, false);
    if (secretFile(file)) throw new Error('Credential files cannot be sent as chat context');
    const document = await vscode.workspace.openTextDocument(uri);
    const text = document.getText(reference.value?.range).slice(0, 12000);
    if (secretText(text)) throw new Error('Remove credentials from the selected context before sending it');
    entries.push(`File: ${file}\n${text}`);
  }
  return entries.join('\n\n').slice(0, 40000);
}
function registerChat(vscode, context, { client, chatClient, controller, openProject, refresh, getPreferences = () => ({}) }) {
  const command = (id, handler) => context.subscriptions.push(vscode.commands.registerCommand(id, handler));
  command('codeva.openChat', () => vscode.commands.executeCommand('workbench.action.chat.open'));
  command('codeva.askAboutTerminal', async () => {
    const prompt = terminalSelectionPrompt(vscode.window.activeTerminal?.selection);
    await vscode.commands.executeCommand('workbench.action.chat.open', { query: prompt, isPartialQuery: true, mode: 'ask' });
  });
  const participant = vscode.chat.createChatParticipant('codeva.mrcodevaa', async (request, history, output, cancellation) => {
    const abort = new AbortController(), subscription = cancellation.onCancellationRequested(() => abort.abort());
    try {
      if (cancellation.isCancellationRequested) return {};
      if (secretText(request.prompt)) throw new Error('Remove API keys from the prompt before sending it');
      const mode = request.modeInstructions2?.name?.toLowerCase();
      // Plain conversation stays a conversation in Agent mode. Project work is
      // opt-in through /plan, /build, /fix, /review and /checkpoint.
      const action = request.command || (mode === 'edit' ? 'inline' : undefined);
      if (action === 'inline') {
        const result = await vscode.commands.executeCommand('codeva.inlineEdit', request.prompt);
        if (result?.error) throw new Error(result.error);
        output.markdown('MrCodevaa proposed a selection change through the dossier API. Review the diff before accepting it.'); return {};
      }
      if (request.command === 'review' || request.command === 'checkpoint') {
        await vscode.commands.executeCommand(request.command === 'review' ? 'codeva.reviewChanges' : 'codeva.checkpoint'); return {};
      }
      if (action === 'plan') {
        if (!request.prompt.trim()) throw new Error('Describe the project you want MrCodevaa to plan');
        const record = await client().request('/studio/projects', 'POST', { name: request.prompt.slice(0, 80), prompt: request.prompt, pack: 'general' }, abort.signal);
        await openProject(record.project_id);
        output.markdown('MrCodevaa stored your original request. Open the project to review the specification and choose a design before building.');
        output.button({ command: 'codeva.openAgents', title: 'Open project and specification' }); return { metadata: { project_id: record.project_id } };
      }
      if (action === 'build' || action === 'fix') {
        if (!controller.projectId) throw new Error('Open a dossier project or use /plan first');
        const route = `/studio/projects/${controller.projectId}/${action === 'fix' ? 'fix' : 'run'}`;
        await client().request(route, 'POST', action === 'fix' ? { text: request.prompt } : {}, abort.signal); await refresh();
        output.markdown('MrCodevaa sent this request to the existing dossier pipeline. The project view shows actual tools, tests and independent reviews.');
        output.button({ command: 'codeva.openAgents', title: 'Open build progress and pending diffs' }); return { metadata: { project_id: controller.projectId } };
      }
      output.progress('MrCodevaa is thinking');
      const api = chatClient(), contextText = await referenceContext(vscode, request.references);
      const previous = [...history.history].reverse().find(turn => turn.result?.metadata?.codeva_thread_id);
      const thread = previous?.result.metadata.codeva_thread_id || (await api.json('/chat', 'POST', { title: request.prompt.slice(0, 80) || 'MrCodevaa chat', model_id: 'auto', mode: 'standard' }, abort.signal))._id;
      // Mongo is the source for history, including resumed native sessions.
      const stored = await api.json(`/chat/${thread}/messages`, 'GET', undefined, abort.signal);
      const messages = stored.messages.slice(-40).map(m => ({ role: m.role, content: m.content }));
      messages.push({ role: 'user', content: request.prompt + (contextText ? `\n\nAttached workspace context:\n${contextText}` : '') });
      const selected = request.model?.id;
      const model = selected === 'auto' || /^apinex\/free\/[\w.-]+$/.test(selected || '') ? selected : 'auto';
      await api.reply(thread, messages, model, abort.signal, text => output.markdown(text), getPreferences());
      return { metadata: { codeva_thread_id: thread } };
    } catch (error) {
      if (abort.signal.aborted) return {};
      output.markdown(error.message); output.button({ command: 'codeva.signIn', title: 'Sign in to Codeva' }); return { errorDetails: { message: error.message } };
    } finally { subscription.dispose(); abort.abort(); }
  });
  participant.iconPath = vscode.Uri.file(path.join(context.extensionPath, 'icon.svg'));
  participant.additionalWelcomeMessage = 'Tell MrCodevaa what to build. Use /plan for a dossier project, /build to run its accepted specification, and /review for changes.';
  participant.titleProvider = { provideChatTitle: history => history.history.find(turn => turn.prompt)?.prompt.slice(0, 60) || 'MrCodevaa' };
  context.subscriptions.push(participant);
  context.subscriptions.push(vscode.lm.registerLanguageModelChatProvider('codeva', {
    async provideLanguageModelChatInformation() {
      const catalog = await chatClient().json('/models').catch(() => ({ models: [] }));
      return [{ id: 'auto', name: 'Codeva Auto', family: 'codeva', version: '1', maxInputTokens: 16000, maxOutputTokens: 4096, capabilities: { toolCalling: true } },
        ...catalog.models.filter(m => m.provider === 'APINEX' && !m.requiresSubscription).map(m => ({ id: m.id, name: m.name, family: 'codeva', version: '1', detail: 'Codeva API', maxInputTokens: 16000, maxOutputTokens: 4096, capabilities: { toolCalling: true } }))];
    },
    async provideLanguageModelChatResponse(model, input, options, progress, cancellation) {
      const abort = new AbortController(), subscription = cancellation.onCancellationRequested(() => abort.abort());
      try {
        const api = chatClient(), messages = [];
        for (const message of input) {
          const text = message.content.filter(p => p instanceof vscode.LanguageModelTextPart).map(p => p.value).join('');
          const calls = message.content.filter(p => p instanceof vscode.LanguageModelToolCallPart);
          const results = message.content.filter(p => p instanceof vscode.LanguageModelToolResultPart);
          if (text || calls.length) messages.push({ role: message.role === vscode.LanguageModelChatMessageRole.Assistant ? 'assistant' : 'user', content: text || null, ...(calls.length ? { tool_calls: calls.map(p => ({ id: p.callId, type: 'function', function: { name: p.name, arguments: JSON.stringify(p.input) } })) } : {}) });
          for (const part of results) messages.push({ role: 'tool', tool_call_id: part.callId, content: part.content.map(p => p.value || '').join('') });
        }
        if (options.tools?.length || messages.some(m => m.tool_calls || m.role === 'tool')) {
          const tools = options.tools?.map(tool => ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.inputSchema } }));
          const preferences = getPreferences();
          const result = await api.json('/ide/complete', 'POST', { messages, model: model.id, stream: false, tools, tool_choice: options.toolMode === vscode.LanguageModelChatToolMode.Required ? 'required' : 'auto', responsePreferences: { style: preferences.style, language: preferences.language }, ...(preferences.agentId ? { agentId: preferences.agentId } : {}) }, abort.signal);
          const response = result.choices?.[0]?.message; if (!response) throw new Error('Codeva did not return a valid tool response');
          if (response.content) progress.report(new vscode.LanguageModelTextPart(response.content));
          for (const call of response.tool_calls || []) progress.report(new vscode.LanguageModelToolCallPart(call.id, call.function.name, JSON.parse(call.function.arguments)));
          return;
        }
        const thread = await api.json('/chat', 'POST', { title: 'MrCodevaa model request', model_id: model.id, mode: 'standard' }, abort.signal);
        await api.reply(thread._id, messages, model.id, abort.signal, text => progress.report(new vscode.LanguageModelTextPart(text)), getPreferences());
      } finally { subscription.dispose(); abort.abort(); }
    },
    async provideTokenCount(_, text) { return Math.ceil((typeof text === 'string' ? text.length : JSON.stringify(text).length) / 4); },
  }));
}
module.exports = { ChatClient, referenceContext, secretFile, registerChat, terminalSelectionPrompt };
