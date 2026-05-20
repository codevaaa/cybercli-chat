import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Shield, Zap } from 'lucide-react'
import ParticleBackground from './ParticleBackground'

export default function HeroSection() {
  const titleRef = useRef(null)
  const subtitleRef = useRef(null)
  const buttonsRef = useRef(null)
  const statsRef = useRef(null)

  useEffect(() => {
    const elements = [titleRef, subtitleRef, buttonsRef, statsRef]
    elements.forEach((ref, i) => {
      if (ref.current) {
        ref.current.style.opacity = '0'
        ref.current.style.transform = 'translateY(30px)'
        setTimeout(() => {
          ref.current.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
          ref.current.style.opacity = '1'
          ref.current.style.transform = 'translateY(0)'
        }, 200 + i * 150)
      }
    })
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background-primary via-background-primary/95 to-background-primary" />
        <ParticleBackground />
        <div className="absolute inset-0 bg-gradient-radial from-accent/5 via-transparent to-transparent opacity-50" />
      </div>

      <div className="relative z-10 section-padding pt-32 pb-20">
        <div className="container-custom text-center">
          <div
            ref={titleRef}
            className="mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">
                Now with Council Mode — 3 models, 1 answer
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
              <span className="text-foreground-primary">The most</span>
              <br />
              <span className="text-gradient-accent">powerful AI chat</span>
              <br />
              <span className="text-foreground-primary">platform</span>
            </h1>
          </div>

          <p
            ref={subtitleRef}
            className="text-lg sm:text-xl text-foreground-muted max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Multi-model, uncensored, voice-enabled, and entirely yours. 
            Access 8+ AI providers in one place with automatic failover, 
            conversation branching, and real-time voice chat.
          </p>

          <div
            ref={buttonsRef}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link to="/auth/signup" className="btn-primary text-base px-8 py-4">
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/features" className="btn-secondary text-base px-8 py-4">
              Explore Features
            </Link>
          </div>

          <div
            ref={statsRef}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
          >
            {[
              { value: '8+', label: 'AI Providers', icon: Zap },
              { value: '200K+', label: 'Models Available', icon: Sparkles },
              { value: '0$', label: 'Free Tier', icon: Shield },
              { value: '5', label: 'AI Voices', icon: Zap },
            ].map((stat) => (
              <div
                key={stat.label}
                className="card p-5 text-center gpu-accelerate"
              >
                <stat.icon className="w-5 h-5 text-accent mx-auto mb-3" />
                <div className="text-2xl font-bold text-foreground-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-foreground-muted">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background-primary to-transparent z-10" />
    </section>
  )
}
