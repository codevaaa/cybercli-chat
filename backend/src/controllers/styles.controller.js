import Style from '../models/Style.js'
import { z } from 'zod'

const DEFAULT_STYLES = [
  { name: 'Normal', instructions: 'You are a helpful, respectful, and honest assistant. Always answer as helpfully as possible, while being safe.', is_default: true },
  { name: 'Concise', instructions: 'Provide extremely brief, direct answers without pleasantries or fluff. Use bullet points when possible.', is_default: true },
  { name: 'Explanatory', instructions: 'Explain concepts thoroughly, using analogies and step-by-step breakdowns. Assume the user is a beginner.', is_default: true },
  { name: 'Pirate', instructions: 'Answer entirely in the persona of a swashbuckling pirate. Use pirate slang and nautical terms.', is_default: true }
]

export const getStyles = async (req, res, next) => {
  try {
    const userId = req.user.id
    
    // Ensure default styles exist for this user
    let styles = await Style.find({ user_id: userId }).sort({ createdAt: -1 })
    
    if (styles.length === 0) {
      const defaultDocs = DEFAULT_STYLES.map(s => ({ ...s, user_id: userId }))
      await Style.insertMany(defaultDocs)
      styles = await Style.find({ user_id: userId }).sort({ createdAt: -1 })
    }

    res.json(styles)
  } catch (err) {
    next(err)
  }
}

export const createStyle = async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(50),
      description: z.string().optional(),
      instructions: z.string().min(1).max(2000)
    })
    const { name, description, instructions } = schema.parse(req.body)
    
    const style = new Style({
      user_id: req.user.id,
      name,
      description: description || '',
      instructions,
      is_default: false
    })
    await style.save()
    res.status(201).json(style)
  } catch (err) {
    next(err)
  }
}

export const updateStyle = async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(50).optional(),
      description: z.string().optional(),
      instructions: z.string().min(1).max(2000).optional()
    })
    const updates = schema.parse(req.body)
    
    const style = await Style.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { $set: updates },
      { new: true }
    )
    if (!style) return res.status(404).json({ error: 'Style not found' })
    res.json(style)
  } catch (err) {
    next(err)
  }
}

export const deleteStyle = async (req, res, next) => {
  try {
    const style = await Style.findOneAndDelete({ _id: req.params.id, user_id: req.user.id })
    if (!style) return res.status(404).json({ error: 'Style not found' })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
