/**
 * test_providers_full.js
 * Deep scan of ALL providers — latest 2025/2026 FREE models only.
 * Tests actual availability and response quality.
 * 
 * Run: node test_providers_full.js
 */

import './src/config/env.js'
import OpenAI from 'openai'

const TEST_MSG = [{ role: 'user', content: 'Reply with only: ONLINE' }]
const TIMEOUT = 15000

function getKey(prefix) {
  const legacy = process.env[`${prefix}_API_KEY`]
  if (legacy?.trim()) return legacy.trim()
  for (let i = 1; i <= 20; i++) {
    const k = process.env[`${prefix}_API_KEY${i}`]
    if (k?.trim()) return k.trim()
  }
  return null
}

function showKeys() {
  const providers = ['GROQ','GEMINI','OPENROUTER','CEREBRAS','MISTRAL','NVIDIA',
    'HUGGINGFACE','OPENCODE','APIFREELLM','CLOUDFLARE','LLM7','BYTEZ']
  console.log('\n📋 API Keys Status:')
  for (const p of providers) {
    const k = getKey(p)
    if (p === 'CLOUDFLARE') {
      const acct = process.env.CLOUDFLARE_ACCOUNT_ID
      console.log(`  ${k ? '✅' : '❌'} ${p.padEnd(15)} ${k ? `key: ${k.slice(0,8)}...` : 'NO KEY'} | ACCOUNT_ID: ${acct ? acct.slice(0,10)+'...' : 'NOT SET'}`)
    } else {
      console.log(`  ${k ? '✅' : '❌'} ${p.padEnd(15)} ${k ? `key: ${k.slice(0,8)}...` : 'NO KEY'}`)
    }
  }
  console.log('')
}

async function test(label, fn) {
  const start = Date.now()
  try {
    const result = await Promise.race([
      fn(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), TIMEOUT))
    ])
    return { label, status: 'OK', latency: Date.now() - start, reply: result }
  } catch (e) {
    return { label, status: `FAIL: ${e.message?.slice(0, 80)}`, latency: Date.now() - start }
  }
}

async function chatTest(provider, baseURL, apiKey, model) {
  if (!apiKey) throw new Error('NO_KEY')
  const client = new OpenAI({ apiKey, baseURL })
  const res = await client.chat.completions.create({
    model, messages: TEST_MSG, max_tokens: 10, stream: false
  })
  return res.choices[0]?.message?.content?.trim() || '?'
}

async function geminiTest(model) {
  const key = getKey('GEMINI')
  if (!key) throw new Error('NO_KEY')
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey: key })
  const res = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: 'Reply with only: ONLINE' }] }],
    config: { maxOutputTokens: 10 }
  })
  return res.text?.trim() || '?'
}

async function cloudflareTest(model) {
  const key = getKey('CLOUDFLARE')
  const acct = process.env.CLOUDFLARE_ACCOUNT_ID
  if (!key || !acct) throw new Error('NO_KEY')
  const client = new OpenAI({ apiKey: key, baseURL: `https://api.cloudflare.com/client/v4/accounts/${acct}/ai/v1` })
  const res = await client.chat.completions.create({ model, messages: TEST_MSG, max_tokens: 10 })
  return res.choices[0]?.message?.content?.trim() || '?'
}

// ─── ALL TESTS ────────────────────────────────────────────────────────────────

