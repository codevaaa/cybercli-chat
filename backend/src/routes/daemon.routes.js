import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { sendActionToDaemon, getDaemon } from '../utils/daemonBridge.js'

const router = Router()

// GET /api/v1/daemon/status
router.get('/status', requireAuth, (req, res) => {
  const ws = getDaemon(req.user.id)
  res.json({ connected: !!ws })
})

router.post('/action', requireAuth, async (req, res, next) => {
  try {
    const { action, payload } = req.body
    if (!action || !['read_file', 'write_file', 'run_command'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Supported actions: read_file, write_file, run_command' })
    }

    const result = await sendActionToDaemon(req.user.id, action, payload)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
