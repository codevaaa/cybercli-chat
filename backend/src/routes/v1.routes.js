import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import orchestrator from '../services/llm/ModelOrchestrator.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

/**
 * Anthropic-compatible /v1/messages endpoint
 * This allows the CyberCoder CLI to connect using the Anthropic SDK
 */
router.post('/messages', requireAuth, async (req, res, next) => {
  try {
    const {
      model,
      messages,
      max_tokens = 4096,
      temperature = 0.7,
      stream = false,
      system
    } = req.body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        type: 'error',
        error: {
          type: 'invalid_request_error',
          message: 'messages is required and must be a non-empty array'
        }
      })
    }

    // Get user plan from auth
    const userPlan = req.user?.plan || 'free'
    
    // Convert Anthropic format to our format
    const prompt = messages[messages.length - 1]?.content || ''
    
    if (stream) {
      // Streaming response
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      
      const messageId = `msg_${uuidv4().replace(/-/g, '')}`
      
      // Send message_start event
      res.write(`data: ${JSON.stringify({
        type: 'message_start',
        message: {
          id: messageId,
          type: 'message',
          role: 'assistant',
          model: model || 'cybermind-default',
          content: []
        }
      })}\n\n`)
      
      try {
        const streamResult = await orchestrator.chatCompletion({
          messages,
          preferredModel: model,
          temperature,
          maxTokens: max_tokens,
          system,
          userPlan,
          stream: true
        })
        
        // Stream the content
        let fullContent = ''
        for await (const chunk of orchestrator.streamCompletion({
          messages,
          preferredModel: model,
          temperature,
          maxTokens: max_tokens,
          system,
          userPlan
        })) {
          if (chunk.done) break
          
          fullContent += chunk.content
          res.write(`data: ${JSON.stringify({
            type: 'content_block_delta',
            index: 0,
            delta: { text: chunk.content }
          })}\n\n`)
        }
        
        // Send message_stop event
        res.write(`data: ${JSON.stringify({ type: 'message_stop' })}\n\n`)
        res.end()
        
      } catch (error) {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: {
            type: 'api_error',
            message: error.message
          }
        })}\n\n`)
        res.end()
      }
    } else {
      // Non-streaming response
      const result = await orchestrator.chatCompletion({
        messages,
        preferredModel: model,
        temperature,
        maxTokens: max_tokens,
        system,
        userPlan
      })
      
      res.json({
        id: `msg_${uuidv4().replace(/-/g, '')}`,
        type: 'message',
        role: 'assistant',
        model: result.model,
        content: [
          {
            type: 'text',
            text: result.content
          }
        ],
        usage: {
          input_tokens: result.tokens.input,
          output_tokens: result.tokens.output
        }
      })
    }
  } catch (error) {
    next(error)
  }
})

/**
 * Anthropic-compatible /v1/models endpoint
 */
router.get('/models', async (req, res) => {
  const models = orchestrator.getAvailableModels('pro')
  
  res.json({
    data: models.map(m => ({
      id: m.id,
      display_name: m.name,
      provider: m.provider,
      pricing: m.pricing
    }))
  })
})

export default router
