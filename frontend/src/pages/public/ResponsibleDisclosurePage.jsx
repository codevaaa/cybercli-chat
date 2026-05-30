import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import SEOHead from '@components/seo/SEOHead'

const LAST_UPDATED = 'May 20, 2026'

const SECTIONS = [
  {
    id: 'principles',
    title: '1. Security Principles',
    content: `At Codeva, security is fundamental to our products and operations. We recognize that external security researchers play a crucial role in protecting our users and systems.

We encourage responsible security testing of our public assets and applications, including Codeva and the AI compute gateway.

This policy outlines how you can safely discover and report vulnerabilities to our engineering team, and our commitment to resolving confirmed reports transparently.`,
  },
  {
    id: 'safe-harbor',
    title: '2. Safe Harbor Commitment',
    content: `**Legal Protection**: If you conduct your security research and vulnerability disclosure in compliance with this policy, we commit to the following:

• We will not initiate or support legal actions (including civil lawsuits or criminal referrals) against you for your testing activities.
• We will view your research as authorized under applicable anti-hacking laws (such as the Computer Fraud and Abuse Act or local equivalents).
• We will cooperate with you to validate and coordinate public disclosure of findings if requested.

This safe harbor applies strictly as long as your activities remain within the boundaries defined here.`,
  },
  {
    id: 'scope',
    title: '3. Out of Scope Testing',
    content: `The following testing methodologies are strictly prohibited and fall outside the scope of our Safe Harbor commitment:

• Denial of Service (DoS or DDoS) attacks against our gateway clusters or database systems.
• Social engineering, phishing, or physical security testing of Codeva staff or offices.
• Accessing, modifying, or deleting other users' private conversation histories, API keys, or billing records. (If you identify a data leakage bug, stop testing immediately and report it).
• Exploiting vulnerabilities to cause server instability, system degradation, or persistent access.`,
  },
  {
    id: 'reporting',
    title: '4. Reporting Guidelines',
    content: `If you believe you have discovered a security vulnerability in our systems, please report it immediately:

**Email**: Send your report to **cybermindcli@cybermindcli.com** with details.
**Details Required**: Please include:
• A detailed description of the vulnerability, including impacted assets or endpoints.
• Step-by-step instructions to reproduce the issue, including raw HTTP payloads or proof-of-concept (PoC) scripts.
• An assessment of the potential security impact (confidentiality, integrity, availability).

We request that you do not share details of the vulnerability publicly or with third parties until we have had reasonable time to patch the issue.`,
  },
  {
    id: 'response-commitment',
    title: '5. Our Response & Remediation',
    content: `We take vulnerability reports seriously and commit to the following response timeline:

• **Acknowledgment**: We will acknowledge receipt of your report within 48 hours.
• **Validation**: Our engineering team will review and attempt to validate the findings within 5 business days.
• **Resolution**: For confirmed vulnerabilities, we target remediation within 30 days, keeping you updated on our progress.
• **Recognition**: With your consent, we will list your name in our Security Hall of Fame in our next release notes or changelog article.`,
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

export default function ResponsibleDisclosurePage() {
  const activeId = useSectionTracker(SECTIONS)

  return (
    <div className="pt-28 pb-20 bg-[#FBF9F6] text-[#191919]">
      <SEOHead
        title="Responsible Disclosure Policy"
        description="Codeva responsible vulnerability disclosure guidelines. Security principles, safe harbor protections, and bug report submission steps."
        path="/responsible-disclosure-policy"
        keywords={['responsible disclosure', 'security policy', 'bug bounty', 'vulnerability disclosure', 'Codeva security']}
      />
      <div className="section-padding">
        <div className="container-custom">
          {/* Header */}
          <div className="mb-12 border-b border-black/[0.06] pb-8">
            <span className="text-xs font-semibold text-[#D97757] tracking-widest uppercase mb-4 block">Security & Trust</span>
            <h1 className="text-4xl md:text-5xl font-serif font-medium text-[#191919] mb-3 tracking-tight">Responsible Disclosure Policy</h1>
            <p className="text-sm text-[#666666]">Last updated: {LAST_UPDATED} · Effective immediately</p>
          </div>

          <div className="flex gap-12 items-start">
            <LegalSidebar sections={SECTIONS} activeId={activeId} />

            {/* Main content */}
            <main className="flex-1 min-w-0">
              <div className="rounded-2xl border border-black/[0.06] bg-[#FAF8F5] p-8 mb-8">
                <p className="text-[#444444] text-sm leading-relaxed">
                  Codeva welcomes ethical security researchers. If you identify vulnerabilities in our web apps, CLI interfaces, or gateways, please coordinate patches with us under these safe harbor provisions. Reach us directly at <a href="mailto:cybermindcli@cybermindcli.com" className="text-[#D97757] hover:underline font-semibold">cybermindcli@cybermindcli.com</a>.
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
                  This policy was last updated on {LAST_UPDATED}. For emergency security incidents, please contact our core infrastructure administrators at <a href="mailto:cybermindcli@cybermindcli.com" className="text-[#D97757] hover:underline">cybermindcli@cybermindcli.com</a>.
                </p>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
