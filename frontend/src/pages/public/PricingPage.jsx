import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Sparkles, ArrowRight, Shield, Zap, Globe, Briefcase } from 'lucide-react'
import { Link } from 'react-router-dom'
import ScrollReveal from '@components/ui/ScrollReveal'
import { isLoggedIn } from '../../lib/api.js'
import SEOHead, { StructuredData } from '@components/seo/SEOHead'

const INDIVIDUAL_PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Get started with powerful AI.',
    features: [
      'Access to all Free-tier models',
      '50 messages per hour',
      'Basic text chat',
      'Standard voice output',
      '3 custom personas',
      'Community support',
    ],
    cta: 'Get Started',
    href: '/auth/signup',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$15',
    period: '/month',
    description: 'For serious AI power users.',
    features: [
      'Everything in Free',
      '500 messages per hour',
      'Cyber-Council Debate Mode',
      'Premium voice synthesis engine',
      'Conversation branching',
      'API Keys management',
      'Secure local CLI Daemon bridge',
      'Unlimited custom personas',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    href: '/auth/signup',
    popular: true,
  },
  {
    name: 'Developer',
    price: '$35',
    period: '/month',
    description: 'For developers integrating Codeva.',
    features: [
      'Everything in Pro',
      '1,500 messages per hour',
      '100 active API keys',
      'Webhook delivery integrations',
      'Workspace terminal action access',
      'Dedicated compute queue',
      'Priority developer support',
    ],
    cta: 'Upgrade to Dev',
    href: '/auth/signup',
    popular: false,
  },
]

const TEAM_PLANS = [
  {
    name: 'Team',
    price: '$12',
    period: '/user/mo',
    description: 'For collaborative squads and startups.',
    features: [
      'Minimum 5 users required',
      '2,000 messages per user/hour',
      'Shared folders and agent personas',
      'Team activity logs & audits',
      'Shared API billing credits',
      '99.9% uptime SLA guarantee',
      'Dedicated success manager',
    ],
    cta: 'Start Team Trial',
    href: '/auth/signup',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For corporate scale and advanced security.',
    features: [
      'Unlimited messages and API keys',
      'Custom model clusters (private compute)',
      'Self-hosting hybrid deployments',
      'Single Sign-On (SSO / SAML 2.0)',
      'Custom SLA compliance',
      'HIPAA & SOC2 compliance modules',
      'Dedicated system prompt guardrails',
    ],
    cta: 'Contact Sales',
    href: '/contact?plan=enterprise',
    popular: false,
  },
]

const FAQ = [
  { q: 'Is the free plan really free?', a: 'Yes. Codeva\'s free tier gives you access to 50+ AI models with no credit card required. We route to the best available free provider automatically.' },
  { q: 'What happens when I hit my message limit?', a: 'Once you hit your hourly limit, you will need to wait for the next hour window to reset, or upgrade to a higher tier for a larger limit.' },
  { q: 'Can I cancel my subscription anytime?', a: 'Yes, subscription management is simple. Cancel from your profile dashboard settings at any time, and you will retain access until the end of your billing cycle.' },
  { q: 'Is user data securely isolated?', a: 'Absolutely. We do not use user conversations to train models. Enterprise workloads are isolated on private, SOC2 compliant database nodes.' },
]

