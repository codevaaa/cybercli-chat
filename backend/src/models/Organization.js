import mongoose from 'mongoose'

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  owner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  plan: {
    type: String,
    enum: ['team', 'enterprise'],
    default: 'team'
  },
  status: {
    type: String,
    enum: ['active', 'past_due', 'canceled', 'trialing'],
    default: 'active'
  },
  stripe_customer_id: {
    type: String,
    default: null
  },
  stripe_subscription_id: {
    type: String,
    default: null
  },
  seats_standard: {
    type: Number,
    default: 1
  },
  seats_premium: {
    type: Number,
    default: 0
  },
  billing_email: {
    type: String,
    default: null
  },
  settings: {
    allow_sso: { type: Boolean, default: false },
    enforce_2fa: { type: Boolean, default: false },
    domain_capture: { type: String, default: null } // e.g. "acme.com"
  }
}, { timestamps: true })

// Helper to generate a slug from the org name
organizationSchema.pre('validate', async function (next) {
  if (this.isModified('name') && !this.slug) {
    const baseSlug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    let slug = baseSlug
    let counter = 1
    while (true) {
      const existing = await mongoose.models.Organization.findOne({ slug })
      if (!existing || existing._id.equals(this._id)) {
        break
      }
      slug = `${baseSlug}-${counter}`
      counter++
    }
    this.slug = slug
  }
  next()
})

const Organization = mongoose.model('Organization', organizationSchema)
export default Organization
