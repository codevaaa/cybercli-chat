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

  if (language.toLowerCase() !== 'javascript' && language.toLowerCase() !== 'js' && language.toLowerCase() !== 'python' && language.toLowerCase() !== 'py') {
    return res.status(400).json({ error: 'Only JavaScript and Python are supported.' })
  }

  try {
    if (language.toLowerCase() === 'python' || language.toLowerCase() === 'py') {
      const { executeInSandbox } = await import('../services/sandbox/agenticSandbox.js')
      const result = await executeInSandbox(code, req.user.id)
      return res.json({
        success: !result.error,
        output: result.error || ((result.stdout || '') + '\n' + (result.stderr || '')).trim() || 'Process exited with no output.'
      })
    } else {
      const result = executeCodeSandbox(code)
      res.json(result)
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
