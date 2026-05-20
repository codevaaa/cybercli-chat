import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, (req, res) => {
  res.json({ folders: [
    { id: '1', name: 'Coding', color: '#7C3AED', parent_id: null },
    { id: '2', name: 'Business', color: '#F59E0B', parent_id: null },
    { id: '3', name: 'Personal', color: '#10B981', parent_id: null },
  ]})
})

router.post('/', requireAuth, (req, res) => {
  res.json({ id: 'folder_' + Date.now(), ...req.body })
})

router.patch('/:id', requireAuth, (req, res) => {
  res.json({ id: req.params.id, ...req.body })
})

router.delete('/:id', requireAuth, (req, res) => {
  res.json({ deleted: req.params.id })
})

export default router
