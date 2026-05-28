import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Shield, Target, Heart, Zap, Globe, Award, Code2, Lock, Github } from 'lucide-react'
import ScrollReveal, { ScrollRevealGroup } from '@components/ui/ScrollReveal'
import SEOHead, { StructuredData } from '@components/seo/SEOHead'
import { useAuthStore } from '@stores/authStore.js'

const VALUES = [
  {
    icon: Target,
    title: 'Truth First',
    desc: 'We believe AI should tell you the truth, not the version that passed corporate review. Our uncensored model access comes with ethical guardrails, not censorship.',
    color: '#D97757',
  },
  {
    icon: Heart,
    title: 'User Ownership',
    desc: 'Your data, your conversations, your choice. Export everything. Delete everything. We do not train on your data. Ever.',
    color: '#D97757',
  },
  {
    icon: Lock,
    title: 'Privacy by Design',
    desc: 'End-to-end encrypted conversations. Zero-logging policy. Your intelligence belongs to you — not to advertisers, not to our servers.',
    color: '#06B6D4',
  },
  {
    icon: Zap,
    title: 'Speed & Access',
    desc: 'Free tier that actually works. We route to the best available free model so you never pay for what you do not need. 8+ providers, zero lock-in.',
    color: '#10B981',
  },
]

const TEAM = [
  {
    name: 'Chandan Pandey',
    role: 'Founder & CEO',
    image: '/chandan.jpeg',
    bio: 'Cybersecurity researcher and AI pioneer. Founder of CyberMindCLI, driving the vision of secure, private, and open artificial intelligence.',
    socials: {
      globe: 'https://cybermindcli.com',
      github: 'https://github.com/thecnical',
    }
  },
  {
    name: 'Rishab Thakur',
    role: 'Co-Founder & CTO',
    image: '/Rishab_thakur.jpeg',
    bio: 'Full-stack systems architect and distributed computing expert. Directing the high-performance AI gateway orchestration cluster.',
    socials: {
      github: 'https://github.com',
    }
  }
]

const STATS = [
  { label: 'AI Providers', value: '8+' },
  { label: 'Models Available', value: '200K+' },
  { label: 'Security Tools Built', value: '15+' },
  { label: 'Uptime SLA', value: '99.9%' },
]

const TIMELINE_MILESTONES = [
  {
    year: 'Early 2024',
    title: 'The Genesis',
    desc: 'Founder Chandan Pandey starts building CyberMindCLI as a local Python-based CLI framework to automate threat intelligence gathering and local vulnerability analysis.',
    tags: ['CLI Core', 'Local Dev', 'Security Automation'],
  },
  {
    year: 'Mid 2024',
    title: 'Gateway Architecture',
    desc: 'Co-Founder & CTO Rishab Thakur joins to architect a highly concurrent, unified routing API gateway. Shift from a purely local CLI to a multi-model SaaS framework leveraging distributed LLM execution nodes.',
    tags: ['API Gateway', 'Multi-Model', 'Supabase Auth'],
  },
  {
    year: 'Early 2025',
    title: 'Web Interface & Beta Launch',
    desc: 'Launch of the CyberCli Chat web app, introducing unique features like Council Mode, conversation branching, and interactive tsParticles backgrounds. The platform scales to 15,000+ developers.',
    tags: ['Vite + React', 'Council Mode', 'UI Overhaul'],
  },
  {
    year: 'Late 2025',
    title: 'Multimodal Voice & Core Optimization',
    desc: 'Integration of real-time audio channels utilizing Gemini Flash TTS and ElevenLabs. Latency decreases to sub-second responses, and local-daemons are integrated into the web client via WebSockets.',
    tags: ['Voice Chat', 'WebSockets', 'Latency Fixes'],
  },
  {
    year: '2026 & Beyond',
    title: 'Support AI Hub & Public Release',
    desc: 'Rollout of the full-stack real-user feedback engine, Claude-style preview drawer for artifacts, and an automated support desk agent. Global expansion of CyberMindCLI across security teams.',
    tags: ['Feedback Loop', 'Help Desk Agent', 'Artifacts Drawer'],
  }
]