export default function PricingPage() {
  const [billingGroup, setBillingGroup] = useState('individual')
  const isAuth = isLoggedIn()

  const activePlans = billingGroup === 'individual' ? INDIVIDUAL_PLANS : TEAM_PLANS

  return (
    <div className="pt-32 pb-20 bg-[#07070a] relative overflow-hidden">
      {/* Background design */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <div className="max-w-5xl mx-auto px-6 text-center mb-10">
        <ScrollReveal>
          <span className="text-xs font-bold text-orange-400 tracking-widest uppercase mb-4 block">Pricing Plans</span>
        </ScrollReveal>
        <ScrollReveal delay={0.08}>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-5 leading-tight">
            Simple, developer-friendly{' '}
            <span className="bg-gradient-to-r from-orange-400 to-orange-550 bg-clip-text text-transparent">
              pricing
            </span>
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.15}>
          <p className="text-sm md:text-base text-gray-400 max-w-xl mx-auto leading-relaxed">
            Get started free. Access 8+ AI model providers and unified compute gateway. Toggle to view Team options.
          </p>
        </ScrollReveal>
      </div>

      {/* Sliding Toggle Control */}
      <div className="flex justify-center mb-16 px-6">
        <div className="relative flex p-1 bg-[#101016] border border-white/[0.05] rounded-2xl w-full max-w-sm">
          {/* Slider Background */}
          <motion.div
            layoutId="billing-slider"
            className="absolute top-1 bottom-1 rounded-xl bg-orange-600 shadow-[0_4px_12px_rgba(217,119,87,0.3)]"
            initial={false}
            animate={{
              left: billingGroup === 'individual' ? '4px' : '50%',
              right: billingGroup === 'individual' ? '50%' : '4px',
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          />

          <button
            onClick={() => setBillingGroup('individual')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl relative z-10 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              billingGroup === 'individual' ? 'text-white' : 'text-gray-500 hover:text-gray-350'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Individual Plans
          </button>
          <button
            onClick={() => setBillingGroup('team')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl relative z-10 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              billingGroup === 'team' ? 'text-white' : 'text-gray-500 hover:text-gray-350'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Team & Enterprise
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="max-w-6xl mx-auto px-6 mb-24">
        <motion.div
          layout
          className={`grid gap-6 max-w-5xl mx-auto items-stretch ${
            billingGroup === 'individual' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 max-w-3xl'
          }`}
        >
          <AnimatePresence mode="popLayout">
            {activePlans.map((tier, i) => (
              <motion.div
                layout
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`relative p-8 rounded-3xl flex flex-col h-full ${
                  tier.popular
                    ? 'bg-[#0f0f15] border-2 border-orange-500/30 shadow-[0_20px_45px_-10px_rgba(217,119,87,0.15)]'
                    : 'bg-[#0c0c12]/80 backdrop-blur-sm border border-white/[0.05]'
                }`}
              >
                {/* Popular badge */}
                {tier.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-orange-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-orange-650/30">
                    <Sparkles className="w-3 h-3" />
                    Recommended
                  </div>
                )}

                {/* Card Title & Desc */}
                <div className="mb-6 flex-grow-0">
                  <h3 className="text-lg font-bold text-white mb-1.5">{tier.name}</h3>
                  <p className="text-xs text-gray-550 leading-relaxed mb-4">{tier.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white">{tier.price}</span>
                    <span className="text-gray-500 text-xs font-semibold">{tier.period}</span>
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-8 flex-grow">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-xs text-gray-400">
                      <Check className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                      <span className="leading-normal">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action button */}
                <Link
                  to={isAuth ? (tier.price === 'Custom' ? '/contact?plan=enterprise' : (tier.name === 'Free' ? '/chat' : '/settings/billing')) : tier.href}
                  className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    tier.popular
                      ? 'bg-orange-600 text-white hover:bg-orange-500 hover:shadow-[0_0_15px_rgba(217,119,87,0.4)]'
                      : 'bg-white/[0.03] border border-white/[0.05] text-white hover:bg-white/[0.05] hover:border-white/[0.1]'
                  }`}
                >
                  {tier.cta}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Security badges */}
        <ScrollReveal delay={0.1}>
          <div className="flex items-center justify-center gap-6 mt-12 flex-wrap text-xs text-gray-500 font-semibold uppercase tracking-wider">
            {['SSL Secure Layer', 'GDPR Compliant Node', '99.9% Compute SLA', 'Cancel Instantly'].map(badge => (
              <div key={badge} className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-orange-400" />
                <span>{badge}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>

      {/* FAQ Accordions */}
      <div className="max-w-3xl mx-auto px-6">
        <ScrollReveal>
          <h2 className="text-2xl font-bold text-white text-center mb-10 tracking-tight">Frequently asked questions</h2>
        </ScrollReveal>
        <div className="space-y-4">
          {FAQ.map((item, i) => (
            <ScrollReveal key={item.q} delay={i * 0.05}>
              <div className="border border-white/[0.05] bg-[#0c0c12]/50 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-2">{item.q}</h3>
                <p className="text-xs text-gray-405 leading-relaxed font-medium">{item.a}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  )
}
