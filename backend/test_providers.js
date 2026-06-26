/**
 * test_providers.js — Live provider + model availability tester
 * Run: node test_providers.js
 * Tests every provider with a simple "Say OK" prompt and reports latency + status.
 */

import './src/config/env.js'
import OpenAI from 'openai'

const TEST_MESSAGES = [{ role: 'user', content: 'Say only the word OK' }]
const TIMEOUT_MS = 12000

function getKey(prefix) {
  // Try KEY1, KEY2, KEY3 ... and legacy KEY
  const legacy = process.env[`${prefix}_API_KEY`]
  if (legacy?.trim()) return legacy.trim()
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`${prefix}_API_KEY${i}`]
    if (k?.trim()) return k.trim()
  }
  return null
}

async function testModel(provider, baseURL, apiKey, model, label) {
  if (!apiKey) return { label, model, provider, status: 'NO_KEY', latency: null }
  
  const client = new OpenAI({ apiKey, baseURL })
  const start = Date.now()
  
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    
    const res = await client.chat.completions.create({
      model,
      messages: TEST_MESSAGES,
      max_tokens: 10,
      stream: false,
    }, { signal: controller.signal })
    
    clearTimeout(timer)
    const content = res.choices?.[0]?.message?.content?.trim() || '?'
    return { label, model, provider, status: 'OK', latency: Date.now() - start, reply: content }
  } catch (e) {
    return { label, model, provider, status: `FAIL: ${e.message?.slice(0, 60)}`, latency: Date.now() - start }
  }
}

async function testGemini(model, label) {
  const key = getKey('GEMINI')
  if (!key) return { label, model, provider: 'gemini', status: 'NO_KEY', latency: null }
  
  const start = Date.now()
  try {
    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey: key })
    const res = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: 'Say only the word OK' }] }],
      config: { maxOutputTokens: 10 }
    })
    return { label, model, provider: 'gemini', status: 'OK', latency: Date.now() - start, reply: res.text?.trim() }
  } catch (e) {
    return { label, model, provider: 'gemini', status: `FAIL: ${e.message?.slice(0, 60)}`, latency: Date.now() - start }
  }
}

