import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import Folder from '../models/Folder.js'

const router = Router()

// Get all folders for user
router.get('/', requireAuth, async (req, res) => {
  try {
    const folders = await Folder.find({ user_id: req.user.id })
    res.json({ folders })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create new folder
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, color, parent_id } = req.body
    const folder = new Folder({
      user_id: req.user.id,
      name,
      color: color || '#7C3AED',
      parent_id: parent_id || null,
    })
    await folder.save()
    res.json(folder)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update folder
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const folder = await Folder.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { $set: req.body },
      { new: true }
    )
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' })
    }
    res.json(folder)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete folder
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await Folder.findOneAndDelete({ _id: req.params.id, user_id: req.user.id })
    if (!result) {
      return res.status(404).json({ error: 'Folder not found' })
    }
    // Clean up parent_ids referencing this folder
    await Folder.updateMany({ parent_id: req.params.id }, { $set: { parent_id: null } })
    res.json({ deleted: req.params.id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
