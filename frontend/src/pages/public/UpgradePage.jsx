import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import api, { isLoggedIn } from '../../lib/api.js'
import SEOHead from '@components/seo/SEOHead'

/*
 * /upgrade — Codeva plan selection, modeled on claude.ai/upgrade.
 * Individual (Free / Pro / Max) and Team & Enterprise (Team / Enterprise) tabs.
 * Buttons trigger REAL Stripe checkout for logged-in users (pro/max), or route
 * to signup / contact otherwise.
 */

const PlantIcon = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M24 42V20" />
    <path d="M24 26c0-5-4-9-9-9-1.5 0-3 .4-4 1 0 5 4 9 9 9 1.5 0 3-.4 4-1Z" />
    <path d="M24 22c0-5 4-9 9-9 1.5 0 3 .4 4 1 0 5-4 9-9 9-1.5 0-3-.4-4-1Z" />
    <circle cx="24" cy="13" r="3" />
  </svg>
)

const StoreIcon = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 20v18h32V20" />
    <path d="M6 12h36l2 8a5 5 0 0 1-10 0 5 5 0 0 1-10 0 5 5 0 0 1-10 0 5 5 0 0 1-10 0Z" />
    <path d="M20 38V28h8v10" />
  </svg>
)

const BuildingIcon = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 42V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v34" />
    <path d="M30 18h8a2 2 0 0 1 2 2v22" />
    <path d="M6 42h36" />
    <path d="M16 14h4M22 14h4M16 22h4M22 22h4M16 30h4M22 30h4" />
  </svg>
)

