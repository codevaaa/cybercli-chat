import mongoose from 'mongoose'

const transactionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['purchase', 'usage', 'refund', 'bonus'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    description: 'Amount in credits/tokens'
  },
  description: {
    type: String,
    default: ''
  },
  paymentMethod: {
    type: String,
    default: null
  },
  paymentId: {
    type: String,
    default: null,
    description: 'Stripe/Razorpay transaction ID'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
})

export default mongoose.model('Transaction', transactionSchema)
