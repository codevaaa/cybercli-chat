import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import Snippet from '../models/Snippet.js'

const router = Router()

// Default fallback snippets if DB is empty
const DEFAULT_SNIPPETS = [
  { title: 'Debug my code', content: 'Find and fix bugs in the following code. Highlight optimizations and write clean corrections.', shortcut: '/debug' },
  { title: 'Explain like I am 5', content: 'Explain the following complex concept in very simple, easy-to-understand terms suitable for a 5-year old.', shortcut: '/eli5' },
  { title: 'Write a tweet thread', content: 'Draft an engaging, educational Twitter thread based on the following content.', shortcut: '/tweet' }
]

// Get all snippets for user
router.get('/', requireAuth, async (req, res) => {
  try {
    let snippets = await Snippet.find({ user_id: req.user.id })
    
    // Seed default public/system ones if the user has no snippets
    if (snippets.length === 0) {
      snippets = await Snippet.insertMany(DEFAULT_SNIPPETS.map(s => ({ ...s, user_id: req.user.id })))
    }
    
    res.json({ snippets })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create new custom snippet
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, content, shortcut } = req.body
    const snippet = new Snippet({
      user_id: req.user.id,
      title,
      content,
      shortcut: shortcut || null,
    })
    await snippet.save()
    res.json(snippet)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update custom snippet
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const snippet = await Snippet.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { $set: req.body },
      { new: true }
    )
    if (!snippet) {
      return res.status(404).json({ error: 'Snippet not found' })
    }
    res.json(snippet)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete custom snippet
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await Snippet.findOneAndDelete({ _id: req.params.id, user_id: req.user.id })
    if (!result) {
      return res.status(404).json({ error: 'Snippet not found or unauthorized' })
    }
    res.json({ deleted: req.params.id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
