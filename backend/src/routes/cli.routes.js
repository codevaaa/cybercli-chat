import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import CLISession from '../models/CLISession.js'
import KnowledgeGraph from '../models/KnowledgeGraph.js'
import UsageAnalytics from '../models/UsageAnalytics.js'
import ApiKey from '../models/ApiKey.js'
import orchestrator from '../services/llm/ModelOrchestrator.js'
import { authenticateCLI } from '../middleware/auth.js'
import { createClient } from '@supabase/supabase-js'

const router = Router()
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// CLI Authentication - Exchange API key for session token
router.post('/auth', async (req, res, next) => {
  try {
    const { api_key, machine_id, machine_name, os, shell, cwd } = req.body

    if (!api_key || !machine_id) {
      return res.status(400).json({ error: 'API key and machine ID are required' })
    }

    // Validate API key
    const apiKeyDoc = await ApiKey.findOne({ key_hash: ApiKey.hashKey(api_key), is_active: true })
    if (!apiKeyDoc) {
      return res.status(401).json({ error: 'Invalid or revoked API key' })
    }

    // Update API key usage
    apiKeyDoc.last_used_at = new Date()
    apiKeyDoc.usage_count = (apiKeyDoc.usage_count || 0) + 1
    await apiKeyDoc.save()

    // Create new CLI session
    let normalizedOs = 'linux'
    if (os) {
      const lowerOs = os.toLowerCase()
      if (lowerOs.includes('win')) normalizedOs = 'windows'
      else if (lowerOs.includes('darwin') || lowerOs.includes('mac')) normalizedOs = 'macos'
    }

    const sessionId = `sess_${uuidv4().replace(/-/g, '')}`
    const session = new CLISession({
      session_id: sessionId,
      user_id: apiKeyDoc.user_id,
      api_key_id: apiKeyDoc._id,
      machine_id,
      machine_name: machine_name || `Machine-${machine_id.slice(0, 8)}`,
      os: normalizedOs,
      shell: shell || 'unknown',
      working_directory: cwd || '/',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'active'
    })

    await session.save()

    // Get user info from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, plan')
      .eq('id', apiKeyDoc.user_id)
      .single()

    if (userError) {
      console.error('Error fetching user:', userError)
    }

    // Get or create usage analytics
    const analytics = await UsageAnalytics.getOrCreate(apiKeyDoc.user_id)

    res.json({
      success: true,
      session_id: sessionId,
      user: {
        id: user?.id || apiKeyDoc.user_id,
        email: user?.email,
        name: user?.name,
        plan: user?.plan || 'free'
      },
      quota: analytics.quota,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    })
  } catch (error) {
    next(error)
  }
})

// Refresh session
router.post('/auth/refresh', authenticateCLI, async (req, res, next) => {
  try {
    const { session } = req
    
    session.last_activity_at = new Date()
    await session.save()

    // Get fresh quota info
    const analytics = await UsageAnalytics.getOrCreate(session.user_id)

    res.json({
      success: true,
      session_id: session.session_id,
      quota: analytics.quota,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
    })
  } catch (error) {
    next(error)
  }
})

// End session
router.post('/auth/logout', authenticateCLI, async (req, res, next) => {
  try {
    const { session } = req
    
    await session.endSession()

    res.json({ success: true, message: 'Session ended successfully' })
  } catch (error) {
    next(error)
  }
})

// Get user context for AI prompts
router.get('/context', authenticateCLI, async (req, res, next) => {
  try {
    const { session } = req
    const { prompt } = req.query

    // Get knowledge graph
    let knowledgeGraph = await KnowledgeGraph.findOne({ user_id: session.user_id })
    
    if (!knowledgeGraph) {
      // Create empty knowledge graph
      knowledgeGraph = new KnowledgeGraph({
        user_id: session.user_id,
        skills: [],
        projects: [],
        coding_patterns: { preferred_languages: [] }
      })
    }

    // Get recent session context
    const recentSessions = await CLISession.find({
      user_id: session.user_id,
      status: 'closed'
    })
    .sort({ ended_at: -1 })
    .limit(5)
    .select('ai_interactions working_directory commands')

    const context = {
      knowledge: knowledgeGraph.getContextForPrompt(prompt || ''),
      recent_sessions: recentSessions.map(s => ({
        directory: s.working_directory,
        commands: s.total_commands,
        interactions: s.ai_interactions.slice(-3)
      })),
      current_session: {
        working_directory: session.working_directory,
        total_commands: session.total_commands,
        ai_interactions_count: session.ai_interactions.length
      }
    }

    res.json(context)
  } catch (error) {
    next(error)
  }
})

