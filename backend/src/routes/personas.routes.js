import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import Persona from '../models/Persona.js'

const router = Router()

// Default fallback system personas if DB is empty
const DEFAULT_PERSONAS = [
  { name: 'General AI', system_prompt: 'You are CyberCli, a helpful AI assistant.', temperature: 0.7, icon: 'sparkles', is_public: true },
  { name: 'Code Expert', system_prompt: 'You are an expert software developer. Write clean, comments-assisted, optimized code.', temperature: 0.3, icon: 'code', is_public: true },
  { name: 'Creative Writer', system_prompt: 'You are a creative writer. Help draft stories, blogs, and essays.', temperature: 0.9, icon: 'pen', is_public: true },
  { name: 'Research Scholar', system_prompt: 'You are a rigorous scientific and academic research assistant.', temperature: 0.5, icon: 'search', is_public: true }
]

// Get all personas (User custom + Public default ones)
router.get('/', requireAuth, async (req, res) => {
  try {
    const userPersonas = await Persona.find({ user_id: req.user.id })
    const publicPersonas = await Persona.find({ is_public: true })
    
    // Seed default public personas if no public ones exist yet
    if (publicPersonas.length === 0) {
      const seeded = await Persona.insertMany(DEFAULT_PERSONAS.map(p => ({ ...p, user_id: 'system' })))
      return res.json({ personas: [...userPersonas, ...seeded] })
    }

    res.json({ personas: [...userPersonas, ...publicPersonas] })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create new custom persona
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, system_prompt, temperature, max_tokens, icon } = req.body
    const persona = new Persona({
      user_id: req.user.id,
      name,
      description: description || '',
      system_prompt,
      temperature: temperature !== undefined ? temperature : 0.7,
      max_tokens: max_tokens || 4096,
      icon: icon || 'brain',
      is_public: false,
    })
    await persona.save()
    res.json(persona)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update custom persona
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const persona = await Persona.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { $set: req.body },
      { new: true }
    )
    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' })
    }
    res.json(persona)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete custom persona
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await Persona.findOneAndDelete({ _id: req.params.id, user_id: req.user.id })
    if (!result) {
      return res.status(404).json({ error: 'Persona not found or unauthorized' })
    }
    res.json({ deleted: req.params.id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
