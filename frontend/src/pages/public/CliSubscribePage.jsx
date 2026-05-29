import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Check, ArrowRight, Zap, Shield, Terminal } from 'lucide-react'
import { Link } from 'react-router-dom'

const PLANS = [
  {
    name: 'Pro',
    price: '$15',
    period: '/month',
    tagline: 'For individual developers',
    features: [
      'Unlimited CLI usage',
      'Access to all Pro models',
      '500 messages/hour',
      'Priority support',
      'Custom personas',
    ],
    cta: 'Upgrade to Pro',
    popular: false,
  },
  {
    name: 'Max',
    price: '$49',
    period: '/month',
    tagline: 'For power users',
    features: [
      'Everything in Pro',
      '2,000 messages/hour',
      'Council Mode (multi-model)',
      'Advanced branching',
      'Premium voice synthesis',
      'Dedicated compute queue',
    ],
    cta: 'Upgrade to Max',
    popular: true,
  },
  {
    name: 'Team',
    price: '$25',
    period: '/user/mo',
    tagline: 'For collaborative teams',
    features: [
      'Everything in Max',
      'Shared team workspace',
      'Team activity logs',
      'SSO / SAML 2.0',
      '99.9% uptime SLA',
      'Dedicated success manager',
    ],
    cta: 'Start Team Trial',
    popular: false,
  },
]

export default function CliSubscribePage() {
  const [hovered, setHovered] = useState(null)

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl w-full text-center"
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <Terminal className="w-6 h-6 text-[#D97736]" />
            <span className="text-white text-xl font-semibold">CyberCli Code</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-white text-3xl md:text-4xl font-semibold mb-4">
          A CyberCli subscription is required to connect to CyberCli Code
        </h1>
        <p className="text-gray-400 text-base max-w-lg mx-auto mb-10">
          Sign up for a Pro, Max, or Team subscription to connect your account, or use your own API key.
        </p>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-10">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className={`relative p-6 rounded-2xl border text-left transition-all ${
                plan.popular
                  ? 'bg-[#2a1f1a] border-[#D97736]/40'
                  : 'bg-[#222222] border-gray-800 hover:border-gray-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#D97736] text-white text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  Recommended
                </div>
              )}

              <h3 className="text-white text-lg font-bold mb-1">{plan.name}</h3>
              <p className="text-gray-500 text-xs mb-4">{plan.tagline}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                <span className="text-gray-500 text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                    <Check className="w-4 h-4 text-[#D97736] flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={`/auth/signup?plan=${plan.name.toLowerCase()}`}
                className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  plan.popular
                    ? 'bg-white text-gray-900 hover:bg-gray-100'
                    : 'bg-white/[0.05] border border-white/[0.1] text-white hover:bg-white/[0.1]'
                }`}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>

        {/* API Key Option */}
        <div className="mb-8">
          <p className="text-gray-500 text-sm mb-3">
            Already have API keys? Use your own keys instead.
          </p>
          <Link
            to="/product"
            className="inline-flex items-center gap-2 text-[#D97736] text-sm font-medium hover:underline"
          >
            <Zap className="w-4 h-4" />
            Use API key (BYOK)
          </Link>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 flex-wrap text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Cancel anytime
          </span>
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            No credit card required for trial
          </span>
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            99.9% uptime SLA
          </span>
        </div>
      </motion.div>
    </div>
  )
}
