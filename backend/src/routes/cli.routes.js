import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import CLISession from '../models/CLISession.js'
import KnowledgeGraph from '../models/KnowledgeGraph.js'
import UsageAnalytics from '../models/UsageAnalytics.js'
import ApiKey from '../models/ApiKey.js'
import { SwarmOrchestrator } from '../services/swarmOrchestrator.js'
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
      system,
      tools
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

    // Check plan for premium models
    const { data: user } = await supabase
      .from('users')
      .select('plan')
      .eq('id', session.user_id)
      .single()

    const plan = (user?.plan || 'free').toLowerCase()
    if (plan === 'free' && ['madhav', 'abhimanyu'].includes((model || '').toLowerCase())) {
      return res.status(403).json({ error: 'Access Denied: The requested model is only available on PRO tiers. Please upgrade at https://opencode.ai/zen' })
    }

    // Get user context
    const knowledgeGraph = await KnowledgeGraph.findOne({ user_id: session.user_id })
    const context = knowledgeGraph?.getContextForPrompt(prompt || messages?.[messages.length - 1]?.content || '')

    // Enhance system prompt with context
    const enhancedSystem = system || buildSystemPrompt(context)

    const startTime = Date.now()

      if (stream) {
        // Streaming response for CLI and VS Code
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        const onEvent = (event) => {
          // Send status events to the client (e.g. "Kimi is reading files...")
          res.write(`data: ${JSON.stringify({ type: 'status', content: event.message })}\n\n`)
        };

        try {
          const finalOutput = await SwarmOrchestrator.processRequest(model || 'madhav', session.session_id, prompt || messages[messages.length - 1]?.content, analytics, onEvent, { messages, tools });

          if (finalOutput && finalOutput.tool_calls) {
            res.write(`data: ${JSON.stringify({ type: 'tool_calls', toolCalls: finalOutput.tool_calls })}\n\n`);
          } else {
            const outputText = typeof finalOutput === 'string' ? finalOutput : (finalOutput?.textOutput || '');
            if (!outputText && !(finalOutput && finalOutput.tool_calls)) {
              res.write(`data: ${JSON.stringify({ type: 'token', content: '[Agent returned an empty response. Please try again.]' })}\n\n`);
            } else {
              const chunkSize = 15;
              for (let i = 0; i < outputText.length; i += chunkSize) {
                const chunk = outputText.slice(i, i + chunkSize);
                res.write(`data: ${JSON.stringify({ type: 'token', content: chunk })}\n\n`);
                await new Promise(r => setTimeout(r, 10));
              }
            }
          }
        } catch (orchestratorError) {
          console.error('SwarmOrchestrator error:', orchestratorError);
          res.write(`data: ${JSON.stringify({ type: 'token', content: `[Agent Error: ${orchestratorError.message}]` })}\n\n`);
        }

        // Send usage event to CLI
        if (finalOutput && finalOutput.tokens) {
          res.write(`data: ${JSON.stringify({ 
            type: 'usage', 
            inputTokens: finalOutput.tokens.input || 0, 
            outputTokens: finalOutput.tokens.output || 0,
            cost: finalOutput.cost || 0
          })}\n\n`);
        }

        // Track usage for old legacy sessions (orchestrator handles this internally via tracking now)
        const duration = Date.now() - startTime
        await session.addAIInteraction(
          'chat',
          prompt,
          model || 'auto',
          finalOutput?.tokens?.input || Math.ceil((prompt || '').length / 4),
          finalOutput?.tokens?.output || Math.ceil((finalOutput?.textOutput || '').length / 4),
          finalOutput?.cost || 0.00001,
          duration
        )

        res.write('data: [DONE]\n\n')
        res.end()
      } else {
        const finalOutput = await SwarmOrchestrator.processRequest(model || 'madhav', session.session_id, prompt || messages[messages.length - 1]?.content, analytics, () => {}, { messages, tools });

        const usageData = await analytics.getAnalytics(session.user_id);
        res.json({
          complexity: 'high'
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

    const { getPlan, MODEL_TIER_MAP } = await import('../config/plans.js')
    const plan = getPlan(user?.plan || 'free')
    const models = Object.entries(MODEL_TIER_MAP)
      .filter(([, tier]) => plan.allowedTiers.includes(tier))
      .map(([id, tier]) => ({ id, name: id, tier }))

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

// Get usage graphs data for Web Dashboard
router.get('/usage/graphs', authenticateCLI, async (req, res, next) => {
  try {
    const { session } = req
    const analytics = await UsageAnalytics.getOrCreate(session.user_id)

    // Format daily usage for charting (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dailyData = analytics.daily_usage
      .filter(d => new Date(d.date) >= thirtyDaysAgo)
      .map(d => ({
        date: d.date.toISOString().split('T')[0],
        tokens: d.tokens_input + d.tokens_output,
        cost: d.cost,
        requests: d.requests_count
      }))

    // Format model breakdown
    const modelBreakdown = analytics.model_usage.map(m => ({
      model: m.model,
      tokens: m.total_tokens,
      cost: m.total_cost,
      percentage: analytics.total_tokens_input + analytics.total_tokens_output > 0 
        ? ((m.total_tokens / (analytics.total_tokens_input + analytics.total_tokens_output)) * 100).toFixed(1)
        : 0
    }))

    res.json({
      success: true,
      totals: {
        total_tokens: analytics.total_tokens_input + analytics.total_tokens_output,
        total_cost: analytics.total_cost,
        total_requests: analytics.total_requests
      },
      quota: {
        limit: analytics.quota.monthly_token_limit,
        used: analytics.quota.tokens_used_this_month,
        remaining: Math.max(0, analytics.quota.monthly_token_limit - analytics.quota.tokens_used_this_month),
        percentage: ((analytics.quota.tokens_used_this_month / analytics.quota.monthly_token_limit) * 100).toFixed(1)
      },
      daily_chart: dailyData,
      model_breakdown: modelBreakdown
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
