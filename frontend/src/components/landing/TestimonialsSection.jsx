import { useEffect, useRef } from 'react'
import { Quote } from 'lucide-react'
import { TESTIMONIALS } from '@lib/constants'

export default function TestimonialsSection() {
  const sectionRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cards = entry.target.querySelectorAll('.testimonial-card')
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
    <section ref={sectionRef} className="section-padding py-24 lg:py-32 border-y border-border-subtle">
      <div className="container-custom">
        <div className="text-center mb-16">
          <span className="text-sm font-medium text-accent tracking-wide uppercase mb-4 block">
            Testimonials
          </span>
          <h2 className="text-h2 mb-5">
            Loved by <span className="text-gradient-accent">power users</span>
          </h2>
          <p className="text-body-lg text-foreground-muted max-w-2xl mx-auto">
            From researchers to developers to creative professionals, 
            people are switching to CyberCli for good.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {TESTIMONIALS.map((testimonial, i) => (
            <div
              key={testimonial.author}
              className="testimonial-card card p-7 gpu-accelerate"
              style={{
                opacity: 0,
                transform: 'translateY(40px)',
                transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 150}ms`,
              }}
            >
              <Quote className="w-8 h-8 text-accent/20 mb-5" />
              <p className="text-foreground-secondary text-sm leading-relaxed mb-6 italic">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-accent">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground-primary">
                    {testimonial.author}
                  </div>
                  <div className="text-xs text-foreground-muted">
                    {testimonial.role}{testimonial.company ? `, ${testimonial.company}` : ''}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
