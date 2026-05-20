import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

const LAST_UPDATED = 'May 20, 2026'

const SECTIONS = [
  {
    id: 'overview',
    title: '1. Overview & Scope',
    content: `This GDPR Notice applies to residents of the European Union (EU), European Economic Area (EEA), and the United Kingdom (UK). It supplements our Privacy Policy and provides specific information required by the General Data Protection Regulation (EU) 2016/679 (GDPR) and, where applicable, the UK GDPR.

CyberMindCLI acts as the **data controller** for personal data collected through CyberCli Chat. As data controller, we determine the purposes and means of processing your personal data and bear responsibility for compliance with the GDPR.

When AI model providers process your prompts to generate responses, they may act as **data processors** on our behalf (where we have Data Processing Agreements in place) or as independent controllers (where their own terms govern the processing). We provide details below.`,
  },
  {
    id: 'controller-details',
    title: '2. Data Controller Details',
    content: `**Data Controller**: CyberMindCLI
**Platform**: CyberCli Chat (cyberclichat.com)
**DPO Contact**: privacy@cybermindcli.com
**Founded**: 2025
**Jurisdiction**: International (primary operations)

You have the right to contact our privacy team at any time with questions, requests, or complaints about how we handle your personal data. We will respond within 30 days, or within 72 hours for urgent security-related matters.`,
  },
  {
    id: 'data-subjects',
    title: '3. Categories of Data Subjects',
    content: `We process personal data relating to the following categories of data subjects:

**Registered Users**: Individuals who have created a CyberCli Chat account. We process account information, conversation data, and usage data for this group.

**Visitors**: Individuals who visit our website without creating an account. We collect minimal technical data (IP address, browser type, pages visited) for security and analytics purposes.

**Trial Users**: Individuals who use the Service on a trial basis. Processed similarly to registered users, with data retained for 30 days after trial expiry.

**API Users**: Developers and organizations accessing the Service via API. Account data, API usage logs, and rate limiting data are processed for this group.`,
  },
  {
    id: 'purposes-bases',
    title: '4. Processing Purposes & Legal Bases',
    content: `We process your personal data for the following purposes, each with a specified legal basis under Article 6 GDPR:

**Service Provision** (Art. 6(1)(b) — Contract):
Processing your account data, conversation data, and payment information is necessary to perform our contract with you (the Terms of Service). Without this processing, we cannot provide the Service.

**Security & Fraud Prevention** (Art. 6(1)(f) — Legitimate Interests):
We process IP addresses, device identifiers, and usage patterns to detect and prevent fraudulent use, unauthorized access, and security threats. Our legitimate interest in protecting the Service and its users outweighs the privacy impact.

**Product Improvement** (Art. 6(1)(f) — Legitimate Interests):
We analyze aggregate usage patterns to improve Service performance, identify bugs, and guide feature development. We do not profile individual users for commercial purposes.

**Marketing Communications** (Art. 6(1)(a) — Consent):
We send product updates and newsletters only where you have explicitly opted in. You may withdraw consent at any time by clicking "unsubscribe" or contacting privacy@cybermindcli.com.

**Legal Compliance** (Art. 6(1)(c) — Legal Obligation):
We may process data when required to comply with a legal obligation, such as responding to a court order, law enforcement request, or regulatory requirement.`,
  },
  {
    id: 'special-categories',
    title: '5. Special Category Data',
    content: `We do not intentionally collect or process special categories of personal data as defined under Article 9 GDPR, including data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, health data, biometric data for unique identification, or data concerning sexual orientation.

However, because we process conversation content, users may voluntarily include sensitive information in their prompts. We recommend that users do not share sensitive personal data in AI conversations. Where such data is inadvertently shared, it is processed only for the purpose of generating an AI response and is not retained for any other purpose beyond the standard data retention periods.

If you believe you have inadvertently shared special category data, you may request deletion of specific conversations by contacting privacy@cybermindcli.com.`,
  },
  {
    id: 'automated-decisions',
    title: '6. Automated Decision-Making',
    content: `We use automated systems in the following ways:

**Content Moderation**: Automated systems may flag content that appears to violate our Acceptable Use Policy. Automated flags are reviewed by a human before any account action is taken.

**Model Routing**: Our AI Gateway automatically selects the optimal model provider for your query based on query characteristics and provider availability. This routing does not affect your legal rights and is based on technical parameters, not personal profiling.

**Fraud Detection**: Automated systems analyze login patterns to detect potential account compromise. Automated flags trigger additional verification requirements and are reviewed by a human before account suspension.

We do not make solely automated decisions that produce legal effects or significantly affect you in ways that would require notification under Article 22 GDPR.`,
  },
  {
    id: 'international-transfers',
    title: '7. International Data Transfers',
    content: `Some of our service providers are located outside the EU/EEA. When we transfer your personal data to third countries, we ensure adequate protection through the following mechanisms:

**Standard Contractual Clauses (SCCs)**: Where we transfer data to processors in countries without an adequacy decision, we use the EU Standard Contractual Clauses (Commission Implementing Decision 2021/914) to ensure an equivalent level of protection.

**Adequacy Decisions**: Some of our processors are located in countries covered by an EU adequacy decision, meaning the European Commission has determined that those countries provide a level of data protection comparable to the EU.

**Transfer Impact Assessments**: We conduct Transfer Impact Assessments (TIAs) for transfers to high-risk jurisdictions, taking into account the likelihood of access by public authorities.

Specific transfers:
• Supabase (PostgreSQL, Auth) — EU regions available
• MongoDB Atlas (Conversation Storage) — EU regions available
• Render (Backend Hosting) — US, Oregon region
• AI Model Providers — US and global (SCCs apply)`,
  },
  {
    id: 'rights',
    title: '8. Your GDPR Rights',
    content: `Under the GDPR, you have the following rights. To exercise any of these rights, contact privacy@cybermindcli.com with subject line "GDPR Rights Request." We will respond within 30 days (extendable to 90 days for complex requests with notification).

**Right of Access (Art. 15)**: Request a copy of your personal data and information about how it is processed. We will provide this in a structured JSON format.

**Right to Rectification (Art. 16)**: Request correction of inaccurate personal data. You may update most account data directly in your account settings.

**Right to Erasure (Art. 17)**: Request deletion of your personal data where: consent has been withdrawn; the data is no longer necessary; you object to processing and we have no overriding legitimate interests; or the data has been unlawfully processed.

**Right to Restriction (Art. 18)**: Request that we restrict processing of your data while a complaint is resolved, where accuracy is contested, or where you need the data for legal claims but we do not.

**Right to Data Portability (Art. 20)**: Receive your personal data in a machine-readable format and transmit it to another controller. Applies to data processed on the basis of consent or contract.

**Right to Object (Art. 21)**: Object at any time to processing based on legitimate interests. We will stop processing unless we demonstrate compelling legitimate grounds that override your interests.

**Rights Related to Automated Decision-Making (Art. 22)**: Where automated decisions have legal or similarly significant effects, you have the right to human review, to express your point of view, and to contest the decision.

**Right to Lodge a Complaint**: If you are not satisfied with our response, you have the right to lodge a complaint with your local supervisory authority. For EU residents, this is your national DPA. For UK residents, this is the Information Commissioner's Office (ICO) at ico.org.uk.`,
  },
  {
    id: 'retention',
    title: '9. Data Retention Schedules',
    content: `Retention period by data category:

• **Account identifiers (email, username)**: Duration of account + 30 days after deletion
• **Conversation data**: Duration of account + 30 days after deletion
• **Usage logs and access logs**: 90 days (IP addresses anonymized after 30 days)
• **Payment transaction records**: 7 years (financial regulation requirement)
• **Support communications**: 3 years
• **Fraud detection records**: 1 year after resolution
• **Consent records**: Duration of the relationship + 5 years
• **Anonymized analytics data**: Up to 36 months

When the retention period expires, data is permanently and irreversibly deleted. We conduct quarterly data deletion audits to ensure compliance.`,
  },
  {
    id: 'dpa-contacts',
    title: '10. Supervisory Authority Contacts',
    content: `If you are dissatisfied with how we handle your personal data and wish to lodge a formal complaint, you may contact your local supervisory authority:

**Germany**: Bundesbeauftragter für den Datenschutz und die Informationsfreiheit (BfDI) — bfdi.bund.de
**France**: Commission Nationale de l'Informatique et des Libertés (CNIL) — cnil.fr
**Netherlands**: Autoriteit Persoonsgegevens (AP) — autoriteitpersoonsgegevens.nl
**Spain**: Agencia Española de Protección de Datos (AEPD) — aepd.es
**Ireland**: Data Protection Commission (DPC) — dataprotection.ie
**United Kingdom**: Information Commissioner's Office (ICO) — ico.org.uk
**All other EU/EEA countries**: Your national data protection authority listed at edpb.europa.eu/about-edpb/about-edpb/members_en

We would appreciate the opportunity to address your concern before you contact a supervisory authority. Please reach out to privacy@cybermindcli.com first.`,
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
                  ? 'text-white bg-violet-500/10 border-l-2 border-violet-500 pl-3'
                  : 'text-[#6B7280] hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <ChevronRight className={`w-3 h-3 flex-shrink-0 ${activeId === s.id ? 'text-violet-400' : 'text-[#374151]'}`} />
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

export default function GDPRPage() {
  const activeId = useSectionTracker(SECTIONS)

  return (
    <div className="pt-28 pb-20 bg-[#0A0A0F]">
      <div className="section-padding">
        <div className="container-custom">
          <div className="mb-12">
            <span className="text-xs font-semibold text-accent tracking-widest uppercase mb-4 block">Legal</span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">GDPR Notice</h1>
            <p className="text-sm text-[#6B7280]">Last updated: {LAST_UPDATED} · For EU/EEA/UK residents</p>
          </div>

          <div className="flex gap-12 items-start">
            <LegalSidebar sections={SECTIONS} activeId={activeId} />

            <main className="flex-1 min-w-0">
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6 mb-6">
                <p className="text-sm text-[#9CA3AF] leading-relaxed">
                  <strong className="text-violet-400">🇪🇺 EU/EEA/UK Residents:</strong> This notice provides the specific GDPR disclosures required by EU data protection law. It supplements our Privacy Policy and governs our obligations as a data controller under the General Data Protection Regulation (EU) 2016/679.
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
                        para.startsWith('• ') ? (
                          <ul key={j} className="space-y-2 pl-2">
                            {para.split('\n').map((item, k) => (
                              <li key={k} className="flex items-start gap-2 text-sm text-[#9CA3AF] leading-relaxed">
                                <span className="text-violet-400 flex-shrink-0 mt-0.5">•</span>
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
                  Last updated: {LAST_UPDATED}. This notice is subject to change. Material changes will be communicated 30 days in advance.
                  Contact <a href="mailto:privacy@cybermindcli.com" className="text-violet-400">privacy@cybermindcli.com</a> for inquiries.
                </p>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
