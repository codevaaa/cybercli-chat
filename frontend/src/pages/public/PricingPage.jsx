import { Check, Sparkles } from 'lucide-react'
import { PRICING_TIERS } from '@lib/constants'

export default function PricingPage() {
  return (
    <div className="pt-28 pb-20">
      <div className="section-padding mb-16">
        <div className="container-custom text-center">
          <span className="text-sm font-medium text-accent tracking-wide uppercase mb-4 block">Pricing</span>
          <h1 className="text-h1 mb-5">Simple, transparent <span className="text-gradient-accent">pricing</span></h1>
          <p className="text-body-lg text-foreground-muted max-w-2xl mx-auto">
            Start free. Upgrade when you need more power. No hidden fees, no surprises.
          </p>
        </div>
      </div>

      <div className="section-padding">
        <div className="container-custom">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative p-7 rounded-2xl ${
                  tier.popular
                    ? 'bg-background-elevated border-2 border-accent/50 shadow-lg shadow-accent/5'
                    : 'bg-background-secondary border border-border-subtle'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-white text-xs font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground-primary mb-2">{tier.name}</h3>
                  <p className="text-sm text-foreground-muted mb-4">{tier.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground-primary">{tier.price}</span>
                    <span className="text-foreground-muted">{tier.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                      <span className="text-foreground-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-3 rounded-lg text-sm font-medium transition-all ${
                  tier.popular
                    ? 'bg-accent text-white hover:bg-accent-light'
                    : 'bg-background-tertiary text-foreground-primary hover:bg-background-elevated border border-border-subtle'
                }`}>
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-sm text-foreground-muted">
              All plans include SSL encryption, 99.9% uptime SLA, and GDPR compliance.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
