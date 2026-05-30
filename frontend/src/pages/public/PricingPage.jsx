import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Minus, Sparkles, ArrowRight, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import ScrollReveal from '@components/ui/ScrollReveal'
import { isLoggedIn } from '../../lib/api.js'
import SEOHead, { StructuredData } from '@components/seo/SEOHead'

/* ── Plan cards (mirror backend config/plans.js tiers) ── */
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '',
    blurb: 'Try Codeva',
    cta: 'Get started',
    href: '/auth/signup',
    popular: false,
    features: [
      'Access to all free-tier models',
      'Fast & balanced model tiers',
      '50 messages per hour',
      'Voice chat & image generation',
      'Web search built in',
      'CyberCoder CLI (free tier)',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$15',
    period: '/ month',
    blurb: 'For everyday productivity',
    cta: 'Get Pro',
    href: '/auth/signup',
    popular: true,
    features: [
      'Everything in Free',
      'Reasoning-tier models (Gemini Pro, DeepSeek R1, Kimi)',
      '500 messages per hour',
      'Council Mode (multi-model consensus)',
      'Parallel agents & conversation branching',
      'API keys + local CLI daemon bridge',
      'Priority routing',
    ],
  },
  {
    id: 'max',
    name: 'Max',
    price: 'From $90',
    period: '/ month',
    blurb: 'For power users who live in Codeva',
    cta: 'Get Max',
    href: '/auth/signup',
    popular: false,
    features: [
      'Everything in Pro',
      'Premium BYOK models (Anthropic / OpenAI direct)',
      '2,000 messages per hour',
      'Up to 6 parallel agents',
      'Largest context windows',
      'Highest priority + early features',
    ],
  },
]

/* ── Feature comparison matrix ── */
const COMPARE = [
  {
    group: 'Models & usage',
    rows: [
      { label: 'Free-tier models (30+)', free: true, pro: true, max: true },
      { label: 'Reasoning-tier models', free: false, pro: true, max: true },
      { label: 'Premium BYOK models', free: false, pro: false, max: true },
      { label: 'Messages per hour', free: '50', pro: '500', max: '2,000' },
      { label: 'Context window cap', free: '16K', pro: '128K', max: '200K+' },
      { label: 'Auto model routing', free: true, pro: true, max: true },
    ],
  },
  {
    group: 'Features & capabilities',
    rows: [
      { label: 'Voice chat & TTS', free: true, pro: true, max: true },
      { label: 'Image generation', free: true, pro: true, max: true },
      { label: 'Web search & research', free: true, pro: true, max: true },
      { label: 'Council Mode (consensus)', free: false, pro: true, max: true },
      { label: 'Parallel sub-agents', free: false, pro: '3', max: '6' },
      { label: 'Conversation branching', free: false, pro: true, max: true },
      { label: 'Custom personas', free: '3', pro: 'Unlimited', max: 'Unlimited' },
    ],
  },
  {
    group: 'Developer & CLI',
    rows: [
      { label: 'CyberCoder CLI', free: true, pro: true, max: true },
      { label: 'API keys', free: false, pro: '10', max: '25' },
      { label: 'Local workspace daemon', free: false, pro: true, max: true },
      { label: 'MCP server connections', free: true, pro: true, max: true },
      { label: 'Hooks & automation', free: true, pro: true, max: true },
    ],
  },
  {
    group: 'Support & security',
    rows: [
      { label: 'Community support', free: true, pro: true, max: true },
      { label: 'Priority support', free: false, pro: true, max: true },
      { label: 'Data never trains models', free: true, pro: true, max: true },
      { label: 'Field-level encryption', free: true, pro: true, max: true },
    ],
  },
]

const FAQ = [
  { q: 'Is the free plan really free?', a: 'Yes. Codeva\'s free tier gives you access to 30+ AI models with no credit card required. We route to the best available free provider automatically based on your task.' },
  { q: 'How does plan-based model access work?', a: 'Your plan governs which model tiers you can use. Free gets fast + balanced models; Pro unlocks reasoning-tier models and Council Mode; Max adds premium BYOK models and the highest limits.' },
  { q: 'What happens when I hit my message limit?', a: 'Once you reach your hourly limit you can wait for the next window, or upgrade for a larger allowance. Limits reset every hour.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Manage or cancel your subscription from Settings → Billing at any time. You keep access until the end of the billing cycle.' },
  { q: 'Is my data secure?', a: 'We never train on your conversations. Sensitive fields are encrypted, and enterprise workloads run on isolated, SOC2-compliant nodes.' },
]

