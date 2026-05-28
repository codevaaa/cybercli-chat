import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import SEOHead from '@components/seo/SEOHead'

const LAST_UPDATED = 'May 20, 2026'

const SECTIONS = [
  {
    id: 'introduction',
    title: '1. Introduction',
    content: `These Consumer Terms of Service ("Terms") govern your access to and use of CyberCli Chat ("the Service") as an individual consumer. The Service is operated by CyberMindCLI ("we," "us," or "our").

By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Service. These Terms constitute a legally binding agreement between you and CyberMindCLI.

Please read these Terms carefully before using the Service. They contain important information about your legal rights, remedies, and obligations, including limitations of liability and dispute resolution procedures.`,
  },
  {
    id: 'using-services',
    title: '2. Using our Services',
    content: `**Eligibility**: You must be at least 13 years of age (or the minimum age of digital consent in your country of residence) to create an account and use the Service. If you are under 18, you must have your parent or legal guardian's permission to use the Service.

**Account Registration**: You must provide accurate and complete information to register for an account. You are responsible for maintaining the security of your credentials and for all activities that occur under your account. If you believe your account has been compromised, contact us immediately.

**Usage Limits & Rates**: We provide both free and paid tiers of access. Free tier users are subject to rate limits (such as 50 requests per hour) and standard compute queues. You agree to respect these limits and not attempt to bypass them through multiple accounts or automated scripts.`,
  },
  {
    id: 'user-content',
    title: '3. Your Content',
    content: `**Prompts and Outputs**: You may provide inputs to the Service ("Prompts") and receive generated outputs ("Outputs"). Together, Prompts and Outputs are "Your Content." You are responsible for Your Content, including ensuring that it does not violate any applicable law or these Terms.

**Ownership**: As between you and CyberMindCLI, you retain all ownership rights in your Prompts. To the extent permitted by law, we assign to you all our rights, title, and interest in and to the Outputs generated in response to your Prompts.

**Data Training Policy**: We value your privacy. We do not use Your Content (conversations, documents, or logs) to train our AI models without your explicit consent. Your data remains yours.`,
  },
  {
    id: 'acceptable-use',
    title: '4. Acceptable Use',
    content: `You must comply with our Acceptable Use Policy when using the Service. Specifically, you agree not to use the Service to:

• Develop, generate, or distribute harmful, illegal, or malicious software.
• Generate content that violates intellectual property rights, promotes hate speech, or incites violence.
• Conduct unauthorized penetration testing or security scanning.
• Reverse engineer, scrape, or extract model weights from our gateway nodes.
• Bypass safety filters, guardrails, or rate limiters.`,
  },
  {
    id: 'intellectual-property',
    title: '5. Our Intellectual Property',
    content: `The Service, including its software, UI/UX design, logos, assets, and documentation, is the exclusive property of CyberMindCLI and protected by copyright, trademark, and other laws.

You may not copy, modify, distribute, sell, lease, or reverse engineer any part of our Service. The brand names, logos (including the CyberCli mark), and product titles are trademarks of CyberMindCLI.`,
  },
  {
    id: 'fees-payment',
    title: '6. Fees & Paid Subscriptions',
    content: `**Subscription Fees**: If you sign up for a paid subscription (such as CyberCli Pro), you agree to pay the fees associated with that plan. All payments are billed in advance on a recurring monthly basis.

**Billing & Stripe**: Billing operations are securely handled through Stripe. You must provide a valid payment method. You can cancel your subscription at any time from your account dashboard, and you will retain access until the end of your billing cycle.

**Refunds**: Subscription fees are non-refundable except as required by law or as expressly stated in our billing policy.`,
  },
  {
    id: 'termination',
    title: '7. Term & Termination',
    content: `**Termination by You**: You may stop using the Service and delete your account at any time by accessing your profile settings.

**Termination by Us**: We reserve the right to suspend or terminate your access to the Service immediately, with or without notice, if we believe you have violated these Terms, engaged in illegal activity, or created liability for us.

**Effect of Termination**: Upon account deletion, all your conversation histories, custom personas, and settings will be permanently purged within 30 days.`,
  },
  {
    id: 'liability-limitations',
    title: '8. Disclaimers & Liability',
    content: `**AI Output Disclaimer**: The Service provides outputs generated by artificial intelligence. Outputs may contain inaccuracies, hallucinations, or outdated information. You should independently verify any output before relying on it. The Service is not a substitute for professional legal, medical, or financial advice.

**Warranty Disclaimer**: The Service is provided "as is" and "as available," without warranty of any kind, express or implied.

**Limitation of Liability**: To the maximum extent permitted by law, CyberMindCLI shall not be liable for any indirect, incidental, special, or consequential damages, including loss of profits, data, or goodwill, arising from your use of the Service.`,
  },
  {
    id: 'disputes',
    title: '9. Dispute Resolution',
    content: `These Terms shall be governed by and construed in accordance with the laws of our operating jurisdiction.

Any disputes arising from these Terms or your use of the Service shall be resolved through binding arbitration on an individual basis. You waive any right to participate in class actions or class-wide arbitration.`,
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

export default function ConsumerTermsPage() {
  const activeId = useSectionTracker(SECTIONS)

  return (
    <div className="pt-28 pb-20 bg-[#FBF9F6] text-[#191919]">
      <SEOHead
        title="Consumer Terms of Service"
        description="CyberMindCLI consumer terms of service. Usage rules, user content details, billing policies, and legal agreements."
        path="/legal/consumer-terms"
        keywords={['consumer terms', 'terms of service', 'user agreement', 'CyberMindCLI', 'AI terms']}
      />
      <div className="section-padding">
        <div className="container-custom">
          {/* Header */}
          <div className="mb-12 border-b border-black/[0.06] pb-8">
            <span className="text-xs font-semibold text-[#D97757] tracking-widest uppercase mb-4 block">Legal & Policies</span>
            <h1 className="text-4xl md:text-5xl font-serif font-medium text-[#191919] mb-3 tracking-tight">Consumer Terms of Service</h1>
            <p className="text-sm text-[#666666]">Last updated: {LAST_UPDATED} · Effective immediately</p>
          </div>

          <div className="flex gap-12 items-start">
            <LegalSidebar sections={SECTIONS} activeId={activeId} />

            {/* Main content */}
            <main className="flex-1 min-w-0">
              <div className="rounded-2xl border border-black/[0.06] bg-[#FAF8F5] p-8 mb-8">
                <p className="text-[#444444] text-sm leading-relaxed">
                  These Consumer Terms govern your access to and personal use of CyberCli Chat. By using our platform, you agree to comply with these rules. If you represent an organization or intend to use our API programmatically, please refer to our <a href="/legal/commercial-terms" className="text-[#D97757] hover:underline font-medium">Commercial Terms</a>.
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
                  These Consumer Terms were last updated on {LAST_UPDATED}. For legal inquiries or support requests, please contact our team at <a href="mailto:cybermindcli@cybermindcli.com" className="text-[#D97757] hover:underline">cybermindcli@cybermindcli.com</a>.
                </p>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
