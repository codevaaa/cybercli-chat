import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { grammarInput, grammarMessages, parseGrammar, rewriteMessages } from '../services/writing/grammar.js'
import { streamLifetime } from '../services/llm/streamLifetime.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { llmGateway } from '../services/llm/gateway.js'
import { cacheKeyFor, getCached, setCached } from '../utils/responseCache.js'
import { getPersonaById } from '../services/agents/registry.js'
import { getPlan } from '../config/plans.js'

const router = Router()
const grammarLimiter = rateLimit({ windowMs: 60000, limit: 30, keyGenerator: req => req.user.id, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many writing checks. Please wait a minute.' } })

// Proofreading uses the same authenticated gateway and account plan as chat.
router.post('/grammar', requireAuth, grammarLimiter, async (req, res) => {
  let input
  try { input = grammarInput(req.body) }
  catch (error) { return res.status(400).json({ error: error.message }) }
  const model = 'auto'
  const messages = grammarMessages(input)
  const key = cacheKeyFor(messages, `${model}:${req.user.id}:${req.user.plan || 'free'}`)
  const cached = getCached(key)
  if (cached) return res.json({ ...cached, cached: true })
  try {
    const result = await llmGateway.completeNonStream({ messages, model, task: 'writing', temperature: 0.1, plan: req.user.plan || 'free', signal: AbortSignal.timeout(90000) })
    if (result.error) throw new Error('Proofreading unavailable')
    const parsed = parseGrammar(result.content, input.text)
    const dictionary = new Set((input.dictionary || []).map(word => word.normalize('NFKC').toLocaleLowerCase()))
    parsed.issues = parsed.issues.filter(issue => issue.type !== 'spelling' || !dictionary.has(issue.original.normalize('NFKC').toLocaleLowerCase()))
    setCached(key, parsed)
    return res.json({ ...parsed, cached: false })
  } catch {
    return res.status(502).json({ error: 'AI proofreading is temporarily unavailable. Please try again.' })
  }
})

router.post('/rewrite', requireAuth, grammarLimiter, async (req, res) => {
  let messages
  try { messages = rewriteMessages(req.body) }
  catch (error) { return res.status(400).json({ error: error.message }) }
  try {
    const result = await llmGateway.completeNonStream({ messages, model: 'auto', task: 'writing', temperature: 0.3, plan: req.user.plan || 'free', signal: AbortSignal.timeout(90000) })
    if (result.error || typeof result.content !== 'string' || !result.content.trim() || result.content.length > 16000) throw new Error('Invalid rewrite')
    res.json({ original: req.body.text, rewritten: result.content.trim(), mode: req.body.mode })
  } catch { res.status(502).json({ error: 'The writing editor is temporarily unavailable. Your draft has been kept. Please try again.' }) }
})

router.post('/', optionalAuth, async (req, res) => {
  const { 
    messages, 
    model: requestedModel,
    temperature = 0.7, 
    stream = true,
    webSearchEnabled = false,
    codeExecutionEnabled = false,
    imageGenerationEnabled = false,
    memoryEnabled = false,
    deepResearchEnabled = false,
    effort = 'low',
    thinking = false,
    agentId = null
  } = req.body
  // Public catalog friendly name uses the same Madhav route as the agent API.
  const model = requestedModel === 'madhav' ? 'llm7/deepseek-v3.1:671b-terminus' : requestedModel
  if (model != null && typeof model !== 'string') return res.status(400).json({ error: 'model must be a string' })
  if (model === 'council' && !getPlan(req.user?.plan).features.council) {
    return res.status(403).json({ error: 'Council requires a paid Codeva plan. Choose Automatic routing or upgrade your account.' })
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' })
  }
  if (messages.length > 64 || messages.some(message => !message || typeof message !== 'object' ||
      !['system', 'developer', 'user', 'assistant', 'tool'].includes(message.role) ||
      !(typeof message.content === 'string' || Array.isArray(message.content) || message.role === 'assistant' && message.tool_calls))) {
    return res.status(400).json({ error: 'Provide up to 64 valid chat messages.' })
  }

  // Resolve the selected agent persona (if any) from the trusted server-side
  // registry. Clients only send a validated `agentId`; the system prompt is
  // NEVER taken from the client, preventing prompt-injection / jailbreaks.
  let persona = null
  if (agentId != null) {
    if (typeof agentId !== 'string') {
      return res.status(400).json({ error: 'agentId must be a string' })
    }
    persona = getPersonaById(agentId)
    if (!persona) {
      return res.status(400).json({ error: 'Unknown agentId' })
    }
  }

  const lastUserMsg = messages.slice().reverse().find(m => m.role === 'user') || { content: '' }

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    res.flushHeaders?.()
    const lifetime = streamLifetime(res)
    try {
      let extraSystemContent = `You are Codeva, an advanced AI assistant created by Codeva.
[CORE KNOWLEDGE]
Codeva has a flagship CLI and VS Code extension called "CyberCoder". 
If the user asks how to install CyberCoder (or Codeva CyberCoder), the correct installation command is via npm:
\`npm install -g cybercli\`
After installation, they can run \`cybercli\` or \`cybercoder\` in their terminal. Do not suggest pip, python, or cloning github for standard installation.`

      // Inject the selected agent persona's trusted system prompt. This comes
      // from the server-side registry only (validated agentId), so it cannot be
      // used to smuggle arbitrary system instructions from the client.
      if (persona) {
        extraSystemContent += `\n\n[ACTIVE AGENT PERSONA: ${persona.name}]\nYou are now acting as the "${persona.name}" specialist. Adopt this expertise and follow these instructions for this conversation:\n${persona.systemPrompt}`
      }

      // If user is authenticated, we can optionally fetch user settings
      if (req.user) {
        try {
          const UserSettings = (await import('../models/UserSettings.js')).default
          const settings = await UserSettings.findOne({ user_id: req.user.id })
          if (settings) {
            if (settings.custom_instructions) {
              extraSystemContent += `\n\n[USER CUSTOM INSTRUCTIONS]\nYou must follow these instructions:\n${settings.custom_instructions}`
            }
            if (memoryEnabled && settings.memories && settings.memories.length > 0) {
              extraSystemContent += `\n\n[USER PROFILE & MEMORIES]\nYou must remember these facts about the user:\n` + settings.memories.map(m => `- ${m}`).join('\n')
            }
          }
        } catch (settingsErr) {
          console.error('Error fetching settings for guest completions:', settingsErr)
        }
      }

      // Handle Deep Research
      if (deepResearchEnabled) {
        try {
          res.write(`data: ${JSON.stringify({ type: 'info', content: '🔍 Running deep research across multiple sources…' })}\n\n`)
          const { performDeepResearch, formatDeepResearchContext } = await import('../utils/deepResearch.js')
          const research = await performDeepResearch(lastUserMsg.content)
          if (research.results.length > 0) {
            res.write(`data: ${JSON.stringify({ type: 'info', content: `📚 Analyzed ${research.totalSources} sources. Synthesizing response…` })}\n\n`)
            extraSystemContent += '\n\n' + formatDeepResearchContext(research)
          }
        } catch (researchErr) {
          console.error('Deep research error:', researchErr)
        }
      }

      // Smart Implicit Search Detection
      const timeKeywords = /\b(2024|2025|2026|latest|recent|current|who is|what is the current|today|news|update|price|weather|stock|score)\b/i
      const needsImplicitSearch = !deepResearchEnabled && !webSearchEnabled && timeKeywords.test(lastUserMsg.content)

      // Handle Web Search
      if ((webSearchEnabled || needsImplicitSearch) && !deepResearchEnabled) {
        try {
          if (needsImplicitSearch) {
             res.write(`data: ${JSON.stringify({ type: 'info', content: '🔍 Implicit search triggered for latest information...' })}\n\n`)
          }
          const { performWebSearch } = await import('../utils/webSearch.js')
          const results = await performWebSearch(lastUserMsg.content)
          if (results && results.length > 0) {
            extraSystemContent += `\n\n[WEB SEARCH RESULTS for "${lastUserMsg.content}"]\n` + 
              results.map((r, i) => `${i+1}. Title: ${r.title}\n   Link: ${r.link}\n   Snippet: ${r.snippet}`).join('\n\n') +
              `\n\nUse the search results above to provide up-to-date and accurate information. You must cite the links directly (e.g. [Title](url)) when using them.`
          }
        } catch (searchErr) {
          console.error('Web search error during guest completion:', searchErr)
        }
      }

      // Handle Image Generation
      if (imageGenerationEnabled) {
        extraSystemContent += `\n\n[IMAGE GENERATION CAPABILITY]\nYou have the real power to generate images. If the user asks you to generate, draw, or paint an image, you MUST formulate a detailed, high-quality, English image prompt and output it inside a markdown image tag using Pollinations AI, exactly like this:\n![description](https://image.pollinations.ai/p/{detailed_url_encoded_prompt}?width=512&height=512&nologo=true)\nDo not use placeholders. Generate a real descriptive prompt.`
      }

      // Handle Code Execution
      if (codeExecutionEnabled) {
        extraSystemContent += `\n\n[CODE EXECUTION CAPABILITY]\nJavaScript code execution is enabled. The user can execute JavaScript code blocks directly. If they ask you to run a calculation, verify some code, or write JavaScript, write standard JavaScript code blocks and remind them they can click the "Run" button on the top-right of your code blocks to execute the code in a sandboxed environment.`
      }



      const history = messages.map(m => ({ role: m.role, content: m.content }))
      if (extraSystemContent) {
        history.push({ role: 'system', content: extraSystemContent, _skip_inject: true })
      }

      let generator
      if (model === 'council') {
        const { runCouncilStream } = await import('../services/llm/councilEngine.js')
        generator = runCouncilStream(history)
      } else {
        generator = llmGateway.complete({ messages: history, model: model || 'auto', temperature, effort, thinking, plan: req.user?.plan || 'free', signal: lifetime.signal })
      }

      for await (const chunk of generator) {
        if (lifetime.signal.aborted) break
        if (chunk.type === 'token') {
          lifetime.token()
          res.write(`data: ${JSON.stringify({ type: 'token', content: chunk.content })}\n\n`)
        } else if (chunk.type === 'error') {
          res.write(`data: ${JSON.stringify({ type: 'error', content: chunk.content })}\n\n`)
        } else if (chunk.type === 'info') {
          res.write(`data: ${JSON.stringify({ type: 'info', content: chunk.content })}\n\n`)
        } else if (chunk.type === 'done') {
          break
        }
      }
      if (!lifetime.signal.aborted) res.write('data: [DONE]\n\n')
    } catch {
      if (!lifetime.signal.aborted) res.write(`data: ${JSON.stringify({ type: 'error', content: 'Completion unavailable. Please try again.' })}\n\n`)
    } finally {
      lifetime.dispose()
      res.end()
    }
  } else {
    try {
      let finalMessages = messages
      // Same trusted persona injection for the non-streaming path.
      if (persona) {
        finalMessages = [
          ...messages,
          {
            role: 'system',
            content: `[ACTIVE AGENT PERSONA: ${persona.name}]\nYou are now acting as the "${persona.name}" specialist. Adopt this expertise and follow these instructions for this conversation:\n${persona.systemPrompt}`,
            _skip_inject: true,
          },
        ]
      }
      const result = await llmGateway.completeNonStream({ messages: finalMessages, model, temperature, effort, thinking, plan: req.user?.plan || 'free' })
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
})

// Council Mode: 4-model ensemble with prompt routing + synthesis
router.post('/council', optionalAuth, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const { messages } = req.body
  if (!messages || !Array.isArray(messages)) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'messages is required' })}\n\n`)
    res.end()
    return
  }

  try {
    const { runCouncilStream } = await import('../services/llm/councilEngine.js')
    for await (const chunk of runCouncilStream(messages)) {
      if (chunk.type === 'done') {
        res.write('data: [DONE]\n\n')
      } else {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`)
      }
    }
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`)
  } finally {
    res.end()
  }
})

// Deep Research Mode: Multi-agent (Jay, Vijay, Deva, Abhay, Kushi, Arjun, Meera, Veer + Codic Manager)
router.post('/research', optionalAuth, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const { messages, withCouncil = false } = req.body
  if (!messages || !Array.isArray(messages)) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'messages is required' })}\n\n`)
    res.end()
    return
  }

  try {
    const { runDeepResearch } = await import('../services/llm/researchEngine.js')
    const plan = req.user?.plan || 'free'
    for await (const chunk of runDeepResearch({ messages, plan, withCouncil })) {
      if (chunk.type === 'research_done') {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`)
        res.write('data: [DONE]\n\n')
      } else {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`)
      }
    }
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`)
  } finally {
    res.end()
  }
})

// Compare Mode: return non-stream responses from 3 models with real latencies
router.post('/compare', optionalAuth, async (req, res) => {
  const { messages } = req.body
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  const models = [
    { id: 'openrouter/gpt-4o-mini', label: 'gpt-4o-mini' },
    { id: 'groq/llama-3.1-8b', label: 'llama-3.1-8b' },
    { id: 'gemini/gemini-2.5-flash', label: 'gemini-2.5-flash' }
  ]

  try {
    const results = await Promise.all(models.map(async ({ id, label }) => {
      const start = Date.now()
      const result = await llmGateway.completeNonStream({ messages, model: id, temperature: 0.7 })
      const end = Date.now()
      
      return {
        model: label,
        content: result.content || result.error || 'Failed to generate response.',
        latency: end - start
      }
    }))

    res.json({ results })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
