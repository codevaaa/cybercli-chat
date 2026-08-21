import { Router } from 'express'
import { SkillsLoader } from '../skills/SkillsLoader.js'

const router  = Router()
const loader  = new SkillsLoader(process.cwd())

// GET /api/skills
router.get('/', async (req, res) => {
  try {
    const skills = await loader.listSkills()
    res.json({ skills })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/skills — install a new skill
router.post('/', async (req, res) => {
  try {
    const { name, content, scope } = req.body
    if (!name || !content) return res.status(400).json({ error: 'name and content required' })
    await loader.installSkill(name, content, scope || 'project')
    res.json({ success: true, name })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export { router as SkillsRouter }
