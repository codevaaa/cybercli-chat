import { Router } from 'express'
import { randomUUID } from 'crypto'
import { authenticateCLI, requireAuth } from '../middleware/auth.js'
import { llmGateway } from '../services/llm/gateway.js'
import { pickModelForPlan } from '../config/plans.js'
import {
  buildEnhanceMessages,
  checkEnhanceQuota,
  summarizeEnhanceChanges,
} from '../services/ide/promptEnhance.js'

const router = Router()

/** Friendly Codeva names → gateway model ids (same map as agent.routes). */
const MODEL_NAME_MAP = {
  ravan: 'codeva-ravan-v1',
  abhimanyu: 'cloudflare/@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  madhav: 'llm7/deepseek-v3.1:671b-terminus',
  yudhishthir: 'nvidia/llama-3.1-nemotron-70b',
  bheem: 'llm7/qwen3-235b',
  arjun: 'llm7/codestral-latest',
  nakul: 'llm7/GLM-4.6V-Flash',
  sahadeva: 'gemini/gemini-2.5-pro',
  chanakya: 'groq/deepseek-r1-distill-70b',
  shiv: 'llm7/kimi-k2.6',
  panchayat: 'council',
  auto: 'auto',
}

/** In-memory IDE session registry (machine/workspace metadata). */
const ideSessions = new Map()

/**
 * Auth: JWT Bearer, sk_cyber_ API key, or CLI session (x-cli-session + API key).
 * Sets req.user.id and req.user.plan.
 */
async function resolveIdeAuth(req, res) {
  if (req.headers['x-cli-session']) {
    await new Promise((resolve, reject) =>
      authenticateCLI(req, res, (err) => (err ? reject(err) : resolve())),
    )
    return {
      userId: req.user?.id || req.session?.user_id,
      plan: req.user?.plan || req.session?.plan || 'free',
    }
  }
  if (req.headers.authorization) {
    await new Promise((resolve, reject) =>
      requireAuth(req, res, (err) => (err ? reject(err) : resolve())),
    )
    return {
      userId: req.user?.id,
      plan: req.user?.plan || 'free',
    }
  }
  const err = new Error('Authentication required (Bearer token or x-cli-session)')
  err.status = 401
  throw err
}

