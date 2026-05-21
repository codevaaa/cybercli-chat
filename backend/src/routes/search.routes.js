import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import Thread from '../models/Thread.js'
import Message from '../models/Message.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  try {
    const { q } = req.query
    if (!q || typeof q !== 'string') {
      return res.json({ query: q || '', results: [], total: 0 })
    }

    // Search threads by title
    const threads = await Thread.find({
      user_id: req.user.id,
      title: { $regex: q, $options: 'i' }
    }).sort({ updatedAt: -1 }).limit(15)

    // Search messages by content
    const messages = await Message.find({
      user_id: req.user.id,
      content: { $regex: q, $options: 'i' }
    }).populate('thread_id', 'title').sort({ updatedAt: -1 }).limit(15)

    const results = []

    // Format threads
    threads.forEach(t => {
      results.push({
        type: 'chat',
        id: t._id,
        title: t.title,
        snippet: `Model: ${t.model_id}`,
        updated: t.updatedAt
      })
    })

    // Format messages
    messages.forEach(m => {
      results.push({
        type: 'message',
        id: m._id,
        chat_id: m.thread_id?._id || m.thread_id,
        chat_title: m.thread_id?.title || 'Untitled Chat',
        content: m.content,
        updated: m.updatedAt
      })
    })

    res.json({
      query: q,
      results,
      total: results.length,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
