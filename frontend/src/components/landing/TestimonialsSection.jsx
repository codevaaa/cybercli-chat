import ScrollReveal, { ScrollRevealGroup } from '@components/ui/ScrollReveal'
import { Star } from 'lucide-react'

const TESTIMONIALS = [
  {
    quote:
      "Council Mode completely changed how I analyse threat models. Three different AI perspectives on the same CVE in under 10 seconds — nothing else comes close.",
    name: 'Riya Mehta',
    initials: 'RM',
    role: 'Senior Security Researcher',
    company: 'Trail of Bits',
    stars: 5,
    accentColor: '#D97757',
  },
  {
    quote:
      "I switched from Claude Pro the moment I tried conversation branching. Being able to explore two hypotheses in parallel without losing context is a game-changer.",
    name: 'James Okafor',
    initials: 'JO',
    role: 'Staff Software Engineer',
    company: 'Linear',
    stars: 5,
    accentColor: '#D97757',
  },
  {
    quote:
      "As a PhD student on a tight budget, having 200K+ free models is wild. CyberCli lets me run literature reviews and summarise papers without paying a cent.",
    name: 'Sara Chen',
    initials: 'SC',
    role: 'PhD Candidate',
    company: 'MIT CSAIL',
    stars: 5,
    accentColor: '#06B6D4',
  },
  {
    quote:
      "The ElevenLabs voice integration is silky smooth. I use it for hands-free code reviews while I'm in the gym. The audio quality beats every other AI voice I've tried.",
    name: 'Tomás Vélez',
    initials: 'TV',
    role: 'Indie Developer',
    company: null,
    stars: 5,
    accentColor: '#10B981',
  },
  {
    quote:
      "Custom Agents saved our team hours a week. We built a security-policy agent with our internal docs and now junior devs get instant, accurate answers without pinging us.",
    name: 'Priya Nair',
    initials: 'PN',
    role: 'Head of Platform Security',
    company: 'Stripe',
    stars: 5,
    accentColor: '#F59E0B',
  },
  {
    quote:
      "The fact that it's truly free — not some freemium bait-and-switch — is what won me over. I've recommended CyberCli to my entire bootcamp cohort.",
    name: 'Luca Moretti',
    initials: 'LM',
    role: 'Full-Stack Developer',
    company: 'Freelance',
    stars: 5,
    accentColor: '#D97757',
  },
]

function StarRating({ count = 5 }) {
  return (
    <div className="flex gap-0.5 mb-4">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      ))}
    </div>
  )
}

export default function TestimonialsSection() {
  return (
    <section className="section-padding py-24 lg:py-32 border-y border-border-subtle">
      <div className="container-custom">
        {/* Header */}
        <ScrollReveal direction="up" delay={0} className="text-center mb-16">
          <span className="inline-block text-xs font-semibold text-accent tracking-[0.2em] uppercase mb-4 px-4 py-1.5 rounded-full bg-accent/5 border border-accent/10">
            Testimonials
          </span>
          <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-bold tracking-tight leading-[1.1] mb-5 text-white">
            Loved by{' '}
            <span className="text-gradient-accent">developers & researchers</span>
          </h2>
          <p className="text-base sm:text-lg text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
            From security teams to indie hackers to PhD students — power users who
            tried CyberCli didn't go back.
          </p>
        </ScrollReveal>

        {/* Masonry-style 3-col grid */}
        <ScrollRevealGroup
          direction="up"
          stagger={0.1}
          className="grid md:grid-cols-3 gap-5 max-w-6xl mx-auto"
        >
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="card-glass p-7 flex flex-col">
              <StarRating count={t.stars} />

              {/* Quote */}
              <blockquote className="text-sm text-[#D1D5DB] leading-relaxed italic flex-1 mb-6">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold"
                  style={{
                    background: `${t.accentColor}20`,
                    color: t.accentColor,
                    border: `1px solid ${t.accentColor}30`,
                  }}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-[#6B7280]">
                    {t.role}{t.company ? `, ${t.company}` : ''}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </ScrollRevealGroup>
      </div>
    </section>
  )
}
