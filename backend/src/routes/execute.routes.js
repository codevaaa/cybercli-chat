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
    // Enforce sandbox usage limits (daily reset, plan-based)
    const { checkAndIncrementSandbox } = await import('../utils/usageHelper.js')
    const usage = await checkAndIncrementSandbox(req.user.id, req.user.plan)
    if (!usage.allowed) {
      return res.status(403).json({
        error: `Sandbox daily limit reached (${usage.limit} executions). Upgrade your plan for more.`,
        usage: { used: usage.used, limit: usage.limit, remaining: 0 },
      })
    }

    const { executeInSandbox } = await import('../services/sandbox/agenticSandbox.js')
    const langKey = (language.toLowerCase() === 'python' || language.toLowerCase() === 'py') ? 'python' : 'javascript'
    const result = await executeInSandbox(code, req.user.id, langKey)
    return res.json({
      success: !result.error,
      output: result.error || ((result.stdout || '') + '\n' + (result.stderr || '')).trim() || 'Process exited with no output.',
      usage: { used: usage.used, limit: usage.limit, remaining: usage.remaining },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
