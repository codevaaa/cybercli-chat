import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

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
    const { executeInSandbox } = await import('../services/sandbox/agenticSandbox.js')
    const langKey = (language.toLowerCase() === 'python' || language.toLowerCase() === 'py') ? 'python' : 'javascript'
    const result = await executeInSandbox(code, req.user.id, langKey)
    return res.json({
      success: !result.error,
      output: result.error || ((result.stdout || '') + '\n' + (result.stderr || '')).trim() || 'Process exited with no output.'
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
