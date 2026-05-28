import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import Project from '../models/Project.js'
import Thread from '../models/Thread.js'

const router = Router()

// Get all projects for logged in user
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const projects = await Project.find({ user_id: req.user.id }).sort({ updatedAt: -1 })
    
    const projectsWithCounts = await Promise.all(projects.map(async (p) => {
      const threadCount = await Thread.countDocuments({ user_id: req.user.id, tags: p._id.toString() })
      return {
        id: p._id,
        _id: p._id,
        name: p.name,
        description: p.description,
        model: p.model,
        updatedAt: p.updatedAt,
        threads: threadCount
      }
    }))
    
    res.json({ success: true, projects: projectsWithCounts })
  } catch (err) {
    next(err)
  }
})

// Create new project
router.post('/', requireAuth, async (req, res, next) => {
  const { name, description, model } = req.body
  if (!name) {
    return res.status(400).json({ error: 'Project name is required' })
  }

  try {
    const project = new Project({
      user_id: req.user.id,
      name,
      description: description || '',
      model: model || 'Madhav'
    })
    await project.save()
    
    res.status(201).json({
      success: true,
      project: {
        id: project._id,
        _id: project._id,
        name: project.name,
        description: project.description,
        model: project.model,
        updatedAt: project.updatedAt,
        threads: 0
      }
    })
  } catch (err) {
    next(err)
  }
})

// Delete a project
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, user_id: req.user.id })
    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }
    res.json({ success: true, message: 'Project deleted successfully' })
  } catch (err) {
    next(err)
  }
})

export default router
