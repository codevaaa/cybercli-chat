import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY

if (!stripeKey) {
  console.warn('STRIPE_SECRET_KEY not set. Payment features will be degraded.')
}

export const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' }) : null

export default stripe
