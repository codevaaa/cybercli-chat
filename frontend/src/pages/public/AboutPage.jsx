import { Target, Heart, Shield, Zap } from 'lucide-react'

const VALUES = [
  { icon: Target, title: 'Truth First', desc: 'We believe AI should tell you the truth, not the version that passed corporate review. Our uncensored model access comes with ethical guardrails, not censorship.' },
  { icon: Heart, title: 'User Ownership', desc: 'Your data, your conversations, your choice. Export everything. Delete everything. We do not train on your data.' },
  { icon: Shield, title: 'Privacy by Design', desc: 'Local model inference via WebGPU. End-to-end encryption. Zero-logging policy. Your privacy is not an afterthought.' },
  { icon: Zap, title: 'Speed & Access', desc: 'Free tier that actually works. No artificial limits. We route to the best available free model so you never pay for what you do not need.' },
]

const TEAM = [
  { name: 'Founder', role: 'CEO & Product', initials: 'FC' },
  { name: 'Lead Engineer', role: 'Backend & AI Gateway', initials: 'LE' },
  { name: 'Design Lead', role: 'UX & Frontend', initials: 'DL' },
  { name: 'DevOps Lead', role: 'Infrastructure & Security', initials: 'DL' },
]

export default function AboutPage() {
  return (
    <div className="pt-28 pb-20">
      <div className="section-padding mb-16">
        <div className="container-custom">
          <span className="text-sm font-medium text-accent tracking-wide uppercase mb-4 block">About</span>
          <h1 className="text-h1 mb-5">Our <span className="text-gradient-accent">mission</span></h1>
          <p className="text-body-lg text-foreground-muted max-w-3xl leading-relaxed mb-12">
            CyberCli was born from a simple belief: AI should be powerful, accessible, and honest. 
            We are building the platform we wished existed — one that combines every major AI provider, 
            respects your privacy, and gives you tools that the big platforms still refuse to build.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-20">
            {VALUES.map((v) => (
              <div key={v.title} className="card p-7">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(217,119,87,0.2)]">
                  <v.icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground-primary mb-2">{v.title}</h3>
                <p className="text-sm text-foreground-muted leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>

          <h2 className="text-h2 mb-8">The Team</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM.map((member) => (
              <div key={member.name} className="card p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(217,119,87,0.2)]">
                  <span className="text-lg font-bold text-accent">{member.initials}</span>
                </div>
                <h3 className="text-base font-semibold text-foreground-primary mb-1">{member.name}</h3>
                <p className="text-sm text-foreground-muted">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
