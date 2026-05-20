import { Link } from 'react-router-dom'
import { ArrowRight, Zap, MessageSquare } from 'lucide-react'

export default function CTASection() {
  return (
    <section className="section-padding py-24 lg:py-32">
      <div className="container-custom">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-accent/15 via-accent/5 to-background-secondary border border-accent/10 p-10 md:p-16 lg:p-20 text-center">
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8">
              <MessageSquare className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Free forever tier available</span>
            </div>

            <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-bold tracking-tight leading-[1.1] mb-6">
              Ready to experience{' '}
              <span className="text-gradient-accent">the future</span>{' '}
              of AI chat?
            </h2>
            <p className="text-lg text-foreground-muted mb-10 leading-relaxed max-w-lg mx-auto">
              Join thousands of power users who have already made the switch. 
              Start free, no credit card required.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/auth/signup" className="btn-primary text-base px-8 py-4 rounded-xl">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/contact" className="btn-secondary text-base px-8 py-4 rounded-xl">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
