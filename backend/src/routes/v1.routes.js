import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { llmGateway } from '../services/llm/gateway.js'
import { requireAuth } from '../middleware/auth.js'
import { requireApiKey } from '../middleware/apiKeyAuth.js'
import { requireCredits } from '../middleware/creditsGuard.js'
import { apiRateLimiter } from '../middleware/rateLimiter.js'
import { getPlan, MODEL_TIER_MAP } from '../config/plans.js'
import UsageLog from '../models/UsageLog.js'
import User from '../models/User.js'

const router = Router()

/**
 * Anthropic-compatible /v1/messages endpoint.
 *
 * This is the CyberCoder CLI's cloud entry point (the CLI talks to it via the
 * Anthropic SDK shape). It routes through the unified `llmGateway` so the CLI
 * gets the SAME 8 free providers, fallback chain, and PLAN-GATED model access
 * as the website — not a separate, weaker orchestrator.
 */
router.post('/messages', requireAuth, async (req, res, next) => {
  try {
    const {
      model,
      messages,
      max_tokens = 4096,
      temperature = 0.7,
      stream = false,
      system,
    } = req.body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        type: 'error',
        error: { type: 'invalid_request_error', message: 'messages is required and must be a non-empty array' },
      })
    }

    const plan = req.user?.plan || 'free'

    // Normalise Anthropic-style content blocks to plain strings and fold the
    // system prompt in as a system message the gateway understands.
    const normalized = []
    if (system) normalized.push({ role: 'system', content: typeof system === 'string' ? system : '' })
    for (const m of messages) {
      const content = Array.isArray(m.content)
        ? m.content.map((b) => (typeof b === 'string' ? b : b.text || '')).join('\n')
        : String(m.content ?? '')
      normalized.push({ role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user', content })
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no')

      const messageId = `msg_${uuidv4().replace(/-/g, '')}`
      res.write(`data: ${JSON.stringify({
        type: 'message_start',
        message: { id: messageId, type: 'message', role: 'assistant', model: model || 'codeva-auto', content: [] },
      })}\n\n`)
      res.write(`data: ${JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })}\n\n`)

      try {
        for await (const chunk of llmGateway.complete({ messages: normalized, model, temperature, plan })) {
          if (chunk.type === 'token' && chunk.content) {
            res.write(`data: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: chunk.content } })}\n\n`)
          } else if (chunk.type === 'error') {
            res.write(`data: ${JSON.stringify({ type: 'error', error: { type: 'api_error', message: chunk.content } })}\n\n`)
          }
        }
        res.write(`data: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`)
        res.write(`data: ${JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'end_turn' } })}\n\n`)
        res.write(`data: ${JSON.stringify({ type: 'message_stop' })}\n\n`)
        res.end()
      } catch (error) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: { type: 'api_error', message: error.message } })}\n\n`)
        res.end()
      }
    } else {
      const result = await llmGateway.completeNonStream({ messages: normalized, model, temperature, plan })
      if (result.error) {
        return res.status(502).json({ type: 'error', error: { type: 'api_error', message: result.error } })
      }
      res.json({
        id: `msg_${uuidv4().replace(/-/g, '')}`,
        type: 'message',
        role: 'assistant',
        model: result.model || 'codeva-auto',
        content: [{ type: 'text', text: result.content }],
        usage: { input_tokens: result.tokens_in || 0, output_tokens: result.tokens_out || 0 },
      })
    }
  } catch (error) {
    next(error)
  }
})

/**
 * OpenAI-compatible /v1/chat/completions endpoint.
 * This is the public API-as-a-Service endpoint for developers.
 */
router.post('/chat/completions', apiRateLimiter, requireApiKey, requireCredits, async (req, res, next) => {
  try {
    const {
      model = 'brahma-v1', // Default to brahma-v1
      messages,
      max_tokens = 4096,
      temperature = 0.7,
      stream = false,
      mode = 'create'
    } = req.body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: { type: 'invalid_request_error', message: 'messages is required and must be a non-empty array' }
      })
    }

    const plan = req.user?.plan || 'free'
    
    // Normalise OpenAI messages to Gateway format
    const normalized = messages.map(m => ({
      role: m.role,
      content: m.content
    }))

    // Temporary logic: Since Brahma-v1 is in development, fallback to a fast open model like Llama-3 (via OpenRouter/Groq)
    const actualModelToUse = model === 'brahma-v1' ? 'llama-3-70b' : model

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const completionId = `chatcmpl-${uuidv4().replace(/-/g, '')}`
      
      let tokensOut = 0

      try {
        for await (const chunk of llmGateway.complete({ messages: normalized, model: actualModelToUse, temperature, plan })) {
          if (chunk.type === 'token' && chunk.content) {
            tokensOut++
            res.write(`data: ${JSON.stringify({
              id: completionId,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: model,
              choices: [{ delta: { content: chunk.content }, index: 0, finish_reason: null }]
            })}\n\n`)
          } else if (chunk.type === 'error') {
             res.write(`data: ${JSON.stringify({ error: { message: chunk.content } })}\n\n`)
          }
        }
        res.write(`data: ${JSON.stringify({
          id: completionId,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: model,
          choices: [{ delta: {}, index: 0, finish_reason: 'stop' }]
        })}\n\n`)
        res.write('data: [DONE]\n\n')
        res.end()

        // Log usage & deduct credits asynchronously
        await logApiUsage(req, model, 0, tokensOut, 'success')
      } catch (error) {
        res.write(`data: ${JSON.stringify({ error: { message: error.message } })}\n\n`)
        res.end()
        await logApiUsage(req, model, 0, tokensOut, 'error', error.message)
      }
    } else {
      const result = await llmGateway.completeNonStream({ messages: normalized, model: actualModelToUse, temperature, plan })
      if (result.error) {
        await logApiUsage(req, model, 0, 0, 'error', result.error)
        return res.status(502).json({ error: { type: 'api_error', message: result.error } })
      }

      const inputTokens = result.tokens_in || 0
      const outputTokens = result.tokens_out || 0

      await logApiUsage(req, model, inputTokens, outputTokens, 'success')

      res.json({
        id: `chatcmpl-${uuidv4().replace(/-/g, '')}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: result.content },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: inputTokens,
          completion_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens
        }
      })
    }
  } catch (error) {
    next(error)
  }
})

