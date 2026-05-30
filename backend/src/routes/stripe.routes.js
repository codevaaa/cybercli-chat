import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { stripe } from '../config/stripe.js'
import supabase from '../config/supabase.js'

const router = Router()

/**
 * Map a plan id to its Stripe Price id (from env). Add MAX/ENTERPRISE prices as
 * you create them in the Stripe dashboard.
 */
const PRICE_IDS = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  max: process.env.STRIPE_MAX_PRICE_ID,
}

/** Look up (or lazily create) the Stripe customer id for a user. */
async function getOrCreateCustomer(userId, email) {
  // Try to read a stored customer id from Supabase.
  try {
    const { data } = await supabase.from('users').select('stripe_customer_id, email').eq('id', userId).single()
    if (data?.stripe_customer_id) return data.stripe_customer_id
    const customer = await stripe.customers.create({
      email: email || data?.email || undefined,
      metadata: { user_id: userId },
    })
    await supabase.from('users').update({ stripe_customer_id: customer.id }).eq('id', userId)
    return customer.id
  } catch {
    // If the users table lacks the column or Supabase is down, create a
    // throwaway customer keyed by metadata so checkout still works.
    const customer = await stripe.customers.create({ email, metadata: { user_id: userId } })
    return customer.id
  }
}

// POST /api/v1/stripe/checkout  { plan: 'pro' | 'max' }
router.post('/checkout', requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' })

  const plan = String(req.body?.plan || 'pro').toLowerCase()
  const priceId = PRICE_IDS[plan]
  if (!priceId) return res.status(400).json({ error: `No Stripe price configured for plan '${plan}'` })

  try {
    const customerId = await getOrCreateCustomer(req.user.id, req.user.email)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL?.split(',')[0]}/settings/billing?success=true`,
      cancel_url: `${process.env.FRONTEND_URL?.split(',')[0]}/settings/billing?canceled=true`,
      client_reference_id: req.user.id,
      metadata: { user_id: req.user.id, plan },
      subscription_data: { metadata: { user_id: req.user.id, plan } },
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

/** Persist a user's plan to Supabase (the source of truth the gateway reads). */
async function setUserPlan(userId, plan) {
  if (!userId) return
  try {
    await supabase.from('users').update({ plan }).eq('id', userId)
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
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const userId = sub.metadata?.user_id
        const active = sub.status === 'active' || sub.status === 'trialing'
        await setUserPlan(userId, active ? sub.metadata?.plan || 'pro' : 'free')
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await setUserPlan(sub.metadata?.user_id, 'free')
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
