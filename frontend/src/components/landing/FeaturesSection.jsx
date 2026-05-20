import { useEffect, useRef } from 'react'
import { Cpu, Users, Shield, Mic, GitBranch, Globe, MessageSquare, Brain, Clock, Lock } from 'lucide-react'
import { HERO_FEATURES } from '@lib/constants'

const iconMap = {
  cpu: Cpu,
  users: Users,
  shield: Shield,
  mic: Mic,
  'git-branch': GitBranch,
  globe: Globe,
  'message-square': MessageSquare,
  brain: Brain,
  clock: Clock,
  lock: Lock,
}

export default function FeaturesSection() {
  const sectionRef = useRef(null)
  const cardsRef = useRef([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cards = entry.target.querySelectorAll('.feature-card')
            cards.forEach((card, i) => {
              setTimeout(() => {
                card.style.opacity = '1'
                card.style.transform = 'translateY(0)'
              }, i * 100)
            })
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="section-padding py-24 lg:py-32">
      <div className="container-custom">
        <div className="text-center mb-16">
          <span className="text-sm font-medium text-accent tracking-wide uppercase mb-4 block">
            Features
          </span>
          <h2 className="text-h2 mb-5">
            Everything you need, <span className="text-gradient-accent">nothing you don't</span>
          </h2>
          <p className="text-body-lg text-foreground-muted max-w-2xl mx-auto">
            Built for power users who refuse to compromise. Every feature is designed 
            to make your AI experience faster, deeper, and more personal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {HERO_FEATURES.map((feature, i) => {
            const Icon = iconMap[feature.icon] || Cpu
            return (
              <div
                key={feature.title}
                className="feature-card card-glow p-7 gpu-accelerate"
                style={{
                  opacity: 0,
                  transform: 'translateY(40px)',
                  transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 100}ms`,
                }}
              >
                <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground-primary mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm text-foreground-muted leading-relaxed">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
