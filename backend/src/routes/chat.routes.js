import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { llmGateway } from '../services/llm/gateway.js'
import Thread from '../models/Thread.js'
import Message from '../models/Message.js'
import { getDaemon } from '../utils/daemonBridge.js'
import { useFallbackMode } from '../utils/fallbackDb.js'

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id) || useFallbackMode()


const router = Router()

// Create a new chat thread
router.post('/', requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().optional(),
      model_id: z.string().optional(),
      folder_id: z.string().nullable().optional(),
      project_id: z.string().nullable().optional(),
      style_id: z.string().nullable().optional(),
      is_pinned: z.boolean().optional(),
      is_archived: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
      mode: z.enum(['standard', 'kalikal', 'kali_kal']).optional(),
    })
    const data = schema.parse(req.body)
    const thread = new Thread({
      user_id: req.user.id,
      title: data.title || 'New Chat',
      model_id: data.model_id || 'auto',
      mode: data.mode || 'standard',
      folder_id: data.folder_id || null,
      project_id: data.project_id || null,
      style_id: data.style_id || null
    })
    await thread.save()
    res.json(thread)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get all threads for the user
router.get('/', requireAuth, async (req, res) => {
  try {
    const threads = await Thread.find({ user_id: req.user.id, is_archived: false })
      .sort({ last_message_at: -1 })
    res.json({ threads })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get a single thread
router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid thread ID format' })
    }
    const thread = await Thread.findOne({ _id: req.params.id, user_id: req.user.id })
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' })
    }
    res.json(thread)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update thread metadata (title, pinned status, folder)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid thread ID format' })
    }
    const thread = await Thread.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { $set: req.body },
      { new: true }
    )
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' })
    }
    res.json(thread)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Clear all threads and messages for the user