async function testCloudflare(model, label) {
  const key = getKey('CLOUDFLARE')
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  if (!key || !accountId) return { label, model, provider: 'cloudflare', status: 'NO_KEY', latency: null }
  
  const client = new OpenAI({
    apiKey: key,
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`
  })
  const start = Date.now()
  try {
    const res = await client.chat.completions.create({
      model,
      messages: TEST_MESSAGES,
      max_tokens: 10,
    })
    const content = res.choices?.[0]?.message?.content?.trim() || '?'
    return { label, model, provider: 'cloudflare', status: 'OK', latency: Date.now() - start, reply: content }
  } catch (e) {
    return { label, model, provider: 'cloudflare', status: `FAIL: ${e.message?.slice(0, 60)}`, latency: Date.now() - start }
  }
}

// ─── All tests ────────────────────────────────────────────────────────────────

const TESTS = [
  // GROQ — fastest free provider
  () => testModel('groq', 'https://api.groq.com/openai/v1', getKey('GROQ'), 'llama-3.1-8b-instant',       'Groq: llama-3.1-8b'),
  () => testModel('groq', 'https://api.groq.com/openai/v1', getKey('GROQ'), 'llama-3.1-70b-versatile',    'Groq: llama-3.1-70b'),
  () => testModel('groq', 'https://api.groq.com/openai/v1', getKey('GROQ'), 'llama-3.3-70b-versatile',    'Groq: llama-3.3-70b'),
  () => testModel('groq', 'https://api.groq.com/openai/v1', getKey('GROQ'), 'deepseek-r1-distill-llama-70b', 'Groq: deepseek-r1-distill-70b'),
  () => testModel('groq', 'https://api.groq.com/openai/v1', getKey('GROQ'), 'qwen-2.5-coder-32b',         'Groq: qwen-2.5-coder-32b'),
  () => testModel('groq', 'https://api.groq.com/openai/v1', getKey('GROQ'), 'compound-beta',              'Groq: compound-beta'),
  () => testModel('groq', 'https://api.groq.com/openai/v1', getKey('GROQ'), 'gemma2-9b-it',               'Groq: gemma2-9b'),
  () => testModel('groq', 'https://api.groq.com/openai/v1', getKey('GROQ'), 'mistral-saba-24b',           'Groq: mistral-saba-24b'),

  // CEREBRAS
  () => testModel('cerebras', 'https://api.cerebras.ai/v1', getKey('CEREBRAS'), 'llama-3.3-70b',    'Cerebras: llama-3.3-70b'),
  () => testModel('cerebras', 'https://api.cerebras.ai/v1', getKey('CEREBRAS'), 'llama3.1-8b',      'Cerebras: llama3.1-8b'),
  () => testModel('cerebras', 'https://api.cerebras.ai/v1', getKey('CEREBRAS'), 'gpt-oss-120b',     'Cerebras: gpt-oss-120b'),
  () => testModel('cerebras', 'https://api.cerebras.ai/v1', getKey('CEREBRAS'), 'qwen-3-32b',       'Cerebras: qwen-3-32b'),

  // GEMINI
  () => testGemini('gemini-2.5-flash', 'Gemini: 2.5-flash'),
  () => testGemini('gemini-2.5-pro',   'Gemini: 2.5-pro'),
  () => testGemini('gemini-2.0-flash', 'Gemini: 2.0-flash'),

  // OPENROUTER (best free models)
  () => testModel('openrouter', 'https://openrouter.ai/api/v1', getKey('OPENROUTER'), 'openai/gpt-4o-mini',                          'OpenRouter: gpt-4o-mini'),
  () => testModel('openrouter', 'https://openrouter.ai/api/v1', getKey('OPENROUTER'), 'meta-llama/llama-3.3-70b-instruct:free',       'OpenRouter: llama-3.3-70b:free'),
  () => testModel('openrouter', 'https://openrouter.ai/api/v1', getKey('OPENROUTER'), 'deepseek/deepseek-v4-flash:free',              'OpenRouter: deepseek-v4-flash:free'),
  () => testModel('openrouter', 'https://openrouter.ai/api/v1', getKey('OPENROUTER'), 'moonshotai/kimi-k2.6:free',                   'OpenRouter: kimi-k2.6:free'),
  () => testModel('openrouter', 'https://openrouter.ai/api/v1', getKey('OPENROUTER'), 'minimax/minimax-m2.5:free',                   'OpenRouter: minimax-m2.5:free'),
  () => testModel('openrouter', 'https://openrouter.ai/api/v1', getKey('OPENROUTER'), 'google/gemini-2.5-flash',                     'OpenRouter: gemini-2.5-flash'),
  () => testModel('openrouter', 'https://openrouter.ai/api/v1', getKey('OPENROUTER'), 'qwen/qwen-2.5-72b-instruct',                  'OpenRouter: qwen-2.5-72b'),
  () => testModel('openrouter', 'https://openrouter.ai/api/v1', getKey('OPENROUTER'), 'anthropic/claude-3.5-sonnet',                 'OpenRouter: claude-3.5-sonnet'),
  () => testModel('openrouter', 'https://openrouter.ai/api/v1', getKey('OPENROUTER'), 'deepseek/deepseek-r1-distill-llama-70b:free', 'OpenRouter: deepseek-r1:free'),

  // LLM7
  () => testModel('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'claude-fable-5',              'LLM7: claude-fable-5'),
  () => testModel('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'deepseek-v4-flash',           'LLM7: deepseek-v4-flash'),
  () => testModel('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'kimi-k2.6',                   'LLM7: kimi-k2.6'),
  () => testModel('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'qwen3-235b',                  'LLM7: qwen3-235b'),
  () => testModel('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'minimax-m2.7',                'LLM7: minimax-m2.7'),
  () => testModel('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'mistral-small-3.2',           'LLM7: mistral-small-3.2'),
  () => testModel('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'devstral-small-2:24b',        'LLM7: devstral-small-2'),
  () => testModel('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'deepseek-v3.1:671b-terminus', 'LLM7: deepseek-v3.1-671b'),

  // OPENCODE
  () => testModel('opencode', 'https://opencode.ai/zen/v1', getKey('OPENCODE'), 'deepseek-v4-pro',      'OpenCode: deepseek-v4-pro'),
  () => testModel('opencode', 'https://opencode.ai/zen/v1', getKey('OPENCODE'), 'deepseek-v4-flash',    'OpenCode: deepseek-v4-flash'),
  () => testModel('opencode', 'https://opencode.ai/zen/v1', getKey('OPENCODE'), 'deepseek-v4-flash-free','OpenCode: deepseek-v4-flash-free'),
  () => testModel('opencode', 'https://opencode.ai/zen/v1', getKey('OPENCODE'), 'kimi-k2.5',            'OpenCode: kimi-k2.5'),
  () => testModel('opencode', 'https://opencode.ai/zen/v1', getKey('OPENCODE'), 'minimax-m3-free',      'OpenCode: minimax-m3-free'),
  () => testModel('opencode', 'https://opencode.ai/zen/v1', getKey('OPENCODE'), 'qwen3.7-max',          'OpenCode: qwen3.7-max'),

  // APIFREELLM
  () => testModel('apifreellm', 'https://apifreellm.com/api/v1', getKey('APIFREELLM'), 'gpt-4o',               'ApiFree: gpt-4o'),
  () => testModel('apifreellm', 'https://apifreellm.com/api/v1', getKey('APIFREELLM'), 'claude-3.5-sonnet',    'ApiFree: claude-3.5-sonnet'),
  () => testModel('apifreellm', 'https://apifreellm.com/api/v1', getKey('APIFREELLM'), 'llama-3-70b',          'ApiFree: llama-3-70b'),

  // MISTRAL
  () => testModel('mistral', 'https://api.mistral.ai/v1', getKey('MISTRAL'), 'mistral-large-latest',   'Mistral: large-latest'),
  () => testModel('mistral', 'https://api.mistral.ai/v1', getKey('MISTRAL'), 'mistral-medium-latest',  'Mistral: medium-latest'),
  () => testModel('mistral', 'https://api.mistral.ai/v1', getKey('MISTRAL'), 'codestral-latest',       'Mistral: codestral'),

  // CLOUDFLARE
  () => testCloudflare('@cf/meta/llama-3.3-70b-instruct-fp8-fast', 'Cloudflare: llama-3.3-70b-fp8-fast'),
  () => testCloudflare('@cf/meta/llama-3.1-8b-instruct',           'Cloudflare: llama-3.1-8b'),
  () => testCloudflare('@cf/qwen/qwq-32b-preview',                 'Cloudflare: qwq-32b'),

  // HUGGINGFACE (most of these fail due to cold starts / plan limits — test anyway)
  () => testModel('huggingface', 'https://router.huggingface.co/v1', getKey('HUGGINGFACE'), 'meta-llama/Llama-3.3-70B-Instruct',                    'HF: llama-3.3-70b'),
  () => testModel('huggingface', 'https://router.huggingface.co/v1', getKey('HUGGINGFACE'), 'Qwen/Qwen2.5-72B-Instruct',                            'HF: qwen2.5-72b'),
  () => testModel('huggingface', 'https://router.huggingface.co/v1', getKey('HUGGINGFACE'), 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B',             'HF: deepseek-r1'),
  () => testModel('huggingface', 'https://router.huggingface.co/v1', getKey('HUGGINGFACE'), 'cognitivecomputations/dolphin-2.9.2-qwen2.5-72b',       'HF: dolphin-qwen-72b'),
  () => testModel('huggingface', 'https://router.huggingface.co/v1', getKey('HUGGINGFACE'), 'cognitivecomputations/dolphin-2.9.4-llama3-70b',        'HF: dolphin-llama-70b'),
  () => testModel('huggingface', 'https://router.huggingface.co/v1', getKey('HUGGINGFACE'), 'NousResearch/Hermes-3-Llama-3.1-70B',                   'HF: hermes-3-70b'),
]

// ─── Run all tests in parallel batches ───────────────────────────────────────

async function run() {
  console.log('\n🔍 Testing all providers — please wait (~12s)...\n')
  
  const BATCH = 8
  const results = []
  
  for (let i = 0; i < TESTS.length; i += BATCH) {
    const batch = TESTS.slice(i, i + BATCH)
    const batchResults = await Promise.all(batch.map(fn => fn()))
    results.push(...batchResults)
    process.stdout.write(`  [${Math.min(i + BATCH, TESTS.length)}/${TESTS.length}] tested...\r`)
  }

  // Sort: OK first (by latency), then FAIL, then NO_KEY
  results.sort((a, b) => {
    if (a.status === 'OK' && b.status !== 'OK') return -1
    if (a.status !== 'OK' && b.status === 'OK') return 1
    if (a.status === 'OK' && b.status === 'OK') return (a.latency || 0) - (b.latency || 0)
    return 0
  })

  console.log('\n\n' + '='.repeat(80))
  console.log('PROVIDER TEST RESULTS')
  console.log('='.repeat(80))
  
  const ok = results.filter(r => r.status === 'OK')
  const fail = results.filter(r => r.status.startsWith('FAIL'))
  const noKey = results.filter(r => r.status === 'NO_KEY')

  console.log(`\n✅ WORKING (${ok.length} models):\n`)
  for (const r of ok) {
    console.log(`  ✅ ${r.label.padEnd(42)} ${String(r.latency)+'ms'.padEnd(8)} "${r.reply}"`)
  }

  console.log(`\n❌ FAILING (${fail.length} models):\n`)
  for (const r of fail) {
    console.log(`  ❌ ${r.label.padEnd(42)} ${r.status}`)
  }

  console.log(`\n🔑 NO KEY (${noKey.length} models):\n`)
  for (const r of noKey) {
    console.log(`  🔑 ${r.label.padEnd(42)} No API key configured`)
  }

  console.log('\n' + '='.repeat(80))
  console.log(`SUMMARY: ${ok.length} working / ${fail.length} failing / ${noKey.length} no key`)
  console.log('='.repeat(80) + '\n')

  // Print recommended mapping for each mythological model
  console.log('RECOMMENDED MYTHOLOGICAL MODEL → BEST AVAILABLE PROVIDER:\n')
  
  const workingIds = new Set(ok.map(r => r.label))
  
  const mythology = [
    { name: 'Abhimanyu (Default)', options: ['Cloudflare: llama-3.3-70b-fp8-fast','Groq: llama-3.3-70b','Cerebras: llama-3.3-70b','Groq: llama-3.1-70b'] },
    { name: 'Ravan',               options: ['LLM7: claude-fable-5','OpenRouter: claude-3.5-sonnet','Gemini: 2.5-pro','LLM7: deepseek-v3.1-671b','OpenRouter: gpt-4o-mini'] },
    { name: 'Madhav',              options: ['Gemini: 2.5-pro','LLM7: qwen3-235b','OpenCode: deepseek-v4-pro','OpenRouter: qwen-2.5-72b','Groq: llama-3.3-70b'] },
    { name: 'Arjun',               options: ['Groq: llama-3.3-70b','Cerebras: llama-3.3-70b','Groq: llama-3.1-70b','Groq: llama-3.1-8b'] },
    { name: 'Bheem',               options: ['ApiFree: gpt-4o','OpenRouter: gpt-4o-mini','Groq: llama-3.3-70b'] },
    { name: 'Chanakya',            options: ['Groq: deepseek-r1-distill-70b','OpenRouter: deepseek-r1:free','HF: deepseek-r1','OpenRouter: gpt-4o-mini'] },
    { name: 'Vyas',                options: ['OpenCode: deepseek-v4-flash','LLM7: deepseek-v4-flash','OpenRouter: deepseek-v4-flash:free','Groq: llama-3.3-70b'] },
    { name: 'Sahadeva/Gemini',     options: ['Gemini: 2.5-pro','Gemini: 2.5-flash','OpenRouter: gemini-2.5-flash'] },
    { name: 'Vayu/Mistral',        options: ['Mistral: large-latest','Mistral: medium-latest','Groq: llama-3.3-70b'] },
    { name: 'Nakul',               options: ['OpenRouter: gpt-4o-mini','Groq: llama-3.1-8b'] },
    { name: 'Kali (uncensored)',   options: ['HF: dolphin-qwen-72b','HF: dolphin-llama-70b','Groq: llama-3.3-70b','OpenRouter: llama-3.3-70b:free'] },
    { name: 'Panchayat/Council',   options: ['Groq: llama-3.3-70b','Gemini: 2.5-flash','OpenRouter: gpt-4o-mini'] },
  ]
  
  for (const m of mythology) {
    const best = m.options.find(o => workingIds.has(o)) || 'NONE WORKING — check API keys'
    const emoji = best.includes('NONE') ? '🚨' : '✅'
    console.log(`  ${emoji} ${m.name.padEnd(22)} → ${best}`)
  }
  
  console.log('')
}

run().catch(console.error)
