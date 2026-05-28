import { Router } from 'express'
import crypto from 'crypto'
import Invite from '../models/Invite.js'
import { requireAuth } from '../middleware/auth.js'
import { sendInviteEmail } from '../services/email/invite-email.js'

const router = Router()

// Generate a random, readable invite code
const generateInviteCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase() // e.g. "E7A9B2F1"
}

// 1. POST /api/v1/invite/send - Send invite email (requires auth)
router.post('/send', requireAuth, async (req, res) => {
  try {
    const { email, inviter_name } = req.body
    const inviter_id = req.user.id

    if (!email) {
      return res.status(400).json({ error: 'Invitee email is required.' })
    }
    if (!inviter_name) {
      return res.status(400).json({ error: 'Inviter name is required.' })
    }

    // Check if an invite is already pending or accepted for this email by this inviter
    const existingInvite = await Invite.findOne({ inviter_id, invitee_email: email.toLowerCase() })
    if (existingInvite) {
      if (existingInvite.status === 'accepted') {
        return res.status(400).json({ error: 'This user has already accepted an invitation from you.' })
      }
      // Resend the existing invite code
      await sendInviteEmail(inviter_name, email, existingInvite.invite_code)
      return res.status(200).json({ success: true, message: 'Invitation email resent.', invite: existingInvite })
    }

    const invite_code = generateInviteCode()
    const invite = new Invite({
      inviter_id,
      invitee_email: email.toLowerCase(),
      invite_code,
      status: 'pending'
    })

    await invite.save()

    // Send the email asynchronously
    sendInviteEmail(inviter_name, email, invite_code).catch(err => {
      console.error('Failed to send invite email:', err)
    })

    res.status(201).json({ success: true, invite })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 2. GET /api/v1/invite/list - List user's sent invites (requires auth)
router.get('/list', requireAuth, async (req, res) => {
  try {
    const inviter_id = req.user.id
    const invites = await Invite.find({ inviter_id }).sort({ createdAt: -1 })
    res.json(invites)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 3. POST /api/v1/invite/accept - Accept invite (called on signup with invite code, public)
router.post('/accept', async (req, res) => {
  try {
    const { invite_code, email } = req.body

    if (!invite_code) {
      return res.status(400).json({ error: 'Invite code is required.' })
    }
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' })
    }

    const invite = await Invite.findOne({ 
      invite_code: invite_code.toUpperCase(), 
      invitee_email: email.toLowerCase(),
      status: 'pending'
    })

    if (!invite) {
      return res.status(404).json({ error: 'No pending invitation found for this email and invite code.' })
    }

    invite.status = 'accepted'
    invite.accepted_at = new Date()
    await invite.save()

    res.json({ success: true, message: 'Invitation accepted successfully.', invite })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 4. GET /api/v1/invite/stats - Get invite stats (requires auth)
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const inviter_id = req.user.id
    const totalSent = await Invite.countDocuments({ inviter_id })
    const totalAccepted = await Invite.countDocuments({ inviter_id, status: 'accepted' })
    res.json({ totalSent, totalAccepted })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
