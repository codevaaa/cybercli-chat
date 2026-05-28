import mongoose from 'mongoose'

const inviteSchema = new mongoose.Schema({
  inviter_id: { type: String, required: true, index: true },
  invitee_email: { type: String, required: true, index: true },
  invite_code: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
  accepted_at: { type: Date, default: null }
}, { timestamps: true })

inviteSchema.index({ inviter_id: 1, status: 1 })

export default mongoose.model('Invite', inviteSchema)