function resolveModel(model) {
  if (!model) return 'auto'
  const lower = String(model).toLowerCase()
  if (MODEL_NAME_MAP[lower]) return MODEL_NAME_MAP[lower]
  // codeva/ravan → ravan
  const short = lower.replace(/^codeva\//, '')
  return MODEL_NAME_MAP[short] || model
}

function openaiMessageFromResult(result) {
  const message = {
    role: 'assistant',
    content: result.content ?? '',
  }
  if (result.tool_calls?.length) {
    message.tool_calls = result.tool_calls
    if (!message.content) message.content = null
  }
  return message
}

/**
 * POST /api/v1/ide/complete
 *
 * Agentic completion tunnel for Codevaa IDE. Forwards tools/tool_choice to
 * OpenAI-compatible providers and returns tool_calls (stream or non-stream).
 *
 * Body: { messages, model?, temperature?, tools?, tool_choice?, stream?, system? }
 */
router.post('/complete', async (req, res, next) => {
  try {
    const { userId, plan } = await resolveIdeAuth(req, res)
    void userId

    const {
      messages,
      model,
      temperature = 0.4,
      tools,
      tool_choice,
      stream = false,
      system,
      max_tokens,
    } = req.body || {}

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' })
    }

    const resolvedModel = resolveModel(model)
    const fullMessages = system
      ? [{ role: 'system', content: system, _skip_inject: true }, ...messages]
      : messages

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.flushHeaders?.()

      try {
        const generator = llmGateway.complete({
          messages: fullMessages,
          model: resolvedModel,
          temperature,
          plan,
          tools,
          tool_choice,
          max_tokens,
        })

        for await (const chunk of generator) {
          if (chunk.type === 'token') {
            res.write(`data: ${JSON.stringify({
              choices: [{ delta: { content: chunk.content }, index: 0 }],
            })}\n\n`)
          } else if (chunk.type === 'tool_calls_delta') {
            res.write(`data: ${JSON.stringify({
              choices: [{ delta: { tool_calls: chunk.tool_calls }, index: 0 }],
            })}\n\n`)
          } else if (chunk.type === 'finish') {
            res.write(`data: ${JSON.stringify({
              choices: [{ delta: {}, finish_reason: chunk.finish_reason, index: 0 }],
            })}\n\n`)
          } else if (chunk.type === 'info') {
            res.write(`data: ${JSON.stringify({ info: chunk.content })}\n\n`)
          } else if (chunk.type === 'done') {
            res.write('data: [DONE]\n\n')
          } else if (chunk.type === 'error') {
            res.write(`data: ${JSON.stringify({ error: chunk.content })}\n\n`)
          }
        }
        if (!res.writableEnded) res.write('data: [DONE]\n\n')
      } catch (err) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      }
      return res.end()
    }

    const result = await llmGateway.completeNonStream({
      messages: fullMessages,
      model: resolvedModel,
      temperature,
      plan,
      tools,
      tool_choice,
      max_tokens,
    })

    if (result.error) {
      return res.status(502).json({ error: result.error })
    }

    const message = openaiMessageFromResult(result)
    return res.json({
      id: `chatcmpl-ide-${randomUUID()}`,
      object: 'chat.completion',
      choices: [{
        message,
        finish_reason: result.finish_reason || (result.tool_calls ? 'tool_calls' : 'stop'),
        index: 0,
      }],
      model: result.model || resolvedModel,
      usage: {
        prompt_tokens: result.tokens_in || 0,
        completion_tokens: result.tokens_out || 0,
        total_tokens: (result.tokens_in || 0) + (result.tokens_out || 0),
      },
    })
  } catch (err) {
    if (err.status === 401 || err.message?.includes('Unauthorized') || err.message?.includes('Authentication')) {
      return res.status(401).json({ error: err.message || 'Authentication failed' })
    }
    next(err)
  }
})

/**
 * POST /api/v1/ide/session
 * Register an IDE session (machine id, workspace hash, Codevaa version).
 *
 * Body: { machineId?, workspaceHash?, version?, ideName? }
 */
router.post('/session', async (req, res, next) => {
  try {
    const { userId, plan } = await resolveIdeAuth(req, res)
    const {
      machineId,
      workspaceHash,
      version,
      ideName = 'codevaa',
    } = req.body || {}

    const sessionId = randomUUID()
    const record = {
      sessionId,
      userId,
      plan,
      machineId: machineId || null,
      workspaceHash: workspaceHash || null,
      version: version || null,
      ideName,
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    }
    ideSessions.set(sessionId, record)

    // Bound memory — drop oldest when over 5000
    if (ideSessions.size > 5000) {
      const first = ideSessions.keys().next().value
      ideSessions.delete(first)
    }

    return res.json({
      sessionId,
      plan,
      ideName,
      createdAt: record.createdAt,
    })
  } catch (err) {
    if (err.status === 401 || err.message?.includes('Authentication')) {
      return res.status(401).json({ error: err.message || 'Authentication failed' })
    }
    next(err)
  }
})

/**
 * POST /api/v1/ide/prompt/enhance
 * Prompt Enhancer — rewrite draft prompt with optional project digest.
 * Metered by plan (free 10/day, pro 100/day, max unlimited).
 *
 * Body: { rawPrompt, projectDigest?, mode?, locale? }
 */
