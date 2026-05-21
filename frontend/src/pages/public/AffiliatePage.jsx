import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, Users, TrendingUp, ArrowRight, Award, Shield, Check, ChevronDown, ChevronUp, Clock, HelpCircle, User, Mail, Globe, MessageSquare, Star } from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'

const STEPS = [
  { 
    num: '01', 
    title: 'Create Account', 
    desc: 'Register as an partner in our affiliate portal. It takes less than a minute and approval is instant.',
    icon: User,
    color: '#7C3AED'
  },
  { 
    num: '02', 
    title: 'Spread the Word', 
    desc: 'Share your custom tracking link on your blog, social media, newsletter, or directly with clients.',
    icon: Globe,
    color: '#D97757'
  },
  { 
    num: '03', 
    title: 'Earn Recurring Commission', 
    desc: 'Receive commissions month-after-month for as long as your referred users remain active on paid tiers.',
    icon: DollarSign,
    color: '#10B981'
  },
]

const TIERS = [
  { name: 'Bronze', referrals: '0 - 10 active', commission: '25% recurring', cookie: '30 days', perk: 'Standard support' },
  { name: 'Silver', referrals: '11 - 50 active', commission: '30% recurring', cookie: '60 days', perk: 'Priority partner support' },
  { name: 'Gold', referrals: '51 - 200 active', commission: '35% recurring', cookie: '90 days', perk: 'Custom promo code + assets' },
  { name: 'Platinum', referrals: '201+ active', commission: '40% recurring', cookie: '120 days', perk: 'Custom co-branded landing page' },
]

const FAQS = [
  {
    q: 'How does the cookie duration work?',
    a: 'We use a cookie tracking window (up to 120 days depending on your affiliate tier). If a user clicks your link and signs up for any plan within that period, the referral will be attributed to your account, even if they do not convert immediately.'
  },
  {
    q: 'What are the payout terms and payment methods?',
    a: 'Payments are processed on the 15th of each month for commission earnings from the previous month. The minimum payout threshold is $50. We support payouts via PayPal, Stripe Connect, and direct bank transfers.'
  },
  {
    q: 'Can I run paid advertisements to promote my link?',
    a: 'Yes, you can run paid ads (Google Ads, Facebook Ads, etc.) but with restrictions: you are strictly prohibited from bidding on trademarked terms such as "CyberCli", "CyberMindCLI", "CyberCli Chat" or any variation. Doing so will result in immediate suspension.'
  },
  {
    q: 'Where do I view my clicks, conversions, and payouts?',
    a: 'Once approved, you get access to our real-time Affiliate Dashboard, which displays granular metrics on click-through rates, registered free signups, active subscriptions, pending commission payouts, and historical transaction reports.'
  }
]

