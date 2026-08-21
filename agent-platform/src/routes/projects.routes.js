import { Router } from 'express'
import { projectManager } from '../projects/ProjectManager.js'

const router = Router()

// GET /api/projects — list all projects
router.get('/', async (req, res) => {
  try {
    const projects = await projectManager.listProjects()
    const active   = await projectManager.getActive()
    res.json({ projects, activeId: active?.id || null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/projects — add a new project
router.post('/', async (req, res) => {
  try {
    const { path: projectPath, name } = req.body
    if (!projectPath) return res.status(400).json({ error: 'path is required' })
    const project = await projectManager.addProject(projectPath, { name })
    res.json(project)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// POST /api/projects/active — set active project
router.post('/active', async (req, res) => {
  try {
    const { projectId, path: projectPath } = req.body
    let project
    if (projectId) {
      project = await projectManager.setActive(projectId)
    } else if (projectPath) {
      project = await projectManager.setActiveByPath(projectPath)
    } else {
      project = await projectManager.setActive(null) // deactivate
    }
    res.json({ active: project })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// GET /api/projects/active — get active project
router.get('/active', async (req, res) => {
  try {
    const active = await projectManager.getActive()
    res.json({ active })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/projects/active/context — get full context for active project
router.get('/active/context', async (req, res) => {
  try {
    const context = await projectManager.loadActiveContext()
    res.json(context)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/projects/:id — get project details
router.get('/:id', async (req, res) => {
  try {
    const project = await projectManager.getProject(req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found' })
    res.json(project)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/projects/:id/context — get full context for a project
router.get('/:id/context', async (req, res) => {
  try {
    const context = await projectManager.loadProjectContext(req.params.id)
    res.json(context)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/projects/:id — remove project from registry
router.delete('/:id', async (req, res) => {
  try {
    const removed = await projectManager.removeProject(req.params.id)
    res.json({ removed })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PATCH /api/projects/:id/settings — update project settings
router.patch('/:id/settings', async (req, res) => {
  try {
    const project = await projectManager.updateSettings(req.params.id, req.body)
    res.json(project)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

export { router as ProjectsRouter }
