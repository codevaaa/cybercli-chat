import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import SEOHead from '@components/seo/SEOHead'

const LAST_UPDATED = 'May 20, 2026'

const SECTIONS = [
  {
    id: 'what-are-cookies',
    title: '1. What Are Cookies',
    content: `Cookies are small text files stored on your device (computer, tablet, or mobile) when you visit a website. They do not damage your device and cannot search your computer for private information. Instead, they act as a memory for the website, allowing it to recognize your device when you return and provide a more personalized, seamless user experience.`,
  },
  {
    id: 'how-we-use',
    title: '2. How We Use Cookies',
    content: `We use cookies to enable core functionality, verify user identity, store preferences, and analyze platform performance. Specifically, our cookies fall into these categories:

**Essential Cookies**: Absolutely necessary for the website to function. They enable secure session management, keep you logged into your account, and prevent CSRF (Cross-Site Request Forgery) attacks. These cannot be disabled.

**Authentication Cookies**: Used to maintain your login session securely. They verify your credentials and authorize access to your chats and workspace projects.

**Preference Cookies**: Remember your user choices, including your selected AI model, custom instructions, sidebar toggle states, and theme selection. These improve usability and ensure a consistent experience across sessions.

**Analytics Cookies**: Help us understand aggregate user metrics, such as popular features, page load latencies, and route usage. They are used exclusively to improve platform speed and usability.`,
  },
  {
    id: 'managing-cookies',
    title: '3. Managing Cookies',
    content: `You have the right to decide whether to accept or reject cookies. Most web browsers automatically accept cookies by default, but you can usually modify your browser settings to decline cookies if you prefer.

If you choose to disable cookies, please note that you may not be able to sign in or use many of the interactive features of CyberCli Chat. Essential functionalities, including conversation tracking and multi-model routing, rely directly on secure cookie storage.`,
  },
  {
    id: 'third-party',
    title: '4. Third-Party Cookies',
    content: `We prioritize user privacy and data minimization. We do not use third-party advertising or retargeting cookies, nor do we share tracking identifiers with marketing networks.

Any performance analytics we perform are handled using privacy-respecting analytics providers with data fully anonymized and stored within secure EU regions.`,
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
                  ? 'text-white bg-orange-500/10 border-l-2 border-orange-500 pl-3'
                  : 'text-[#6B7280] hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <ChevronRight className={`w-3 h-3 flex-shrink-0 ${activeId === s.id ? 'text-orange-400' : 'text-[#374151]'}`} />
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

export default function CookiePolicyPage() {
  const activeId = useSectionTracker(SECTIONS)

  return (
    <div className="pt-28 pb-20 bg-[#0A0A0F]">
      <SEOHead
        title="Cookie Policy"
        description="CyberMindCLI cookie policy. Learn about the cookies we use, their purposes, and how to manage your preferences."
        path="/cookie-policy"
        keywords={['cookie policy', 'cookies', 'tracking', 'CyberMindCLI', 'privacy']}
      />
      <div className="section-padding">
        <div className="container-custom">
          <div className="mb-12">
            <span className="text-xs font-semibold text-accent tracking-widest uppercase mb-4 block">Legal</span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Cookie Policy</h1>
            <p className="text-sm text-[#6B7280]">Last updated: {LAST_UPDATED} · Effective immediately</p>
          </div>

          <div className="flex gap-12 items-start">
            <LegalSidebar sections={SECTIONS} activeId={activeId} />

            <main className="flex-1 min-w-0">
              <div className="rounded-2xl border border-white/[0.06] bg-[#0D0D14] p-8 mb-6">
                <p className="text-[#9CA3AF] text-sm leading-relaxed">
                  CyberCli Chat uses cookies and similar storage technologies to maintain secure logins, remember your model and interface configurations, and analyze overall site performance. We do not use advertising tracking cookies.
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
                                <span className="text-orange-400 flex-shrink-0 mt-0.5">•</span>
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
                  Last updated: {LAST_UPDATED}. Contact <a href="mailto:cybermindcli@cybermindcli.com" className="text-orange-400">cybermindcli@cybermindcli.com</a> with questions about this Cookie Policy.
                </p>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