// Helper to log usage and deduct credits
async function logApiUsage(req, model, inputTokens, outputTokens, status, errorMessage = null) {
  try {
    const totalTokens = inputTokens + outputTokens
    const estimatedCost = totalTokens // 1 token = 1 credit for now
    
    await UsageLog.create({
      userId: req.user.supabase_id,
      apiKeyId: req.apiKey._id,
      model: model,
      endpoint: '/v1/chat/completions',
      inputTokens,
      outputTokens,
      totalTokens,
      cost: estimatedCost,
      status,
      errorMessage
    })

    if (status === 'success') {
      await User.updateOne(
        { supabase_id: req.user.supabase_id },
        { 
          $inc: { 
            credits: -estimatedCost,
            totalUsedTokens: totalTokens
          } 
        }
      )
    }
  } catch (e) {
    console.error('Failed to log API usage:', e)
  }
}

/**
 * Anthropic-compatible /v1/models endpoint — lists the models available to the
 * caller's plan (plan-gated), so the CLI's /model picker only shows usable ones.
 */
router.get('/models', requireAuth, async (req, res) => {
  const plan = getPlan(req.user?.plan || 'free')
  const data = Object.entries(MODEL_TIER_MAP)
    .filter(([, tier]) => plan.allowedTiers.includes(tier))
    .map(([id, tier]) => ({ id, display_name: id, tier, available: true }))
  res.json({ data, plan: plan.id })
})

export default router
