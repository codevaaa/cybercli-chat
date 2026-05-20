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
              }, i * 80)
            })
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.05 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="section-padding py-28 lg:py-36">
      <div className="container-custom">
        <div className="text-center mb-16 lg:mb-20">
          <span className="inline-block text-xs font-semibold text-accent tracking-[0.2em] uppercase mb-4 px-4 py-1.5 rounded-full bg-accent/5 border border-accent/10">
            Features
          </span>
          <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-bold tracking-tight leading-[1.1] mb-6">
            Everything you need,{' '}
            <span className="text-gradient-accent">nothing you don't</span>
          </h2>
          <p className="text-lg text-foreground-muted max-w-2xl mx-auto leading-relaxed">
            Built for power users who refuse to compromise. Every feature is designed 
            to make your AI experience faster, deeper, and more personal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {HERO_FEATURES.map((feature, i) => {
            const Icon = iconMap[feature.icon] || Cpu
            return (
              <div
                key={feature.title}
                className="feature-card group relative p-7 rounded-2xl bg-background-secondary/50 border border-border-subtle hover:border-accent/15 transition-all duration-500 gpu-accelerate"
                style={{
                  opacity: 0,
                  transform: 'translateY(30px)',
                  transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 80}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 80}ms`,
                }}
              >
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/15 group-hover:scale-105 transition-all duration-300">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground-primary mb-2.5 group-hover:text-accent transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-foreground-muted leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
