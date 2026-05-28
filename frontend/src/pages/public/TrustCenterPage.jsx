import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import SEOHead from '@components/seo/SEOHead'

const LAST_UPDATED = 'May 20, 2026'

const SECTIONS = [
  {
    id: 'security-architecture',
    title: '1. Security Architecture',
    content: `CyberCli is designed with deep security principles at its core. Our full-stack platform implements the following protective measures:

• **Authentication Security**: Managed by Supabase Auth utilizing standard JSON Web Tokens (JWT) with secure bcrypt password hashing.
• **Database Isolation**: PostgreSQL tables leverage Supabase Row-Level Security (RLS) policies, verifying that users only query their own records.
• **Field-Level Encryption**: Sensitive user data in MongoDB (such as API keys, custom system prompts, and workspace variables) is encrypted at the field level using AES-256 before disk write.
• **TLS 1.3 Transmission**: All data in transit between users, our servers, and third-party AI gateways is fully encrypted.`,
  },
  {
    id: 'uptime-failover',
    title: '2. Uptime & Failover',
    content: `We maintain high availability for our AI compute gateway:

• **Multi-Provider Fallback**: Our intelligent routing gateway links to 8+ free and premium AI providers. If one provider experiences degradation, we fail over automatically.
• **Uptime Monitoring**: We target a 99.9% availability index on our edge compute orchestration engines.
• **Edge Geo-Distribution**: Distributed cache nodes ensure minimal response latencies.`,
  },
  {
    id: 'data-privacy',
    title: '3. Data Privacy & Isolation',
    content: `We believe your data belongs strictly to you:

• **No Model Training**: We do not use your chat conversations, documents, or terminal command histories to train underlying models.
• **Sandboxed execution**: Code execution features and terminal actions are run in secure sandbox instances.
• **Instant Data Deletion**: Deleting your account Purges all MongoDB database records, Supabase user entries, and usage histories within 24 hours.`,
  },
  {
    id: 'compliance-roadmap',
    title: '4. Compliance Roadmap',
    content: `We align our operations with global regulatory frameworks:

• **GDPR/UK GDPR**: Fully compliant with data minimization, portability (JSON exports), and Article 17 deletion rights.
• **CCPA/CPRA**: We do not sell or share user data with advertising networks.
• **SOC2 Alignment**: We are currently building our controls framework toward SOC2 Type 1 audits in Q3 2026 and Type 2 compliance in early 2027.`,
  },
  {
    id: 'vulnerability-management',
    title: '5. Vulnerability Management',
    content: `We maintain continuous safety checks on our codebase:

• **Automated Scanning**: New code integrations are automatically scanned for static analysis vulnerabilities.
• **Dependency Audits**: We run weekly Snyk scans to catch package vulnerabilities.
• **Responsible Disclosure**: We collaborate with security researchers under our safe harbor disclosure policy.`,
  },
]

function LegalSidebar({ sections, activeId }) {
  return (
    <aside className="sticky top-24 hidden lg:block w-64 flex-shrink-0">
      <div className="rounded-2xl border border-black/[0.06] bg-[#FAF8F5] p-5">
        <p className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-4">Contents</p>
        <nav className="space-y-1">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg transition-all duration-200 leading-snug ${
                activeId === s.id
                  ? 'text-[#D97757] font-semibold bg-[#D97757]/5 border-l-2 border-[#D97757] pl-3'
                  : 'text-[#666666] hover:text-[#191919] hover:bg-black/[0.02]'
              }`}
            >
              <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${activeId === s.id ? 'text-[#D97757]' : 'text-black/20'}`} />
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
      return <strong key={i} className="text-[#191919] font-semibold">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

export default function TrustCenterPage() {
  const activeId = useSectionTracker(SECTIONS)

  return (
    <div className="pt-28 pb-20 bg-[#FBF9F6] text-[#191919]">
      <SEOHead
        title="Trust Center & Security Portal"
        description="CyberMindCLI Trust Center. Read about our security protocols, database field encryption, uptime failovers, compliance roadmap, and vulnerability fixes."
        path="/trust"
        keywords={['Trust Center', 'security architecture', 'SLA uptime', 'GDPR compliance', 'SOC2 roadmap', 'CyberMindCLI security']}
      />
      <div className="section-padding">
        <div className="container-custom">
          {/* Header */}
          <div className="mb-12 border-b border-black/[0.06] pb-8">
            <span className="text-xs font-semibold text-[#D97757] tracking-widest uppercase mb-4 block">Security & Trust</span>
            <h1 className="text-4xl md:text-5xl font-serif font-medium text-[#191919] mb-3 tracking-tight">Trust Center</h1>
            <p className="text-sm text-[#666666]">Last updated: {LAST_UPDATED} · Effective immediately</p>
          </div>

          <div className="flex gap-12 items-start">
            <LegalSidebar sections={SECTIONS} activeId={activeId} />

            {/* Main content */}
            <main className="flex-1 min-w-0">
              <div className="rounded-2xl border border-black/[0.06] bg-[#FAF8F5] p-8 mb-8">
                <p className="text-[#444444] text-sm leading-relaxed">
                  Welcome to the CyberMindCLI Trust Center. We are dedicated to providing a secure, reliable, and transparent platform for artificial intelligence operations. Explore details on our database encryption, uptime SLA failovers, and compliance standards. For custom auditing requests, email us at <a href="mailto:cybermindcli@cybermindcli.com" className="text-[#D97757] hover:underline font-semibold">cybermindcli@cybermindcli.com</a>.
                </p>
              </div>

              <div className="space-y-12">
                {SECTIONS.map((section) => (
                  <motion.section
                    key={section.id}
                    id={section.id}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.4 }}
                    className="scroll-mt-24"
                  >
                    <h2 className="text-2xl font-serif font-medium text-[#191919] mb-4 pb-2 border-b border-black/[0.06]">
                      {section.title}
                    </h2>
                    <div className="space-y-4">
                      {section.content.split('\n\n').map((para, j) => (
                        para.startsWith('• ') ? (
                          <ul key={j} className="space-y-2.5 pl-2">
                            {para.split('\n').map((item, k) => (
                              <li key={k} className="flex items-start gap-2.5 text-sm text-[#444444] leading-relaxed">
                                <span className="text-[#D97757] flex-shrink-0 mt-1">•</span>
                                <span>{formatContent(item.replace('• ', ''))}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p key={j} className="text-sm text-[#444444] leading-[1.8]">
                            {formatContent(para)}
                          </p>
                        )
                      ))}
                    </div>
                  </motion.section>
                ))}
              </div>

              <div className="mt-16 p-6 rounded-xl border border-black/[0.06] bg-[#FAF8F5]">
                <p className="text-xs text-[#666666] leading-relaxed">
                  This trust portal was last updated on {LAST_UPDATED}. For direct inquiries regarding security posture, pen-testing reports, or audits, email <a href="mailto:cybermindcli@cybermindcli.com" className="text-[#D97757] hover:underline">cybermindcli@cybermindcli.com</a>.
                </p>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
