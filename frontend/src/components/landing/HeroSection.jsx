import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Zap, Shield, Cpu, Mic } from 'lucide-react'
import ParticleBackground from './ParticleBackground'

export default function HeroSection() {
  const badgeRef = useRef(null)
  const titleRef = useRef(null)
  const subtitleRef = useRef(null)
  const buttonsRef = useRef(null)
  const statsRef = useRef(null)

  useEffect(() => {
    const elements = [badgeRef, titleRef, subtitleRef, buttonsRef, statsRef]
    elements.forEach((ref, i) => {
      if (ref.current) {
        ref.current.style.opacity = '0'
        ref.current.style.transform = 'translateY(24px)'
        setTimeout(() => {
          ref.current.style.transition = 'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)'
          ref.current.style.opacity = '1'
          ref.current.style.transform = 'translateY(0)'
        }, 150 + i * 120)
      }
    })
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background-primary via-background-primary/95 to-background-primary" />
        <ParticleBackground />
        <div className="absolute inset-0 bg-gradient-radial from-accent/5 via-transparent to-transparent opacity-40" />
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'linear-gradient(rgba(124,58,237,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.3) 1px, transparent 1px)',
            backgroundSize: '80px 80px'
          }}
        />
      </div>

      <div className="relative z-10 section-padding pt-28 pb-20">
        <div className="container-custom text-center max-w-5xl mx-auto">
          {/* Badge */}
          <div ref={badgeRef} className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/8 border border-accent/15 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">
                Now with Council Mode — 3 models debate, 1 best answer
              </span>
            </div>
          </div>

          {/* Title */}
          <div ref={titleRef} className="mb-8">
            <h1 className="text-[clamp(2.5rem,6vw,5.5rem)] font-extrabold tracking-[-0.04em] leading-[1.05]">
              <span className="text-foreground-primary block">The most</span>
              <span className="text-gradient-accent block mt-1">powerful AI chat</span>
              <span className="text-foreground-primary block mt-1">platform</span>
            </h1>
          </div>

          {/* Subtitle */}
          <p
            ref={subtitleRef}
            className="text-lg sm:text-xl text-foreground-muted max-w-2xl mx-auto mb-10 leading-relaxed font-light"
          >
            Multi-model, uncensored, voice-enabled, and entirely yours. 
            Access 8+ AI providers with automatic failover, 
            conversation branching, and real-time voice chat.
          </p>

          {/* Buttons */}
          <div
            ref={buttonsRef}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20"
          >
            <Link to="/auth/signup" className="btn-primary text-base px-7 py-3.5 rounded-xl">
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/features" className="btn-secondary text-base px-7 py-3.5 rounded-xl">
              Explore Features
            </Link>
          </div>

          {/* Stats cards */}
          <div
            ref={statsRef}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {[
              { value: '8+', label: 'AI Providers', icon: Cpu },
              { value: '200K+', label: 'Models', icon: Zap },
              { value: 'Free', label: 'Forever tier', icon: Shield },
              { value: 'Voice', label: 'TTS built-in', icon: Mic },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="card p-5 text-center gpu-accelerate group hover:border-accent/20 transition-all duration-300"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-accent/15 transition-colors">
                  <stat.icon className="w-5 h-5 text-accent" />
                </div>
                <div className="text-2xl font-bold text-foreground-primary mb-0.5">
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

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background-primary to-transparent z-10 pointer-events-none" />
    </section>
  )
}
