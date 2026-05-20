import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const SAMPLE_PERSONAS = [
  { id: '1', name: 'Code Reviewer', system_prompt: 'You are a senior software engineer...', temperature: 0.3, icon: 'code' },
  { id: '2', name: 'Creative Writer', system_prompt: 'You are a creative writing assistant...', temperature: 0.9, icon: 'pen' },
  { id: '3', name: 'Research Assistant', system_prompt: 'You are a research analyst...', temperature: 0.5, icon: 'search' },
]

router.get('/', requireAuth, (req, res) => {
  res.json({ personas: SAMPLE_PERSONAS })
})

router.post('/', requireAuth, (req, res) => {
  res.json({ id: 'new_' + Date.now(), ...req.body })
})

router.patch('/:id', requireAuth, (req, res) => {
  res.json({ id: req.params.id, ...req.body })
})

router.delete('/:id', requireAuth, (req, res) => {
  res.json({ deleted: req.params.id })
})

export default router