const TESTS = [

  // ══ GROQ ══════════════════════════════════════════════════════════════════
  // Currently active models (June 2026)
  () => test('Groq | llama-3.1-8b-instant',       () => chatTest('groq', 'https://api.groq.com/openai/v1', getKey('GROQ'), 'llama-3.1-8b-instant')),
  () => test('Groq | llama-3.3-70b-versatile',     () => chatTest('groq', 'https://api.groq.com/openai/v1', getKey('GROQ'), 'llama-3.3-70b-versatile')),
  () => test('Groq | compound-beta',               () => chatTest('groq', 'https://api.groq.com/openai/v1', getKey('GROQ'), 'compound-beta')),
  () => test('Groq | compound-beta-mini',          () => chatTest('groq', 'https://api.groq.com/openai/v1', getKey('GROQ'), 'compound-beta-mini')),
  () => test('Groq | moonshotai/kimi-k1.5-32k',   () => chatTest('groq', 'https://api.groq.com/openai/v1', getKey('GROQ'), 'moonshotai/kimi-k1.5-32k')),
  () => test('Groq | meta-llama/llama-4-scout',   () => chatTest('groq', 'https://api.groq.com/openai/v1', getKey('GROQ'), 'meta-llama/llama-4-scout-17b-16e-instruct')),
  () => test('Groq | meta-llama/llama-4-maverick',() => chatTest('groq', 'https://api.groq.com/openai/v1', getKey('GROQ'), 'meta-llama/llama-4-maverick-17b-128e-instruct')),
  () => test('Groq | qwen-qwq-32b',               () => chatTest('groq', 'https://api.groq.com/openai/v1', getKey('GROQ'), 'qwen-qwq-32b')),
  () => test('Groq | deepseek-r1-distill-llama-70b', () => chatTest('groq', 'https://api.groq.com/openai/v1', getKey('GROQ'), 'deepseek-r1-distill-llama-70b')),
  () => test('Groq | allam-2-7b',                 () => chatTest('groq', 'https://api.groq.com/openai/v1', getKey('GROQ'), 'allam-2-7b')),
  () => test('Groq | mistral-saba-24b',            () => chatTest('groq', 'https://api.groq.com/openai/v1', getKey('GROQ'), 'mistral-saba-24b')),
  () => test('Groq | playai-tts (skip)',           async () => { throw new Error('TTS skip') }),

  // ══ CEREBRAS ══════════════════════════════════════════════════════════════
  () => test('Cerebras | llama-3.3-70b',           () => chatTest('cerebras', 'https://api.cerebras.ai/v1', getKey('CEREBRAS'), 'llama-3.3-70b')),
  () => test('Cerebras | llama3.1-8b',             () => chatTest('cerebras', 'https://api.cerebras.ai/v1', getKey('CEREBRAS'), 'llama3.1-8b')),
  () => test('Cerebras | qwen-3-32b',              () => chatTest('cerebras', 'https://api.cerebras.ai/v1', getKey('CEREBRAS'), 'qwen-3-32b')),
  () => test('Cerebras | qwen-3-235b',             () => chatTest('cerebras', 'https://api.cerebras.ai/v1', getKey('CEREBRAS'), 'qwen-3-235b')),
  () => test('Cerebras | gpt-oss-120b',            () => chatTest('cerebras', 'https://api.cerebras.ai/v1', getKey('CEREBRAS'), 'gpt-oss-120b')),
  () => test('Cerebras | llama-4-scout',           () => chatTest('cerebras', 'https://api.cerebras.ai/v1', getKey('CEREBRAS'), 'llama-4-scout')),

  // ══ GEMINI ════════════════════════════════════════════════════════════════
  () => test('Gemini | gemini-2.5-flash',          () => geminiTest('gemini-2.5-flash')),
  () => test('Gemini | gemini-2.5-pro',            () => geminiTest('gemini-2.5-pro')),
  () => test('Gemini | gemini-2.0-flash',          () => geminiTest('gemini-2.0-flash')),
  () => test('Gemini | gemini-1.5-flash',          () => geminiTest('gemini-1.5-flash')),

  // ══ LLM7 ══════════════════════════════════════════════════════════════════
  // Latest models as of June 2026
  () => test('LLM7 | claude-opus-4.8',             () => chatTest('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'claude-opus-4.8')),
  () => test('LLM7 | claude-fable-5',              () => chatTest('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'claude-fable-5')),
  () => test('LLM7 | claude-sonnet-4.5',           () => chatTest('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'claude-sonnet-4.5')),
  () => test('LLM7 | deepseek-v4-0709',            () => chatTest('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'deepseek-v4-0709')),
  () => test('LLM7 | deepseek-v4-flash',           () => chatTest('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'deepseek-v4-flash')),
  () => test('LLM7 | deepseek-v3.1:671b-terminus', () => chatTest('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'deepseek-v3.1:671b-terminus')),
  () => test('LLM7 | kimi-k2.6',                   () => chatTest('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'kimi-k2.6')),
  () => test('LLM7 | qwen3-235b',                  () => chatTest('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'qwen3-235b')),
  () => test('LLM7 | qwen3-30b-a3b',               () => chatTest('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'qwen3-30b-a3b')),
  () => test('LLM7 | GLM-4.1V-Thinking-Flash',     () => chatTest('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'GLM-4.1V-Thinking-Flash')),
  () => test('LLM7 | GLM-4.6V-Flash',             () => chatTest('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'GLM-4.6V-Flash')),
  () => test('LLM7 | gpt-4.1-nano',               () => chatTest('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'gpt-4.1-nano')),
  () => test('LLM7 | gpt-4.1-mini',               () => chatTest('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'gpt-4.1-mini')),
  () => test('LLM7 | mistral-small-3.2',           () => chatTest('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'mistral-small-3.2')),
  () => test('LLM7 | devstral-small-2:24b',        () => chatTest('llm7', 'https://api.llm7.io/v1', getKey('LLM7'), 'devstral-small-2:24b')),

  // ══ OPENCODE ══════════════════════════════════════════════════════════════
  () => test('OpenCode | deepseek-v4-pro',         () => chatTest('opencode', 'https://opencode.ai/zen/v1', getKey('OPENCODE'), 'deepseek-v4-pro')),
  () => test('OpenCode | deepseek-v4-flash',       () => chatTest('opencode', 'https://opencode.ai/zen/v1', getKey('OPENCODE'), 'deepseek-v4-flash')),
  () => test('OpenCode | deepseek-v4-flash-free',  () => chatTest('opencode', 'https://opencode.ai/zen/v1', getKey('OPENCODE'), 'deepseek-v4-flash-free')),
  () => test('OpenCode | kimi-k2.5',               () => chatTest('opencode', 'https://opencode.ai/zen/v1', getKey('OPENCODE'), 'kimi-k2.5')),
  () => test('OpenCode | minimax-m3-free',         () => chatTest('opencode', 'https://opencode.ai/zen/v1', getKey('OPENCODE'), 'minimax-m3-free')),
  () => test('OpenCode | qwen3.7-max',             () => chatTest('opencode', 'https://opencode.ai/zen/v1', getKey('OPENCODE'), 'qwen3.7-max')),

  // ══ APIFREELLM ════════════════════════════════════════════════════════════
  () => test('ApiFree | gpt-4o',                   () => chatTest('apifreellm', 'https://apifreellm.com/api/v1', getKey('APIFREELLM'), 'gpt-4o')),
  () => test('ApiFree | gpt-4.1',                  () => chatTest('apifreellm', 'https://apifreellm.com/api/v1', getKey('APIFREELLM'), 'gpt-4.1')),
  () => test('ApiFree | claude-opus-4',            () => chatTest('apifreellm', 'https://apifreellm.com/api/v1', getKey('APIFREELLM'), 'claude-opus-4')),
  () => test('ApiFree | claude-sonnet-4.5',        () => chatTest('apifreellm', 'https://apifreellm.com/api/v1', getKey('APIFREELLM'), 'claude-sonnet-4.5')),
  () => test('ApiFree | gemini-2.5-pro',           () => chatTest('apifreellm', 'https://apifreellm.com/api/v1', getKey('APIFREELLM'), 'gemini-2.5-pro')),
  () => test('ApiFree | deepseek-v4',              () => chatTest('apifreellm', 'https://apifreellm.com/api/v1', getKey('APIFREELLM'), 'deepseek-v4')),
  () => test('ApiFree | llama-4-maverick',         () => chatTest('apifreellm', 'https://apifreellm.com/api/v1', getKey('APIFREELLM'), 'llama-4-maverick')),

  // ══ OPENROUTER ════════════════════════════════════════════════════════════
  () => test('OpenRouter | gpt-4o-mini',           () => chatTest('openrouter', 'https://openrouter.ai/api/v1', getKey('OPENROUTER'), 'openai/gpt-4o-mini')),
  () => test('OpenRouter | google/gemini-2.5-flash',() => chatTest('openrouter', 'https://openrouter.ai/api/v1', getKey('OPENROUTER'), 'google/gemini-2.5-flash')),
  () => test('OpenRouter | qwen/qwen-2.5-72b',     () => chatTest('openrouter', 'https://openrouter.ai/api/v1', getKey('OPENROUTER'), 'qwen/qwen-2.5-72b-instruct')),
  () => test('OpenRouter | deepseek/deepseek-r1:free', () => chatTest('openrouter', 'https://openrouter.ai/api/v1', getKey('OPENROUTER'), 'deepseek/deepseek-r1:free')),
  () => test('OpenRouter | meta-llama/llama-4-scout:free', () => chatTest('openrouter', 'https://openrouter.ai/api/v1', getKey('OPENROUTER'), 'meta-llama/llama-4-scout-17b-16e-instruct:free')),
  () => test('OpenRouter | qwen/qwen3-235b:free',  () => chatTest('openrouter', 'https://openrouter.ai/api/v1', getKey('OPENROUTER'), 'qwen/qwen3-235b-a22b:free')),
  () => test('OpenRouter | moonshotai/kimi-k2.6:free', () => chatTest('openrouter', 'https://openrouter.ai/api/v1', getKey('OPENROUTER'), 'moonshotai/kimi-k2.6:free')),
  () => test('OpenRouter | deepseek/deepseek-v4-flash:free', () => chatTest('openrouter', 'https://openrouter.ai/api/v1', getKey('OPENROUTER'), 'deepseek/deepseek-v4-flash:free')),

  // ══ MISTRAL ════════════════════════════════════════════════════════════════
  () => test('Mistral | mistral-large-latest',     () => chatTest('mistral', 'https://api.mistral.ai/v1', getKey('MISTRAL'), 'mistral-large-latest')),
  () => test('Mistral | mistral-medium-latest',    () => chatTest('mistral', 'https://api.mistral.ai/v1', getKey('MISTRAL'), 'mistral-medium-latest')),
  () => test('Mistral | codestral-latest',         () => chatTest('mistral', 'https://api.mistral.ai/v1', getKey('MISTRAL'), 'codestral-latest')),

  // ══ HUGGINGFACE ════════════════════════════════════════════════════════════
  () => test('HF | meta-llama/Llama-3.3-70B',     () => chatTest('huggingface', 'https://router.huggingface.co/v1', getKey('HUGGINGFACE'), 'meta-llama/Llama-3.3-70B-Instruct')),
  () => test('HF | Qwen/Qwen2.5-72B',             () => chatTest('huggingface', 'https://router.huggingface.co/v1', getKey('HUGGINGFACE'), 'Qwen/Qwen2.5-72B-Instruct')),
  () => test('HF | deepseek-r1-distill-70b',       () => chatTest('huggingface', 'https://router.huggingface.co/v1', getKey('HUGGINGFACE'), 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B')),

  // ══ CLOUDFLARE ════════════════════════════════════════════════════════════
  () => test('Cloudflare | llama-3.3-70b-fp8',    () => cloudflareTest('@cf/meta/llama-3.3-70b-instruct-fp8-fast')),
  () => test('Cloudflare | llama-3.1-8b',         () => cloudflareTest('@cf/meta/llama-3.1-8b-instruct')),
  () => test('Cloudflare | qwq-32b',              () => cloudflareTest('@cf/qwen/qwq-32b-preview')),
]

// ─── Run ─────────────────────────────────────────────────────────────────────

async function run() {
  showKeys()
  console.log(`🚀 Testing ${TESTS.length} models across all providers...\n`)

  const BATCH = 6
  const results = []

  for (let i = 0; i < TESTS.length; i += BATCH) {
    const batch = TESTS.slice(i, i + BATCH)
    const r = await Promise.all(batch.map(fn => fn()))
    results.push(...r)
    const done = Math.min(i + BATCH, TESTS.length)
    process.stdout.write(`  Progress: ${done}/${TESTS.length}\r`)
  }

  const ok   = results.filter(r => r.status === 'OK').sort((a,b) => a.latency - b.latency)
  const fail = results.filter(r => r.status !== 'OK')
  const noKey = fail.filter(r => r.status.includes('NO_KEY'))
  const dead  = fail.filter(r => !r.status.includes('NO_KEY') && !r.status.includes('TTS skip'))

  console.log('\n\n' + '═'.repeat(75))
  console.log(`✅  WORKING (${ok.length})`)
  console.log('═'.repeat(75))
  for (const r of ok) {
    console.log(`  ✅  ${r.label.padEnd(48)} ${String(r.latency)+'ms'}`)
  }

  console.log('\n' + '═'.repeat(75))
  console.log(`❌  FAILING (${dead.length})`)
  console.log('═'.repeat(75))
  for (const r of dead) {
    console.log(`  ❌  ${r.label.padEnd(48)} ${r.status.slice(0, 50)}`)
  }

  console.log('\n' + '═'.repeat(75))
  console.log(`🔑  NO KEY (${noKey.length})`)
  console.log('═'.repeat(75))
  for (const r of noKey) {
    console.log(`  🔑  ${r.label}`)
  }

  // ── Mythological Recommendations ────────────────────────────────────────
  console.log('\n' + '═'.repeat(75))
  console.log('🏆  MYTHOLOGICAL MODEL → BEST AVAILABLE (Top 3 per character)')
  console.log('═'.repeat(75))

  const working = new Set(ok.map(r => r.label))
  const byLatency = (labels) => labels.filter(l => working.has(l)).slice(0, 3)

  const mapping = {
    '👻 Abhimanyu (Default/All-Rounder)': [
      'Groq | llama-3.3-70b-versatile',
      'Groq | compound-beta',
      'Cerebras | llama-3.3-70b',
      'Cerebras | qwen-3-235b',
      'LLM7 | kimi-k2.6',
      'OpenCode | deepseek-v4-pro',
    ],
    '🔴 Ravan (God-Tier Brute Force Coder)': [
      'LLM7 | claude-opus-4.8',
      'LLM7 | claude-fable-5',
      'LLM7 | deepseek-v4-0709',
      'LLM7 | deepseek-v3.1:671b-terminus',
      'ApiFree | claude-opus-4',
      'ApiFree | gpt-4.1',
      'OpenRouter | qwen/qwen-2.5-72b',
    ],
    '🟡 Madhav (Supreme Intelligence)': [
      'LLM7 | qwen3-235b',
      'LLM7 | deepseek-v4-0709',
      'Cerebras | qwen-3-235b',
      'Gemini | gemini-2.5-pro',
      'Gemini | gemini-2.5-flash',
      'OpenRouter | google/gemini-2.5-flash',
      'OpenCode | deepseek-v4-pro',
      'ApiFree | gemini-2.5-pro',
    ],
    '🟢 Arjun (Swift Speed Warrior)': [
      'Groq | llama-3.1-8b-instant',
      'Groq | llama-3.3-70b-versatile',
      'Cerebras | llama-3.3-70b',
      'Cerebras | llama3.1-8b',
      'LLM7 | GLM-4.1V-Thinking-Flash',
      'LLM7 | gpt-4.1-nano',
    ],
    '🔵 Bheem (Reliable Powerhouse)': [
      'ApiFree | gpt-4o',
      'ApiFree | gpt-4.1',
      'LLM7 | gpt-4.1-mini',
      'OpenRouter | gpt-4o-mini',
      'Groq | compound-beta',
    ],
    '🟣 Chanakya (Deep Reasoning R1)': [
      'LLM7 | deepseek-v4-0709',
      'LLM7 | deepseek-v3.1:671b-terminus',
      'HF | deepseek-r1-distill-70b',
      'OpenRouter | deepseek/deepseek-r1:free',
      'Groq | deepseek-r1-distill-llama-70b',
      'Groq | qwen-qwq-32b',
    ],
    '⚫ Kali/Ashwatthama (Uncensored)': [
      'HF | deepseek-r1-distill-70b',
      'HF | Qwen/Qwen2.5-72B',
      'LLM7 | qwen3-235b',
      'Groq | compound-beta',
    ],
    '🟠 Vayu/Mistral': [
      'Mistral | mistral-large-latest',
      'Mistral | mistral-medium-latest',
      'Mistral | codestral-latest',
    ],
  }

  for (const [name, options] of Object.entries(mapping)) {
    const best = byLatency(options)
    if (best.length === 0) {
      console.log(`\n  🚨 ${name}`)
      console.log(`     No options working — check keys`)
    } else {
      console.log(`\n  ${name}`)
      best.forEach((b, i) => {
        const r = ok.find(x => x.label === b)
        console.log(`     ${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} ${b.padEnd(45)} ${r?.latency}ms`)
      })
    }
  }

  console.log('\n' + '═'.repeat(75))
  console.log(`TOTAL: ${ok.length} working / ${dead.length} failing / ${noKey.length} no key`)
  console.log('═'.repeat(75) + '\n')
}

run().catch(console.error)
