import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import SEOHead from '@components/seo/SEOHead'

const LAST_UPDATED = 'May 20, 2026'

const SECTIONS = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: `By accessing or using Codeva ("the Service"), operated by CODEVAA Pvt Ltd ("we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service. These Terms constitute a legally binding agreement between you and CODEVAA Pvt Ltd.

By creating an account, you represent that you are at least 13 years of age (or the minimum age of digital consent in your jurisdiction), have the legal capacity to enter into binding contracts, and will comply with all applicable laws and regulations. If you are accessing the Service on behalf of an organization, you represent that you have authority to bind that organization to these Terms.`,
  },
  {
    id: 'description',
    title: '2. Description of Service',
    content: `Codeva is an AI-powered chat platform that provides access to multiple large language models (LLMs) from third-party providers including but not limited to OpenRouter, Google Gemini, Groq, Cerebras, Cloudflare, HuggingFace, Bytez, and NVIDIA. The Service includes:

• Multi-model AI chat with intelligent routing
• Council Mode for multi-model consensus responses
• Text-to-speech and voice input capabilities
• Conversation history and organization features
• API access for programmatic integration
• Additional features as added over time

Codeva reserves the right to modify, suspend, or discontinue any aspect of the Service at any time, with or without notice. We will make reasonable efforts to notify users of significant changes that materially affect their use of the Service.`,
  },
  {
    id: 'accounts',
    title: '3. User Accounts',
    content: `To access certain features of the Service, you must create an account. You are responsible for:

**Account Security**: Maintaining the confidentiality of your login credentials. You must immediately notify us at cybermindcli@cybermindcli.com of any unauthorized use of your account. We are not liable for losses arising from unauthorized account access resulting from your failure to protect your credentials.

**Account Accuracy**: Providing accurate, current, and complete information during registration. You agree to promptly update your account information to keep it accurate, current, and complete.

**Account Activity**: All activity that occurs under your account, whether or not you authorized it. You may not share your account credentials with third parties, sell or transfer your account, or create accounts by automated means.

**Prohibited Accounts**: You may not create an account if you have been previously banned from the Service, or if you are located in a jurisdiction subject to international sanctions that would prohibit your use of the Service.`,
  },
  {
    id: 'acceptable-use',
    title: '4. Acceptable Use Policy',
    content: `You agree not to use the Service to generate, transmit, or facilitate:

**Prohibited Content**: Child sexual abuse material (CSAM) or any content that sexualizes minors; content that constitutes illegal harassment, threats, or incitement to violence; materials that violate intellectual property rights of third parties; defamatory content that you know to be false and damaging.

**Abuse**: Any attempt to reverse engineer, scrape, or interfere with the integrity of the Service or the underlying model providers is strictly prohibited. You may not use the Service to build competing products.

**Security Violations**: Unauthorized penetration testing against third-party systems without explicit written authorization; development of malware designed to cause harm to third-party systems; circumvention of security measures of any system without authorization.

**Abuse Clause**: Users are strictly prohibited from using CODEVAA for generating malicious software, cyberattacks, malware, or any illegal activities. The platform holds zero tolerance for unlawful exploitation.

**Spam and Manipulation**: Automated generation of spam content; coordinated inauthentic behavior campaigns; creation of synthetic media designed to deceive (deepfakes) in harmful contexts.

**Legal Violations**: Any use that violates applicable local, national, or international laws or regulations; export control violations; sanctions violations.

We reserve the right to suspend or terminate accounts that violate this policy, and to report illegal activity to appropriate law enforcement authorities.`,
  },
  {
    id: 'intellectual-property',
    title: '5. Intellectual Property',
    content: `**Your Content**: You retain ownership of all content you input into the Service ("User Content"). By using the Service, you grant CODEVAA Pvt Ltd a limited, non-exclusive, worldwide, royalty-free license to process, transmit, and store your User Content solely for the purpose of providing the Service.

**AI Outputs**: Outputs generated by AI models in response to your prompts ("AI Outputs") are not guaranteed to be original and may be similar to outputs generated for other users. We make no claims of copyright ownership in AI Outputs, and our ability to grant you rights in AI Outputs is limited by the terms of the underlying model providers.

**Service IP**: The Service, including its software, design, features, and documentation, is owned by CODEVAA Pvt Ltd and protected by intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of the Service.

**Feedback**: Any feedback, suggestions, or ideas you provide about the Service may be used by CODEVAA Pvt Ltd without compensation or attribution to you.`,
  },
  {
    id: 'privacy',
    title: '6. Privacy and Data',
    content: `Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Key data practices include:

• Conversation data is stored encrypted in MongoDB Atlas with field-level encryption for sensitive fields
• We do not train our models on your conversation data without explicit consent
• Authentication data is managed by Supabase with industry-standard security practices
• We implement data minimization principles — we collect only what is necessary to provide the Service
• You may request deletion of your account and associated data at any time by contacting cybermindcli@cybermindcli.com

For complete information about how we handle your data, please review our Privacy Policy and GDPR Notice.`,
  },
  {
    id: 'disclaimers',
    title: '7. Disclaimers and Limitations',
    content: `**AI Accuracy & As-Is Clause**: The service is provided "AS IS". CODEVAA Pvt Ltd does not guarantee the 100% accuracy, safety, or reliability of the outputs generated by its core modes (including Madhav, Kali, Council, and others). AI-generated content may be inaccurate, incomplete, or outdated. The Service is not a substitute for professional legal, medical, financial, or security advice. You assume sole responsibility for evaluating the accuracy of AI Outputs and for any reliance you place on them.

**Service Availability**: The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components.

**Limitation of Liability**: To the maximum extent permitted by applicable law, CODEVAA Pvt Ltd shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising from your use of or inability to use the Service. Under no circumstances shall the company or its developers be held liable for any data loss, financial loss, or technical damage resulting from the use of this AI.

**Third-Party Models**: We act as a gateway to third-party AI model providers. The outputs of those models are governed by the terms of those providers, and we disclaim all liability for the content generated by third-party models.`,
  },
  {
    id: 'termination',
    title: '8. Termination',
    content: `**By You**: You may terminate your account at any time by accessing your account settings and requesting account deletion. Upon termination, your right to use the Service will immediately cease.

**By Us**: We may suspend or terminate your account immediately, without prior notice or liability, for any reason including: violation of these Terms; illegal use of the Service; non-payment of applicable fees; or inactivity for more than 24 months.

**Effect of Termination**: Upon termination, we will delete your account data in accordance with our data retention policy. Conversations and settings will be permanently deleted within 30 days of termination. Some aggregate, anonymized data may be retained for analytics purposes.`,
  },
  {
    id: 'governing-law',
    title: '9. Governing Law & Disputes',
    content: `These Terms are governed by and construed in accordance with applicable laws. Any disputes arising from these Terms or your use of the Service shall be resolved through binding arbitration, except that either party may seek injunctive relief in a court of competent jurisdiction to prevent irreparable harm.

If you are an EU/EEA consumer, mandatory local consumer protection laws may apply and may not be waived by these Terms. Nothing in these Terms limits any rights you have under applicable consumer protection legislation.

**Class Action Waiver**: To the extent permitted by law, you agree to resolve disputes with us only on an individual basis and not as part of a class action.`,
  },
  {
    id: 'changes',
    title: '10. Changes to Terms',
    content: `We reserve the right to modify these Terms at any time. We will provide at least 30 days' notice before material changes take effect by: sending an email to your registered address, displaying a prominent notice in the Service interface, and updating the "Last Updated" date on this page.

Your continued use of the Service after changes take effect constitutes acceptance of the revised Terms. If you do not agree to the revised Terms, you must stop using the Service.

For questions about these Terms, contact us at cybermindcli@cybermindcli.com.`,
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

export default function TermsPage() {
  const activeId = useSectionTracker(SECTIONS)

  return (
    <div className="pt-28 pb-20 bg-[#FBF9F6] text-[#191919]">
      <SEOHead
        title="Terms of Service"
        description="Codeva terms of service. Usage terms, liability, intellectual property, and user responsibilities."
        path="/terms-of-service"
        keywords={['terms of service', 'user agreement', 'Codeva', 'AI terms', 'acceptable use']}
      />
      <div className="section-padding">
        <div className="container-custom">
          {/* Header */}
          <div className="mb-12 border-b border-black/[0.06] pb-8">
            <span className="text-xs font-semibold text-[#D97757] tracking-widest uppercase mb-4 block">Legal & Policies</span>
            <h1 className="text-4xl md:text-5xl font-serif font-medium text-[#191919] mb-3 tracking-tight">Terms of Service</h1>
            <p className="text-sm text-[#666666]">Last updated: {LAST_UPDATED} · Effective immediately</p>
          </div>

          <div className="flex gap-12 items-start">
            <LegalSidebar sections={SECTIONS} activeId={activeId} />

            {/* Main content */}
            <main className="flex-1 min-w-0">
              <div className="rounded-2xl border border-black/[0.06] bg-[#FAF8F5] p-8 mb-8">
                <p className="text-[#444444] text-sm leading-relaxed">
                  Please read these Terms of Service carefully before using Codeva. These Terms govern your access to and use of the Service. By using the Service, you agree to these Terms. If you have questions, contact us at <a href="mailto:cybermindcli@cybermindcli.com" className="text-[#D97757] hover:underline font-semibold">cybermindcli@cybermindcli.com</a>.
                </p>
              </div>

              <div className="space-y-12">
                {SECTIONS.map((section, i) => (
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
                  These Terms of Service were last updated on {LAST_UPDATED} and supersede all previous versions.
                  For legal inquiries, contact <a href="mailto:cybermindcli@cybermindcli.com" className="text-[#D97757] hover:underline">cybermindcli@cybermindcli.com</a>.
                </p>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
