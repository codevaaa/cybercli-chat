import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import Workflow from '../models/Workflow.js'

const router = Router()

// Get all workflows for logged in user
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const workflows = await Workflow.find({ user_id: req.user.id }).sort({ updatedAt: -1 })
    const formatted = workflows.map(w => ({
      id: w._id,
      _id: w._id,
      name: w.name,
      description: w.description,
      prompt: w.prompt,
      model: w.model,
      updatedAt: w.updatedAt
    }))
    res.json({ success: true, workflows: formatted })
  } catch (err) {
    next(err)
  }
})

// Create new workflow
router.post('/', requireAuth, async (req, res, next) => {
  const { name, description, prompt, model } = req.body
  if (!name || !prompt) {
    return res.status(400).json({ error: 'Name and prompt template are required' })
  }

  try {
    const workflow = new Workflow({
      user_id: req.user.id,
      name,
      description: description || '',
      prompt,
      model: model || 'Madhav (Flagship)'
    })
    await workflow.save()
    
    res.status(201).json({
      success: true,
      workflow: {
        id: workflow._id,
        _id: workflow._id,
        name: workflow.name,
        description: workflow.description,
        prompt: workflow.prompt,
        model: workflow.model,
        updatedAt: workflow.updatedAt
      }
    })
  } catch (err) {
    next(err)
  }
})

// Delete a workflow
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const workflow = await Workflow.findOneAndDelete({ _id: req.params.id, user_id: req.user.id })
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' })
    }
    res.json({ success: true, message: 'Workflow deleted successfully' })
  } catch (err) {
    next(err)
  }
})

export default router