// Update knowledge graph from interaction
router.post('/context/update', authenticateCLI, async (req, res, next) => {
  try {
    const { session } = req
    const { technologies, code_quality, patterns_detected } = req.body

    let knowledgeGraph = await KnowledgeGraph.findOne({ user_id: session.user_id })
    
    if (!knowledgeGraph) {
      knowledgeGraph = new KnowledgeGraph({
        user_id: session.user_id,
        skills: [],
        projects: [],
        coding_patterns: { preferred_languages: [] }
      })
    }

    // Update skills
    if (technologies?.length) {
      await knowledgeGraph.updateSkills(technologies, code_quality || 0.7)
    }

    // Update coding patterns
    if (patterns_detected?.length) {
      knowledgeGraph.coding_patterns = knowledgeGraph.coding_patterns || {}
      knowledgeGraph.coding_patterns.patterns_detected = [
        ...(knowledgeGraph.coding_patterns.patterns_detected || []),
        ...patterns_detected
      ]
    }

    knowledgeGraph.updated_at = new Date()
    await knowledgeGraph.save()

    res.json({ success: true, updated: true })
  } catch (error) {
    next(error)
  }
})

// AI completion endpoint
router.post('/complete', authenticateCLI, async (req, res, next) => {
  try {
    const { session } = req
    const {
      prompt,
      messages,
      model,
      temperature,
      max_tokens,
      stream = false,
      system
    } = req.body

    if (!prompt && !messages) {
      return res.status(400).json({ error: 'Prompt or messages are required' })
    }

    // Check quota
    const analytics = await UsageAnalytics.getOrCreate(session.user_id)
    if (analytics.quota.remaining <= 0) {
      return res.status(429).json({
        error: 'Quota exceeded',
        quota: analytics.quota,
        upgrade_url: `${process.env.FRONTEND_URL}/pricing`
      })
    }

    // Get user context
    const knowledgeGraph = await KnowledgeGraph.findOne({ user_id: session.user_id })
    const context = knowledgeGraph?.getContextForPrompt(prompt || messages?.[messages.length - 1]?.content || '')

    // Enhance system prompt with context
    const enhancedSystem = system || buildSystemPrompt(context)

    const startTime = Date.now()

    if (stream) {
      // Streaming response
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const stream = orchestrator.streamCompletion({
        prompt,
        messages: messages || [{ role: 'user', content: prompt }],
        preferredModel: model,
        temperature,
        maxTokens: max_tokens,
        system: enhancedSystem,
        userPlan: analytics.quota.plan
      })

      let fullContent = ''
      let tokenCount = 0

      for await (const chunk of stream) {
        if (chunk.done) {
          // Track usage
          const duration = Date.now() - startTime
          const estimatedTokens = Math.ceil(fullContent.length / 4)
          const cost = estimatedTokens * 0.00001 // Rough estimate

          await session.addAIInteraction(
            'chat',
            prompt,
            model || 'auto',
            Math.ceil(prompt.length / 4),
            estimatedTokens,
            cost,
            duration
          )

          await analytics.trackUsage(
            model || 'auto',
            'unknown',
            Math.ceil(prompt.length / 4),
            estimatedTokens,
            cost,
            duration
          )

          res.write('data: [DONE]\n\n')
          res.end()
        } else {
          fullContent += chunk.content
          tokenCount += chunk.content.length
          res.write(`data: ${JSON.stringify({ content: chunk.content, model: chunk.model })}\n\n`)
        }
      }
    } else {
      // Non-streaming response
      const result = await orchestrator.chatCompletion({
        prompt,
        messages: messages || [{ role: 'user', content: prompt }],
        preferredModel: model,
        temperature,
        maxTokens: max_tokens,
        system: enhancedSystem,
        userPlan: analytics.quota.plan
      })

      // Track usage
      await session.addAIInteraction(
        'chat',
        prompt,
        result.model,
        result.tokens.input,
        result.tokens.output,
        result.cost,
        result.duration_ms
      )

      await analytics.trackUsage(
        result.model,
        result.provider,
        result.tokens.input,
        result.tokens.output,
        result.cost,
        result.duration_ms
      )

      res.json({
        content: result.content,
        model: result.model,
        provider: result.provider,
        tokens: result.tokens,
        cost: result.cost,
        duration_ms: result.duration_ms,
        complexity: result.complexity
      })
    }
  } catch (error) {
    next(error)
  }
})

