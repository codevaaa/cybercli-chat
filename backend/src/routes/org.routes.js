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

export default router
