import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Check, Sparkles } from 'lucide-react'
import { PRICING_TIERS } from '@lib/constants'

export default function PricingSection() {
  const sectionRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cards = entry.target.querySelectorAll('.pricing-card')
            cards.forEach((card, i) => {
              setTimeout(() => {
                card.style.opacity = '1'
                card.style.transform = 'translateY(0)'
              }, i * 150)
            })
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="section-padding py-24 lg:py-32">
      <div className="container-custom">
        <div className="text-center mb-16">
          <span className="text-sm font-medium text-accent tracking-wide uppercase mb-4 block">
            Pricing
          </span>
          <h2 className="text-h2 mb-5">
            Simple, transparent <span className="text-gradient-accent">pricing</span>
          </h2>
          <p className="text-body-lg text-foreground-muted max-w-2xl mx-auto">
            Start free. Upgrade when you need more power. No hidden fees, no surprises.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PRICING_TIERS.map((tier, i) => (
            <div
              key={tier.name}
              className={`pricing-card relative p-7 rounded-2xl gpu-accelerate ${
                tier.popular
                  ? 'bg-background-elevated border-2 border-accent/50 shadow-lg shadow-accent/5'
                  : 'bg-background-secondary border border-border-subtle'
              }`}
              style={{
                opacity: 0,
                transform: 'translateY(40px)',
                transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 150}ms`,
              }}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-white text-xs font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground-primary mb-2">
                  {tier.name}
                </h3>
                <p className="text-sm text-foreground-muted mb-4">
                  {tier.description}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground-primary">
                    {tier.price}
                  </span>
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

              <Link
                to={tier.price === 'Custom' ? '/contact' : '/auth/signup'}
                className={`block text-center py-3 rounded-lg text-sm font-medium transition-all ${
                  tier.popular
                    ? 'bg-accent text-white hover:bg-accent-light'
                    : 'bg-background-tertiary text-foreground-primary hover:bg-background-elevated border border-border-subtle'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
