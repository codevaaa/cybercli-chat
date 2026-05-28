import { Router } from 'express'
import mongoose from 'mongoose'
import { sendContactNotification } from '../services/email/mailer.js'

const router = Router()

// Simple Contact Schema
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
})

// Check if model already compiled to avoid Hot Reload Errors
const Contact = mongoose.models.Contact || mongoose.model('Contact', contactSchema)

router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required.' })
    }

    const contact = new Contact({ name, email, subject, message })
    await contact.save()

    // Dispatch email notifications asynchronously (non-blocking)
    sendContactNotification(name, email, subject, message).catch(err => {
      console.error('Failed to send contact notification email:', err)
    })

    res.status(201).json({ success: true, message: 'Your message has been stored successfully. Our support team will get in touch shortly.' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
