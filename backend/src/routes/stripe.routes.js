import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { stripe } from '../config/stripe.js'

const router = Router()

router.post('/checkout', requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' })

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/settings/billing?canceled=true`,
      client_reference_id: req.user.id,
    })

    res.json({ url: session.url })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/portal', requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' })

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: req.user.id,
      return_url: `${process.env.FRONTEND_URL}/settings/billing`,
    })

    res.json({ url: session.url })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/webhook', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' })

  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (error) {
    return res.status(400).json({ error: `Webhook Error: ${error.message}` })
  }

  if (event.type === 'checkout.session.completed') {
    console.log('Subscription created:', event.data.object)
  }

  res.json({ received: true })
})

export default router
