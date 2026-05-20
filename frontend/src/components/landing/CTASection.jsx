import { Link } from 'react-router-dom'
import { ArrowRight, Zap } from 'lucide-react'

export default function CTASection() {
  return (
    <section className="section-padding py-24 lg:py-32">
      <div className="container-custom">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent/20 via-accent/5 to-background-secondary border border-accent/10 p-10 md:p-16 lg:p-20 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--accent)_0%,_transparent_50%)] opacity-10" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-8">
              <Zap className="w-7 h-7 text-accent" />
            </div>

            <h2 className="text-h2 mb-5">
              Ready to experience <span className="text-gradient-accent">the future</span> of AI chat?
            </h2>
            <p className="text-body-lg text-foreground-muted mb-10 leading-relaxed">
              Join thousands of power users who have already made the switch. 
              Start free, no credit card required.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth/signup" className="btn-primary text-base px-8 py-4">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/contact" className="btn-secondary text-base px-8 py-4">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