// Multi-model consensus
router.post('/consensus', authenticateCLI, async (req, res, next) => {
  try {
    const { session } = req
    const { prompt, models, strategy = 'weighted' } = req.body

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    const result = await orchestrator.consensusQuery(prompt, models, strategy)

    if (result.error) {
      return res.status(500).json({ error: result.error })
    }

    // Track usage for all responses
    const analytics = await UsageAnalytics.getOrCreate(session.user_id)
    for (const response of result.responses || [result]) {
      await analytics.trackUsage(
        response.model,
        response.provider,
        response.tokens?.input || 0,
        response.tokens?.output || 0,
        response.cost || 0,
        response.duration_ms || 0
      )
    }

    res.json({
      consensus: result.consensus,
      responses: result.responses || [{ content: result.content, model: result.model }],
      aggregated: result.aggregated,
      total_cost: result.aggregated?.totalCost || result.cost
    })
  } catch (error) {
    next(error)
  }
})

// Get available models
router.get('/models', authenticateCLI, async (req, res, next) => {
  try {
    const { session } = req
    
    // Get user plan
    const { data: user } = await supabase
      .from('users')
      .select('plan')
      .eq('id', session.user_id)
      .single()

    const models = orchestrator.getAvailableModels(user?.plan || 'free')

    res.json({
      models,
      plan: user?.plan || 'free'
    })
  } catch (error) {
    next(error)
  }
})

// Track command execution
router.post('/track/command', authenticateCLI, async (req, res, next) => {
  try {
    const { session } = req
    const { command, args, cwd, exit_code, output_preview, duration_ms } = req.body

    await session.addCommand(command, args, cwd, exit_code, output_preview, duration_ms)

    res.json({ success: true, tracked: true })
  } catch (error) {
    next(error)
  }
})

// Get session stats
router.get('/stats', authenticateCLI, async (req, res, next) => {
  try {
    const { session } = req
    const analytics = await UsageAnalytics.getOrCreate(session.user_id)

    res.json({
      current_session: {
        id: session.session_id,
        started_at: session.started_at,
        total_commands: session.total_commands,
        ai_interactions: session.ai_interactions.length,
        status: session.status
      },
      usage: {
        quota: analytics.quota,
        this_session: {
          tokens: session.ai_interactions.reduce((sum, i) => sum + (i.tokens_input + i.tokens_output), 0),
          cost: session.ai_interactions.reduce((sum, i) => sum + i.cost, 0),
          commands: session.total_commands
        },
        today: analytics.daily_usage[analytics.daily_usage.length - 1] || null,
        this_month: {
          total_requests: analytics.total_requests,
          total_cost: analytics.total_cost,
          total_commands: analytics.total_commands
        }
      }
    })
  } catch (error) {
    next(error)
  }
})

// Health check for CLI
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: {
      ai_completion: true,
      streaming: true,
      consensus: true,
      knowledge_graph: true,
      usage_tracking: true
    }
  })
})

// Build system prompt with context
function buildSystemPrompt(context) {
  const parts = ['You are CyberCoder, an AI coding assistant integrated into a CLI environment.']
  
  if (context?.preferredLanguages?.length) {
    parts.push(`The user prefers these languages: ${context.preferredLanguages.join(', ')}.`)
  }
  
  if (context?.technologies?.length) {
    parts.push(`They have experience with: ${context.technologies.join(', ')}.`)
  }
  
  if (context?.codingStyle) {
    parts.push(`They typically use a ${context.codingStyle} architecture style.`)
  }

  parts.push('Provide concise, practical code solutions. Prefer modern best practices.')
  
  return parts.join(' ')
}

export default router
