// Acceptance-only observer. Records host names, never URLs, headers or bodies.
'use strict';
const fs = require('node:fs');
const file = `/acceptance-log/${process.env.CODEVA_ACCEPTANCE_SERVICE}.jsonl`;
const publicModels = /(^|\.)(apinex\.bond|openrouter\.ai|mistral\.ai|groq\.com|googleapis\.com|openai\.com|anthropic\.com|cerebras\.ai|nvidia\.com|huggingface\.co|apifreellm\.com|llm7\.io)$/i;
function observe(host) {
  const hostname = String(host || '').split(':')[0];
  const public_model = publicModels.test(hostname);
  fs.appendFileSync(file, JSON.stringify({ kind: 'request', hostname, public_model }) + '\n');
  if (public_model) throw new Error('Public model request refused by on-prem acceptance observer');
}
fs.appendFileSync(file, JSON.stringify({ kind: 'observer_started', local_gateway: Boolean(process.env.DOSSIER_LOCAL_GATEWAY_URL) }) + '\n');
const originalFetch = globalThis.fetch;
globalThis.fetch = function(input, options) { observe(new URL(typeof input === 'string' || input instanceof URL ? input : input.url).hostname); return originalFetch.call(this, input, options); };
for (const protocol of ['http', 'https']) {
  const module = require(`node:${protocol}`), request = module.request;
  module.request = function(input, ...args) {
    const host = typeof input === 'string' || input instanceof URL ? new URL(input).hostname : input.hostname || input.host || 'localhost';
    observe(host); return request.call(this, input, ...args);
  };
}
