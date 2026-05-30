import { motion } from 'framer-motion'
import { MapPin, Clock, DollarSign, Briefcase, ArrowRight, Users, Zap, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import ScrollReveal from '@components/ui/ScrollReveal'
import SEOHead from '@components/seo/SEOHead'

const OPEN_ROLES = [
  {
    title: 'Senior Frontend Engineer',
    team: 'Engineering',
    type: 'Full-time',
    location: 'Remote',
    salary: '$80K–$120K',
    color: '#D97757',
    desc: 'Lead the development of Codeva\'s React/Vite frontend. Expertise in Framer Motion, TailwindCSS, and SSE streaming required.',
    skills: ['React', 'TypeScript', 'Framer Motion', 'TailwindCSS'],
  },
  {
    title: 'AI/ML Engineer',
    team: 'AI Gateway',
    type: 'Full-time',
    location: 'Remote',
    salary: '$100K–$150K',
    color: '#D97757',
    desc: 'Design and optimize our multi-provider LLM routing system. Work on Council Mode inference, embedding pipelines, and fine-tuning.',
    skills: ['Python', 'LangChain', 'Node.js', 'Vector DBs'],
  },
  {
    title: 'Cybersecurity Researcher',
    team: 'Security',
    type: 'Contract/Full-time',
    location: 'Remote',
    salary: '$70K–$110K',
    color: '#06B6D4',
    desc: 'Conduct security research, write technical blog content, develop internal security tooling, and help shape our threat intelligence capabilities.',
    skills: ['Penetration Testing', 'OSINT', 'Python', 'CVE Research'],
  },
  {
    title: 'DevOps & Infrastructure Engineer',
    team: 'Infrastructure',
    type: 'Full-time',
    location: 'Remote',
    salary: '$90K–$130K',
    color: '#10B981',
    desc: 'Own our Render + Vercel deployment pipeline, MongoDB Atlas operations, Supabase administration, and CI/CD automation.',
    skills: ['Docker', 'GitHub Actions', 'MongoDB', 'Redis'],
  },
]

const BENEFITS = [
  { icon: DollarSign, title: 'Competitive Pay', desc: 'Market-rate salaries with equity available for full-time roles' },
  { icon: Heart, title: 'Health & Wellness', desc: 'Health coverage and mental wellness stipend' },
  { icon: Users, title: 'Remote-First', desc: 'Work from anywhere. No mandatory office hours ever.' },
  { icon: Zap, title: 'Equipment Allowance', desc: '$1,500 annual equipment and software allowance' },
]

export default function CareersPage() {
  return (
    <div className="pt-28 pb-20">
      {/* Header */}
      <div className="section-padding mb-16">
        <div className="container-custom">
          <ScrollReveal>
            <span className="text-sm font-medium text-accent tracking-widest uppercase mb-4 block">Careers</span>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h1 className="text-5xl sm:text-6xl font-serif font-light text-foreground-primary mb-5">
              Build the future of AI<br />
              <span className="text-gradient-accent italic">with us</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <p className="text-lg text-foreground-muted max-w-2xl leading-relaxed">
              Codeva is a small, remote-first team building tools that matter. We move fast,
              care deeply about security and privacy, and believe that the best products come from people
              who are also users of what they build.
            </p>
          </ScrollReveal>
        </div>
      </div>

      {/* Benefits */}
      <div className="section-padding mb-20">
        <div className="container-custom">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {BENEFITS.map((benefit, i) => (
              <ScrollReveal key={benefit.title} delay={i * 0.08}>
                <div className="card-glass p-6">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center mb-4">
                    <benefit.icon className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground-primary mb-1">{benefit.title}</h3>
                  <p className="text-xs text-foreground-muted leading-relaxed">{benefit.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>

      {/* Open Roles */}
      <div className="section-padding">
        <div className="container-custom">
          <ScrollReveal>
            <h2 className="text-3xl font-serif font-light text-foreground-primary mb-10">Open Positions</h2>
          </ScrollReveal>
          <div className="space-y-5">
            {OPEN_ROLES.map((role, i) => (
              <ScrollReveal key={role.title} delay={i * 0.08}>
                <motion.div
                  className="card-glass p-7 group"
                  whileHover={{ y: -3, borderColor: `${role.color}30` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                          style={{ color: role.color, borderColor: `${role.color}40`, background: `${role.color}12` }}>
                          {role.team}
                        </span>
                        <span className="text-xs text-foreground-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />{role.type}
                        </span>
                        <span className="text-xs text-foreground-muted flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{role.location}
                        </span>
                        <span className="text-xs text-foreground-muted flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />{role.salary}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground-primary mb-2 group-hover:text-accent transition-colors">{role.title}</h3>
                      <p className="text-sm text-foreground-muted leading-relaxed mb-4">{role.desc}</p>
                      <div className="flex flex-wrap gap-2">
                        {role.skills.map(skill => (
                          <span key={skill} className="text-xs px-2.5 py-1 rounded-md bg-background-secondary border border-border-subtle text-foreground-muted">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Link
                      to="/contact"
                      className="btn-secondary text-sm whitespace-nowrap flex items-center gap-2 flex-shrink-0"
                    >
                      Apply now <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={0.2}>
            <div className="mt-12 text-center card-glass p-10 max-w-2xl mx-auto">
              <h3 className="text-xl font-semibold text-foreground-primary mb-2">Don't see your role?</h3>
              <p className="text-sm text-foreground-muted mb-6">We're always looking for exceptional people. Send us a note about what you'd love to work on.</p>
              <Link to="/contact" className="btn-primary inline-flex">
                Get in touch <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  )
}
