import { motion } from 'framer-motion'
import { Shield, Zap, Globe, Heart, Users, Code, Lock, Cpu } from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'

const VALUES = [
  {
    icon: Shield,
    title: 'Security First',
    desc: 'Every feature, every API call, every data point is designed with zero-trust principles. We\'re cybersecurity people building AI — security is not an afterthought.',
    gradient: 'from-violet-600 to-indigo-600',
  },
  {
    icon: Globe,
    title: 'Democratized Intelligence',
    desc: 'Enterprise-grade AI should not require an enterprise budget. We unite 8+ free AI providers under one roof so every researcher, developer, and analyst has the same power.',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: Code,
    title: 'Radical Transparency',
    desc: 'We show you which model answered, its confidence score, its reasoning chain, and which provider served the request. No black boxes.',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Heart,
    title: 'Community Driven',
    desc: 'We build in public. Feature requests from our community become roadmap priorities. Your feedback shapes the future of CyberCli Chat.',
    gradient: 'from-pink-500 to-rose-500',
  },
]

const TEAM = [
  {
    initials: 'CP',
    name: 'Chandan Pandey',
    role: 'Founder & CEO',
    bg: 'from-violet-600 to-indigo-700',
    badges: ['Cybersecurity', 'Ethical Hacking', 'AI Engineering'],
  },
  {
    initials: 'AI',
    name: 'AI Research Team',
    role: 'Model Engineering',
    bg: 'from-orange-500 to-red-600',
    badges: ['LLM Integration', 'Gateway Architecture', 'Benchmarking'],
  },
  {
    initials: 'SE',
    name: 'Security Engineers',
    role: 'Infrastructure Security',
    bg: 'from-emerald-500 to-teal-600',
    badges: ['Penetration Testing', 'Zero Trust', 'SIEM'],
  },
]

