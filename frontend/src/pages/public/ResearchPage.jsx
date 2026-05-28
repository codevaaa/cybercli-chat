import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import SEOHead from '@components/seo/SEOHead'

const LAST_UPDATED = 'May 20, 2026'

const SECTIONS = [
  {
    id: 'intelligent-routing',
    title: '1. Intelligent Routing Gateway',
    content: `Our research focuses on solving the provider-lockin and reliability challenges of AI infrastructure.

Traditional architectures bind clients to a single vendor. Our gateway dynamically routes requests across 8+ distinct LLM providers based on continuous latency polling, current API error rates, rate limit windows, and model capabilities.

By treating compute units as a fluid utility, we maximize execution speeds and provide 99.9% fault-tolerance for user interactions.`,
  },
  {
    id: 'ensemble-reasoning',
    title: '2. Ensemble Reasoning (Council Mode)',
    content: `A central branch of our research is multi-model consensus and synthesis.

Through Council Mode, we run parallel inference pathways. Instead of presenting a single model's output, our synthesis layer parses three independent models (such as Cyber-Smart, Cyber-Balanced, and Cyber-Mini).

We analyze overlapping semantic structures, filter out outlier hallucinations, and compile a unified response. Public benchmarks demonstrate that ensemble reasoning reduces factual hallucinations by up to 47%.`,
  },
  {
    id: 'latency-reduction',
    title: '3. Latency Optimization & TTS',
    content: `Conversational AI requires low latency. We optimize performance at three critical bottlenecks:

• **Streaming SSE Gateway**: Optimizing server-sent events (SSE) pipeline setups to ensure characters stream immediately to the client.
• **High-speed compute pools**: Utilizing low-latency providers (such as Groq and Cerebras) for voice execution steps to maintain sub-500ms tokens-per-second outputs.
• **Server-side speech orchestration**: Orchestrating Gemini Flash TTS on the backend to begin audio caching before text streaming completes.`,
  },
  {
    id: 'safety-guardrails',
    title: '4. AI Safety & Watermarking',
    content: `We research balanced safety guardrails that protect users without restricting access to raw information:

• **Transparent reasoning**: Exposing collapsible chain-of-thought traces so users can verify the model's intermediate logic.
• **Input-Output sanitization**: Running local classifiers to detect malicious injection payloads or attempts to generate toxic content.
• **Ethics watermarking**: Injecting traceable watermarks into API outputs to encourage responsible, authentic sharing.`,
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

export default function ResearchPage() {
  const activeId = useSectionTracker(SECTIONS)

  return (
    <div className="pt-28 pb-20 bg-[#FBF9F6] text-[#191919]">
      <SEOHead
        title="AI Routing & Synthesis Research"
        description="CyberMindCLI Research portal. Learn about our dynamic AI routing systems, ensemble reasoning algorithms, and latency reduction experiments."
        path="/research"
        keywords={['AI research', 'ensemble reasoning', 'intelligent gateway', 'hallucination reduction', 'CyberMindCLI research']}
      />
      <div className="section-padding">
        <div className="container-custom">
          {/* Header */}
          <div className="mb-12 border-b border-black/[0.06] pb-8">
            <span className="text-xs font-semibold text-[#D97757] tracking-widest uppercase mb-4 block">Intelligence & Innovation</span>
            <h1 className="text-4xl md:text-5xl font-serif font-medium text-[#191919] mb-3 tracking-tight">AI Research</h1>
            <p className="text-sm text-[#666666]">Last updated: {LAST_UPDATED} · Effective immediately</p>
          </div>

          <div className="flex gap-12 items-start">
            <LegalSidebar sections={SECTIONS} activeId={activeId} />

            {/* Main content */}
            <main className="flex-1 min-w-0">
              <div className="rounded-2xl border border-black/[0.06] bg-[#FAF8F5] p-8 mb-8">
                <p className="text-[#444444] text-sm leading-relaxed">
                  CyberMindCLI conducts research in distributed inference, ensemble learning, and multi-model synthesis. Our mission is to make advanced reasoning architectures faster, more reliable, and universally accessible. Explore our ongoing research topics below.
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
                  This research index was last updated on {LAST_UPDATED}. For research collaborations or academic compute grants, please contact our research board at <a href="mailto:cybermindcli@cybermindcli.com" className="text-[#D97757] hover:underline">cybermindcli@cybermindcli.com</a>.
                </p>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
