import mongoose from 'mongoose'

const organizationMemberSchema = new mongoose.Schema({
  org_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member'],
    default: 'member'
  },
  seat_type: {
    type: String,
    enum: ['standard', 'premium'],
    default: 'standard'
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended'],
    default: 'active' // Can be pending if invited via email and haven't joined yet
  }
}, { timestamps: true })

// Ensure a user can only be in a specific org once
organizationMemberSchema.index({ org_id: 1, user_id: 1 }, { unique: true })

const OrganizationMember = mongoose.model('OrganizationMember', organizationMemberSchema)
export default OrganizationMember
