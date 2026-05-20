import { motion } from 'framer-motion'
import { Check, Sparkles, Zap, ArrowRight } from 'lucide-react'
import { PRICING_TIERS } from '@lib/constants'
import ScrollReveal from '@components/ui/ScrollReveal'

const TIER_STYLES = {
  Free: {
    bg: 'bg-[#0D0D14]',
    border: 'border-white/[0.06]',
    badge: null,
    checkColor: 'text-[#9CA3AF]',
    btnClass: 'btn-secondary w-full',
  },
  Pro: {
    bg: 'bg-[#0D0D14]',
    border: 'border-transparent',
    badge: 'Most Popular',
    checkColor: 'text-violet-400',
    btnClass: 'w-full py-3 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-900/40',
  },
  Enterprise: {
    bg: 'bg-[#0D0D14]',
    border: 'border-white/[0.06]',
    badge: null,
    checkColor: 'text-emerald-400',
    btnClass: 'btn-secondary w-full',
  },
}

function PricingCard({ tier, delay }) {
  const style = TIER_STYLES[tier.name] || TIER_STYLES.Free
  const isPopular = tier.popular

  return (
    <ScrollReveal delay={delay} direction="up">
      <div className={`relative flex flex-col h-full rounded-2xl p-7 border ${style.bg} ${isPopular ? 'border-spinning' : style.border} transition-all duration-300 hover:-translate-y-1`}>
        {isPopular && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold shadow-lg shadow-violet-900/30 whitespace-nowrap">
            <Sparkles className="w-3 h-3" />
            Most Popular
          </div>
        )}

        {/* Tier */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
            {isPopular && <Zap className="w-4 h-4 text-violet-400" />}
          </div>
          <p className="text-sm text-[#6B7280] mb-4">{tier.description}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold text-white">{tier.price}</span>
            {tier.period && <span className="text-[#6B7280] text-sm">{tier.period}</span>}
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8 flex-1">
          {tier.features.map((feature, i) => (
            <motion.li
              key={feature}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: delay + i * 0.05 }}
              className="flex items-start gap-3 text-sm"
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isPopular ? 'bg-violet-500/15' : 'bg-white/[0.04]'}`}>
                <Check className={`w-3 h-3 ${style.checkColor}`} />
              </div>
              <span className="text-[#9CA3AF]">{feature}</span>
            </motion.li>
          ))}
        </ul>

        {/* CTA */}
        <motion.button
          className={style.btnClass}
          whileHover={{ scale: 1.02, brightness: 1.1 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="flex items-center justify-center gap-2">
            {tier.cta}
            <ArrowRight className="w-4 h-4" />
          </span>
        </motion.button>
      </div>
    </ScrollReveal>
  )
}

export default function PricingPage() {
  return (
    <div className="pt-28 pb-20 bg-[#0A0A0F]">
      {/* Spinning border keyframes via inline style */}
      <style>{`
        .border-spinning {
          position: relative;
          border: none;
        }
        .border-spinning::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          padding: 1px;
          background: conic-gradient(
            from var(--angle, 0deg),
            #7C3AED,
            #D97757,
            #4F46E5,
            #7C3AED
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: border-spin 4s linear infinite;
          pointer-events: none;
        }
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes border-spin {
          to { --angle: 360deg; }
        }
      `}</style>

      {/* Hero */}
      <section className="section-padding mb-16 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-violet-600/8 rounded-full blur-[100px]" />
        </div>
        <div className="container-custom text-center relative z-10">
          <ScrollReveal>
            <span className="inline-block text-xs font-semibold text-accent tracking-widest uppercase mb-5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
              Pricing
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold tracking-tight leading-[1.1] text-white mb-5">
              Simple, transparent{' '}
              <span
                className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent"
                style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                pricing
              </span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <p className="text-lg text-[#9CA3AF] max-w-2xl mx-auto">
              Start free. Upgrade when you need more power. No hidden fees, no surprises.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="section-padding mb-16">
        <div className="container-custom">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
            {PRICING_TIERS.map((tier, i) => (
              <PricingCard key={tier.name} tier={tier} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="section-padding">
        <div className="container-custom max-w-3xl">
          <ScrollReveal>
            <div className="text-center mb-8">
              <p className="text-sm text-[#6B7280]">
                All plans include SSL encryption, 99.9% uptime SLA, and GDPR compliance.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'SSL Encrypted', icon: '🔒' },
                { label: '99.9% Uptime', icon: '⚡' },
                { label: 'GDPR Compliant', icon: '🇪🇺' },
                { label: 'Cancel Anytime', icon: '✅' },
              ].map(badge => (
                <div key={badge.label} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/[0.06] bg-[#0D0D14] text-center">
                  <span className="text-2xl">{badge.icon}</span>
                  <span className="text-xs text-[#9CA3AF]">{badge.label}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
