import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, ChevronRight, CornerDownRight, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import SEOHead from '@components/seo/SEOHead'

const SECTIONS = [
  { id: 'conversation-planning', label: '1. Plan your conversations' },
  { id: 'specific-concise', label: '2. Be specific and concise' },
  { id: 'search-memory', label: '3. Leverage search & memory' },
  { id: 'batch-requests', label: '4. Batch similar requests' },
  { id: 'edit-prompts', label: '5. Review & edit prompts' },
  { id: 'knowledge-bases', label: '6. Use project knowledge bases' },
  { id: 'monitor-consumption', label: '7. Monitor your consumption' },
  { id: 'coding-tips', label: '8. Quick coding tips' },
]

export default function UsageLimitBestPracticesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  return (
    <div className="pt-28 pb-20 bg-[#FBFBF8] text-[#191919] min-h-screen">
      <SEOHead
        title="Usage Limit Best Practices — Help Center"
        description="Help article explaining how to optimize your message quotas, write token-efficient prompts, manage system memory, and stay within limits."
        path="/usage-limit-best-practices"
        keywords={['usage limits', 'rate limits', 'prompt optimization', 'token budgets', 'CyberCli support']}
      />

      <div className="section-padding">
        <div className="container-custom max-w-5xl">
          {/* Breadcrumb & Support Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-black/[0.06] pb-6">
            <div className="flex items-center gap-2 text-xs text-[#666666]">
              <Link to="/docs" className="hover:text-[#D97757] transition-colors">Help Center</Link>
              <ChevronRight className="w-3 h-3 opacity-60" />
              <span className="text-[#191919] font-medium">Usage limit best practices</span>
            </div>

            {/* Support Search bar */}
            <div className="relative w-full max-w-sm">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black/30">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search help articles..."
                className="w-full pl-10 pr-4 py-2 bg-[#FAF8F5] border border-black/[0.08] rounded-xl text-sm focus:outline-none focus:border-[#D97757] focus:ring-1 focus:ring-[#D97757]"
              />
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="grid lg:grid-cols-4 gap-12 items-start">
            {/* Left: Article Body */}
            <main className="lg:col-span-3 min-w-0">
              <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-serif font-medium text-[#191919] mb-4">
                  Usage limit best practices
                </h1>
                <p className="text-xs text-[#666666] mb-6">Updated over a week ago · 6 min read</p>
                <p className="text-[#444444] text-sm leading-relaxed mb-6 font-medium">
                  In this article, we explain how to maximize your hourly message limits and manage your token budget efficiently. Select your plan tier to see your default quotas:
                </p>

                {/* Tier shortcuts */}
                <div className="flex flex-wrap gap-2 mb-8">
                  {['Free (50/hr)', 'Pro (500/hr)', 'Developer (1,500/hr)', 'Team & Enterprise'].map((t, idx) => (
                    <span
                      key={t}
                      className="text-xs font-semibold px-3 py-1 rounded-full border border-black/[0.06] bg-[#FAF8F5] text-[#444444]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sections content */}
              <div className="space-y-10 prose-support text-sm text-[#444444] leading-[1.8]">
                {/* 1 */}
                <section id="conversation-planning" className="scroll-mt-24">
                  <h2 className="text-lg font-bold text-[#191919] mb-3">1. Start by planning your conversations</h2>
                  <p className="mb-4">
                    Before starting a conversation with CyberCli, plan what you intend to accomplish. Try to structure your queries to get the most information out of a single interaction rather than asking minor questions repeatedly.
                  </p>
                  <ul className="space-y-1 pl-4 list-disc mb-4">
                    <li>What is the final output format you need?</li>
                    <li>Can you ask for multiple functions or modules in a single prompt?</li>
                    <li>Are there files or documentation you should attach first?</li>
                  </ul>
                </section>

                {/* 2 */}
                <section id="specific-concise" className="scroll-mt-24">
                  <h2 className="text-lg font-bold text-[#191919] mb-3">2. Be specific and concise</h2>
                  <p className="mb-4">
                    Avoid sending extremely long messages with redundant specifications. Give the model clear, itemized instructions. This minimizes prompt tokens and helps the model return accurate outputs on its first attempt, saving your message quota.
                  </p>
                </section>

                {/* 3 */}
                <section id="search-memory" className="scroll-mt-24">
                  <h2 className="text-lg font-bold text-[#191919] mb-3">3. Leverage search and memory capabilities</h2>
                  <p className="mb-4">
                    Instead of copying and pasting the same background context in every new chat:
                  </p>
                  <ul className="space-y-1 pl-4 list-disc mb-4">
                    <li>**Use custom agent personas** with saveable system prompts to avoid repeating instructions.</li>
                    <li>**Enable Memory** in Settings → Capabilities, so CyberCli remembers key technical configurations and preferences across separate threads.</li>
                  </ul>
                </section>

                {/* 4 */}
                <section id="batch-requests" className="scroll-mt-24">
                  <h2 className="text-lg font-bold text-[#191919] mb-3">4. Batch similar requests in one message</h2>
                  <p className="mb-4">
                    If you have multiple small tasks (like writing documentation comments, formatting lists, or renaming fields), combine them into a single, structured prompt. It takes only one message from your quota instead of five.
                  </p>
                </section>

                {/* 5 */}
                <section id="edit-prompts" className="scroll-mt-24">
                  <h2 className="text-lg font-bold text-[#191919] mb-3">5. Review and edit your prompt before sending</h2>
                  <p className="mb-4">
                    Make use of the message edit button. If you spot an error in your prompt, edit the message to correct it instead of sending a follow-up query. This keeps your thread context clean and saves messages.
                  </p>
                </section>

                {/* 6 */}
                <section id="knowledge-bases" className="scroll-mt-24">
                  <h2 className="text-lg font-bold text-[#191919] mb-3">6. Use project knowledge bases effectively</h2>
                  <p className="mb-4">
                    When importing codebase assets or uploading reference materials, isolate only the relevant files needed for your specific inquiry. Attaching massive folders increases prompt token overhead, slowing down inference speeds and eating into your message rate limit faster.
                  </p>
                </section>

                {/* 7 */}
                <section id="monitor-consumption" className="scroll-mt-24">
                  <h2 className="text-lg font-bold text-[#191919] mb-3">7. Monitor your consumption in Usage & Stats</h2>
                  <p className="mb-4">
                    You can view your token count, active billing cycle, and message counts in the app dashboard under <a href="/usage" className="text-[#D97757] hover:underline font-semibold">Usage & Stats</a>. This helps you track when limits reset.
                  </p>
                </section>

                {/* 8 */}
                <section id="coding-tips" className="scroll-mt-24">
                  <h2 className="text-lg font-bold text-[#191919] mb-3">8. Quick coding tips</h2>
                  <p className="mb-4">
                    When using CyberCli for code generation:
                  </p>
                  <ul className="space-y-2 pl-2">
                    <li className="flex items-start gap-2">
                      <CornerDownRight className="w-4 h-4 text-[#D97757] flex-shrink-0 mt-1" />
                      <span>**Ask for diffs** instead of complete file reprints to optimize token use.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CornerDownRight className="w-4 h-4 text-[#D97757] flex-shrink-0 mt-1" />
                      <span>**Use local CLI integration** (CyberCli Daemon) to sync changes directly into your editor, preventing copy-paste steps.</span>
                    </li>
                  </ul>
                </section>
              </div>

              {/* Helpful feedback block */}
              <div className="mt-12 border-t border-black/[0.06] pt-8 text-center">
                <p className="text-sm text-[#444444] mb-3">Did this article answer your question?</p>
                {!feedbackSubmitted ? (
                  <div className="flex justify-center gap-3">
                    {['😞', '😐', '😃'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setFeedbackSubmitted(true)}
                        className="text-xl px-4 py-2 hover:bg-black/[0.03] rounded-xl border border-black/[0.06] bg-[#FAF8F5] transition-all transform hover:scale-105 active:scale-95"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : (
                  <motion.p
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-sm font-semibold text-[#D97757]"
                  >
                    Thank you for your feedback!
                  </motion.p>
                )}
              </div>
            </main>

            {/* Right Sidebar: Quick contents */}
            <aside className="sticky top-24 hidden lg:block w-full flex-shrink-0">
              <div className="rounded-2xl border border-black/[0.06] bg-[#FAF8F5] p-5">
                <p className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-4">In this article</p>
                <nav className="space-y-2">
                  {SECTIONS.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="block text-xs text-[#666666] hover:text-[#D97757] hover:underline transition-colors leading-snug"
                    >
                      {s.label}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
