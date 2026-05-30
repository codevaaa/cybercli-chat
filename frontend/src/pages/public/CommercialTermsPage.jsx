import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import SEOHead from '@components/seo/SEOHead'

const LAST_UPDATED = 'May 20, 2026'

const SECTIONS = [
  {
    id: 'commercial-use',
    title: '1. Commercial Use & Accounts',
    content: `These Commercial Terms of Service ("Commercial Terms") govern your access to and commercial use of the Codeva platform, API services, and developers dashboard. By accessing the Service on behalf of a company, organization, or commercial entity, you agree to these Commercial Terms.

You represent that you have the authority to bind your organization to these Commercial Terms. If you do not have such authority, or do not agree to these Commercial Terms, you must not use the Service.

You must maintain accurate registration data and take sole responsibility for account activities, API key custody, and security configurations.`,
  },
  {
    id: 'api-access',
    title: '2. API Access & Integrations',
    content: `**License Grant**: Subject to payment of applicable fees and compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use our API gateway solely for your internal development and commercial operations.

**API Keys**: We generate API keys to authorize programmatic requests. You must keep your API keys secure and confidential. You are fully responsible for all fees and activities associated with your API keys.

**Abuse & Scraping**: You are prohibited from scraping outputs in bulk to train competing models, conducting automated penetration tests without prior written consent, or abusing gateway nodes.`,
  },
  {
    id: 'billing-stripe',
    title: '3. Fees, Billing & Stripe',
    content: `**Subscription & Usage Fees**: Paid commercial accounts (such as Team or Enterprise tiers) are subject to subscription plans and usage-based billing metrics. All rates are listed on our pricing page or custom enterprise quotes.

**Stripe Payments**: Commercial invoicing and credit card operations are managed through Stripe. You authorize us to charge your payment method for recurring subscriptions and token consumption.

**Tax Responsibilities**: You are responsible for all applicable taxes associated with your purchase, excluding taxes based on our net income.`,
  },
  {
    id: 'sla-availability',
    title: '4. Service Availability & SLA',
    content: `**Uptime Commitment**: For custom Enterprise customers, we offer a 99.9% compute gateway uptime SLA. Standard and Pro tiers are provided on an "as available" basis without uptime guarantees.

**Outages & Fallbacks**: Our platform implements automatic failover routing across 8+ AI providers. In the event of an outage on a specific model, we route requests to equivalent fallback architectures to maintain service.

**Maintenance**: We schedule system maintenance during low-traffic windows. We make reasonable efforts to notify administrators 48 hours before scheduled downtimes.`,
  },
  {
    id: 'intellectual-property',
    title: '5. Intellectual Property & Output Licensing',
    content: `**Data Ownership**: You retain all ownership rights in your training datasets, system prompt templates, and custom payloads.

**Output Rights**: We do not claim ownership of AI-generated Outputs. To the extent permitted by law, we assign all intellectual property rights in the Outputs to you.

**Gateway IP**: Codeva owns all rights, title, and interest in the routing gateway algorithms, synthesis engine software, and UI/UX design components.`,
  },
  {
    id: 'confidentiality',
    title: '6. Confidentiality',
    content: `**Confidential Information**: Each party agrees to protect the other's Confidential Information (business plans, source code, API keys, pricing, and system data) with the same degree of care it uses for its own confidential information, but no less than reasonable care.

**Exclusions**: Confidential Information does not include information that is publicly known, already in the receiving party's possession, or independently developed without reference to the disclosing party's information.`,
  },
  {
    id: 'liability-caps',
    title: '7. Warranties & Liability Caps',
    content: `**Warranties**: Codeva warrants that the Service will be performed in a professional manner. EXCEPT AS EXPRESSLY STATED, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTIBILITY AND FITNESS FOR A PARTICULAR PURPOSE.

**Liability Caps**: TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY ARISING OUT OF THESE COMMERCIAL TERMS SHALL NOT EXCEED THE TOTAL FEES PAID BY YOU IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.`,
  },
  {
    id: 'dispute-resolution',
    title: '8. Arbitration & Law',
    content: `These Commercial Terms are governed by and construed under the laws of our primary operating jurisdiction, without regard to conflicts of law principles.

Any dispute, controversy, or claim arising from these Commercial Terms shall be settled by binding arbitration administered by the appropriate arbitration association, and not in court. Both parties waive any right to a jury trial.`,
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

export default function CommercialTermsPage() {
  const activeId = useSectionTracker(SECTIONS)

  return (
    <div className="pt-28 pb-20 bg-[#FBF9F6] text-[#191919]">
      <SEOHead
        title="Commercial Terms of Service"
        description="Codeva commercial terms of service. Guidelines for API consumption, SLA commitments, enterprise licensing, and payment policies."
        path="/legal/commercial-terms"
        keywords={['commercial terms', 'API terms', 'enterprise SLA', 'Codeva', 'developer agreements']}
      />
      <div className="section-padding">
        <div className="container-custom">
          {/* Header */}
          <div className="mb-12 border-b border-black/[0.06] pb-8">
            <span className="text-xs font-semibold text-[#D97757] tracking-widest uppercase mb-4 block">Legal & Policies</span>
            <h1 className="text-4xl md:text-5xl font-serif font-medium text-[#191919] mb-3 tracking-tight">Commercial Terms of Service</h1>
            <p className="text-sm text-[#666666]">Last updated: {LAST_UPDATED} · Effective immediately</p>
          </div>

          <div className="flex gap-12 items-start">
            <LegalSidebar sections={SECTIONS} activeId={activeId} />

            {/* Main content */}
            <main className="flex-1 min-w-0">
              <div className="rounded-2xl border border-black/[0.06] bg-[#FAF8F5] p-8 mb-8">
                <p className="text-[#444444] text-sm leading-relaxed">
                  These Commercial Terms govern your business, development, or organizational use of the Codeva platform. By integrating our APIs or deploying team workspaces, you agree to these commercial covenants. Individual users should refer to our <a href="/legal/consumer-terms" className="text-[#D97757] hover:underline font-medium">Consumer Terms</a>.
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
                  These Commercial Terms were last updated on {LAST_UPDATED}. For customized SLA contracts or sales requests, please contact our support department at <a href="mailto:cybermindcli@cybermindcli.com" className="text-[#D97757] hover:underline">cybermindcli@cybermindcli.com</a>.
                </p>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