function Cell({ value }) {
  if (value === true) return <Check className="w-4 h-4 text-orange-400 mx-auto" />
  if (value === false) return <Minus className="w-4 h-4 text-gray-600 mx-auto" />
  return <span className="text-xs text-gray-300">{value}</span>
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/[0.06]">
      <button onClick={() => setOpen(!open)} className="w-full py-5 flex items-center justify-between text-left group">
        <span className="text-[15px] text-white font-medium group-hover:text-orange-400 transition-colors">{q}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="pb-5 text-sm text-gray-400 leading-relaxed max-w-2xl">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function PricingPage() {
  const isAuth = isLoggedIn()
  const planHref = (p) => isAuth ? (p.id === 'free' ? '/chat' : '/settings/billing') : p.href

  return (
    <div className="pt-32 pb-20 bg-[#0a0a0c] relative overflow-hidden">
      <SEOHead
        title="Pricing — Free, Pro & Max"
        description="Codeva pricing: start free with 30+ AI models, upgrade to Pro for reasoning models and Council Mode, or Max for premium models and the highest limits."
        keywords="Codeva pricing, AI chat pricing, Pro plan, Max plan, free AI models"
        path="/pricing"
      />
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-orange-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <div className="max-w-5xl mx-auto px-6 text-center mb-14 relative z-10">
        <ScrollReveal>
          <h1 className="text-4xl md:text-5xl font-serif font-normal tracking-tight text-white mb-4" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Pricing
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <p className="text-base text-gray-400 max-w-xl mx-auto leading-relaxed">
            Start free. Upgrade when you need more power. Your plan decides which models and features you unlock.
          </p>
        </ScrollReveal>
      </div>

      {/* Plan cards */}
      <div className="max-w-5xl mx-auto px-6 mb-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {PLANS.map((p, i) => (
            <ScrollReveal key={p.id} delay={i * 0.06}>
              <div className={`relative p-7 rounded-2xl flex flex-col h-full ${
                p.popular
                  ? 'bg-[#14120f] border-2 border-orange-500/40'
                  : 'bg-[#0e0e12] border border-white/[0.06]'
              }`}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-orange-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Most popular
                  </div>
                )}
                <h3 className="text-lg font-semibold text-white mb-1">{p.name}</h3>
                <p className="text-xs text-gray-500 mb-4">{p.blurb}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-bold text-white">{p.price}</span>
                  <span className="text-gray-500 text-xs">{p.period}</span>
                </div>
                <Link
                  to={planHref(p)}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 mb-6 ${
                    p.popular
                      ? 'bg-orange-600 text-white hover:bg-orange-500'
                      : 'bg-white/[0.05] border border-white/[0.08] text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {p.cta} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <ul className="space-y-2.5 flex-grow">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-xs text-gray-400">
                      <Check className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                      <span className="leading-normal">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          ))}
        </div>
        <p className="text-center text-xs text-gray-600 mt-6">
          Need a team or enterprise plan? <Link to="/contact?plan=enterprise" className="text-orange-400 hover:underline">Contact sales</Link>.
        </p>
      </div>

      {/* Compare features across plans */}
      <div className="max-w-5xl mx-auto px-6 mb-24 relative z-10">
        <ScrollReveal>
          <h2 className="text-2xl md:text-3xl font-serif font-normal text-white text-center mb-10" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Compare features across plans
          </h2>
        </ScrollReveal>

        <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-[#0e0e12]">
          {/* Sticky header */}
          <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center px-5 py-4 border-b border-white/[0.08] bg-[#101014] sticky top-16 z-10">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Features</span>
            {['Free', 'Pro', 'Max'].map((h) => (
              <span key={h} className="text-center text-sm font-semibold text-white">{h}</span>
            ))}
          </div>

          {COMPARE.map((section) => (
            <div key={section.group}>
              <div className="px-5 py-3 bg-white/[0.02] border-b border-white/[0.04]">
                <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">{section.group}</span>
              </div>
              {section.rows.map((row) => (
                <div key={row.label} className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center px-5 py-3 border-b border-white/[0.04] hover:bg-white/[0.015]">
                  <span className="text-xs text-gray-300">{row.label}</span>
                  <div className="text-center"><Cell value={row.free} /></div>
                  <div className="text-center"><Cell value={row.pro} /></div>
                  <div className="text-center"><Cell value={row.max} /></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-6 relative z-10">
        <ScrollReveal>
          <h2 className="text-2xl font-serif font-normal text-white text-center mb-8" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Frequently asked questions
          </h2>
        </ScrollReveal>
        <div>
          {FAQ.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </div>
  )
}
