import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import * as orgController from '../controllers/org.js'

const router = Router()

// All org routes require authentication
router.use(requireAuth)

// Get all orgs the user is a member of
router.get('/', orgController.getMyOrgs)

// Get specific org details (including members)
router.get('/:orgId', orgController.getOrgDetails)

// Update org settings (admin only)
router.put('/:orgId', orgController.updateOrgSettings)

// Member management (admin only)
router.post('/:orgId/members/invite', orgController.inviteMember)
router.delete('/:orgId/members/:memberId', orgController.removeMember)

// DEV BYPASS: Allow users to instantly upgrade to team for testing when Stripe is not configured
router.post('/dev-bypass', async (req, res) => {
  try {
    const { User, Organization, OrganizationMember } = await import('../models/index.js').catch(async () => {
       const u = (await import('../models/User.js')).default;
       const o = (await import('../models/Organization.js')).default;
       const om = (await import('../models/OrganizationMember.js')).default;
       return { User: u, Organization: o, OrganizationMember: om };
    });

    const userId = req.user.id;
    let userDoc = await User.findOne({ supabase_id: userId });
    
    if (!userDoc) {
       // Auto-create user if they somehow bypassed auth/sync
       userDoc = await User.create({
         supabase_id: userId,
         email: req.user.email || `test-${userId}@example.com`,
         plan: 'team'
       });
    }

    userDoc.plan = 'team';
    await userDoc.save();

    const orgName = `${userDoc.full_name || 'Test'} Team`;
    
    let org = await Organization.findOne({ owner_id: userDoc._id, plan: 'team' });
    if (!org) {
      org = await Organization.create({
        name: orgName,
        owner_id: userDoc._id,
        plan: 'team',
        seats_standard: 5,
        seats_premium: 2,
        billing_email: userDoc.email
      });
    }

    const member = await OrganizationMember.findOne({ org_id: org._id, user_id: userDoc._id });
    if (!member) {
      await OrganizationMember.create({
        org_id: org._id,
        user_id: userDoc._id,
        role: 'owner',
        seat_type: 'premium'
      });
    }

    // Attempt to update Supabase Auth if available
    try {
      const supabase = (await import('../config/supabase.js')).default;
      if (supabase) {
         await supabase.auth.admin.updateUserById(userId, { user_metadata: { plan_tier: 'team' } });
      }
    } catch (e) {}

    res.json({ success: true, message: 'Upgraded to Team successfully via bypass!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
})

export default router
