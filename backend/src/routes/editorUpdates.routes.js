import { Router } from 'express'
import { editorUpdate } from '../services/downloads/editorRelease.js'
const router = Router()
// Matches the pinned upstream createUpdateURL protocol. No account is required.
router.get('/api/update/:platform/:quality/:current', async (req, res, next) => {
  try {
    const update = await editorUpdate(req.params.platform, req.params.quality, req.params.current)
    res.setHeader('Cache-Control', 'no-store')
    if (!update) return res.status(204).end()
    res.json(update)
  } catch (error) { next(error) }
})
export default router
