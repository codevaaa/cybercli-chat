import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles, Zap, Shield, Cpu, Mic, Send, Paperclip } from 'lucide-react'
import ParticleBackground from './ParticleBackground'
import { useAuthStore } from '../../stores/authStore'

export default function HeroSection() {
  const [prompt, setPrompt] = useState('')
  const navigate = useNavigate()
  const { session } = useAuthStore()

  const badgeRef = useRef(null)
  const titleRef = useRef(null)
  const subtitleRef = useRef(null)
  const inputRef = useRef(null)
  const statsRef = useRef(null)

  useEffect(() => {
    const elements = [badgeRef, titleRef, subtitleRef, inputRef, statsRef]
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

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!prompt.trim()) return
    sessionStorage.setItem('pending_prompt', prompt.trim())
    navigate('/chat')
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background-primary py-24">
      {/* Background layers */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background-primary via-background-primary/95 to-background-primary" />
        <ParticleBackground />
        <div className="absolute inset-0 bg-gradient-radial from-accent/5 via-transparent to-transparent opacity-40" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(rgba(217,119,87,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(217,119,87,0.1) 1px, transparent 1px)',
            backgroundSize: '80px 80px'
          }}
        />
      </div>

      <div className="relative z-10 section-padding pt-20 pb-16 w-full">
        <div className="container-custom text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div ref={badgeRef} className="mb-6 flex flex-col items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/8 border border-accent/15 backdrop-blur-sm shadow-inner-glow">
              <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse-soft" />
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                Introducing Council Mode — 3 models debate, 1 synthesis
              </span>
            </div>
          </div>

          {/* Title */}
          <div ref={titleRef} className="mb-6">
            <h1 className="text-[clamp(2.5rem,5.5vw,5rem)] font-extrabold tracking-[-0.03em] leading-[1.08] text-foreground-primary">
              <span className="font-serif italic font-normal text-foreground-secondary block">Deliberate with the</span>
              <span className="text-gradient-accent block mt-0.5">Council of AI Experts</span>
            </h1>
          </div>

          {/* Subtitle */}
          <p
            ref={subtitleRef}
            className="text-base sm:text-lg text-foreground-muted max-w-xl mx-auto mb-10 leading-relaxed font-light"
          >
            Access 8+ premier models, stream multi-model consensus debates,
            branch timelines, and experience ElevenLabs natural voice responses in a unified platform.
          </p>

          {/* Claude-style Centered Chat Box Input */}
          <div ref={inputRef} className="max-w-2xl mx-auto mb-16 w-full px-2">
            <form onSubmit={handleSubmit} className="relative bg-background-elevated border border-border-subtle rounded-2xl p-2.5 shadow-md focus-within:border-accent transition-all duration-300">
              <div className="flex items-end gap-2.5">
                <button type="button" className="p-2.5 rounded-xl hover:bg-background-secondary text-foreground-muted transition-colors flex-shrink-0" title="Attach file">
                  <Paperclip className="w-5 h-5" />
                </button>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                  placeholder="Ask the Council to debug code, write a paper, or resolve a debate..."
                  rows={2}
                  className="flex-1 bg-transparent text-foreground-primary text-sm sm:text-base resize-none py-2 focus:outline-none min-h-[50px] max-h-32"
                />
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className="p-3 rounded-xl bg-accent text-white hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0 shadow-sm"
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </div>
            </form>
            <div className="flex justify-center items-center gap-2 mt-3">
              <span className="text-xs text-foreground-muted">Or try suggestions:</span>
              {['Compare React & Vue routing', 'Write a clean fast fetch wrapper'].map((s) => (
                <button
                  key={s}
                  onClick={() => setPrompt(s)}
                  className="text-xs text-accent hover:underline bg-accent/5 px-2 py-0.5 rounded-md border border-accent/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Stats cards */}
          <div
            ref={statsRef}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {[
              { value: '8+', label: 'AI Providers', icon: Cpu },
              { value: '3-Model', label: 'Council Debates', icon: Sparkles },
              { value: 'Free', label: 'Unlimited TTS', icon: Mic },
              { value: '100% Real', label: 'Timeline Branching', icon: Zap },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="bg-background-secondary border border-border-subtle p-5 rounded-2xl text-center hover:border-accent/30 transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center mx-auto mb-3 group-hover:bg-accent/10 transition-colors">
                  <stat.icon className="w-5 h-5 text-accent" />
                </div>
                <div className="text-xl font-bold text-foreground-primary mb-0.5">
                  {stat.value}
                </div>
                <div className="text-xs text-foreground-secondary">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background-primary to-transparent z-10 pointer-events-none" />
    </section>
  )
}
