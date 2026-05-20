import { motion } from 'framer-motion'
import { Check, Sparkles, ArrowRight, Shield, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PRICING_TIERS } from '@lib/constants'
import ScrollReveal from '@components/ui/ScrollReveal'

const FAQ = [
  { q: 'Is the free plan really free?', a: 'Yes. CyberCli\'s free tier gives you full access to 50+ AI models with no credit card required. We route to the best available free provider automatically.' },
  { q: 'What happens when I hit my message limit?', a: 'Free users get 50 messages per hour. Once reached, you\'ll need to wait for the next hour window or upgrade to Pro for 10x the limit.' },
  { q: 'Can I cancel my Pro subscription anytime?', a: 'Absolutely. Cancel any time from your account settings. You\'ll retain Pro access until the end of your billing period.' },
  { q: 'Do you train AI models on my conversations?', a: 'Never. Your conversations are your data. We do not use your chats to train any AI models, ever.' },
]

export default function PricingPage() {
  return (
    <div className="pt-28 pb-20">
      {/* Header */}
      <div className="section-padding mb-16">
        <div className="container-custom text-center">
          <ScrollReveal>
            <span className="text-sm font-medium text-accent tracking-widest uppercase mb-4 block">Pricing</span>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h1 className="text-5xl sm:text-6xl font-serif font-light text-foreground-primary mb-5">
              Simple, transparent{' '}
              <span className="text-gradient-accent italic">pricing</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <p className="text-lg text-foreground-muted max-w-2xl mx-auto">
              Start free. Upgrade when you need more power. No hidden fees, no surprises, no credit card required to start.
            </p>
          </ScrollReveal>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="section-padding mb-20">
        <div className="container-custom">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRICING_TIERS.map((tier, i) => (
              <ScrollReveal key={tier.name} delay={i * 0.1}>
                <motion.div
                  className={`relative p-7 rounded-2xl h-full ${
                    tier.popular
                      ? 'bg-background-elevated border-2 border-accent/40'
                      : 'bg-background-secondary border border-border-subtle'
                  }`}
                  whileHover={{ y: -6, boxShadow: tier.popular ? '0 24px 60px rgba(217,119,87,0.15)' : '0 16px 40px rgba(0,0,0,0.4)' }}
                  transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                >
                  {/* Popular badge */}
                  {tier.popular && (
                    <motion.div
                      className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-accent text-white text-xs font-semibold flex items-center gap-1.5"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: 'spring', stiffness: 400 }}
                    >
                      <Sparkles className="w-3 h-3" />
                      Most Popular
                    </motion.div>
                  )}

                  {/* Header */}
                  <div className="mb-7">
                    <h3 className="text-lg font-semibold text-foreground-primary mb-1">{tier.name}</h3>
                    <p className="text-sm text-foreground-muted mb-5">{tier.description}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold text-foreground-primary">{tier.price}</span>
                      {tier.period && <span className="text-foreground-muted text-sm">{tier.period}</span>}
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, fi) => (
                      <motion.li
                        key={feature}
                        className="flex items-start gap-3 text-sm"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 + fi * 0.05 }}
                      >
                        <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                        <span className="text-foreground-secondary">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    to="/auth/signup"
                    className={`w-full py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      tier.popular
                        ? 'bg-accent text-white hover:bg-accent-light'
                        : 'bg-background-tertiary text-foreground-primary hover:bg-background-elevated border border-border-subtle hover:border-accent/30'
                    }`}
                  >
                    {tier.cta}
                    {tier.popular && <ArrowRight className="w-4 h-4" />}
                  </Link>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>

          {/* Trust badges */}
          <ScrollReveal delay={0.2}>
            <div className="flex items-center justify-center gap-8 mt-10 flex-wrap text-sm text-foreground-muted">
              {['SSL Encryption', 'GDPR Compliant', '99.9% Uptime SLA', 'Cancel Anytime'].map(badge => (
                <div key={badge} className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-accent" />
                  {badge}
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* FAQ */}
      <div className="section-padding">
        <div className="container-custom max-w-3xl">
          <ScrollReveal>
            <h2 className="text-3xl font-serif font-light text-foreground-primary text-center mb-12">Frequently asked questions</h2>
          </ScrollReveal>
          <div className="space-y-4">
            {FAQ.map((item, i) => (
              <ScrollReveal key={item.q} delay={i * 0.08}>
                <div className="card-glass p-6">
                  <h3 className="text-sm font-semibold text-foreground-primary mb-2">{item.q}</h3>
                  <p className="text-sm text-foreground-muted leading-relaxed">{item.a}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
