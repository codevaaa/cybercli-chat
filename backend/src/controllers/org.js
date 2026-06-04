import Organization from '../models/Organization.js'
import OrganizationMember from '../models/OrganizationMember.js'
import User from '../models/User.js'

export const getMyOrgs = async (req, res) => {
  try {
    const userId = req.user.id
    const memberships = await OrganizationMember.find({ user_id: userId }).populate('org_id')
    const orgs = memberships.map(m => ({
      ...m.org_id.toObject(),
      my_role: m.role,
      my_seat_type: m.seat_type
    }))
    res.json({ organizations: orgs })
  } catch (error) {
    console.error('Error fetching orgs:', error)
    res.status(500).json({ error: 'Failed to fetch organizations' })
  }
}

export const getOrgDetails = async (req, res) => {
  try {
    const { orgId } = req.params
    const userId = req.user.id

    const membership = await OrganizationMember.findOne({ org_id: orgId, user_id: userId })
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this organization' })
    }

    const org = await Organization.findById(orgId)
    const members = await OrganizationMember.find({ org_id: orgId }).populate('user_id', 'full_name email avatar_url')

    res.json({
      organization: org,
      members: members.map(m => ({
        id: m._id,
        user_id: m.user_id._id,
        full_name: m.user_id.full_name,
        email: m.user_id.email,
        avatar_url: m.user_id.avatar_url,
        role: m.role,
        seat_type: m.seat_type,
        status: m.status,
        joined_at: m.createdAt
      })),
      my_role: membership.role
    })
  } catch (error) {
    console.error('Error fetching org details:', error)
    res.status(500).json({ error: 'Failed to fetch organization details' })
  }
}

export const updateOrgSettings = async (req, res) => {
  try {
    const { orgId } = req.params
    const { name, settings } = req.body
    const userId = req.user.id

    const membership = await OrganizationMember.findOne({ org_id: orgId, user_id: userId })
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ error: 'Requires admin privileges' })
    }

    const updates = {}
    if (name) updates.name = name
    if (settings) updates.settings = settings

    const org = await Organization.findByIdAndUpdate(orgId, { $set: updates }, { new: true })
    res.json({ organization: org })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update organization' })
  }
}

export const inviteMember = async (req, res) => {
  try {
    const { orgId } = req.params
    const { email, role = 'member', seat_type = 'standard' } = req.body
    const userId = req.user.id

    const membership = await OrganizationMember.findOne({ org_id: orgId, user_id: userId })
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ error: 'Requires admin privileges to invite' })
    }

    const targetUser = await User.findOne({ email })
    if (!targetUser) {
      // In a real system, you'd send an email to sign up, but for now we require them to exist
      return res.status(404).json({ error: 'User with this email not found. They must sign up first.' })
    }

    const existingMember = await OrganizationMember.findOne({ org_id: orgId, user_id: targetUser._id })
    if (existingMember) {
      return res.status(400).json({ error: 'User is already in this organization' })
    }

    const newMember = await OrganizationMember.create({
      org_id: orgId,
      user_id: targetUser._id,
      role,
      seat_type,
      status: 'active' // Auto active for simplicity in this MVP
    })

    res.json({ message: 'Member invited successfully', member: newMember })
  } catch (error) {
    res.status(500).json({ error: 'Failed to invite member' })
  }
}

export const removeMember = async (req, res) => {
  try {
    const { orgId, memberId } = req.params
    const userId = req.user.id

    const membership = await OrganizationMember.findOne({ org_id: orgId, user_id: userId })
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ error: 'Requires admin privileges' })
    }

    const targetMembership = await OrganizationMember.findById(memberId)
    if (!targetMembership) {
      return res.status(404).json({ error: 'Member not found' })
    }
    
    if (targetMembership.role === 'owner' && membership.role !== 'owner') {
      return res.status(403).json({ error: 'Cannot remove the owner' })
    }

    await OrganizationMember.findByIdAndDelete(memberId)
    res.json({ message: 'Member removed successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' })
  }
}
