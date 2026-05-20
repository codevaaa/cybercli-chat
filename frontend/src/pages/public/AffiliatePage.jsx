import { DollarSign, Users, TrendingUp, ArrowRight } from 'lucide-react'

const STEPS = [
  { num: '01', title: 'Sign Up', desc: 'Create your free affiliate account in 30 seconds.' },
  { num: '02', title: 'Share', desc: 'Share your unique referral link with your audience.' },
  { num: '03', title: 'Earn', desc: 'Earn 30% recurring commission on every paid referral.' },
]

export default function AffiliatePage() {
  return (
    <div className="pt-28 pb-20">
      <div className="section-padding mb-16">
        <div className="container-custom text-center">
          <span className="text-sm font-medium text-accent tracking-wide uppercase mb-4 block">Affiliate Program</span>
          <h1 className="text-h1 mb-5">Earn <span className="text-gradient-accent">30% recurring</span></h1>
          <p className="text-body-lg text-foreground-muted max-w-2xl mx-auto">
            Share CyberCli with your audience and earn 30% recurring commission for every paying customer you refer.
          </p>
        </div>
      </div>

      <div className="section-padding">
        <div className="container-custom">
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {[
              { icon: DollarSign, stat: '30%', label: 'Recurring Commission' },
              { icon: Users, stat: '$120', label: 'Avg. Monthly Earnings' },
              { icon: TrendingUp, stat: '90d', label: 'Cookie Duration' },
            ].map((item) => (
              <div key={item.label} className="card p-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(217,119,87,0.2)]">
                  <item.icon className="w-6 h-6 text-accent" />
                </div>
                <div className="text-3xl font-bold text-foreground-primary mb-2">{item.stat}</div>
                <div className="text-sm text-foreground-muted">{item.label}</div>
              </div>
            ))}
          </div>

          <h2 className="text-h3 mb-8 text-center">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            {STEPS.map((step) => (
              <div key={step.num} className="card p-6 text-center">
                <div className="text-4xl font-bold text-accent/20 mb-4">{step.num}</div>
                <h3 className="text-lg font-semibold text-foreground-primary mb-2">{step.title}</h3>
                <p className="text-sm text-foreground-muted">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button className="btn-primary text-base px-8 py-4">
              Become an Affiliate <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