export default function AboutPage() {
  const { user } = useAuthStore()
  const personChandan = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Chandan Pandey',
    jobTitle: 'Founder & CEO',
    worksFor: {
      '@type': 'Organization',
      name: 'CyberMindCLI',
      url: 'https://cybermindcli.com'
    },
    image: 'https://cybermindcli.info/chandan.jpeg',
    url: 'https://cybermindcli.com',
    sameAs: [
      'https://github.com/thecnical'
    ]
  }

  const personRishab = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Rishab Thakur',
    jobTitle: 'Co-Founder & CTO',
    worksFor: {
      '@type': 'Organization',
      name: 'CyberMindCLI',
      url: 'https://cybermindcli.com'
    },
    image: 'https://cybermindcli.info/Rishab_thakur.jpeg',
    sameAs: [
      'https://github.com'
    ]
  }

  const structuredData = [
    StructuredData.organization(),
    StructuredData.breadcrumb([
      { name: 'Home', path: '/' },
      { name: 'About', path: '/about' }
    ]),
    personChandan,
    personRishab
  ]

  return (
    <div className="pt-28 pb-20">
      <SEOHead
        title="About Us — Our Team & Mission"
        description="Learn about CyberMindCLI — the team building the next generation of AI chat. Meet our Founder & CEO Chandan Pandey and CTO Rishab Thakur."
        keywords="about CyberMindCLI, AI team, mission, Chandan Pandey, Rishab Thakur, tech startup"
        path="/about"
        structuredData={structuredData}
      />

      {/* ── Hero ── */}
      <div className="section-padding mb-20">
        <div className="container-custom">
          <ScrollReveal>
            <span className="text-sm font-medium text-accent tracking-widest uppercase mb-4 block">About CyberCli</span>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-light text-foreground-primary leading-tight mb-6">
              Built for those who<br />
              <span className="text-gradient-accent italic">demand more</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.16}>
            <p className="text-lg text-foreground-muted max-w-2xl leading-relaxed">
              CyberCli was born from a simple belief: AI should be powerful, accessible, and honest.
              We are building the platform we wished existed — combining every major AI provider,
              respecting your privacy, and giving you tools that the big platforms still refuse to build.
            </p>
          </ScrollReveal>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="section-padding mb-24">
        <div className="container-custom">
          <ScrollReveal>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border-subtle rounded-2xl overflow-hidden">
              {STATS.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="bg-background-secondary p-8 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16,1,0.3,1] }}
                >
                  <div className="text-4xl font-bold text-gradient-accent mb-1">{stat.value}</div>
                  <div className="text-sm text-foreground-muted">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* ── Founder Spotlight ── */}
      <div className="section-padding mb-24">
        <div className="container-custom">
          <ScrollReveal>
            <span className="text-xs font-semibold tracking-widest uppercase text-accent mb-3 block">Founder Spotlight</span>
            <h2 className="text-4xl font-serif font-light text-foreground-primary mb-16">The mind behind CyberCli</h2>
          </ScrollReveal>

          <div className="grid lg:grid-cols-5 gap-12 items-start">
            {/* Left — Photo Card */}
            <ScrollReveal direction="right" className="lg:col-span-2">
              <div className="card-glass p-8 text-center">
                <div className="w-28 h-28 rounded-2xl mx-auto mb-6 overflow-hidden border border-white/10 relative bg-background-tertiary">
                  <motion.img
                    src="/chandan.jpeg"
                    alt="Chandan Pandey"
                    className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-500 scale-100 hover:scale-105"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  />
                </div>
                <h3 className="text-2xl font-semibold text-foreground-primary mb-1">Chandan Pandey</h3>
                <p className="text-accent text-sm font-medium mb-4">Founder & CEO · CyberMindCLI</p>
                <div className="flex flex-wrap gap-2 justify-center mb-6">
                  {['Ethical Hacker', 'Tool Creator', 'AI Researcher', 'Security Engineer'].map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">{tag}</span>
                  ))}
                </div>
                <div className="flex gap-3 justify-center">
                  <a href="https://cybermindcli.com" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-accent transition-colors">
                    <Globe className="w-4 h-4" />
                    cybermindcli.com
                  </a>
                </div>
              </div>
            </ScrollReveal>

            {/* Right — Bio */}
            <ScrollReveal direction="left" delay={0.1} className="lg:col-span-3">
              <div className="space-y-5 text-foreground-secondary leading-relaxed">
                <p className="text-lg">
                  <strong className="text-foreground-primary">Chandan Pandey</strong> is a cybersecurity researcher, ethical hacker,
                  and prolific tool creator with deep expertise spanning both offensive and defensive security methodologies.
                  Over the course of his career, he has engineered more than fifteen cybersecurity tools deployed across
                  penetration testing workflows, vulnerability assessment pipelines, network reconnaissance operations,
                  and digital forensics investigations.
                </p>
                <p>
                  His work in <strong className="text-foreground-primary">offensive security</strong> includes building
                  custom exploitation frameworks, automated reconnaissance tools, payload crafting utilities, and
                  network enumeration engines that are used by security professionals in real-world red team engagements.
                  On the <strong className="text-foreground-primary">defensive side</strong>, Chandan has developed
                  SIEM integration utilities, log correlation engines, threat hunting scripts, and incident response
                  automation tools that help blue teams respond faster and with greater precision.
                </p>
                <p>
                  As the <strong className="text-foreground-primary">Founder of CyberMindCLI</strong> (cybermindcli.com),
                  Chandan's central vision is to democratize access to advanced AI and security intelligence tools —
                  making enterprise-grade capabilities available to every researcher, analyst, student, and developer,
                  regardless of budget or institutional affiliation.
                </p>
                <p>
                  <strong className="text-foreground-primary">CyberCli Chat</strong> is the flagship AI product of
                  CyberMindCLI — combining 8+ AI providers, a unified intelligent routing gateway, voice conversation
                  powered by ElevenLabs and Gemini Flash TTS, multi-model Council Mode debate synthesis, and advanced
                  conversation management into one cohesive, privacy-first platform.
                </p>

                {/* Achievements */}
                <div className="grid sm:grid-cols-3 gap-4 pt-4">
                  {[
                    { icon: Code2, label: '15+ Security Tools', sub: 'Built & maintained' },
                    { icon: Shield, label: 'Offensive + Defensive', sub: 'Full-spectrum security' },
                    { icon: Award, label: 'CyberMindCLI', sub: 'Founder & Visionary' },
                  ].map(({ icon: Icon, label, sub }) => (
                    <div key={label} className="flex items-start gap-3 p-4 rounded-xl bg-background-secondary border border-border-subtle">
                      <Icon className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-foreground-primary">{label}</p>
                        <p className="text-xs text-foreground-muted">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* ── Values ── */}
      <div className="section-padding mb-24">
        <div className="container-custom">
          <ScrollReveal>
            <span className="text-xs font-semibold tracking-widest uppercase text-accent mb-3 block">Our Values</span>
            <h2 className="text-4xl font-serif font-light text-foreground-primary mb-12">What we stand for</h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 gap-5">
            {VALUES.map((v, i) => (
              <ScrollReveal key={v.title} delay={i * 0.08}>
                <motion.div
                  className="card-glass p-7 h-full"
                  whileHover={{ y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${v.color}18`, border: `1px solid ${v.color}30` }}>
                    <v.icon className="w-6 h-6" style={{ color: v.color }} />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground-primary mb-2">{v.title}</h3>
                  <p className="text-sm text-foreground-muted leading-relaxed">{v.desc}</p>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>

      {/* ── Journey Timeline ── */}
      <div className="section-padding mb-24">
        <div className="container-custom">
          <ScrollReveal>
            <span className="text-xs font-semibold tracking-widest uppercase text-accent mb-3 block">Our Evolution</span>
            <h2 className="text-4xl font-serif font-light text-foreground-primary mb-16">The Journey of CyberCli</h2>
          </ScrollReveal>

          <div className="relative max-w-4xl mx-auto py-8">
            {/* Central Line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#7C3AED] via-[#D97757] to-border-subtle transform -translate-x-1/2 opacity-35" />

            <div className="space-y-12">
              {TIMELINE_MILESTONES.map((m, i) => {
                const isEven = i % 2 === 0
                return (
                  <div key={m.title} className="relative flex flex-col md:flex-row items-start md:items-center">
                    {/* Pulsing Node */}
                    <div className="absolute left-4 md:left-1/2 w-4 h-4 rounded-full bg-accent border-2 border-background-primary transform -translate-x-1/2 z-10 shadow-[0_0_10px_rgba(217,119,87,0.8)] animate-pulse" />

                    {/* Left space/card spacer for desktop */}
                    <div className={`w-full md:w-1/2 ${isEven ? 'md:pr-12 md:text-right' : 'md:order-2 md:pl-12 text-left'} pl-12 md:pl-0`}>
                      <ScrollReveal direction={isEven ? 'right' : 'left'} delay={i * 0.1}>
                        <div className="card-glass p-6 hover:border-accent/30 transition-all duration-350 relative group">
                          <span className="text-xs font-bold text-accent tracking-widest block mb-1.5">{m.year}</span>
                          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-accent transition-colors">{m.title}</h3>
                          <p className="text-xs text-foreground-secondary leading-relaxed mb-4">{m.desc}</p>
                          <div className={`flex flex-wrap gap-1.5 justify-start ${isEven ? 'md:justify-end' : ''}`}>
                            {m.tags.map(tag => (
                              <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-foreground-muted border border-white/[0.06]">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </ScrollReveal>
                    </div>

                    {/* Right spacer to align grid */}
                    <div className="hidden md:block md:w-1/2" />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Team ── */}
      <div className="section-padding mb-20">
        <div className="container-custom">
          <ScrollReveal>
            <span className="text-xs font-semibold tracking-widest uppercase text-accent mb-3 block">The Team</span>
            <h2 className="text-4xl font-serif font-light text-foreground-primary mb-12">Built by believers</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {TEAM.map((member, i) => (
              <ScrollReveal key={member.name} delay={i * 0.08}>
                <motion.div
                  className="card-glass p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left h-full relative group border border-white/[0.05] hover:border-white/[0.12] transition-all bg-white/[0.01]"
                  whileHover={{ y: -4, boxShadow: '0 10px 30px -15px rgba(124,58,237,0.15)' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 relative bg-background-tertiary">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-500 scale-100 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-0.5 group-hover:text-accent transition-colors leading-tight">
                      {member.name}
                    </h3>
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-accent mb-3">
                      {member.role}
                    </p>
                    <p className="text-xs text-foreground-secondary leading-relaxed mb-4 flex-1">
                      {member.bio}
                    </p>
                    <div className="flex items-center gap-3 justify-center sm:justify-start">
                      {member.socials.globe && (
                        <a
                          href={member.socials.globe}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground-muted hover:text-white transition-colors"
                        >
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                      {member.socials.github && (
                        <a
                          href={member.socials.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground-muted hover:text-white transition-colors"
                        >
                          <Github className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="section-padding">
        <div className="container-custom">
          <ScrollReveal>
            <div className="card-glass p-12 text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-serif font-light text-foreground-primary mb-4">
                Ready to experience the future of AI?
              </h2>
              <p className="text-foreground-muted mb-8">Join thousands of researchers, developers, and creators already using CyberCli.</p>
              <Link to={user ? "/chat" : "/auth/signup"} className="btn-primary inline-flex">
                Get started for free <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  )
}