router.post('/prompt/enhance', async (req, res, next) => {
  try {
    const { userId, plan } = await resolveIdeAuth(req, res)
    const { rawPrompt, projectDigest, mode, locale } = req.body || {}

    if (!rawPrompt || typeof rawPrompt !== 'string' || !rawPrompt.trim()) {
      return res.status(400).json({ error: 'rawPrompt is required' })
    }

    const quotaPeek = checkEnhanceQuota(userId, plan, { consume: false })
    if (!quotaPeek.allowed) {
      return res.status(429).json({
        error: 'Daily prompt enhance quota exceeded',
        used: quotaPeek.used,
        limit: quotaPeek.limit,
        remaining: 0,
      })
    }

    const messages = buildEnhanceMessages({ rawPrompt, projectDigest, mode, locale })
    // Prefer a strong free/beta coding model for Prompt Master (balanced tier).
    const enhanceModel = pickModelForPlan(plan, 'balanced')

    const result = await llmGateway.completeNonStream({
      messages,
      model: enhanceModel,
      temperature: 0.25,
      plan,
      max_tokens: 2200,
    })

    if (result.error) {
      return res.status(502).json({ error: result.error })
    }

    const enhancedPrompt = (result.content || '').trim()
    if (!enhancedPrompt) {
      return res.status(502).json({ error: 'Enhancer returned empty response' })
    }

    const quota = checkEnhanceQuota(userId, plan, { consume: true })

    return res.json({
      enhancedPrompt,
      changesSummary: summarizeEnhanceChanges(rawPrompt, enhancedPrompt),
      quota: {
        used: quota.used,
        limit: quota.limit,
        remaining: quota.remaining,
      },
      model: result.model || enhanceModel,
    })
  } catch (err) {
    if (err.status === 401 || err.message?.includes('Authentication')) {
      return res.status(401).json({ error: err.message || 'Authentication failed' })
    }
    next(err)
  }
})

/**
 * POST /api/v1/ide/complete/tab
 * Low-latency Tab / ghost-text completions. Fast model, low temperature, short output.
 *
 * Body: {
 *   prefix?, suffix?, language?, filePath?,
 *   messages?,  // optional full messages instead of prefix/suffix
 *   max_tokens?
 * }
 */
router.post('/complete/tab', async (req, res, next) => {
  try {
    const { userId, plan } = await resolveIdeAuth(req, res)
    void userId

    const {
      prefix,
      suffix,
      language,
      filePath,
      messages: bodyMessages,
      max_tokens = 256,
    } = req.body || {}

    let messages = bodyMessages
    if (!messages) {
      if (typeof prefix !== 'string') {
        return res.status(400).json({ error: 'prefix (or messages) is required' })
      }
      const lang = language || 'code'
      const pathHint = filePath ? `File: ${filePath}\n` : ''
      messages = [
        {
          role: 'system',
          content: `You are Codevaa's Tab autocomplete. Continue the ${lang} at the cursor. Output ONLY the completion text to insert — no markdown fences, no explanation, no repeating the prefix.`,
          _skip_inject: true,
        },
        {
          role: 'user',
          content: `${pathHint}<prefix>\n${String(prefix).slice(-6000)}\n</prefix>\n${
            suffix ? `<suffix>\n${String(suffix).slice(0, 2000)}\n</suffix>\n` : ''
          }Complete from the end of prefix.`,
        },
      ]
    }

    const fastModel = pickModelForPlan(plan, 'fast')
    const result = await llmGateway.completeNonStream({
      messages,
      model: fastModel,
      temperature: 0.15,
      plan,
      max_tokens: Math.min(Number(max_tokens) || 256, 512),
    })

    if (result.error) {
      return res.status(502).json({ error: result.error })
    }

    let completion = result.content || ''
    // Strip accidental fences
    completion = completion.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trimEnd()

    return res.json({
      completion,
      model: result.model || fastModel,
      finish_reason: result.finish_reason || 'stop',
      usage: {
        prompt_tokens: result.tokens_in || 0,
        completion_tokens: result.tokens_out || 0,
      },
    })
  } catch (err) {
    if (err.status === 401 || err.message?.includes('Authentication')) {
      return res.status(401).json({ error: err.message || 'Authentication failed' })
    }
    next(err)
  }
})

/**
 * GET /api/v1/ide/me
 * Profile snapshot for IDE Settings (email/plan when available on req.user).
 */
router.get('/me', async (req, res, next) => {
  try {
    const { userId, plan } = await resolveIdeAuth(req, res)
    return res.json({
      id: userId,
      email: req.user?.email || null,
      plan: plan || 'free',
      providers: ['codevaa', 'free-beta'],
    })
  } catch (err) {
    if (err.status === 401 || err.message?.includes('Authentication')) {
      return res.status(401).json({ error: err.message || 'Authentication failed' })
    }
    next(err)
  }
})

