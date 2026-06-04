import mongoose from 'mongoose'
import 'dotenv/config'
import User from './src/models/User.js'
import Organization from './src/models/Organization.js'
import OrganizationMember from './src/models/OrganizationMember.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
)

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    const assignments = [
      { email: 'bhaktikisakti.11@gmail.com', plan: 'team' },
      { email: 'chandanabhay4456@gmail.com', plan: 'enterprise' },
      { email: 'chandanabhay458@gmail.com', plan: 'pro' },
      { email: 'mrabhaygod12@gmail.com', plan: 'max' }
    ]

    for (const assignment of assignments) {
      console.log(`Processing ${assignment.email} for plan ${assignment.plan}...`)
      
      const user = await User.findOne({ email: assignment.email })
      if (!user) {
        console.log(`❌ User ${assignment.email} not found in MongoDB. Skipping.`)
        continue
      }

      // Update MongoDB User plan
      user.plan = assignment.plan
      await user.save()
      console.log(`✅ Updated MongoDB plan for ${assignment.email}`)

      // Update Supabase Users table
      const { error: dbError } = await supabase
        .from('users')
        .update({ plan: assignment.plan })
        .eq('id', user.supabase_id)
      
      if (dbError) {
        console.log(`❌ Failed to update Supabase users table for ${assignment.email}:`, dbError.message)
      } else {
        console.log(`✅ Updated Supabase users table for ${assignment.email}`)
      }

      // Update Supabase Auth metadata
      const { error: authError } = await supabase.auth.admin.updateUserById(
        user.supabase_id,
        { user_metadata: { plan_tier: assignment.plan } }
      )

      if (authError) {
        console.log(`❌ Failed to update Supabase Auth metadata for ${assignment.email}:`, authError.message)
      } else {
         console.log(`✅ Updated Supabase Auth metadata for ${assignment.email}`)
      }

      // If team or enterprise, create Organization
      if (['team', 'enterprise'].includes(assignment.plan)) {
        const orgName = `${user.full_name || user.email.split('@')[0]}'s ${assignment.plan.toUpperCase()}`
        
        let org = await Organization.findOne({ owner_id: user._id, plan: assignment.plan })
        if (!org) {
          org = await Organization.create({
            name: orgName,
            owner_id: user._id,
            plan: assignment.plan,
            seats_standard: 5,
            seats_premium: 2,
            billing_email: user.email
          })
          console.log(`✅ Created ${assignment.plan} Organization for ${assignment.email}`)
        } else {
          console.log(`ℹ️ Organization already exists for ${assignment.email}`)
        }

        const member = await OrganizationMember.findOne({ org_id: org._id, user_id: user._id })
        if (!member) {
          await OrganizationMember.create({
            org_id: org._id,
            user_id: user._id,
            role: 'owner',
            seat_type: 'premium'
          })
          console.log(`✅ Created Org Owner membership for ${assignment.email}`)
        }
      }
    }
  } catch (error) {
    console.error('Script failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

run()