export default function AffiliatePage() {
  const [activeFaq, setActiveFaq] = useState(null)
  const [formData, setFormData] = useState({ name: '', email: '', website: '', strategy: '', agree: false })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.title = 'Affiliate Partner Program — CyberCli Chat'
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      setIsSubmitted(true)
    }, 1500)
  }

  return (
    <div className="pt-28 pb-20">
      {/* Hero Section */}
      <div className="section-padding mb-12">
        <div className="container-custom text-center">
          <ScrollReveal>
            <span className="text-sm font-medium text-accent tracking-widest uppercase mb-4 block">Partner Network</span>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-light text-foreground-primary mb-6">
              Grow with <span className="text-gradient-accent">CyberCli</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <p className="text-lg text-foreground-muted max-w-2xl mx-auto leading-relaxed">
              Join the CyberCli Affiliate Partner program. Refer users to the most advanced multi-model AI platform and earn up to <span className="text-foreground-primary font-semibold">40% lifetime recurring commissions</span>.
            </p>
          </ScrollReveal>
        </div>
      </div>

      {/* Quick Statistics */}
      <div className="section-padding mb-16">
        <div className="container-custom">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: DollarSign, stat: 'Up to 40%', label: 'Recurring Commission', color: '#10B981' },
              { icon: Clock, stat: '120 Days', label: 'Cookie Lifetime Window', color: '#7C3AED' },
              { icon: Users, stat: '$280+', label: 'Average Commission per Paid User', color: '#D97757' },
            ].map((item, i) => (
              <ScrollReveal key={item.label} delay={i * 0.08}>
                <motion.div 
                  className="card-glass p-8 text-center border border-white/5 relative overflow-hidden group"
                  whileHover={{ y: -4 }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5 blur-2xl" style={{ background: item.color }} />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5 border"
                    style={{ background: `${item.color}15`, borderColor: `${item.color}30` }}>
                    <item.icon className="w-6 h-6" style={{ color: item.color }} />
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-foreground-primary mb-2">{item.stat}</div>
                  <div className="text-sm text-foreground-muted">{item.label}</div>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>

      {/* How it Works (3 Steps) */}
      <div className="section-padding bg-black/20 py-20 border-y border-white/5 mb-24">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-serif font-light text-foreground-primary">Three simple steps to earn</h2>
              <p className="text-sm text-foreground-muted mt-2">Start monetizing your network in less than five minutes.</p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <ScrollReveal key={step.num} delay={i * 0.1}>
                  <div className="relative h-full flex flex-col justify-between p-6 card-glass border border-white/5 group">
                    <div className="absolute -top-4 right-6 text-5xl font-bold font-serif opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-300" style={{ color: step.color }}>
                      {step.num}
                    </div>
                    <div>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 border"
                        style={{ background: `${step.color}12`, borderColor: `${step.color}30` }}>
                        <Icon className="w-6 h-6" style={{ color: step.color }} />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground-primary mb-3">{step.title}</h3>
                      <p className="text-sm text-foreground-muted leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </div>

      {/* Commission Tiers Table */}
      <div className="section-padding mb-24">
        <div className="container-custom max-w-4xl">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-serif font-light text-foreground-primary">Referral Tiers</h2>
              <p className="text-sm text-foreground-muted mt-2">The more users you refer, the higher your commission percentage and perks.</p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-background-secondary/40 backdrop-blur-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/2">
                    <th className="p-4 text-xs font-semibold uppercase text-foreground-muted tracking-wider">Tier</th>
                    <th className="p-4 text-xs font-semibold uppercase text-foreground-muted tracking-wider">Active Referrals</th>
                    <th className="p-4 text-xs font-semibold uppercase text-foreground-muted tracking-wider">Commission</th>
                    <th className="p-4 text-xs font-semibold uppercase text-foreground-muted tracking-wider">Cookie Window</th>
                    <th className="p-4 text-xs font-semibold uppercase text-foreground-muted tracking-wider">Tier Perks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {TIERS.map((tier) => (
                    <tr key={tier.name} className="hover:bg-white/1 transition-colors group">
                      <td className="p-4 text-sm font-semibold text-foreground-primary flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-accent" /> {tier.name}
                      </td>
                      <td className="p-4 text-sm text-foreground-secondary">{tier.referrals}</td>
                      <td className="p-4 text-sm font-medium text-accent">{tier.commission}</td>
                      <td className="p-4 text-sm text-foreground-muted">{tier.cookie}</td>
                      <td className="p-4 text-sm text-foreground-secondary">{tier.perk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Application Form & FAQ Grid */}
      <div className="section-padding">
        <div className="container-custom max-w-5xl">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            
            {/* FAQs */}
            <div className="lg:col-span-6 space-y-6">
              <ScrollReveal>
                <h2 className="text-3xl font-serif font-light text-foreground-primary mb-6">Frequently Asked Questions</h2>
              </ScrollReveal>
              
              {FAQS.map((faq, i) => (
                <ScrollReveal key={i} delay={i * 0.08}>
                  <div className="border border-white/5 rounded-xl bg-background-secondary/30 overflow-hidden">
                    <button 
                      onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-foreground-primary hover:bg-white/1 transition-colors"
                    >
                      <span className="text-sm">{faq.q}</span>
                      {activeFaq === i ? <ChevronUp className="w-4 h-4 text-accent" /> : <ChevronDown className="w-4 h-4 text-foreground-muted" />}
                    </button>
                    <AnimatePresence initial={false}>
                      {activeFaq === i && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="p-5 pt-0 text-sm text-foreground-muted leading-relaxed border-t border-white/2 bg-white/1">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Form Panel */}
            <div className="lg:col-span-6">
              <ScrollReveal delay={0.12}>
                <div className="p-8 rounded-2xl border border-white/5 bg-gradient-to-br from-[#0F0F15] to-[#0A0A0F] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-accent/5 blur-3xl" />
                  
                  <h3 className="text-2xl font-serif font-light text-foreground-primary mb-2">Apply for Program</h3>
                  <p className="text-xs text-foreground-muted mb-6">Become a partner and start earning lifetime recurring commission checks.</p>

                  {isSubmitted ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-10"
                    >
                      <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-green-400" />
                      </div>
                      <h4 className="text-lg font-semibold text-foreground-primary mb-2">Application Received!</h4>
                      <p className="text-sm text-foreground-muted max-w-sm mx-auto">
                        Thank you for your interest. Chandan Pandey or one of our partner managers will review your application and email you within 24 hours.
                      </p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wider">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                          <input 
                            type="text" 
                            required
                            placeholder="Chandan Pandey" 
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-[#0E0E12] border border-white/8 focus:border-accent rounded-xl py-3 pl-10 pr-4 text-sm text-foreground-primary outline-none transition-all placeholder:text-white/20"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wider">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                          <input 
                            type="email" 
                            required
                            placeholder="chandan@example.com" 
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-[#0E0E12] border border-white/8 focus:border-accent rounded-xl py-3 pl-10 pr-4 text-sm text-foreground-primary outline-none transition-all placeholder:text-white/20"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wider">Website or Social Channel URL</label>
                        <div className="relative">
                          <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                          <input 
                            type="url" 
                            required
                            placeholder="https://chandanpandey.com" 
                            value={formData.website}
                            onChange={e => setFormData({ ...formData, website: e.target.value })}
                            className="w-full bg-[#0E0E12] border border-white/8 focus:border-accent rounded-xl py-3 pl-10 pr-4 text-sm text-foreground-primary outline-none transition-all placeholder:text-white/20"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wider">Promotion Strategy</label>
                        <div className="relative">
                          <MessageSquare className="absolute left-3.5 top-3 w-4 h-4 text-foreground-muted" />
                          <textarea 
                            required
                            rows={3}
                            placeholder="Tell us how you plan to promote CyberCli (e.g. blog reviews, YouTube channel, agency client referrals)..." 
                            value={formData.strategy}
                            onChange={e => setFormData({ ...formData, strategy: e.target.value })}
                            className="w-full bg-[#0E0E12] border border-white/8 focus:border-accent rounded-xl py-3 pl-10 pr-4 text-sm text-foreground-primary outline-none transition-all placeholder:text-white/20 resize-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-start gap-2 pt-2">
                        <input 
                          type="checkbox" 
                          id="agree"
                          required
                          checked={formData.agree}
                          onChange={e => setFormData({ ...formData, agree: e.target.checked })}
                          className="mt-1 rounded border-white/10 text-accent bg-[#0E0E12]"
                        />
                        <label htmlFor="agree" className="text-xs text-foreground-muted leading-relaxed cursor-pointer select-none">
                          I agree to the CyberCli Affiliate Agreement terms and consent to having my application reviewed.
                        </label>
                      </div>

                      <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-3.5 bg-accent hover:bg-accent-hover active:scale-[0.98] text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 mt-4"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            Submit Application <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </ScrollReveal>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
