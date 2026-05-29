import { llmGateway } from './gateway.js'

/**
 * CyberCli Council Engine — Multi-Model Ensemble with Prompt Routing
 *
 * Flow:
 *   1. PROMPT ROUTER: User prompt → 4 specialized prompts (one per model role)
 *   2. PARALLEL EXECUTOR: Fire 4 models simultaneously, 10s timeout each
 *   3. RESPONSE COLLECTOR: Gather all replies (handles partial failures)
 *   4. SYNTHESIZER: Merge all replies into one best answer
 *
 * Time budget: ~10 seconds total (parallel calls + synthesis)
 */

const COUNCIL_MODELS = [
  {
    id: 'gemini/gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    provider: 'gemini',
    role: 'creative_strategist',
    emoji: '🧠',
    desc: 'Creative & strategic thinking',
  },
  {
    id: 'mistral/mistral-large-latest',
    label: 'Mistral Large',
    provider: 'mistral',
    role: 'technical_architect',
    emoji: '⚙️',
    desc: 'Structured technical reasoning',
  },
  {
    id: 'groq/llama-3.1-70b',
    label: 'Llama 3.1 70B',
    provider: 'groq',
    role: 'factual_analyst',
    emoji: '⚡',
    desc: 'Fast factual analysis',
  },
  {
    id: 'openrouter/gpt-4o-mini',
    label: 'GPT-4o Mini',
    provider: 'openrouter',
    role: 'comprehensive_expert',
    emoji: '🔬',
    desc: 'Deep comprehensive analysis',
  },
]

const MODEL_TIMEOUT_MS = 12000 // 12 seconds per model (parallel, so total ~12s)
const SYNTHESIS_TIMEOUT_MS = 8000 // 8 seconds for synthesis

// ─────────────────────────────────────────────────────────────
// STEP 1: PROMPT ROUTER
// Takes the conversation history and creates 4 role-optimized variants
// ─────────────────────────────────────────────────────────────
function routePrompts(originalMessages) {
  // Extract the last user message (the actual query)
  const lastUserMsg = originalMessages.slice().reverse().find(m => m.role === 'user')
  const userQuery = lastUserMsg?.content || ''

  // Build conversation context (everything except the last user message)
  const contextMessages = originalMessages.filter(m => m !== lastUserMsg)

  const rolePrompts = {
    creative_strategist: `You are a Creative Strategist. Your thinking style is: innovative, holistic, big-picture oriented. You see connections others miss and propose novel approaches.

Approach this query with creative problem-solving, strategic thinking, and forward-looking insights. Consider edge cases, unconventional solutions, and emerging trends.

User Query: ${userQuery}`,

    technical_architect: `You are a Technical Architect. Your thinking style is: structured, precise, methodical, and detail-oriented. You excel at breaking down complex problems into clear steps.

Approach this query with rigorous technical analysis, step-by-step reasoning, and structured output. Use precise terminology and provide actionable, well-organized information.

User Query: ${userQuery}`,

    factual_analyst: `You are a Factual Analyst. Your thinking style is: concise, evidence-based, direct, and practical. You prioritize accuracy and actionable information over lengthy explanations.

Approach this query with concise, factual accuracy. Provide the most important points first. Be brief but comprehensive. Focus on what the user can directly use.

User Query: ${userQuery}`,

    comprehensive_expert: `You are a Comprehensive Domain Expert. Your thinking style is: thorough, balanced, multidisciplinary, and deeply analytical. You consider all angles and provide nuanced insights.

Approach this query with deep, comprehensive analysis. Cover multiple perspectives, consider trade-offs, and provide a well-rounded, nuanced answer that leaves no stone unturned.

User Query: ${userQuery}`,
  }

  return COUNCIL_MODELS.map(model => {
    // Build specialized message list: context + role-optimized prompt
    const specializedMessages = [
      ...contextMessages,
      { role: 'user', content: rolePrompts[model.role] },
    ]
    return { model, messages: specializedMessages }
  })
}

