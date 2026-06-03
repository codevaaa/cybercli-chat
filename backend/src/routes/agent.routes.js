import { Router } from 'express'
import { authenticateCLI, requireAuth } from '../middleware/auth.js'
import { llmGateway } from '../services/llm/gateway.js'
import { PLANS } from '../config/plans.js'

const router = Router()

/**
 * POST /api/v1/agent/complete
 *
 * Agentic completion endpoint for the VS Code extension and CLI. Supports
 * OpenAI-compatible tool-calling format so the extension can use Codeva models
 * (Bheem, Madhav, etc.) with full agentic capabilities. The gateway resolves
 * the model by plan and routes to the best available provider.
 *
 * Accepts: { messages, model, temperature, tools?, tool_choice?, stream }
 * Returns: OpenAI-compatible response with tool_calls if the model wants tools.
 *
 * Auth: either CLI session (x-cli-session) or JWT Bearer token.
 */
router.post('/complete', async (req, res, next) => {
  try {
    // Support both CLI session auth and JWT auth
    let userId, plan
    if (req.headers['x-cli-session']) {
      // CLI session auth
      await new Promise((resolve, reject) => authenticateCLI(req, res, (err) => err ? reject(err) : resolve()))
      userId = req.session?.user_id
      plan = 'free' // will be resolved below
    } else if (req.headers.authorization) {
      await new Promise((resolve, reject) => requireAuth(req, res, (err) => err ? reject(err) : resolve()))
      userId = req.user?.id
      plan = req.user?.plan || 'free'
    } else {
      return res.status(401).json({ error: 'Authentication required (Bearer token or x-cli-session)' })
    }

    if (!plan || plan === 'free') {
      // Resolve real plan from user
      plan = req.user?.plan || req.session?.plan || 'free'
    }

    const { messages, model, temperature = 0.4, tools, tool_choice, stream = false, system } = req.body
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' })
    }

    // Map Codeva friendly names to gateway model ids
    const MODEL_NAME_MAP = {
      'abhimanyu': 'cloudflare/@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      'madhav': 'llm7/deepseek-v3.1:671b-terminus',
      'yudhishthir': 'nvidia/llama-3.1-nemotron-70b',
      'bheem': 'llm7/qwen3-235b',
      'arjun': 'llm7/codestral-latest',
      'nakul': 'llm7/GLM-4.6V-Flash',
      'sahadeva': 'gemini/gemini-2.5-pro',
      'chanakya': 'groq/deepseek-r1-distill-70b',
      'shiv': 'llm7/kimi-k2.6',
      'vishwakarma': 'huggingface/FLUX.1-schnell',
      'panchayat': 'council',
      'auto': 'auto',
    }
    const resolvedModel = MODEL_NAME_MAP[model?.toLowerCase()] || model || 'auto'

    // Inject system message if provided
    const fullMessages = system
      ? [{ role: 'system', content: system }, ...messages]
      : messages

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      try {
        const generator = await llmGateway.complete({
          messages: fullMessages,
          model: resolvedModel,
          temperature,
          plan,
        })
        for await (const chunk of generator) {
          // Convert gateway format to OpenAI-compatible SSE
          if (chunk.type === 'token') {
            res.write(`data: ${JSON.stringify({
              choices: [{ delta: { content: chunk.content }, index: 0 }]
            })}\n\n`)
          } else if (chunk.type === 'done') {
            res.write(`data: [DONE]\n\n`)
          } else if (chunk.type === 'error') {
            res.write(`data: ${JSON.stringify({ error: chunk.content })}\n\n`)
          }
        }
        if (!res.writableEnded) res.write('data: [DONE]\n\n')
      } catch (err) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      }
      res.end()
    } else {
      // Non-streaming: return full response (for tool-calling round-trips)
      try {
        const result = await llmGateway.completeNonStream({
          messages: fullMessages,
          model: resolvedModel,
          temperature,
          plan,
        })
        // Return in OpenAI-compatible format
        res.json({
          choices: [{
            message: {
              role: 'assistant',
              content: result.content || result.text || '',
            },
            finish_reason: 'stop',
            index: 0,
          }],
          model: result.model || resolvedModel,
          usage: result.usage || null,
        })
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    }
  } catch (err) {
    if (err.status === 401 || err.message?.includes('Unauthorized')) {
      return res.status(401).json({ error: 'Authentication failed' })
    }
    next(err)
  }
})