export default function AboutPage() {
  return (
    <div className="pt-28 pb-20 bg-[#0A0A0F]">
      {/* Hero Section */}
      <section className="section-padding mb-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-violet-600/10 rounded-full blur-[120px]" />
        </div>
        <div className="container-custom text-center relative z-10 max-w-4xl mx-auto">
          <ScrollReveal>
            <span className="inline-block text-xs font-semibold text-accent tracking-widest uppercase mb-5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
              About CyberMindCLI
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold tracking-tight leading-[1.1] mb-6">
              Built by a{' '}
              <span
                className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent"
                style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                cybersecurity researcher
              </span>{' '}
              who got tired of paying for AI
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <p className="text-lg text-foreground-muted max-w-2xl mx-auto leading-relaxed">
              CyberCli Chat was born from a conviction that intelligence tools should be free,
              transparent, and powerful — not locked behind paywalls or surveillance capitalism.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Founder Spotlight */}
      <section className="section-padding mb-24">
        <div className="container-custom">
          <ScrollReveal>
            <div className="relative rounded-3xl overflow-hidden border border-white/[0.06] bg-[#0D0D14]">
              {/* Gradient orb */}
              <div className="absolute -top-24 -left-24 w-96 h-96 bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

              <div className="relative z-10 p-8 md:p-14 grid md:grid-cols-[auto_1fr] gap-10 md:gap-14 items-start">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-4">
                  <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-[0_0_60px_rgba(124,58,237,0.4)]">
                    <span className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">CP</span>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-white">Chandan Pandey</p>
                    <p className="text-sm text-violet-400 font-medium">Founder & CEO</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center max-w-[180px]">
                    {['Cybersecurity', 'Ethical Hacker', 'Tool Creator', 'AI Engineer'].map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-accent tracking-widest uppercase">Founder Spotlight</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                    The Architect of CyberMindCLI
                  </h2>
                  <div className="space-y-4 text-[15px] leading-[1.8] text-[#9CA3AF]">
                    <p>
                      Chandan Pandey is a cybersecurity researcher, ethical hacker, and tool creator with deep
                      expertise in both offensive and defensive security methodologies. He has engineered multiple
                      cybersecurity tools used across penetration testing, vulnerability assessment, network
                      reconnaissance, and digital forensics.
                    </p>
                    <p>
                      As the founder of <span className="text-violet-400 font-medium">CyberMindCLI</span>{' '}
                      (<a
                        href="https://cybermindcli.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
                      >
                        cybermindcli.com
                      </a>
                      ), Chandan's vision is to democratize access to advanced AI and security intelligence
                      tools — making enterprise-grade capabilities available to every researcher, analyst,
                      and developer.
                    </p>
                    <p>
                      <span className="text-white font-medium">CyberCli Chat</span> is the flagship AI product
                      of CyberMindCLI, combining 8+ AI providers, a unified intelligent gateway, voice
                      conversation, and advanced multi-model council mode into one powerful platform. It represents
                      the belief that access to the most capable AI tools should never be gated by geography,
                      budget, or institutional affiliation.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    {[
                      { label: 'Security Tools Built', value: '20+' },
                      { label: 'AI Providers Integrated', value: '8+' },
                      { label: 'Models Available', value: '200K+' },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06] text-center">
                        <div className="text-xl font-bold text-white">{stat.value}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Mission */}
      <section className="section-padding mb-24">
        <div className="container-custom max-w-4xl text-center">
          <ScrollReveal>
            <span className="text-xs font-semibold text-accent tracking-widest uppercase mb-4 block">Our Mission</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Democratize the{' '}
              <span
                className="bg-gradient-to-r from-orange-400 to-violet-400 bg-clip-text text-transparent"
                style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                intelligence layer
              </span>
            </h2>
            <p className="text-lg text-[#9CA3AF] leading-relaxed">
              We exist at the intersection of cybersecurity and artificial intelligence. Our mission
              is simple: build the most capable, transparent, and accessible AI platform on the planet —
              where every researcher, developer, and security professional can harness the full power of
              modern AI without compromise.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Values Grid */}
      <section className="section-padding mb-24">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="text-xs font-semibold text-accent tracking-widest uppercase mb-4 block">What We Stand For</span>
              <h2 className="text-3xl md:text-4xl font-bold text-white">Our core values</h2>
            </div>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {VALUES.map((val, i) => (
              <ScrollReveal key={val.title} delay={i * 0.08}>
                <div className="group relative rounded-2xl border border-white/[0.06] bg-[#0D0D14] p-6 h-full transition-all duration-500 hover:border-white/[0.12] hover:-translate-y-1">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${val.gradient} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:rotate-[10deg]`}>
                    <val.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{val.title}</h3>
                  <p className="text-sm text-[#9CA3AF] leading-relaxed">{val.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="section-padding mb-16">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="text-xs font-semibold text-accent tracking-widest uppercase mb-4 block">The Team</span>
              <h2 className="text-3xl md:text-4xl font-bold text-white">People behind the platform</h2>
            </div>
          </ScrollReveal>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {TEAM.map((member, i) => (
              <ScrollReveal key={member.name} delay={i * 0.1}>
                <div className="group rounded-2xl border border-white/[0.06] bg-[#0D0D14] p-6 text-center hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-1">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${member.bg} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                    <span className="text-2xl font-extrabold text-white">{member.initials}</span>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">{member.name}</h3>
                  <p className="text-sm text-violet-400 mb-3">{member.role}</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {member.badges.map((badge) => (
                      <span key={badge} className="text-xs px-2 py-0.5 rounded-full bg-white/[0.04] text-gray-400 border border-white/[0.06]">
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding">
        <div className="container-custom max-w-2xl text-center">
          <ScrollReveal>
            <div className="rounded-3xl border border-white/[0.06] bg-gradient-to-br from-violet-900/20 to-indigo-900/10 p-12">
              <h2 className="text-3xl font-bold text-white mb-4">Ready to experience it?</h2>
              <p className="text-[#9CA3AF] mb-8">
                Join thousands of researchers, developers, and security professionals already using CyberCli Chat.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <a href="/auth/signup" className="btn-primary">
                  Get Started Free
                </a>
                <a href="/contact" className="btn-secondary">
                  Contact the Team
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
