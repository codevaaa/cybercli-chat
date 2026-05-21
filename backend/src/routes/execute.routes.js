import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { executeCodeSandbox } from '../utils/sandbox.js'

const router = Router()

// Route: POST /api/v1/execute
router.post('/', requireAuth, async (req, res) => {
  const { code, language = 'javascript' } = req.body

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'code must be a string' })
  }

  if (language.toLowerCase() !== 'javascript' && language.toLowerCase() !== 'js') {
    return res.status(400).json({ error: 'Only JavaScript is supported in sandboxed code execution currently.' })
  }

  try {
    const result = executeCodeSandbox(code)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
