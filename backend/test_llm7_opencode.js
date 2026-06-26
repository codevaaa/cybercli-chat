/**
 * test_llm7_opencode.js
 * Live test of LLM7 and OpenCode keys + all their available models
 * Run: node test_llm7_opencode.js
 */

import OpenAI from 'openai'

const LLM7_KEY   = 'ey5HteAfAWCuDdXLsKvIYDULK8V79SLpqIzHCdxbzSzVqtpizczTk+EZTyYHwIDx8GPDzSJwn1q3tcQN7U4ZOHrytFT90DSdFRIg04KnjmMiUldqgGHcsY7ae8UjfGBhGRO2dboY1gHhUjAfSTr8rYJ'
const OPENCODE_KEY = 'sk-qzZZu37BuaFzDOX4OcRKabzJeSeO4cKYZv8HZHxn5eeFXYOaZQ5YFj2X46rCBnaF'

const LLM7_BASE    = 'https://api.llm7.io/v1'
const OPENCODE_BASE = 'https://opencode.ai/zen/v1'

const TEST_MSG = [{ role: 'user', content: 'Reply with only the word: ONLINE' }]
const TIMEOUT  = 14000

const llm7Client    = new OpenAI({ apiKey: LLM7_KEY,    baseURL: LLM7_BASE    })
const opencodeClient = new OpenAI({ apiKey: OPENCODE_KEY, baseURL: OPENCODE_BASE })

async function chat(client, model, label) {
  const start = Date.now()
  try {
    const res = await Promise.race([
      client.chat.completions.create({ model, messages: TEST_MSG, max_tokens: 12, stream: false }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), TIMEOUT))
    ])
    const reply = res.choices?.[0]?.message?.content?.trim() ?? '?'
    return { label, model, status: 'OK', latency: Date.now() - start, reply }
  } catch (e) {
    return { label, model, status: `FAIL: ${e.message?.slice(0, 70)}`, latency: Date.now() - start }
  }
}

// ─── LLM7 models to test (June 2026 catalog) ─────────────────────────────────
const LLM7_MODELS = [
  // Claude (free via LLM7)
  'claude-opus-4.8',
  'claude-fable-5',
  'claude-sonnet-4.5',
  'claude-opus-4-5',
  'claude-3-7-sonnet',
  // DeepSeek
  'deepseek-v4-0709',
  'deepseek-v4-flash',
  'deepseek-v3.1:671b-terminus',
  'deepseek-r1',
  // Kimi
  'kimi-k2.6',
  'kimi-k2.5',
  // Qwen
  'qwen3-235b',
  'qwen3-30b-a3b',
  'qwen3-14b',
  // GLM
  'GLM-4.1V-Thinking-Flash',
  'GLM-4.6V-Flash',
  'GLM-Z1-Flash',
  // GPT (free via LLM7)
  'gpt-4.1-nano',
  'gpt-4.1-mini',
  'gpt-4o-mini',
  // Mistral
  'mistral-small-3.2',
  'devstral-small-2:24b',
  'codestral-latest',
  // Misc
  'minimax-m2.7',
  'llama-4-scout',
  'gemini-2.5-flash',
]

// ─── OpenCode models to test ──────────────────────────────────────────────────
const OPENCODE_MODELS = [
  'deepseek-v4-pro',
  'deepseek-v4-flash',
  'deepseek-v4-flash-free',
  'kimi-k2.5',
  'minimax-m3-free',
  'minimax-m2.5',
  'qwen3.7-max',
  'qwen3-235b',
  'llama-4-maverick',
  'llama-4-scout',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gpt-4o',
  'gpt-4.1',
  'claude-sonnet-4.5',
  'claude-opus-4',
]

