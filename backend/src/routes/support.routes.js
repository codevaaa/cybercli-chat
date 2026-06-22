import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import SupportThread from '../models/SupportThread.js'
import SupportMessage from '../models/SupportMessage.js'
import llmGateway from '../services/llm/gateway.js'

const router = Router()

// GET /api/v1/support/thread
// Retrieve open support thread for authenticated user
router.get('/thread', requireAuth, async (req, res) => {
  try {
    const thread = await SupportThread.findOne({ user_id: req.user.id, status: 'open' })
    res.json(thread)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/v1/support/thread
// Initialize support thread & accept terms, seed welcome message
router.post('/thread', requireAuth, async (req, res) => {
  try {
    // Check if open thread already exists
    let thread = await SupportThread.findOne({ user_id: req.user.id, status: 'open' })
    
    if (!thread) {
      thread = new SupportThread({
        user_id: req.user.id,
        accepted_terms: true,
        status: 'open'
      })
      await thread.save()

      // Seed first automated welcoming message from agent
      const welcomeMessage = new SupportMessage({
        thread_id: thread._id,
        sender: 'agent',
        content: 'Hello! I am your Codeva Support Agent. How can I help you today? Feel free to ask me anything about the platform, models, or our tools.'
      })
      await welcomeMessage.save()
    } else if (!thread.accepted_terms) {
      thread.accepted_terms = true
      await thread.save()
    }

    res.status(201).json(thread)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/v1/support/messages/:threadId
// Fetch conversation history for a support thread
router.get('/messages/:threadId', requireAuth, async (req, res) => {
  const { threadId } = req.params
  
  try {
    // Safety check: verify thread ownership
    const thread = await SupportThread.findById(threadId)
    if (!thread) {
      return res.status(404).json({ error: 'Support thread not found' })
    }
    if (thread.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access to support thread' })
    }

    const messages = await SupportMessage.find({ thread_id: threadId }).sort({ createdAt: 1 })
    res.json(messages)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/v1/support/messages/:threadId
// Post a message and get an automated AI response
router.post('/messages/:threadId', requireAuth, async (req, res) => {
  const { threadId } = req.params
  const { content } = req.body

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required' })
  }

  try {
    const thread = await SupportThread.findById(threadId)
    if (!thread) {
      return res.status(404).json({ error: 'Support thread not found' })
    }
    if (thread.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access to support thread' })
    }

    // Save user message
    const userMsg = new SupportMessage({
      thread_id: threadId,
      sender: 'user',
      content: content.trim()
    })
    await userMsg.save()

    // Fetch conversation messages to feed into AI
    const history = await SupportMessage.find({ thread_id: threadId }).sort({ createdAt: 1 })
    
    // Format messages for gateway
    const aiMessages = [
      {
        role: 'system',
        content: `You are the official Codeva Support AI Agent.
Your mission is to help users with inquiries regarding the Codeva platform and Codeva security tool suite.

Here is the key context about our ecosystem to help you resolve user issues:
1. Tech Stack & Brand: Codeva is a premium AI multi-model chat application. Accent color is peach/clay (#D97757) and theme is dark-first (#0A0A0F). It was created by Chandan Pandey (Founder & CEO, ethical hacker and security researcher) and Rishab Thakur (Co-Founder & CTO, systems architect).
2. Features:
   - 8+ API providers, 50+ free models (e.g. Codeva, Madhav, Chanakya, Bheem, Arjun, Panchayat council mode, Sahadeva, Vyas, etc.).
   - Panchayat (Council Mode): streams queries to multiple models concurrently and returns side-by-side comparative views.
   - Conversation Branching: click on a message to branch/fork a conversation from that specific point.
   - Premium Voice Chat: Fast multimodal voice synthesis powered by Gemini Flash and ElevenLabs (Voices: Aoede female, Charon male 1, Puck male 2).
   - Artifacts panel: Displays code and images generated in chat in a side-by-side split screen view with live preview.
3. Pricing Plans:
   - Free Plan: Access to 50+ free models (rate limits apply).
   - Pro Plan: Unlimited fast messages, priority model gateway access, developer APIs, custom instructions, and custom agents. Starting at $0/month currently for early adopters.
4. Support Channels: For security alerts, enterprise partnerships, or payment issues, reach out to cybermindcli@cybermindcli.com.

Be professional, direct, extremely polite, and concise. Help the user step-by-step.`,
        _skip_inject: true
      },
      ...history.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.content
      }))
    ]

    // Complete response using deepseek-v4-pro or fast model
    const aiResponse = await llmGateway.completeNonStream({
      messages: aiMessages,
      model: 'opencode/deepseek-v4-flash',
      temperature: 0.5
    })

    const agentReply = aiResponse.content || 'I am having trouble connecting to my central systems. Please contact cybermindcli@cybermindcli.com for direct support.'

    // Save agent message
    const agentMsg = new SupportMessage({
      thread_id: threadId,
      sender: 'agent',
      content: agentReply
    })
    await agentMsg.save()

    res.status(201).json(agentMsg)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