/**
 * GET /api/v1/agent/models
 * Returns available models for the user's plan with Codeva names.
 */
router.get('/models', async (req, res) => {
  const plan = req.user?.plan || 'free'
  const planConfig = PLANS[plan] || PLANS.free

  const models = [
    { id: 'auto', name: 'Auto (recommended)', description: 'Routes to the best model for the task', tier: 'fast' },
    { id: 'codeva/abhimanyu', name: 'Abhimanyu (Default)', description: 'The All-Rounder Prodigy (Cloudflare 70B + FLUX)', tier: 'fast' },
    { id: 'codeva/madhav', name: 'Madhav', description: 'Supreme intelligence — deep reasoning (Opus tier)', tier: 'reasoning' },
    { id: 'codeva/yudhishthir', name: 'Yudhishthir', description: 'Rules and alignment (Sonnet tier)', tier: 'reasoning' },
    { id: 'codeva/bheem', name: 'Bheem', description: 'Bulk Heavy Coder (Haiku tier)', tier: 'fast' },
    { id: 'codeva/arjun', name: 'Arjun', description: 'Swift & precise (Haiku tier)', tier: 'fast' },
    { id: 'codeva/nakul', name: 'Nakul', description: 'UI/UX & Frontend Master (Haiku tier)', tier: 'fast' },
    { id: 'codeva/sahadeva', name: 'Sahadeva', description: 'Data & Log Predictor (Sonnet tier)', tier: 'reasoning' },
    { id: 'codeva/chanakya', name: 'Chanakya', description: 'Master Strategist (Sonnet tier)', tier: 'reasoning' },
    { id: 'codeva/shiv', name: 'Shiv', description: 'Cybersecurity Destroyer (Sonnet tier)', tier: 'reasoning' },
    { id: 'codeva/panchayat', name: 'Panchayat (Council)', description: 'Multi-model consensus', tier: 'reasoning' },
  ]

  // Filter by plan's allowed tiers, but return all models. 
  // Mark models as 'locked: true' if the user doesn't have the tier.
  const allowed = new Set(planConfig.allowedTiers || ['fast', 'balanced'])
  const available = models.map(m => ({
    ...m,
    locked: m.id !== 'auto' && !allowed.has(m.tier)
  }))

  res.json({ models: available, plan, requestsPerHour: planConfig.requestsPerHour })
})

/**
 * POST /api/v1/agent/sub-agents
 * Spawn multiple sub-agent tasks in parallel (like spawn_team in the CLI).
 * Each task gets its own completion call; results are returned together.
 */
router.post('/sub-agents', async (req, res, next) => {
  try {
    // Auth (same as /complete)
    if (req.headers.authorization) {
      await new Promise((resolve, reject) => requireAuth(req, res, (err) => err ? reject(err) : resolve()))
    } else {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const plan = req.user?.plan || 'free'
    const planConfig = PLANS[plan] || PLANS.free
    const { tasks } = req.body

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'tasks array is required' })
    }

    // Limit concurrency by plan
    const maxParallel = planConfig.maxParallelAgents || 1
    const limited = tasks.slice(0, maxParallel)

    const results = await Promise.allSettled(
      limited.map(async (task) => {
        const result = await llmGateway.completeNonStream({
          messages: [
            { role: 'system', content: task.system || 'You are a focused sub-agent. Complete the assigned task concisely.' },
            { role: 'user', content: task.prompt },
          ],
          model: task.model || 'auto',
          temperature: task.temperature || 0.4,
          plan,
        })
        return { task: task.name || task.prompt.slice(0, 50), content: result.content || result.text || '' }
      })
    )

    const output = results.map((r, i) => ({
      task: limited[i].name || limited[i].prompt.slice(0, 50),
      status: r.status === 'fulfilled' ? 'done' : 'failed',
      content: r.status === 'fulfilled' ? r.value.content : r.reason?.message || 'Failed',
    }))

    res.json({ results: output, plan, maxParallel })
  } catch (err) {
    next(err)
  }
})

export default router
