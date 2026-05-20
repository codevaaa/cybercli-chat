import { Briefcase, MapPin, DollarSign, ArrowRight } from 'lucide-react'

const OPEN_ROLES = [
  { title: 'Senior Full-Stack Engineer', location: 'Remote', type: 'Full-time', salary: '$120K - $180K' },
  { title: 'AI/ML Engineer', location: 'Remote', type: 'Full-time', salary: '$130K - $200K' },
  { title: 'Product Designer', location: 'Remote', type: 'Full-time', salary: '$100K - $150K' },
  { title: 'DevOps Engineer', location: 'Remote', type: 'Full-time', salary: '$110K - $170K' },
]

const BENEFITS = [
  'Competitive salary + equity',
  'Fully remote, async-friendly',
  'Unlimited PTO (with minimum)',
  'AI tool budget ($500/month)',
  'Health, dental, vision',
  'Learning & conference stipend',
]

export default function CareersPage() {
  return (
    <div className="pt-28 pb-20">
      <div className="section-padding mb-16">
        <div className="container-custom text-center">
          <span className="text-sm font-medium text-accent tracking-wide uppercase mb-4 block">Careers</span>
          <h1 className="text-h1 mb-5">Join the <span className="text-gradient-accent">team</span></h1>
          <p className="text-body-lg text-foreground-muted max-w-2xl mx-auto">
            We are a small, ambitious team building the future of AI interaction. Come make an impact.
          </p>
        </div>
      </div>

      <div className="section-padding">
        <div className="container-custom">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <h2 className="text-h3 mb-6">Open Positions</h2>
              <div className="space-y-4">
                {OPEN_ROLES.map((role) => (
                  <div key={role.title} className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-foreground-primary mb-2">{role.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-foreground-muted">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{role.location}</span>
                        <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{role.type}</span>
                        <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{role.salary}</span>
                      </div>
                    </div>
                    <button className="btn-secondary text-sm whitespace-nowrap">
                      Apply Now <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-h3 mb-6">Benefits</h2>
              <div className="card p-6">
                <ul className="space-y-4">
                  {BENEFITS.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3 text-sm text-foreground-secondary">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 shadow-[0_0_8px_rgba(217,119,87,0.3)]" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
