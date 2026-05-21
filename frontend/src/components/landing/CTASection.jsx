import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import ScrollReveal from '@components/ui/ScrollReveal'

export default function CTASection() {
  return (
    <section className="section-padding py-24 lg:py-32 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full blur-[140px] opacity-20"
          style={{ background: 'radial-gradient(ellipse, #D97757 0%, #B85D3D 50%, transparent 100%)' }}
        />
      </div>

      <div className="container-custom relative z-10">
        {/* Gradient border card */}
        <div
          className="relative rounded-[2rem] p-px overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(217,119,87,0.35) 0%, rgba(184,93,61,0.2) 40%, rgba(255,255,255,0.05) 100%)',
          }}
        >
          {/* Inner card */}
          <div className="relative rounded-[calc(2rem-1px)] bg-[#0D0D14] p-12 md:p-20 text-center overflow-hidden">
            {/* Animated orb behind text */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full blur-[100px] pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, rgba(217,119,87,0.18) 0%, rgba(184,93,61,0.1) 60%, transparent 100%)' }}
              animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative z-10 max-w-2xl mx-auto">
              {/* Pill badge */}
              <ScrollReveal direction="up" delay={0}>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-medium text-accent">Free forever tier — no credit card needed</span>
                </div>
              </ScrollReveal>

              {/* Serif headline */}
              <ScrollReveal direction="up" delay={0.08}>
                <h2
                  className="font-serif italic text-[clamp(2.2rem,5vw,4rem)] font-normal leading-[1.1] text-white mb-4"
                >
                  Start thinking with
                  <br />
                  <span
                    className="not-italic font-extrabold"
                    style={{
                      background: 'linear-gradient(135deg, #F4A37A 0%, #D97757 45%, #C4613A 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    the Council
                  </span>
                </h2>
              </ScrollReveal>

              {/* Subtitle */}
              <ScrollReveal direction="up" delay={0.14}>
                <p className="text-base sm:text-lg text-[#9CA3AF] mb-10 leading-relaxed max-w-lg mx-auto">
                  Access 8+ AI models, stream multi-model debates, and branch conversations
                  — all completely free. No limits on the ideas that matter.
                </p>
              </ScrollReveal>

              {/* CTA Buttons */}
              <ScrollReveal direction="up" delay={0.2}>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                    <Link
                      to="/auth/signup"
                      className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl font-semibold text-white text-base"
                      style={{
                        background: 'linear-gradient(135deg, #D97757 0%, #C4613A 100%)',
                        boxShadow: '0 8px 32px rgba(217,119,87,0.35)',
                      }}
                    >
                      Get started free
                      <ArrowRight className="w-4.5 h-4.5" />
                    </Link>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      to="/docs"
                      className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl font-semibold text-white text-base border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/[0.2] transition-all duration-300"
                    >
                      <BookOpen className="w-4 h-4 text-accent" />
                      Read the docs
                    </Link>
                  </motion.div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