router.delete('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    await Thread.deleteMany({ user_id: userId })
    await Message.deleteMany({ user_id: userId })
    res.json({ success: true, message: 'All conversations and messages cleared successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete thread and its messages
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid thread ID format' })
    }
    const thread = await Thread.findOneAndDelete({ _id: req.params.id, user_id: req.user.id })
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' })
    }
    await Message.deleteMany({ thread_id: req.params.id })
    res.json({ deleted: req.params.id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Fork/Branch conversation
router.post('/:id/fork', requireAuth, async (req, res) => {
  try {
    const { message_id } = req.body
    if (!message_id) {
      return res.status(400).json({ error: 'message_id is required to fork a thread' })
    }

    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid thread ID format' })
    }

    // Verify original thread ownership
    const originalThread = await Thread.findOne({ _id: req.params.id, user_id: req.user.id })
    if (!originalThread) {
      return res.status(404).json({ error: 'Original thread not found' })
    }

    // Verify target message belongs to the thread
    const targetMsg = await Message.findOne({ _id: message_id, thread_id: req.params.id })
    if (!targetMsg) {
      return res.status(404).json({ error: 'Message not found in this thread' })
    }

    // Mark the message as a fork point
    targetMsg.is_fork_point = true
    await targetMsg.save()

    // Retrieve all messages in original thread up to the target message (inclusive)
    const messagesToCopy = await Message.find({
      thread_id: req.params.id,
      createdAt: { $lte: targetMsg.createdAt }
    }).sort({ createdAt: 1 })

    // Create a new branched thread
    const branchedThread = new Thread({
      user_id: req.user.id,
      title: `${originalThread.title} (Branched)`,
      model_id: originalThread.model_id,
      folder_id: originalThread.folder_id,
      project_id: originalThread.project_id,
      style_id: originalThread.style_id
    })
    await branchedThread.save()

    // Clone the messages into the new thread
    const clonedMessages = messagesToCopy.map(m => ({
      thread_id: branchedThread._id,
      user_id: req.user.id,
      role: m.role,
      content: m.content,
      model: m.model,
      provider: m.provider,
    }))
    
    if (clonedMessages.length > 0) {
      await Message.insertMany(clonedMessages)
    }

    // Link the target message with the new branched thread
    targetMsg.forked_thread_id = branchedThread._id
    await targetMsg.save()

    // Update count in branched thread
    branchedThread.message_count = clonedMessages.length
    await branchedThread.save()

    res.json(branchedThread)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Truncate messages in a thread after a specific message
router.delete('/:id/messages/after/:messageId', requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.id) || !isValidId(req.params.messageId)) {
      return res.status(400).json({ error: 'Invalid ID format' })
    }

    const thread = await Thread.findOne({ _id: req.params.id, user_id: req.user.id })
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' })
    }

    const targetMsg = await Message.findOne({ _id: req.params.messageId, thread_id: req.params.id })
    if (!targetMsg) {
      return res.status(404).json({ error: 'Message not found in this thread' })
    }

    // Delete all messages in the thread created after the target message
    const deleteResult = await Message.deleteMany({
      thread_id: req.params.id,
      createdAt: { $gt: targetMsg.createdAt }
    })

    // Optionally delete the target message itself if we want to "revert" the user's message as well
    // Wait, the user wants the message back in their input box. We should delete the target message too!
    await Message.deleteOne({ _id: req.params.messageId })
    const totalDeleted = deleteResult.deletedCount + 1

    // Update count
    thread.message_count = Math.max(0, thread.message_count - totalDeleted)
    await thread.save()

    res.json({ deletedCount: totalDeleted })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Sync message from frontend (used for client-side generated assets like images)
router.post('/:id/messages/sync', requireAuth, async (req, res) => {
  const { role, content, model } = req.body
  if (!role || !content) return res.status(400).json({ error: 'role and content required' })
  
  try {
    const thread = await Thread.findOne({ _id: req.params.id, user_id: req.user.id })
    if (!thread) return res.status(404).json({ error: 'Thread not found' })

    const isImage = (model && model.includes('image')) || (/^(draw|generate image|create an image|make an image|paint)/i.test(content) && role === 'user') || (content.includes('![Generated Image]') && role === 'assistant')
    
    const newMsg = new Message({
      thread_id: thread._id,
      user_id: req.user.id,
      role,
      content,
      model: model || thread.model_id,
      ...(isImage ? { expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) } : {})
    })
    await newMsg.save()

    // Optionally auto-generate title if it's the very first user message
    if (role === 'user' && thread.title === 'New Chat') {
      const llmGateway = (await import('../services/llm/gateway.js')).llmGateway
      try {
        const titleGen = await llmGateway.completeNonStream({
          messages: [{ role: 'user', content: `Summarize this in 3 to 5 words for a chat title:\n\n"${content}"` }],
          model: 'openrouter/gpt-4o-mini',
          temperature: 0.5
        })
        if (titleGen && titleGen.content) {
          let newTitle = titleGen.content.replace(/["']/g, '').trim()
          thread.title = newTitle.slice(0, 50)
          await thread.save()
        }
      } catch (e) {
        console.error('Auto-title error during sync:', e)
      }
    }

    res.json({ success: true, message: newMsg })
  } catch (err) {
    console.error('Error syncing message:', err)
    res.status(500).json({ error: 'Failed to sync message' })
  }
})

// Retrieve messages of a thread
router.get('/:id/messages', requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid thread ID format' })
    }
    const thread = await Thread.findOne({ _id: req.params.id, user_id: req.user.id })
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' })
    }
    const messages = await Message.find({ thread_id: req.params.id }).sort({ createdAt: 1 })
    res.json({ messages })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Stream response and persist message history
// Stream response and persist message history
router.post('/:id/messages', requireAuth, async (req, res) => {
  let { 
    messages, 
    model, 
    temperature,
    webSearchEnabled = false,
    codeExecutionEnabled = false,
    imageGenerationEnabled = false,
    memoryEnabled = false,
    deepResearchEnabled = false,
    effort = 'low',
    thinking = false
  } = req.body
  
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid thread ID format' })
  }

  const thread = await Thread.findOne({ _id: req.params.id, user_id: req.user.id })
  if (!thread) {
    return res.status(404).json({ error: 'Thread not found' })
  }

  // --- Kali_Kal Mode Usage Enforcement (daily reset, plan-based limits) ---
  if (thread.mode === 'kali_kal' || thread.mode === 'kalikal') {
    const { checkAndIncrementKali } = await import('../utils/usageHelper.js')
    const usage = await checkAndIncrementKali(req.user.id, req.user.plan)
    if (!usage.allowed) {
      return res.status(403).json({
        error: `Kali_Kal daily limit reached (${usage.limit} requests). Upgrade your plan for more.`,
        usage: { used: usage.used, limit: usage.limit, remaining: 0 },
      })
    }
  }


  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    // 1. Save user's prompt to DB
    const lastUserMsg = messages.slice().reverse().find(m => m.role === 'user') || { content: '' }
    
    // Auto-enable OSINT/Research for Kali models
    if (thread.mode === 'kali_kal' || thread.mode === 'kalikal') {
      const p = lastUserMsg.content.toLowerCase()
      if (p.includes('dork') || p.includes('osint') || p.includes('deep research') || p.includes('scrape the internet') || p.includes('deep search') || p.includes('find all') || p.includes('thoroughly search')) {
        deepResearchEnabled = true
      } else if (p.includes('search') || p.includes('scrape') || p.includes('latest') || p.includes('news') || p.includes('github repo') || p.includes('find') || p.includes('research')) {
        webSearchEnabled = true
      }
    }

    const userMsg = new Message({
      thread_id: thread._id,
      user_id: req.user.id,
      role: 'user',
      content: lastUserMsg.content,
      model: model || thread.model_id,
    })
    await userMsg.save()

    // 2. Fetch UserSettings and construct system prompt additions
    let extraSystemContent = ""
    try {
      // Fetch User Settings
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

      // Fetch Project Instructions
      if (thread.project_id) {
        const Project = (await import('../models/Project.js')).default
        const project = await Project.findById(thread.project_id)
        if (project && project.custom_instructions) {
          extraSystemContent += `\n\n[PROJECT CONTEXT: ${project.name}]\n${project.custom_instructions}`
        }
      }

      // Fetch Style Instructions
      if (thread.style_id) {
        const Style = (await import('../models/Style.js')).default
        const style = await Style.findById(thread.style_id)
        if (style && style.instructions) {
          extraSystemContent += `\n\n[WRITING STYLE: ${style.name}]\n${style.instructions}`
        }
      }
    } catch (settingsErr) {
      console.error('Error fetching context for chat system prompt:', settingsErr)
    }

    // 3. Handle Deep Research (multi-angle web search like Perplexity)
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

    // 4. Handle Web Search (quick mode)
    if (webSearchEnabled && !deepResearchEnabled) {
      try {
        const { performWebSearch } = await import('../utils/webSearch.js')
        const results = await performWebSearch(lastUserMsg.content)
        if (results && results.length > 0) {
          extraSystemContent += `\n\n[WEB SEARCH RESULTS for "${lastUserMsg.content}"]\n` + 
            results.map((r, i) => `${i+1}. Title: ${r.title}\n   Link: ${r.link}\n   Snippet: ${r.snippet}`).join('\n\n') +
            `\n\nUse the search results above to provide up-to-date and accurate information. You must cite the links directly (e.g. [Title](url)) when using them.`
        }
      } catch (searchErr) {
        console.error('Web search error during chat:', searchErr)
      }
    }

    // 5. Handle Image Generation Instructions
    if (imageGenerationEnabled) {
      extraSystemContent += `\n\n[IMAGE GENERATION CAPABILITY]\nYou have the real power to generate images. If the user asks you to generate, draw, or paint an image, you MUST formulate a detailed, high-quality, English image prompt and output it inside a markdown image tag using the backend direct generation URL exactly like this:\n![description](https://cybercli-api.onrender.com/api/v1/images/generate-direct?prompt={url_encoded_prompt})\nCRITICAL: When generating an image, you MUST ONLY output the markdown image tag. DO NOT provide any tips, explanations, or conversational filler. Just the markdown tag.`
    }

    // 6. Handle Code Execution Instructions
    if (codeExecutionEnabled) {
      extraSystemContent += `\n\n[CODE EXECUTION CAPABILITY]\nJavaScript code execution is enabled. The user can execute JavaScript code blocks directly. If they ask you to run a calculation, verify some code, or write JavaScript, write standard JavaScript code blocks and remind them they can click the "Run" button on the top-right of your code blocks to execute the code in a sandboxed environment.`
    }

    // 6.5 Handle Daemon Connection / Workspace Editing Instructions
    const hasDaemon = !!getDaemon(req.user.id)
    if (hasDaemon) {
      extraSystemContent += `\n\n[LOCAL WORKSPACE EDITING (CLI DAEMON CONNECTED)]
You are connected to the user's local workspace via a secure CLI daemon. You have the ability to read files, create/edit files, and run terminal commands to help them build, run, and debug their code.
To invoke these workspace tools, you MUST output specific XML-like tags in your response. The frontend will intercept these tags, execute them via the daemon, and display the results to the user.
Available tools:
1. Read a file:
<read_file path="path/to/file.js" />

2. Write or create a file:
<write_file path="path/to/file.js">
// File contents here
</write_file>

3. Run a terminal command (e.g. build, compile, tests, install):
<run_command cmd="npm run build" />

Rules:
- Specify paths relative to the project root.
- You can explain what you are doing before or after using these tags.
- Always use the exact tags above to perform local operations. When you output these tags, they will be executed on the user's system after their confirmation in the terminal.`
    }

    // 7. Enrich messages history
    const history = messages.map(m => ({ role: m.role, content: m.content }))
    if (extraSystemContent) {
      history.push({ role: 'system', content: extraSystemContent, _skip_inject: true })
    }

    // 8. Call LLM Gateway
    let generator
    const isKaliKal = (thread.mode === 'kalikal' || thread.mode === 'kali_kal')
    
    if (model === 'council') {
      const { runCouncilStream } = await import('../services/llm/councilEngine.js')
      generator = runCouncilStream(history)
    } else {
      generator = await llmGateway.complete({ messages: history, model: model || thread.model_id, temperature, effort, thinking, isKaliKal })
    }
    
    let assistantReply = ''
    let chosenProvider = ''
    let isExecuting = false

    for await (const chunk of generator) {
      if (chunk.type === 'token') {
        assistantReply += chunk.content
        res.write(`data: ${JSON.stringify({ type: 'token', content: chunk.content })}\n\n`)
      } else if (chunk.type === 'error') {
        res.write(`data: ${JSON.stringify({ type: 'error', content: chunk.content })}\n\n`)
        res.end()
        return
      } else if (chunk.type === 'info') {
        if (chunk.provider) chosenProvider = chunk.provider
        res.write(`data: ${JSON.stringify({ type: 'info', content: chunk.content })}\n\n`)
      } else if (chunk.type === 'done') {
        
        // Save assistant response to DB
        const assistantMsg = new Message({
          thread_id: thread._id,
          user_id: req.user.id,
          role: 'assistant',
          content: assistantReply,
          model: model || thread.model_id,
          provider: chosenProvider,
        })
        await assistantMsg.save()

        // Auto-update thread title if it was default
        if (thread.title === 'New Chat') {
          const generatedTitle = lastUserMsg.content.substring(0, 30) + (lastUserMsg.content.length > 30 ? '...' : '')
          thread.title = generatedTitle
        }

        // Update thread stats
        thread.message_count += 2
        thread.last_message_at = new Date()
        await thread.save()

        res.write('data: [DONE]\n\n')
        res.end()
        return
      }
    }
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`)
    res.end()
  }
})

export default router
