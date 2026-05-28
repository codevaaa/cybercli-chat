import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import SEOHead from '@components/seo/SEOHead'

const LAST_UPDATED = 'May 20, 2026'

const SECTIONS = [
  {
    id: 'prohibited-uses',
    title: '1. Prohibited Uses',
    content: `You may not use CyberCli Chat for any purpose that is unlawful, harmful, or violates this Acceptable Use Policy. Specifically, you agree not to use the platform to:

• Engage in, facilitate, or promote illegal activities, including but not limited to human trafficking, illegal drug trade, child exploitation, and cybercrime.
• Generate or distribute malicious software, including ransomware, keyloggers, viruses, or exploit scripts designed to compromise computer systems.
• Impersonate individuals, organizations, or governmental bodies to conduct phishing attacks, identity theft, or financial fraud.
• Conduct unauthorized penetration testing or vulnerability scanning on third-party networks without explicit legal authorization.`,
  },
  {
    id: 'content-standards',
    title: '2. Content Standards',
    content: `Any content you input into the platform, or generate through our custom AI models, must conform to high safety and ethical standards. You are prohibited from generating:

• Content that incites violence, promotes hate speech, or harasses and doxxes individuals.
• Sexually explicit content, pornography, or material promoting non-consensual sexual content.
• Misinformation or disinformation campaigns intended to mislead the public, disrupt democratic processes, or damage reputations.
• Content violating intellectual property, copyright, trademark, or patent rights of other individuals or companies.`,
  },
  {
    id: 'api-abuse',
    title: '3. API & System Abuse',
    content: `To ensure high availability and fair access for all users, we enforce strict controls on system usage. The following behaviors are prohibited:

• Bypassing rate limiters, security sandboxes, or prompt-injection guards through adversarial input construction.
• Scraping, reverse engineering, or extracting model weights or proprietary backend endpoints without authorization.
• Deploying automated bots, scripts, or spiders to register accounts, run chats, or crawl CyberCli assets in bulk.
• Attempting to disrupt, overload, or compromise the availability of the AI gateway cluster or database layers.`,
  },
  {
    id: 'monitoring-enforcement',
    title: '4. Enforcement & Monitoring',
    content: `We monitor system usage patterns for abuse and security verification purposes. If we determine that you have violated these policies:

• We reserve the right to suspend or terminate your account immediately without prior warning or refund.
• We may redact, filter, or block inputs and outputs that trigger safety classifiers.
• We will cooperate with law enforcement and reporting authorities if we detect illegal activities or credible threats of violence.`,
  },
  {
    id: 'reporting',
    title: '5. Reporting Abuse',
    content: `We rely on our community to maintain a secure and productive environment. If you encounter any generated content or user activity that violates these terms:

• Send a detailed report to **cybermindcli@cybermindcli.com** including prompt references or thread identifiers.
• Our safety team reviews all incident tickets within 24 hours and takes appropriate administrative action.`,
  },
]

function LegalSidebar({ sections, activeId }) {
  return (
    <aside className="sticky top-24 hidden lg:block w-64 flex-shrink-0">
      <div className="rounded-2xl border border-white/[0.06] bg-[#0D0D14] p-5">
        <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-4">Contents</p>
        <nav className="space-y-1">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg transition-all duration-200 leading-snug ${
                activeId === s.id
                  ? 'text-white bg-[#D97757]/10 border-l-2 border-[#D97757] pl-3'
                  : 'text-[#6B7280] hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <ChevronRight className={`w-3 h-3 flex-shrink-0 ${activeId === s.id ? 'text-[#F4A37A]' : 'text-[#374151]'}`} />
              {s.title}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  )
}

function useSectionTracker(sections) {
  const [activeId, setActiveId] = useState(sections[0]?.id)
  useEffect(() => {
    const handler = () => {
      const scrollPos = window.scrollY + 120
      let current = sections[0]?.id
      for (const s of sections) {
        const el = document.getElementById(s.id)
        if (el && el.offsetTop <= scrollPos) current = s.id
      }
      setActiveId(current)
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [sections])
  return activeId
}

function formatContent(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

export default function AcceptableUsePage() {
  const activeId = useSectionTracker(SECTIONS)

  return (
    <div className="pt-28 pb-20 bg-[#0A0A0F]">
      <SEOHead
        title="Acceptable Use Policy"
        description="CyberMindCLI acceptable use policy. Guidelines for responsible AI usage, prohibited activities, and reporting violations."
        path="/acceptable-use"
        keywords={['acceptable use', 'AI policy', 'usage guidelines', 'CyberMindCLI', 'responsible AI']}
      />
      <div className="section-padding">
        <div className="container-custom">
          <div className="mb-12">
            <span className="text-xs font-semibold text-[#D97757] tracking-widest uppercase mb-4 block">Legal</span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Acceptable Use Policy</h1>
            <p className="text-sm text-[#6B7280]">Last updated: {LAST_UPDATED} · Effective immediately</p>
          </div>

          <div className="flex gap-12 items-start">
            <LegalSidebar sections={SECTIONS} activeId={activeId} />

            <main className="flex-1 min-w-0">
              <div className="rounded-2xl border border-white/[0.06] bg-[#0D0D14] p-8 mb-6">
                <p className="text-[#9CA3AF] text-sm leading-relaxed">
                  This Acceptable Use Policy outlines the rules and standards governing your use of CyberCli Chat and our AI model gateway. By accessing our services, you commit to respecting these boundaries.
                </p>
              </div>

              <div className="space-y-10">
                {SECTIONS.map((section) => (
                  <motion.section
                    key={section.id}
                    id={section.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.5 }}
                    className="scroll-mt-24"
                  >
                    <h2 className="text-xl font-bold text-white mb-4 pb-3 border-b border-white/[0.06]">
                      {section.title}
                    </h2>
                    <div className="space-y-4">
                      {section.content.split('\n\n').map((para, j) => (
                        para.startsWith('• ') || para.includes('\n• ') ? (
                          <ul key={j} className="space-y-2 pl-2">
                            {para.split('\n').map((item, k) => (
                              <li key={k} className="flex items-start gap-2 text-sm text-[#9CA3AF] leading-relaxed">
                                <span className="text-[#D97757] flex-shrink-0 mt-0.5">•</span>
                                <span>{formatContent(item.replace('• ', ''))}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p key={j} className="text-sm text-[#9CA3AF] leading-[1.8]">
                            {formatContent(para)}
                          </p>
                        )
                      ))}
                    </div>
                  </motion.section>
                ))}
              </div>

              <div className="mt-12 p-6 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <p className="text-xs text-[#6B7280]">
                  Last updated: {LAST_UPDATED}. Contact <a href="mailto:cybermindcli@cybermindcli.com" className="text-[#D97757]">cybermindcli@cybermindcli.com</a> for policy inquiries or to report violations.
                </p>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
