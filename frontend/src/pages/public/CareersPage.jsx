import { motion } from 'framer-motion'
import { MapPin, Clock, ArrowRight, Briefcase, Globe, Zap, Shield, Code } from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'

const JOBS = [
  {
    id: 1,
    title: 'Senior Frontend Engineer',
    department: 'Engineering',
    location: 'Remote (Worldwide)',
    type: 'Full-time',
    icon: Code,
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.2)',
    desc: 'Build pixel-perfect, performant React interfaces with Framer Motion animations and TailwindCSS. Own the UX of CyberCli Chat\'s core product.',
    requirements: ['React 19 + TypeScript', 'Framer Motion / GSAP', 'TailwindCSS v4', 'Performance optimization', 'WebSockets / SSE streaming'],
  },
  {
    id: 2,
    title: 'AI/ML Engineer',
    department: 'AI Research',
    location: 'Remote (Worldwide)',
    type: 'Full-time',
    icon: Zap,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    desc: 'Design and maintain the AI Gateway that routes 200K+ models. Research Council Mode consensus algorithms. Optimize inference pipelines for latency and cost.',
    requirements: ['LLM API integrations', 'Node.js / Python', 'Vector databases (pgvector, Pinecone)', 'Prompt engineering', 'Benchmarking & eval frameworks'],
  },
  {
    id: 3,
    title: 'Security Researcher',
    department: 'Security',
    location: 'Remote (Worldwide)',
    type: 'Full-time',
    icon: Shield,
    color: '#10B981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    desc: 'Conduct penetration testing, threat modeling, and vulnerability research. Help build security tooling that our users rely on. Write technical research for our blog.',
    requirements: ['Penetration testing (OSCP/PNPT preferred)', 'Web application security', 'OSINT & reconnaissance', 'CVE research & disclosure', 'Security tool development'],
  },
  {
    id: 4,
    title: 'DevOps / Platform Engineer',
    department: 'Infrastructure',
    location: 'Remote (Worldwide)',
    type: 'Full-time',
    icon: Globe,
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.2)',
    desc: 'Own the infrastructure powering CyberCli Chat\'s backend on Render, Netlify, and Supabase. Implement zero-downtime deployments, monitoring, and observability.',
    requirements: ['Docker / Kubernetes', 'CI/CD (GitHub Actions)', 'Render / Railway / Fly.io', 'PostgreSQL + MongoDB Atlas', 'Observability (Grafana, Loki, OpenTelemetry)'],
  },
]

const VALUES = [
  { title: 'Remote-first, async by default', icon: '🌍' },
  { title: 'Competitive salary + equity', icon: '💰' },
  { title: 'Learning & conference budget', icon: '📚' },
  { title: 'Flexible working hours', icon: '🕐' },
  { title: 'Health & wellness stipend', icon: '🏃' },
  { title: 'Top-tier hardware setup', icon: '💻' },
]

export default function CareersPage() {
  return (
    <div className="pt-28 pb-20 bg-[#0A0A0F]">
      {/* Hero */}
      <section className="section-padding mb-20 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-[500px] h-[300px] bg-violet-600/8 rounded-full blur-[100px]" />
        </div>
        <div className="container-custom text-center relative z-10 max-w-3xl mx-auto">
          <ScrollReveal>
            <span className="inline-block text-xs font-semibold text-accent tracking-widest uppercase mb-5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
              Careers
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <h1 className="text-[clamp(2.2rem,5vw,4rem)] font-extrabold tracking-tight leading-[1.1] text-white mb-5">
              Build the future of{' '}
              <span
                className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent"
                style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                AI security
              </span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <p className="text-lg text-[#9CA3AF] leading-relaxed">
              We are a small, talented team building something the world needs. Join us at the
              intersection of cybersecurity and artificial intelligence.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Benefits */}
      <section className="section-padding mb-20">
        <div className="container-custom">
          <ScrollReveal>
            <h2 className="text-2xl font-bold text-white text-center mb-10">Why join CyberMindCLI?</h2>
          </ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {VALUES.map((v, i) => (
              <ScrollReveal key={v.title} delay={i * 0.07}>
                <div className="rounded-xl border border-white/[0.06] bg-[#0D0D14] p-4 flex items-center gap-3">
                  <span className="text-2xl">{v.icon}</span>
                  <span className="text-sm text-[#9CA3AF]">{v.title}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="section-padding">
        <div className="container-custom">
          <ScrollReveal>
            <h2 className="text-2xl font-bold text-white mb-2">Open Positions</h2>
            <p className="text-sm text-[#6B7280] mb-10">4 roles · All Remote</p>
          </ScrollReveal>

          <div className="space-y-4 max-w-4xl">
            {JOBS.map((job, i) => (
              <ScrollReveal key={job.id} delay={i * 0.1}>
                <motion.div
                  className="group rounded-2xl border border-white/[0.06] bg-[#0D0D14] p-6 md:p-8"
                  whileHover={{
                    borderColor: job.border,
                    boxShadow: `0 0 30px ${job.bg}`,
                    transition: { duration: 0.3 },
                  }}
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-5">
                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: job.bg, border: `1px solid ${job.border}` }}
                    >
                      <job.icon className="w-6 h-6" style={{ color: job.color }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-white group-hover:text-white/90">{job.title}</h3>
                          <div className="flex flex-wrap gap-3 mt-1.5">
                            <span
                              className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                              style={{ color: job.color, background: job.bg, border: `1px solid ${job.border}` }}
                            >
                              {job.department}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-[#6B7280]">
                              <MapPin className="w-3 h-3" />
                              {job.location}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-[#6B7280]">
                              <Clock className="w-3 h-3" />
                              {job.type}
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-[#9CA3AF] leading-relaxed mb-4">{job.desc}</p>

                      <div className="flex flex-wrap gap-2 mb-5">
                        {job.requirements.map(req => (
                          <span key={req} className="text-xs px-2.5 py-1 rounded-full bg-white/[0.04] text-[#6B7280] border border-white/[0.06]">
                            {req}
                          </span>
                        ))}
                      </div>

                      <motion.a
                        href={`mailto:careers@cybermindcli.com?subject=Application: ${encodeURIComponent(job.title)}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-all duration-300"
                        style={{ background: job.bg, border: `1px solid ${job.border}`, color: job.color }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Apply for this role
                        <ArrowRight className="w-4 h-4" />
                      </motion.a>
                    </div>
                  </div>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={0.5}>
            <div className="mt-10 max-w-4xl p-6 rounded-2xl border border-white/[0.06] bg-[#0D0D14] flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white mb-1">Don't see your role?</p>
                <p className="text-sm text-[#6B7280]">We always want to hear from exceptional people. Send us your story.</p>
              </div>
              <a
                href="mailto:hello@cybermindcli.com?subject=Open Application"
                className="btn-secondary whitespace-nowrap flex-shrink-0"
              >
                Open Application
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