const INDIVIDUAL_PLANS = [
  {
    id: 'free',
    name: 'Free',
    sub: 'Meet Codeva',
    price: '$0',
    priceNote: '',
    cta: 'Use Codeva for free',
    action: 'free',
    highlight: false,
    featuresTitle: '',
    features: [
      'Chat on web, iOS, Android, and desktop',
      'Generate code and visualize data',
      'Access 30+ free AI models',
      'Extended thinking for complex work',
      'Built-in web search',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    sub: 'Research, code, and organize',
    price: '$15',
    priceNoteMonthly: 'USD / month\nbilled monthly',
    priceNoteYearly: 'USD / month\nbilled annually',
    priceMonthly: '$18',
    priceYearly: '$15',
    cta: 'Get Pro plan',
    action: 'pro',
    highlight: true,
    billingToggle: true,
    featuresTitle: 'Everything in Free, and:',
    features: [
      'CyberCoder CLI directly in your codebase',
      'Power through tasks with Cowork',
      'Higher usage limits (500 / hour)',
      'Reasoning-tier models & deep research',
      'Council Mode (multi-model consensus)',
      'Memory that carries across conversations',
    ],
  },
  {
    id: 'max',
    name: 'Max',
    sub: 'Higher limits, priority access',
    price: 'From $90',
    priceNote: 'USD / month\nbilled monthly',
    cta: 'Get Max plan',
    action: 'max',
    highlight: false,
    subnote: 'No commitment · Cancel anytime',
    featuresTitle: 'Everything in Pro, plus:',
    features: [
      'Up to 20x more usage than Pro*',
      'Recommended for CyberCoder & Cowork',
      'Early access to advanced Codeva features',
      'Higher output limits for all tasks',
      'Priority access at high traffic times',
    ],
  },
]

const TEAM_PLANS = [
  {
    id: 'team',
    name: 'Team',
    sub: 'Predictable usage per seat',
    badge: '5–150 users',
    icon: StoreIcon,
    seats: [
      { label: 'Standard seat', price: '$20', per: '/mo', note: 'All Codeva features, plus more usage than Pro*\n$25 /mo when billed monthly' },
      { label: 'Premium seat', price: '$100', per: '/mo', note: '5x more usage than standard seats*\n$125 /mo when billed monthly' },
    ],
    features: [
      '200K context window',
      'Usage credits available at API rates',
      'CyberCoder CLI',
      'Cowork',
      'Central billing and administration',
      'Single sign-on (SSO) and domain capture',
      'Admin controls for remote and local connectors',
      'Enterprise deployment for the Codeva desktop app',
      'Enterprise search across your organization',
      'Connect Microsoft 365, Slack, and more',
      'No model training on your content by default',
    ],
    cta: 'Get Team plan',
    action: 'team',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    sub: 'Flexible pooled usage',
    badge: '20+ users',
    icon: BuildingIcon,
    seatBox: { label: 'Seat price + usage at API rates', note: '$20/seat + tax. Usage cost scales with model and task.' },
    featuresTitle: 'All Team features, plus:',
    features: [
      'Pay-as-you-go pricing with pooled usage across your org',
      'Set user and org spend limits',
      '500K context window',
      'Role-based access with fine grained permissioning',
      'System for Cross-domain Identity Management (SCIM)',
      'Audit logs',
      'Compliance API for observability and monitoring',
      'Network-level access control',
      'Custom data retention controls',
      'IP allowlisting',
    ],
    cta: 'Get Enterprise plan',
    action: 'enterprise',
  },
]

export default function UpgradePage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('individual')
  const [billing, setBilling] = useState('yearly')
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [error, setError] = useState(null)

  const handleAction = async (action) => {
    setError(null)
    if (action === 'free') {
      navigate(isLoggedIn() ? '/chat' : '/auth/signup')
      return
    }
    if (action === 'team') {
      navigate('/contact?plan=team')
      return
    }
    if (action === 'enterprise') {
      navigate('/contact?plan=enterprise')
      return
    }
    // pro / max → real Stripe checkout
    if (!isLoggedIn()) {
      navigate(`/auth/signup?plan=${action}`)
      return
    }
    try {
      setLoadingPlan(action)
      const { data } = await api.post('/stripe/checkout', { plan: action, billing })
      if (data?.url) {
        window.location.href = data.url
      } else {
        setError('Could not start checkout. Please try again.')
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Checkout is currently unavailable. Please try again later.')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1a18] pt-24 pb-20 px-4 sm:px-6">
      <SEOHead
        title="Upgrade your plan"
        description="Plans that grow with you. Start free, upgrade to Pro or Max for more power, or pick Team & Enterprise for your organization."
        path="/upgrade"
      />

      {/* Back */}
      <div className="max-w-6xl mx-auto mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-serif font-normal text-[#f5f4ef] mb-6" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Plans that grow with you
        </h1>

        {/* Tab toggle */}
        <div className="inline-flex items-center rounded-lg bg-[#0e0e0c] border border-white/[0.08] p-1">
          {[
            { id: 'individual', label: 'Individual' },
            { id: 'team', label: 'Team and Enterprise' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === t.id ? 'text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab === t.id && (
                <motion.span layoutId="upgrade-tab" className="absolute inset-0 rounded-md bg-[#2b2b27]" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="max-w-md mx-auto mb-6 px-4 py-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm text-center">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {tab === 'individual' ? (
          <motion.div
            key="individual"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {INDIVIDUAL_PLANS.map((p) => {
              const price = p.billingToggle ? (billing === 'yearly' ? p.priceYearly : p.priceMonthly) : p.price
              const priceNote = p.billingToggle ? (billing === 'yearly' ? p.priceNoteYearly : p.priceNoteMonthly) : p.priceNote
              return (
                <div
                  key={p.id}
                  className={`relative rounded-2xl p-6 flex flex-col ${
                    p.highlight ? 'bg-[#262521] border border-white/[0.12]' : 'bg-[#211f1c] border border-white/[0.06]'
                  }`}
                >
                  <PlantIcon className="w-9 h-9 text-[#c96442] mb-5" />

                  {/* Billing toggle (Pro only) */}
                  {p.billingToggle && (
                    <div className="absolute top-6 right-6 inline-flex items-center rounded-full bg-[#0e0e0c] border border-white/[0.08] p-0.5 text-[11px]">
                      <button onClick={() => setBilling('monthly')} className={`px-2.5 py-1 rounded-full transition-colors ${billing === 'monthly' ? 'bg-[#3a3934] text-white' : 'text-gray-400'}`}>Monthly</button>
                      <button onClick={() => setBilling('yearly')} className={`px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 ${billing === 'yearly' ? 'bg-[#3a3934] text-white' : 'text-gray-400'}`}>
                        Yearly <span className="text-[#c96442]">· Save 17%</span>
                      </button>
                    </div>
                  )}

                  <h3 className="text-xl font-semibold text-white">{p.name}</h3>
                  <p className="text-sm text-gray-400 mt-0.5 mb-5">{p.sub}</p>

                  <div className="flex items-baseline gap-2 mb-5 min-h-[44px]">
                    <span className="text-4xl font-bold text-white">{price}</span>
                    {priceNote && (
                      <span className="text-[11px] text-gray-500 leading-tight whitespace-pre-line">{priceNote}</span>
                    )}
                  </div>

                  <button
                    onClick={() => handleAction(p.action)}
                    disabled={loadingPlan === p.action}
                    className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60 ${
                      p.highlight || p.id === 'max'
                        ? 'bg-[#f5f4ef] text-[#1a1a18] hover:bg-white'
                        : 'bg-transparent border border-white/[0.18] text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    {loadingPlan === p.action ? 'Starting…' : p.cta}
                  </button>
                  {p.subnote && <p className="text-center text-[11px] text-gray-500 mt-2">{p.subnote}</p>}

                  <div className="mt-6 space-y-3">
                    {p.featuresTitle && <p className="text-xs text-gray-400 font-medium">{p.featuresTitle}</p>}
                    {p.features.map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <span className="text-[13px] text-gray-300 leading-snug">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </motion.div>
        ) : (
          <motion.div
            key="team"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {TEAM_PLANS.map((p) => {
              const Icon = p.icon
              return (
                <div key={p.id} className="relative rounded-2xl p-6 flex flex-col bg-[#211f1c] border border-white/[0.06]">
                  <span className="absolute top-6 right-6 px-2.5 py-1 rounded-md bg-[#0e0e0c] border border-white/[0.08] text-[11px] text-gray-400">{p.badge}</span>
                  <Icon className="w-9 h-9 text-[#c96442] mb-5" />
                  <h3 className="text-xl font-serif text-white" style={{ fontFamily: "'Instrument Serif', serif" }}>{p.name}</h3>
                  <p className="text-sm text-gray-400 mt-0.5 mb-5">{p.sub}</p>

                  {/* Seat pricing */}
                  {p.seats && (
                    <div className="rounded-xl border border-white/[0.07] divide-y divide-white/[0.06] mb-5">
                      {p.seats.map((s) => (
                        <div key={s.label} className="p-3.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white">{s.label}</span>
                            <span className="text-sm font-semibold text-white">{s.price}<span className="text-gray-500 font-normal">{s.per}</span></span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1 whitespace-pre-line leading-snug">{s.note}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {p.seatBox && (
                    <div className="rounded-xl border border-white/[0.07] p-3.5 mb-5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{p.seatBox.label}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 leading-snug">{p.seatBox.note}</p>
                    </div>
                  )}

                  <div className="space-y-3 flex-grow">
                    {p.featuresTitle && <p className="text-xs text-gray-400 font-medium">{p.featuresTitle}</p>}
                    {p.features.map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <span className="text-[13px] text-gray-300 leading-snug">{f}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleAction(p.action)}
                    className="w-full mt-6 py-2.5 rounded-lg text-sm font-semibold bg-[#2f2e2a] border border-white/[0.1] text-white hover:bg-[#3a3934] transition-all"
                  >
                    {p.cta}
                  </button>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-center text-[11px] text-gray-500 mt-8 max-w-2xl mx-auto">
        *Usage limits apply. Prices and plans are subject to change at Codeva's discretion.
      </p>
    </div>
  )
}
