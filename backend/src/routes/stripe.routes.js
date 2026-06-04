import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { stripe } from '../config/stripe.js'
import supabase from '../config/supabase.js'

const router = Router()

/**
 * Map a plan id to its Stripe Price id (from env). Add MAX/ENTERPRISE prices as
 * you create them in the Stripe dashboard. Each plan can have a monthly and an
 * (optional) yearly price; we fall back to the base/monthly price if no yearly
 * price is configured.
 */
const PRICE_IDS = {
  pro: {
    monthly: process.env.STRIPE_PRO_PRICE_ID,
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID,
  },
  max: {
    monthly: process.env.STRIPE_MAX_PRICE_ID,
    yearly: process.env.STRIPE_MAX_YEARLY_PRICE_ID || process.env.STRIPE_MAX_PRICE_ID,
  },
  team_standard: {
    monthly: process.env.STRIPE_TEAM_STANDARD_PRICE_ID,
    yearly: process.env.STRIPE_TEAM_STANDARD_YEARLY_PRICE_ID || process.env.STRIPE_TEAM_STANDARD_PRICE_ID,
  },
  team_premium: {
    monthly: process.env.STRIPE_TEAM_PREMIUM_PRICE_ID,
    yearly: process.env.STRIPE_TEAM_PREMIUM_YEARLY_PRICE_ID || process.env.STRIPE_TEAM_PREMIUM_PRICE_ID,
  },
}

function resolvePriceId(plan, billing) {
  const entry = PRICE_IDS[plan]
  if (!entry) return null
  const period = billing === 'yearly' ? 'yearly' : 'monthly'
  return entry[period] || entry.monthly
}

/** Look up (or lazily create) the Stripe customer id for a user. */
async function getOrCreateCustomer(userId, email) {
  try {
    const user = await User.findOne({ supabase_id: userId })
    if (user?.stripe_customer_id) return user.stripe_customer_id
    
    const customer = await stripe.customers.create({
      email: email || user?.email || undefined,
      metadata: { user_id: userId },
    })
    
    if (user) {
      user.stripe_customer_id = customer.id
      await user.save()
    }
    return customer.id
  } catch (e) {
    console.error('[stripe] getOrCreateCustomer error:', e.message)
    const customer = await stripe.customers.create({ email, metadata: { user_id: userId } })
    return customer.id
  }
}

// POST /api/v1/stripe/checkout  { plan: 'pro' | 'max' | 'team', billing?: 'monthly' | 'yearly', seats?: { standard: number, premium: number } }
router.post('/checkout', requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' })

  const plan = String(req.body?.plan || 'pro').toLowerCase()
  const billing = String(req.body?.billing || 'monthly').toLowerCase()
  
  let line_items = []

  if (plan === 'team') {
    const seats = req.body.seats || { standard: 1, premium: 0 }
    const stdPrice = resolvePriceId('team_standard', billing)
    const premPrice = resolvePriceId('team_premium', billing)

    if (seats.standard > 0 && stdPrice) {
      line_items.push({ price: stdPrice, quantity: seats.standard })
    }
    if (seats.premium > 0 && premPrice) {
      line_items.push({ price: premPrice, quantity: seats.premium })
    }
    if (line_items.length === 0) {
      return res.status(400).json({ error: 'Invalid seat quantities or missing price IDs for Team plan' })
    }
  } else {
    const priceId = resolvePriceId(plan, billing)
    if (!priceId) return res.status(400).json({ error: `No Stripe price configured for plan '${plan}'` })
    line_items.push({ price: priceId, quantity: 1 })
  }

  try {
    const customerId = await getOrCreateCustomer(req.user.id, req.user.email)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items,
      success_url: `${process.env.FRONTEND_URL?.split(',')[0]}/settings/billing?success=true`,
      cancel_url: `${process.env.FRONTEND_URL?.split(',')[0]}/settings/billing?canceled=true`,
      client_reference_id: req.user.id,
      metadata: { user_id: req.user.id, plan, billing, ...req.body.seats },
      subscription_data: { metadata: { user_id: req.user.id, plan, billing } },
      allow_promotion_codes: true,
    })
    res.json({ url: session.url })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/v1/stripe/portal — manage/cancel an existing subscription
router.post('/portal', requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' })
  try {
    const customerId = await getOrCreateCustomer(req.user.id, req.user.email)
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL?.split(',')[0]}/settings/billing`,
    })
    res.json({ url: session.url })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/** Persist a user's plan to MongoDB and Supabase Auth metadata. */
async function setUserPlan(userId, plan) {
  if (!userId) return
  try {
    await User.findOneAndUpdate({ supabase_id: userId }, { plan })
    // Also reflect in auth metadata so JWT-based reads stay consistent.
    await supabase.auth.admin.updateUserById(userId, { user_metadata: { plan_tier: plan } })
  } catch (err) {
    console.error('[stripe] failed to set user plan:', err.message)
  }
}

/**
 * Stripe webhook handler — exported and mounted with a RAW body parser in
 * server.js (signature verification needs the raw bytes). This is what actually
 * upgrades/downgrades the user's plan after payment events.
 */
import Organization from '../models/Organization.js'
import OrganizationMember from '../models/OrganizationMember.js'
import User from '../models/User.js'

export async function handleWebhook(req, res) {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' })

  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (error) {
    return res.status(400).json({ error: `Webhook Error: ${error.message}` })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object
        const userId = s.client_reference_id || s.metadata?.user_id
        const plan = s.metadata?.plan || 'pro'
        
        await setUserPlan(userId, plan)

        // If it's a team plan, auto-create the organization!
        if (plan === 'team') {
          const seatsStd = parseInt(s.metadata?.standard || '1', 10)
          const seatsPrem = parseInt(s.metadata?.premium || '0', 10)
          
          const userDoc = await User.findById(userId)
          if (userDoc) {
            const orgName = `${userDoc.full_name || 'My'} Team`
            
            const newOrg = await Organization.create({
              name: orgName,
              owner_id: userId,
              plan: 'team',
              stripe_customer_id: s.customer,
              stripe_subscription_id: s.subscription,
              seats_standard: seatsStd,
              seats_premium: seatsPrem,
              billing_email: userDoc.email
            })

            await OrganizationMember.create({
              org_id: newOrg._id,
              user_id: userId,
              role: 'owner',
              seat_type: seatsPrem > 0 ? 'premium' : 'standard'
            })
          }
        }
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const userId = sub.metadata?.user_id
        const active = sub.status === 'active' || sub.status === 'trialing'
        const plan = active ? sub.metadata?.plan || 'pro' : 'free'
        await setUserPlan(userId, plan)
        
        // Update org subscription if it's a team plan
        if (plan === 'team') {
           await Organization.findOneAndUpdate(
             { stripe_subscription_id: sub.id },
             { status: sub.status }
           )
        }
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await setUserPlan(sub.metadata?.user_id, 'free')
        // Cancel org if it exists
        await Organization.findOneAndUpdate(
           { stripe_subscription_id: sub.id },
           { status: 'canceled' }
        )
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error('[stripe] webhook handler error:', err.message)
  }

  res.json({ received: true })
}

export default router