async function run() {
  console.log('\n🔑 Testing LLM7 key:', LLM7_KEY.slice(0, 20) + '...')
  console.log('🔑 Testing OpenCode key:', OPENCODE_KEY.slice(0, 20) + '...')

  // ── LLM7 ──────────────────────────────────────────────────────────────────
  console.log(`\n\n${'═'.repeat(65)}`)
  console.log(`LLM7 — Testing ${LLM7_MODELS.length} models`)
  console.log('═'.repeat(65))

  const llm7Results = []
  const BATCH = 5
  for (let i = 0; i < LLM7_MODELS.length; i += BATCH) {
    const batch = LLM7_MODELS.slice(i, i + BATCH)
    const r = await Promise.all(batch.map(m => chat(llm7Client, m, `LLM7 | ${m}`)))
    llm7Results.push(...r)
    process.stdout.write(`  [${Math.min(i + BATCH, LLM7_MODELS.length)}/${LLM7_MODELS.length}]\r`)
  }

  const llm7OK   = llm7Results.filter(r => r.status === 'OK').sort((a,b) => a.latency - b.latency)
  const llm7Fail = llm7Results.filter(r => r.status !== 'OK')

  console.log(`\n✅ LLM7 WORKING (${llm7OK.length}):\n`)
  for (const r of llm7OK) {
    console.log(`  ✅  ${r.model.padEnd(38)} ${String(r.latency)+'ms'.padEnd(8)}  "${r.reply}"`)
  }
  console.log(`\n❌ LLM7 FAILING (${llm7Fail.length}):\n`)
  for (const r of llm7Fail) {
    console.log(`  ❌  ${r.model.padEnd(38)} ${r.status.slice(0, 55)}`)
  }

  // ── OpenCode ───────────────────────────────────────────────────────────────
  console.log(`\n\n${'═'.repeat(65)}`)
  console.log(`OpenCode — Testing ${OPENCODE_MODELS.length} models`)
  console.log('═'.repeat(65))

  const ocResults = []
  for (let i = 0; i < OPENCODE_MODELS.length; i += BATCH) {
    const batch = OPENCODE_MODELS.slice(i, i + BATCH)
    const r = await Promise.all(batch.map(m => chat(opencodeClient, m, `OC | ${m}`)))
    ocResults.push(...r)
    process.stdout.write(`  [${Math.min(i + BATCH, OPENCODE_MODELS.length)}/${OPENCODE_MODELS.length}]\r`)
  }

  const ocOK   = ocResults.filter(r => r.status === 'OK').sort((a,b) => a.latency - b.latency)
  const ocFail = ocResults.filter(r => r.status !== 'OK')

  console.log(`\n✅ OpenCode WORKING (${ocOK.length}):\n`)
  for (const r of ocOK) {
    console.log(`  ✅  ${r.model.padEnd(38)} ${String(r.latency)+'ms'.padEnd(8)}  "${r.reply}"`)
  }
  console.log(`\n❌ OpenCode FAILING (${ocFail.length}):\n`)
  for (const r of ocFail) {
    console.log(`  ❌  ${r.model.padEnd(38)} ${r.status.slice(0, 55)}`)
  }

  // ── Mythological Recommendations ──────────────────────────────────────────
  console.log(`\n\n${'═'.repeat(65)}`)
  console.log('🏆  BEST MODEL PER MYTHOLOGICAL CHARACTER')
  console.log('═'.repeat(65))

  const allWorking = new Set([...llm7OK.map(r => `llm7:${r.model}`), ...ocOK.map(r => `oc:${r.model}`)])

  function pick(candidates) {
    for (const [prov, model] of candidates) {
      if (allWorking.has(`${prov}:${model}`)) {
        const r = prov === 'llm7'
          ? llm7OK.find(x => x.model === model)
          : ocOK.find(x => x.model === model)
        return `${prov === 'llm7' ? 'LLM7' : 'OpenCode'}: ${model} (${r?.latency}ms)`
      }
    }
    return '⚠️  NONE — use OpenRouter fallback'
  }

  const characters = [
    {
      name: '👻 Abhimanyu (All-Rounder)',
      candidates: [['llm7','kimi-k2.6'],['llm7','qwen3-235b'],['llm7','deepseek-v4-0709'],['oc','deepseek-v4-pro'],['llm7','gpt-4.1-mini']]
    },
    {
      name: '🔴 Ravan (God-Tier Coder)',
      candidates: [['llm7','claude-opus-4.8'],['llm7','deepseek-v4-0709'],['llm7','deepseek-v3.1:671b-terminus'],['llm7','claude-fable-5'],['oc','claude-sonnet-4.5']]
    },
    {
      name: '🟡 Madhav (Supreme Intelligence)',
      candidates: [['llm7','qwen3-235b'],['llm7','deepseek-v4-0709'],['oc','deepseek-v4-pro'],['llm7','kimi-k2.6'],['llm7','gemini-2.5-flash'],['oc','gemini-2.5-pro']]
    },
    {
      name: '🟢 Arjun (Swift Speed)',
      candidates: [['llm7','gpt-4.1-nano'],['llm7','GLM-4.1V-Thinking-Flash'],['llm7','deepseek-v4-flash'],['oc','deepseek-v4-flash'],['oc','deepseek-v4-flash-free']]
    },
    {
      name: '🔵 Bheem (Reliable GPT)',
      candidates: [['llm7','gpt-4.1-mini'],['llm7','gpt-4o-mini'],['oc','gpt-4o'],['oc','gpt-4.1']]
    },
    {
      name: '🟣 Chanakya (Deep R1 Reasoning)',
      candidates: [['llm7','deepseek-r1'],['llm7','deepseek-v3.1:671b-terminus'],['llm7','deepseek-v4-0709'],['oc','deepseek-v4-pro']]
    },
    {
      name: '⚫ Kali (Uncensored 671B)',
      candidates: [['llm7','deepseek-v3.1:671b-terminus'],['llm7','deepseek-v4-0709'],['llm7','qwen3-235b'],['oc','deepseek-v4-pro']]
    },
  ]

  for (const c of characters) {
    console.log(`\n  ${c.name}`)
    console.log(`     Best: ${pick(c.candidates)}`)
  }

  console.log(`\n\n${'═'.repeat(65)}`)
  console.log(`SUMMARY: LLM7 ${llm7OK.length}✅/${llm7Fail.length}❌ | OpenCode ${ocOK.length}✅/${ocFail.length}❌`)
  console.log('═'.repeat(65) + '\n')
}

run().catch(console.error)
