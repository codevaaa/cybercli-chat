import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import SEOHead from '@components/seo/SEOHead'

const LAST_UPDATED = 'May 20, 2026'

const SECTIONS = [
  {
    id: 'overview',
    title: '1. Overview',
    content: `CyberMindCLI ("we," "us," "our") operates CyberCli Chat at cyberclichat.com (the "Service"). This Privacy Policy explains how we collect, use, store, and protect your personal data when you use the Service.

We are committed to processing your personal data in accordance with applicable data protection laws, including the EU General Data Protection Regulation (GDPR), the UK GDPR, the California Consumer Privacy Act (CCPA), and other applicable privacy laws.

If you are an EU/EEA resident, the data controller responsible for your personal data is CyberMindCLI, contactable at cybermindcli@cybermindcli.com.`,
  },
  {
    id: 'data-collected',
    title: '2. Data We Collect',
    content: `We collect the following categories of personal data:

**Account Data**: When you create an account, we collect your email address, display name, and password hash (managed by Supabase Auth). Optionally, you may provide a profile picture and bio.

**Conversation Data**: The messages you send and receive through the Service, including prompts, AI responses, and any attached files. Conversation data is stored encrypted in MongoDB Atlas.

**Usage Data**: Information about how you use the Service, including features accessed, models used, session duration, and feature interaction patterns. This data is collected in aggregate and used to improve the Service.

**Device and Technical Data**: IP address, browser type and version, operating system, device identifiers, and referral URLs. This data is collected automatically when you access the Service.

**Payment Data**: If you upgrade to a paid plan, payment processing is handled by Stripe. We do not store full card numbers — only the last four digits and expiry date for display purposes.

**Communications**: If you contact us, we retain the content of that communication to provide support and improve our Service.`,
  },
  {
    id: 'legal-basis',
    title: '3. Legal Basis for Processing (GDPR)',
    content: `If you are located in the EU/EEA, we process your personal data on the following legal bases:

**Contract Performance (Art. 6(1)(b) GDPR)**: Processing your account data, conversation data, and payment data is necessary to provide the Service you have contracted for.

**Legitimate Interests (Art. 6(1)(f) GDPR)**: We process usage data and technical data based on our legitimate interest in improving the Service, preventing fraud, and ensuring security. We have assessed that our legitimate interests are not overridden by your rights and interests.

**Consent (Art. 6(1)(a) GDPR)**: We process marketing communications and optional analytics data based on your explicit consent, which you may withdraw at any time.

**Legal Obligation (Art. 6(1)(c) GDPR)**: In certain circumstances, we may be required to process your data to comply with a legal obligation, such as responding to a valid court order.`,
  },
  {
    id: 'data-use',
    title: '4. How We Use Your Data',
    content: `We use your personal data for the following purposes:

**Providing the Service**: Authenticating your identity, routing AI queries, returning AI responses, storing your conversation history, and enabling features you use.

**Security and Fraud Prevention**: Detecting and preventing unauthorized access, abuse, spam, and illegal use of the Service.

**Improving the Service**: Analyzing aggregate usage patterns to understand which features are valuable, identifying performance bottlenecks, and guiding product decisions. We do not use your individual conversation content to train AI models without your explicit consent.

**Communications**: Sending transactional emails (account confirmation, password reset, billing receipts) and, where you have opted in, product updates and newsletters.

**Legal Compliance**: Responding to legal process, law enforcement requests, and regulatory obligations.`,
  },
  {
    id: 'data-sharing',
    title: '5. Data Sharing and Third Parties',
    content: `We share your personal data with the following categories of third parties:

**AI Model Providers**: Your conversation prompts are transmitted to third-party AI providers (OpenRouter, Google, Groq, Cerebras, Cloudflare, HuggingFace, Bytez, NVIDIA) to generate responses. These providers process your prompts under their own privacy policies. We select providers with strong privacy practices and data processing agreements where available.

**Infrastructure Providers**: Supabase (authentication and PostgreSQL database), MongoDB Atlas (conversation storage), Render (backend hosting), and Vercel (frontend hosting). These providers process data under data processing agreements that comply with GDPR requirements.

**Payment Processor**: Stripe processes payment information for paid plans. Stripe's privacy policy governs how it handles your payment data.

**Analytics**: We use privacy-preserving analytics that do not track individual users across websites or sell data to advertisers.

We do not sell your personal data to third parties. We do not share your data with advertising networks.`,
  },
  {
    id: 'data-retention',
    title: '6. Data Retention',
    content: `We retain your personal data for the following periods:

**Account Data**: Retained for the duration of your account and deleted within 30 days of account termination.

**Conversation Data**: Retained for the duration of your account. You may delete individual conversations at any time from within the Service. Upon account deletion, all conversation data is permanently deleted within 30 days.

**Usage and Technical Data**: Aggregate usage data is retained for up to 24 months. Individual IP addresses are anonymized within 90 days.

**Payment Records**: Transaction records are retained for 7 years to comply with financial regulations.

**Support Communications**: Retained for 3 years to support customer service follow-up.

After the applicable retention period, data is permanently deleted or anonymized so that it can no longer be associated with you.`,
  },
  {
    id: 'your-rights',
    title: '7. Your Privacy Rights',
    content: `Depending on your jurisdiction, you have the following rights regarding your personal data:

**Right of Access**: You may request a copy of the personal data we hold about you, including what categories of data we have, how it is used, and who we share it with.

**Right to Rectification**: You may request correction of inaccurate personal data we hold about you.

**Right to Erasure**: You may request deletion of your personal data. Note that we may be required to retain certain data for legal or contractual reasons.

**Right to Data Portability**: You may request your personal data in a structured, machine-readable format (JSON) for transfer to another service.

**Right to Restrict Processing**: You may request that we restrict how we process your data in certain circumstances.

**Right to Object**: You may object to processing based on legitimate interests at any time.

**Right to Withdraw Consent**: Where processing is based on consent, you may withdraw it at any time without affecting the lawfulness of prior processing.

To exercise any of these rights, contact cybermindcli@cybermindcli.com. We will respond within 30 days. You also have the right to lodge a complaint with your local data protection authority.`,
  },
  {
    id: 'security',
    title: '8. Security Measures',
    content: `We implement the following security measures to protect your personal data:

**Encryption**: All data is encrypted in transit using TLS 1.3. Conversation content and sensitive fields in MongoDB are encrypted at rest using field-level encryption (FLE) with AES-256.

**Access Controls**: Access to production systems is restricted to authorized personnel using multi-factor authentication and principle of least privilege.

**Authentication Security**: User authentication is managed by Supabase with bcrypt password hashing, JWT token validation, and Row-Level Security (RLS) policies that ensure users can only access their own data.

**Monitoring**: We maintain security monitoring, intrusion detection systems, and regular security audits.

**Incident Response**: We have a documented incident response plan. In the event of a data breach affecting your rights and freedoms, we will notify you and relevant supervisory authorities within 72 hours of becoming aware of the breach, as required by GDPR.`,
  },
  {
    id: 'international-transfers',
    title: '9. International Data Transfers',
    content: `Your data may be processed in countries outside your own. When we transfer personal data from the EU/EEA to third countries, we rely on appropriate safeguards including:

• Standard Contractual Clauses (SCCs) approved by the European Commission
• Adequacy decisions issued by the European Commission
• Privacy Shield successor frameworks where applicable

Our primary infrastructure providers (Supabase, MongoDB Atlas) maintain EU-based data processing options. Upon request, we can provide more information about the specific transfer mechanisms we use.`,
  },
  {
    id: 'cookies',
    title: '10. Cookies and Tracking',
    content: `We use cookies and similar technologies for the following purposes:

**Essential Cookies**: Required for the Service to function. These include authentication session cookies and CSRF protection tokens. These cannot be disabled.

**Preference Cookies**: Remember your settings such as theme preference and selected model. These are set only after you use the Service.

**Analytics Cookies**: Aggregate usage analytics. These are set only with your consent, which you can manage via the cookie preferences banner.

We do not use third-party advertising cookies or participate in cross-site behavioral advertising. You can manage cookies through your browser settings, but disabling essential cookies will impair Service functionality.`,
  },
  {
    id: 'contact',
    title: '11. Contact Us',
    content: `For privacy-related inquiries, requests, or complaints:

**Privacy Officer**: cybermindcli@cybermindcli.com
**General Contact**: cybermindcli@cybermindcli.com
**Security Concerns**: cybermindcli@cybermindcli.com
**Legal Matters**: cybermindcli@cybermindcli.com

We aim to respond to all privacy requests within 30 days. For complex requests, we may extend this period by an additional 60 days, in which case we will notify you within the initial 30 days.

If you are an EU/EEA resident and we have not resolved your concern satisfactorily, you have the right to lodge a complaint with your local data protection authority.`,
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

export default function PrivacyPolicyPage() {
  const activeId = useSectionTracker(SECTIONS)

  return (
    <div className="pt-28 pb-20 bg-[#FBF9F6] text-[#191919]">
      <SEOHead
        title="Privacy Policy"
        description="CyberMindCLI privacy policy. Learn how we collect, use, and protect your data. GDPR and CCPA compliant."
        path="/privacy-policy"
        keywords={['privacy policy', 'data protection', 'GDPR', 'CCPA', 'CyberMindCLI', 'AI privacy']}
      />
      <div className="section-padding">
        <div className="container-custom">
          <div className="mb-12 border-b border-black/[0.06] pb-8">
            <span className="text-xs font-semibold text-[#D97757] tracking-widest uppercase mb-4 block">Legal & Policies</span>
            <h1 className="text-4xl md:text-5xl font-serif font-medium text-[#191919] mb-3 tracking-tight">Privacy Policy</h1>
            <p className="text-sm text-[#666666]">Last updated: {LAST_UPDATED} · Effective immediately</p>
          </div>

          <div className="flex gap-12 items-start">
            <LegalSidebar sections={SECTIONS} activeId={activeId} />

            <main className="flex-1 min-w-0">
              <div className="rounded-2xl border border-black/[0.06] bg-[#FAF8F5] p-8 mb-8">
                <p className="text-[#444444] text-sm leading-relaxed">
                  At CyberMindCLI, privacy is not a checkbox — it is a design principle. We are committed to being transparent about the data we collect, why we collect it, and how we protect it. This policy applies to all users of CyberCli Chat globally.
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
                  Last updated: {LAST_UPDATED}. Contact <a href="mailto:cybermindcli@cybermindcli.com" className="text-[#D97757] hover:underline">cybermindcli@cybermindcli.com</a> with questions.
                </p>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
