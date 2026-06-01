import Project from '../models/Project.js'
import { z } from 'zod'

export const getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ user_id: req.user.id }).sort({ updatedAt: -1 })
    res.json(projects)
  } catch (err) {
    next(err)
  }
}

export const createProject = async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      custom_instructions: z.string().max(5000).optional()
    })
    const { name, description, custom_instructions } = schema.parse(req.body)
    
    const project = new Project({
      user_id: req.user.id,
      name,
      description: description || '',
      custom_instructions: custom_instructions || ''
    })
    await project.save()
    res.status(201).json(project)
  } catch (err) {
    next(err)
  }
}

export const updateProject = async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      custom_instructions: z.string().max(5000).optional()
    })
    const updates = schema.parse(req.body)
    
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { $set: updates },
      { new: true }
    )
    if (!project) return res.status(404).json({ error: 'Project not found' })
    res.json(project)
  } catch (err) {
    next(err)
  }
}

export const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, user_id: req.user.id })
    if (!project) return res.status(404).json({ error: 'Project not found' })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
