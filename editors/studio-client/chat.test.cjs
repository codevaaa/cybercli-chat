'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const { ChatClient, referenceContext, registerChat } = require('./chat.cjs');
test('Codeva SSE handles split UTF-8, validates completion and credentials never enter a URL', async () => {
  const encoder = new TextEncoder(), bytes = encoder.encode('data: {"type":"token","content":"नमस्ते"}\r\n\r\ndata: [DONE]\n\n');
  let options;
  const client = new ChatClient({ baseUrl: 'https://cybercli-api.onrender.com/api/v1', getToken: async () => 'fixture-account-token', fetcher: async (url, body) => {
    assert.ok(!url.includes('fixture-account-token')); options = body;
    return new Response(new ReadableStream({ start(controller) { for (let offset=0;offset<bytes.length;offset+=7) controller.enqueue(bytes.slice(offset,offset+7)); controller.close(); } }), { headers: { 'Content-Type': 'text/event-stream' } });
  } });
  let answer = ''; await client.reply('a'.repeat(24), [{ role: 'user', content: 'Hello' }], 'auto', undefined, text => answer += text, { style: 'detailed', language: 'hi', agentId: 'backend-architect' });
  assert.equal(answer, 'नमस्ते'); assert.equal(options.headers.Authorization, 'Bearer fixture-account-token');
  assert.deepEqual(JSON.parse(options.body).responsePreferences, { style: 'detailed', language: 'hi' });
  assert.equal(JSON.parse(options.body).agentId, 'backend-architect');
  await assert.rejects(client.request('/chat/../../auth'), /Unsupported/);
  const denied = new ChatClient({ baseUrl: client.baseUrl, getToken: async () => null }); await assert.rejects(denied.request('/chat'), /Sign in/);
  for (const body of ['data: {"type":"error"}\n\n', 'data: {"type":"token","content":"partial"}\n\n']) {
    const broken = new ChatClient({ baseUrl: client.baseUrl, getToken: async () => 'fixture', fetcher: async () => new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }) });
    await assert.rejects(broken.reply('a'.repeat(24), [], 'auto', undefined, () => {}));
  }
});
test('only explicit trusted workspace references are sent; credentials and outside files are refused', async () => {
  const vscode = { workspace: { isTrusted: true, getWorkspaceFolder: uri => uri.fsPath.startsWith('/owned/') ? {} : null, asRelativePath: uri => uri.fsPath.slice(7), openTextDocument: async () => ({ getText: () => 'print("hello")' }) } };
  const ref = file => ({ value: { scheme: 'file', fsPath: '/owned/'+file } });
  assert.match(await referenceContext(vscode,[ref('main.py')]), /File: main.py/);
  for (const file of ['.env', '.env.local', 'credentials.json', '.git/config', 'private.pem', 'node_modules/key.js']) await assert.rejects(referenceContext(vscode,[ref(file)]), /Credential/);
  assert.equal(await referenceContext(vscode,[{ value: { scheme: 'file', fsPath: '/outside/main.py' } }]), '');
  vscode.workspace.isTrusted=false; assert.equal(await referenceContext(vscode,[ref('main.py')]), ''); vscode.workspace.isTrusted=true;
  vscode.workspace.openTextDocument = async () => ({ getText: () => 'sk-'+'x'.repeat(40) }); await assert.rejects(referenceContext(vscode,[ref('main.py')]), /credentials/);
});
test('native participant persists backend sessions, invokes actual dossier actions and declares truthful model capabilities', async () => {
  let handler, provider; const calls = [], commands = [], rendered = [], controller = {}, registeredCommands = new Map();
  class Text { constructor(value) { this.value=value; } }
  class Call { constructor(callId,name,input) { Object.assign(this,{callId,name,input}); } }
  class Result { constructor(callId,content) { Object.assign(this,{callId,content}); } }
  const vscode = {
    commands: { registerCommand: (name, callback) => { registeredCommands.set(name, callback); return { dispose() {} }; }, executeCommand: async (...args) => { commands.push(args); } },
    chat: { createChatParticipant: (_,fn) => { handler=fn; return { dispose() {} }; } },
    lm: { registerLanguageModelChatProvider: (_,p) => { provider=p; return { dispose() {} }; } },
    Uri: { file: file => file }, workspace: {}, LanguageModelTextPart: Text, LanguageModelToolCallPart: Call, LanguageModelToolResultPart: Result,
    LanguageModelChatMessageRole: { Assistant: 2 }, LanguageModelChatToolMode: { Required: 2 }, window: { activeTerminal: { selection: 'Build failed: missing package' } },
  };
  const id='a'.repeat(24), thread='b'.repeat(24), context={ extensionPath:'/extension', subscriptions:[] };
  const api = {
    async json(route, method, body) { calls.push({route,method,body}); return route==='/models' ? {models:[{provider:'APINEX',id:'apinex/free/gpt-6-luna',name:'GPT Luna'},{provider:'APINEX',id:'apinex/free/qwen-3.8-max',requiresSubscription:true}]} : route==='/ide/complete' ? { choices:[{message:{tool_calls:[{id:'tool-1',function:{name:'lookup',arguments:'{"id":7}'}}]}}] } : route.endsWith('/messages') ? { messages:[{role:'assistant',content:'Previous reply'}] } : {_id:thread}; },
    async reply(...args) { calls.push({reply:args.slice(0,3), preferences:args[5]}); args[4]('**Real stream fixture**'); },
  };
  registerChat(vscode,context,{controller,chatClient:()=>api,client:()=>({request:async(route,method,body)=>{calls.push({route,method,body});return{project_id:id};}}),openProject:async value=>{controller.projectId=value;},refresh:async()=>{},getPreferences:()=>({style:'detailed',language:'hi',agentId:'backend-architect'}) });
  const output = { markdown:value=>rendered.push(value), progress:value=>rendered.push(value), button:value=>rendered.push(value) };
  const cancellation={isCancellationRequested:false,onCancellationRequested:()=>({dispose(){}})};
  const result=await handler({prompt:'Explain',references:[],model:{id:'auto'}},{history:[]},output,cancellation);
  assert.equal(result.metadata.codeva_thread_id,thread); assert.equal(calls.at(-1).reply[1][0].content,'Previous reply');
  assert.deepEqual(calls.at(-1).preferences,{style:'detailed',language:'hi',agentId:'backend-architect'});
  const created=calls.filter(c=>c.route==='/chat').length;
  await handler({prompt:'Continue'},{history:[{result}]},output,cancellation); assert.equal(calls.filter(c=>c.route==='/chat').length,created);
  const projectCount=calls.filter(c=>c.route==='/studio/projects').length;
  await handler({prompt:'Explain this error without creating a project',modeInstructions2:{name:'Agent'},model:{id:'auto'}},{history:[]},output,cancellation);
  assert.equal(calls.filter(c=>c.route==='/studio/projects').length,projectCount,'Plain Agent-mode conversation must stay in normal chat');
  assert.ok(calls.some(c=>c.route==='/chat'&&c.body?.title==='Explain this error without creating a project'));
  const original='  Build\r\nनमस्ते  ';
  await handler({prompt:original,command:'plan',modeInstructions2:{name:'Agent'}},{history:[]},output,cancellation);
  assert.equal(calls.find(c=>c.route==='/studio/projects').body.prompt,original);
  await handler({prompt:'Fix title',command:'fix',modeInstructions2:{name:'Agent'}},{history:[]},output,cancellation); assert.ok(calls.some(c=>c.route===`/studio/projects/${id}/fix`));
  await handler({prompt:'Run',command:'build'},{history:[]},output,cancellation); assert.ok(calls.some(c=>c.route===`/studio/projects/${id}/run`));
  for (const command of ['review','checkpoint']) await handler({prompt:'',command},{history:[]},output,cancellation);
  await handler({prompt:'Change selection',modeInstructions2:{name:'Edit'}},{history:[]},output,cancellation); assert.ok(commands.some(c=>c[0]==='codeva.inlineEdit'&&c[1]==='Change selection'));
  const models=await provider.provideLanguageModelChatInformation(); assert.equal(models.length,2); assert.equal(models[0].capabilities.toolCalling,true);
  const parts=[];
  await provider.provideLanguageModelChatResponse(models[0],[{role:1,content:[new Text('Lookup 7')]}],{tools:[{name:'lookup',description:'Lookup',inputSchema:{type:'object'}}],toolMode:2},{report:part=>parts.push(part)},cancellation);
  assert.equal(parts[0].name,'lookup'); assert.deepEqual(parts[0].input,{id:7}); assert.equal(calls.at(-1).body.tool_choice,'required');
  await provider.provideLanguageModelChatResponse(models[0],[{role:2,content:[new Call('tool-1','lookup',{id:7})]},{role:1,content:[new Result('tool-1',[new Text('seven')])]}],{}, {report(){}}, cancellation);
  assert.equal(calls.at(-1).body.messages.at(-1).role,'tool');
  await provider.provideLanguageModelChatResponse(models[0],[{role:1,content:[new Text('Hello')]}],{}, {report(){}}, cancellation);
  assert.equal(await provider.provideTokenCount(models[0],'12345678'),2);
  assert.equal(await provider.provideTokenCount(models[0],{text:'fixture'})>0,true);
  await handler({prompt:'sk-'+'x'.repeat(40)},{history:[]},output,cancellation); assert.ok(rendered.some(value=>typeof value==='string'&&value.includes('Remove API keys')));
  await registeredCommands.get('codeva.askAboutTerminal')();
  const terminalChat=commands.findLast(value=>value[0]==='workbench.action.chat.open');
  assert.match(terminalChat[1].query,/Build failed: missing package/);
  assert.equal(terminalChat[1].isPartialQuery,true);
  vscode.window.activeTerminal.selection='sk-'+'x'.repeat(32);
  await assert.rejects(registeredCommands.get('codeva.askAboutTerminal')(),/credential/);
});
