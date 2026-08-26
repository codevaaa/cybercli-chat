import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { llmGateway } from '../services/llm/gateway.js'

const router = Router()

/**
 * POST /api/v1/compare
 * Multi-Model Comparison — send the same prompt to 2-3 models in parallel,
 * stream each model's response as it completes.
 *
 * Body: { messages: [...], models: ['model-a', 'model-b', ...], temperature? }
 * Response: SSE stream with events per model:
 *   { type: 'model_start', model, index }
 *   { type: 'model_token', model, content }
 *   { type: 'model_done', model, index, elapsed }
 *   { type: 'model_error', model, error }
 *   { type: 'all_done' }
 */
router.post('/', requireAuth, async (req, res) => {
  const { messages, models, temperature = 0.7 } = req.body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' })
  }
  if (!models || !Array.isArray(models) || models.length < 2 || models.length > 4) {
    return res.status(400).json({ error: 'models array must contain 2-4 model IDs' })
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  const send = (data) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }
  }

  const MODEL_TIMEOUT_MS = 20000 // 20s per model

  try {
    // Fire all models in parallel
    const promises = models.map(async (modelId, index) => {
      const startTime = Date.now()
      send({ type: 'model_start', model: modelId, index })

      try {
        const result = await Promise.race([
          llmGateway.completeNonStream({
            messages,
            model: modelId,
            temperature,
            plan: req.user?.plan || 'free',
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), MODEL_TIMEOUT_MS)
          ),
        ])

        const elapsed = Date.now() - startTime

        if (result.error) {
          send({ type: 'model_error', model: modelId, index, error: result.error, elapsed })
        } else {
          // Stream the content in chunks for a nice progressive feel
          const content = result.content || ''
          const chunkSize = 80 // chars per chunk
          for (let i = 0; i < content.length; i += chunkSize) {
            send({ type: 'model_token', model: modelId, index, content: content.slice(i, i + chunkSize) })
          }
          send({ type: 'model_done', model: modelId, index, elapsed })
        }
      } catch (err) {
        const elapsed = Date.now() - startTime
        send({ type: 'model_error', model: modelId, index, error: err.message, elapsed })
      }
    })

    await Promise.all(promises)
    send({ type: 'all_done' })
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    send({ type: 'error', content: err.message })
    res.write('data: [DONE]\n\n')
    res.end()
  }
})

export default router