/**
 * GET /api/v1/ide/plan
 * Plan + usage summary for IDE Settings. Stubs against req.user.plan and
 * lightweight in-memory enhance counters; prefers Message aggregate when present.
 */
router.get('/plan', async (req, res, next) => {
  try {
    const { userId, plan } = await resolveIdeAuth(req, res)
    const enhance = checkEnhanceQuota(userId, plan, { consume: false })

    let usage = {
      total_messages: null,
      total_tokens_in: null,
      total_tokens_out: null,
      enhance_used: enhance.used,
      enhance_limit: enhance.limit,
      enhance_remaining: enhance.remaining,
    }

    try {
      const Message = (await import('../models/Message.js')).default
      const totalMessages = await Message.countDocuments({ user_id: userId })
      const tokenStats = await Message.aggregate([
        { $match: { user_id: userId } },
        {
          $group: {
            _id: null,
            total_tokens_in: { $sum: '$tokens_in' },
            total_tokens_out: { $sum: '$tokens_out' },
          },
        },
      ])
      usage = {
        ...usage,
        total_messages: totalMessages,
        total_tokens_in: tokenStats[0]?.total_tokens_in || 0,
        total_tokens_out: tokenStats[0]?.total_tokens_out || 0,
      }
    } catch {
      // Message model / DB optional in some environments
    }

    const planKey = String(plan || 'free').toLowerCase()
    const limits = {
      free: { daily_requests: 50, note: 'Free beta — multiple providers routed by gateway' },
      pro: { daily_requests: 500, note: 'Pro' },
      max: { daily_requests: -1, note: 'Max' },
      enterprise: { daily_requests: -1, note: 'Enterprise' },
    }

    return res.json({
      plan: planKey,
      email: req.user?.email || null,
      limits: limits[planKey] || limits.free,
      usage,
      models: Object.keys(MODEL_NAME_MAP),
      customEndpointProxy: true,
      betaProviders: ['llm7', 'groq', 'gemini', 'nvidia', 'cloudflare'],
    })
  } catch (err) {
    if (err.status === 401 || err.message?.includes('Authentication')) {
      return res.status(401).json({ error: err.message || 'Authentication failed' })
    }
    next(err)
  }
})

/**
 * POST /api/v1/ide/proxy/custom
 * Optional BYOK proxy: forward chat completion to a user-supplied OpenAI-compatible base URL.
 * Body: { baseUrl, apiKey, model, messages, temperature?, max_tokens?, stream? }
 */
router.post('/proxy/custom', async (req, res, next) => {
  try {
    await resolveIdeAuth(req, res)
    const {
      baseUrl,
      apiKey,
      model,
      messages,
      temperature = 0.4,
      max_tokens,
      stream = false,
    } = req.body || {}

    if (!baseUrl || !apiKey || !messages) {
      return res.status(400).json({ error: 'baseUrl, apiKey, and messages are required' })
    }

    let root = String(baseUrl).replace(/\/$/, '')
    if (!root.endsWith('/v1')) {
      root = `${root}/v1`
    }
    const target = `${root}/chat/completions`

    const upstream = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages,
        temperature,
        max_tokens,
        stream: !!stream,
      }),
    })

    if (stream) {
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/event-stream')
      res.status(upstream.status)
      const reader = upstream.body
      if (!reader) {
        return res.end()
      }
      // Node fetch body is a web stream in newer Node; fall back to arrayBuffer
      if (typeof reader.getReader === 'function') {
        const r = reader.getReader()
        const pump = async () => {
          const { done, value } = await r.read()
          if (done) return res.end()
          res.write(value)
          return pump()
        }
        return pump()
      }
      const buf = Buffer.from(await upstream.arrayBuffer())
      res.write(buf)
      return res.end()
    }

    const data = await upstream.json().catch(() => ({}))
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data.error?.message || data.error || `Upstream HTTP ${upstream.status}`,
      })
    }
    return res.status(upstream.status).json(data)
  } catch (err) {
    if (err.status === 401 || err.message?.includes('Authentication')) {
      return res.status(401).json({ error: err.message || 'Authentication failed' })
    }
    next(err)
  }
})

export default router