// ─────────────────────────────────────────────────────────────
// STEP 2: PARALLEL EXECUTOR with timeout & error resilience
// ─────────────────────────────────────────────────────────────
async function executeParallel(routedPrompts, onProgress) {
  const results = {}
  let completed = 0

  const promises = routedPrompts.map(async ({ model, messages }) => {
    const startTime = Date.now()
    try {
      onProgress({
        step: 'executing',
        model: model.id,
        label: model.label,
        emoji: model.emoji,
        index: COUNCIL_MODELS.findIndex(m => m.id === model.id) + 1,
        total: COUNCIL_MODELS.length,
      })

      // Race between the LLM call and a timeout
      const response = await Promise.race([
        llmGateway.completeNonStream({ messages, model: model.id, temperature: 0.7 }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${MODEL_TIMEOUT_MS}ms`)), MODEL_TIMEOUT_MS)
        ),
      ])

      const elapsed = Date.now() - startTime
      completed++

      if (response.error) {
        onProgress({
          step: 'error',
          model: model.id,
          label: model.label,
          emoji: model.emoji,
          error: response.error,
          completed,
          total: COUNCIL_MODELS.length,
        })
        results[model.id] = { content: '', error: response.error, elapsed }
      } else {
        onProgress({
          step: 'completed',
          model: model.id,
          label: model.label,
          emoji: model.emoji,
          completed,
          total: COUNCIL_MODELS.length,
          elapsed,
        })
        results[model.id] = { content: response.content || '', error: null, elapsed }
      }
    } catch (err) {
      completed++
      onProgress({
        step: 'error',
        model: model.id,
        label: model.label,
        emoji: model.emoji,
        error: err.message,
        completed,
        total: COUNCIL_MODELS.length,
      })
      results[model.id] = { content: '', error: err.message, elapsed: Date.now() - startTime }
    }
  })

  await Promise.all(promises)
  return results
}

// ─────────────────────────────────────────────────────────────
// STEP 3: RESPONSE SYNTHESIZER
// Merge all replies into one best combined response
// ─────────────────────────────────────────────────────────────
async function synthesize(originalMessages, results, onProgress) {
  const successful = Object.entries(results).filter(([, r]) => !r.error && r.content)

  // Edge case: no successful replies → fallback to single model
  if (successful.length === 0) {
    onProgress({ step: 'fallback', reason: 'all_models_failed' })
    const fallback = await llmGateway.completeNonStream({
      messages: originalMessages,
      model: 'gemini/gemini-2.5-flash',
      temperature: 0.7,
    })
    return fallback.content || 'All council models failed. Please try again.'
  }

  // Edge case: only 1 successful reply → return it directly
  if (successful.length === 1) {
    onProgress({ step: 'single', model: successful[0][0] })
    return successful[0][1].content
  }

  onProgress({ step: 'synthesizing', count: successful.length })

  // Build synthesis prompt
  const synthesisContext = successful
    .map(([modelId, result], idx) => {
      const model = COUNCIL_MODELS.find(m => m.id === modelId)
      return `EXPERT ${idx + 1} — ${model?.label || modelId} (${model?.desc || ''}):
${result.content.trim()}
---`
    })
    .join('\n\n')

  const synthesisPrompt = `You are the Council Synthesis Engine. You have received analyses from ${successful.length} expert AI models, each with a different specialty and perspective.

Your task: Read ALL expert analyses below, combine their best insights, resolve any contradictions, eliminate redundancy, and produce a SINGLE comprehensive, accurate, and well-structured response.

Rules:
- Merge overlapping points; keep unique insights from each expert.
- If experts disagree, present the most balanced or evidence-based view.
- Maintain the user's original language and tone.
- Structure the response clearly with headings, bullet points, or numbered steps where appropriate.
- Do NOT mention that this is a synthesis or refer to "Expert 1", "Expert 2", etc. in the final output. Write as one coherent voice.

EXPERT ANALYSES:

${synthesisContext}

FINAL SYNTHESIZED RESPONSE:`

  const synthesisMessages = [
    ...originalMessages.filter(m => m.role !== 'user'),
    { role: 'user', content: synthesisPrompt },
  ]

  try {
    const synthesis = await Promise.race([
      llmGateway.completeNonStream({
        messages: synthesisMessages,
        model: 'gemini/gemini-2.5-pro',
        temperature: 0.4, // Lower temp for consistent synthesis
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Synthesis timeout`)), SYNTHESIS_TIMEOUT_MS)
      ),
    ])

    if (synthesis.error) {
      // Synthesis failed → return best single reply (longest = most comprehensive)
      const best = successful.sort((a, b) => b[1].content.length - a[1].content.length)[0]
      onProgress({ step: 'synthesis_failed', fallback: best[0] })
      return best[1].content
    }

    onProgress({ step: 'done', models_used: successful.length })
    return synthesis.content || successful[0][1].content
  } catch (err) {
    // Synthesis timeout/error → return best single reply
    const best = successful.sort((a, b) => b[1].content.length - a[1].content.length)[0]
    onProgress({ step: 'synthesis_error', error: err.message, fallback: best[0] })
    return best[1].content
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN STREAMING API
// Yields progress events + final synthesized tokens
// ─────────────────────────────────────────────────────────────
export async function* runCouncilStream(originalMessages) {
  const startTime = Date.now()

  // ── Phase 1: Prompt Routing ──
  yield {
    type: 'info',
    content: '🧠 Council Mode: Analyzing query and routing to 4 specialized models...',
  }

  const routedPrompts = routePrompts(originalMessages)

  yield {
    type: 'info',
    content: `🎯 Prompts routed: ${COUNCIL_MODELS.map(m => m.emoji + ' ' + m.label).join(' | ')}`,
  }

  // ── Phase 2: Parallel Execution ──
  const progressUpdates = []
  const results = await executeParallel(routedPrompts, (update) => {
    progressUpdates.push(update)
  })

  // Emit progress to user
  for (const update of progressUpdates) {
    if (update.step === 'executing') {
      yield {
        type: 'info',
        content: `${update.emoji} Model ${update.index}/${update.total} responding: ${update.label} (${update.desc})`,
      }
    } else if (update.step === 'completed') {
      yield {
        type: 'info',
        content: `✅ ${update.emoji} ${update.label} replied (${update.elapsed}ms)`,
      }
    } else if (update.step === 'error') {
      yield {
        type: 'info',
        content: `⚠️ ${update.emoji} ${update.label} failed: ${update.error}`,
      }
    }
  }

  // ── Phase 3: Synthesis ──
  const synthesisProgress = []
  const finalReply = await synthesize(originalMessages, results, (update) => {
    synthesisProgress.push(update)
  })

  for (const update of synthesisProgress) {
    if (update.step === 'synthesizing') {
      yield {
        type: 'info',
        content: `🔄 Synthesizing best response from ${update.count} expert replies...`,
      }
    } else if (update.step === 'fallback') {
      yield {
        type: 'info',
        content: '⚠️ All models failed. Falling back to single model...',
      }
    } else if (update.step === 'single') {
      yield {
        type: 'info',
        content: 'ℹ️ Only one model responded. Returning its analysis.',
      }
    } else if (update.step === 'synthesis_failed' || update.step === 'synthesis_error') {
      yield {
        type: 'info',
        content: '⚠️ Synthesis failed. Returning best individual response.',
      }
    } else if (update.step === 'done') {
      const totalTime = Date.now() - startTime
      yield {
        type: 'info',
        content: `✨ Council synthesis complete (${totalTime}ms | ${update.models_used} models)`,
      }
    }
  }

  // ── Phase 4: Stream final reply as tokens ──
  // Stream the synthesized response word-by-word for better UX
  const words = finalReply.split(/(\s+)/) // Split but keep delimiters
  const chunkSize = 5 // Words per token event
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join('')
    yield { type: 'token', content: chunk }
    // Tiny delay to simulate streaming feel (total ~1-2s for full text)
    if (i < words.length - chunkSize) {
      await new Promise(r => setTimeout(r, 8))
    }
  }

  yield { type: 'done' }
}

// ─────────────────────────────────────────────────────────────
// NON-STREAMING API (for internal use / sync contexts)
// ─────────────────────────────────────────────────────────────
export async function runCouncilNonStream(originalMessages) {
  const tokens = []
  for await (const chunk of runCouncilStream(originalMessages)) {
    if (chunk.type === 'token') tokens.push(chunk.content)
  }
  return tokens.join('')
}
