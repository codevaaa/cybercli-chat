import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, ChevronLeft, ChevronDown, Menu, X, Clock, Calendar,
  ThumbsUp, ThumbsDown, Sparkles, Hash, ArrowLeft, ArrowRight, BookOpen
} from 'lucide-react'
import { CATEGORIES } from './DocsPage'

/* ─── Article content database ─── */
const ARTICLE_CONTENT = {
  'quick-start-guide': {
    title: 'Quick Start Guide',
    category: 'Getting Started',
    categoryId: 'getting-started',
    lastUpdated: 'May 18, 2026',
    readTime: '3 min',
    intro: 'Get up and running with CyberCli Chat in under 5 minutes.',
    sections: [
      {
        id: 'create-account',
        heading: 'Step 1: Create an Account',
        content: `Sign up with your email, Google, or GitHub account. You'll receive a verification email — click the link to activate your account. Free accounts get full access to all free-tier models immediately.`,
      },
      {
        id: 'first-chat',
        heading: 'Step 2: Start Your First Chat',
        content: `Click "New Chat" from the sidebar. Select any model from the model picker (we recommend Gemini 2.5 Flash to start). Type your first message and press Enter. Your response streams in real time.`,
      },
      {
        id: 'explore-features',
        heading: 'Step 3: Explore Key Features',
        content: `Once comfortable with basic chat, try these power features: Council Mode (three models debate your question), Voice Chat (hold spacebar to talk), and Conversation Branching (right-click any message to fork a new thread).`,
      },
      {
        id: 'keyboard-shortcuts',
        heading: 'Useful Keyboard Shortcuts',
        content: `Press Ctrl+K to open the command palette. Use Ctrl+Enter to send a message. Press Escape to cancel a streaming response. Use Alt+N for a new chat thread.`,
      },
    ],
  },
  'council-mode-deep-dive': {
    title: 'Council Mode Deep Dive',
    category: 'Advanced Features',
    categoryId: 'advanced-features',
    lastUpdated: 'May 15, 2026',
    readTime: '7 min',
    intro: 'Council Mode is CyberCli\'s flagship feature — it sends your question to three AI models simultaneously and synthesizes the best answer.',
    sections: [
      {
        id: 'how-it-works',
        heading: 'How Council Mode Works',
        content: `When you enable Council Mode, your query is dispatched to three different models chosen based on the task type. Each model responds independently. A synthesis model then reads all three responses and generates a unified, best-of-all-worlds answer with citations to which model contributed what insight.`,
      },
      {
        id: 'choosing-models',
        heading: 'Choosing Your Council',
        content: `By default, CyberCli auto-selects the best three models for your query. You can manually pick models from the Council Configuration panel. We recommend combining a reasoning model (Cyber-Smart), a creative model (Cyber-Pro), and a fast model (Cyber-Fast) for general use.`,
      },
      {
        id: 'when-to-use',
        heading: 'When to Use Council Mode',
        content: `Council Mode excels at complex research questions, nuanced ethical dilemmas, creative projects requiring multiple perspectives, and any task where a single model's bias might mislead. It's less ideal for quick factual lookups or simple coding tasks where speed matters more than depth.`,
      },
      {
        id: 'reading-output',
        heading: 'Reading Council Output',
        content: `The synthesis output includes color-coded attribution showing which parts came from which model. You can expand any individual model's raw response using the "Show Individual Responses" toggle. Each model response also shows a confidence indicator.`,
      },
    ],
  },
  'authentication-api-keys': {
    title: 'Authentication & API Keys',
    category: 'API Reference',
    categoryId: 'api-reference',
    lastUpdated: 'May 16, 2026',
    readTime: '4 min',
    intro: 'Learn how to authenticate with the CyberCli API using JWT tokens and API keys.',
    sections: [
      {
        id: 'jwt-auth',
        heading: 'JWT Authentication',
        content: `All API requests must include an Authorization header with a Bearer token. Obtain your JWT by authenticating through /api/v1/auth/login. Tokens expire after 7 days and can be refreshed using /api/v1/auth/refresh.`,
      },
      {
        id: 'api-keys',
        heading: 'Creating API Keys',
        content: `For server-to-server integrations, generate an API key from Settings → API Keys. API keys never expire unless explicitly revoked. Treat API keys like passwords — never expose them in client-side code or public repositories.`,
      },
      {
        id: 'scopes',
        heading: 'Permission Scopes',
        content: `API keys support granular permission scopes: chat:read, chat:write, models:read, tts:read, settings:read, and settings:write. Always use the minimum required scopes for your use case.`,
      },
      {
        id: 'rate-limits',
        heading: 'Rate Limits',
        content: `Free tier: 50 requests/hour. Pro tier: 500 requests/hour. Enterprise: custom limits. Rate limit headers are returned with every response: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset.`,
      },
    ],
  },
  'setting-up-voice-chat': {
    title: 'Setting Up Voice Chat',
    category: 'Voice & TTS',
    categoryId: 'voice-tts',
    lastUpdated: 'May 14, 2026',
    readTime: '4 min',
    intro: 'Enable walkie-talkie style voice conversations with CyberCli\'s AI voices.',
    sections: [
      {
        id: 'browser-permissions',
        heading: 'Browser Microphone Permissions',
        content: `Voice Chat requires microphone access. On first use, your browser will ask for permission — click Allow. If you accidentally denied access, go to your browser settings and reset microphone permissions for cybercli.chat.`,
      },
      {
        id: 'using-voice',
        heading: 'Using Voice Chat',
        content: `Navigate to /voice-chat or press the microphone icon in the chat sidebar. Hold Spacebar (or the large mic button) to speak. Release to send. The AI responds automatically using text-to-speech. It's exactly like a walkie-talkie.`,
      },
      {
        id: 'choosing-voice',
        heading: 'Choosing a TTS Voice',
        content: `Go to Settings → Voice to pick from 5 unique AI voices. Free tier voices use Gemini Flash TTS. Pro tier unlocks 25+ ElevenLabs voices via Puter.js for ultra-realistic speech with no usage cost.`,
      },
      {
        id: 'troubleshooting',
        heading: 'Common Issues',
        content: `If voice isn't working: ensure your browser supports Web Speech API (Chrome and Edge are recommended). Check that your microphone is not being used by another application. Try refreshing the page if the session appears stuck.`,
      },
    ],
  },
}

// Fallback article for unknown slugs
const FALLBACK_ARTICLE = {
  title: 'Documentation Article',
  category: 'Getting Started',
  categoryId: 'getting-started',
  lastUpdated: 'May 2026',
  readTime: '3 min',
  intro: 'This article is being written. Check back soon!',
  sections: [
    { id: 'coming-soon', heading: 'Coming Soon', content: 'This documentation page is under construction. Browse other articles in the sidebar.' },
  ],
}

/* ─── Sidebar (shared, same as DocsPage) ─── */
function DocsSidebar({ activeSlug, onClose, isMobile = false }) {
  const [openCats, setOpenCats] = useState(() => {
    const initial = {}
    CATEGORIES.forEach(c => {
      // Auto-open the active category
      initial[c.id] = c.articles.some(a => a.slug === activeSlug)
    })
    if (!Object.values(initial).some(Boolean)) {
      CATEGORIES.forEach(c => { initial[c.id] = true })
    }
    return initial
  })
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const navigate = useNavigate()

  const toggleCat = (id) => setOpenCats(p => ({ ...p, [id]: !p[id] }))

  const filtered = search.trim()
    ? CATEGORIES.map(c => ({
        ...c,
        articles: c.articles.filter(a => a.title.toLowerCase().includes(search.toLowerCase())),
      })).filter(c => c.articles.length > 0)
    : CATEGORIES

  const handleArticleClick = (slug) => {
    navigate(`/docs/${slug}`)
    if (onClose) onClose()
  }

  return (
    <aside
      style={{ width: isMobile ? '100%' : 260 }}
      className="flex flex-col h-full bg-[#0D0D16] border-r border-white/[0.06] overflow-hidden flex-shrink-0"
    >
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <Link to="/docs" className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-white tracking-tight">Documentation</span>
        </Link>
        {isMobile && (
          <button onClick={onClose} className="p-1 rounded hover:bg-white/[0.05] text-[#6B7280]">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-3 pb-3">
        <div
          className="relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200"
          style={{
            borderColor: searchFocused ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)',
            background: searchFocused ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.025)',
          }}
        >
          <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${searchFocused ? 'text-violet-400' : 'text-[#4B5563]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search docs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="flex-1 bg-transparent text-xs text-white placeholder-[#4B5563] focus:outline-none"
          />
          {!search && (
            <span className="text-[10px] text-[#374151] border border-white/[0.08] rounded px-1 py-0.5 font-mono">⌘K</span>
          )}
          {search && (
            <button onClick={() => setSearch('')} className="text-[#4B5563] hover:text-white">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-6 space-y-0.5">
        {filtered.map(cat => {
          const Icon = cat.icon
          const isOpen = openCats[cat.id] ?? false
          return (
            <div key={cat.id}>
              <button
                onClick={() => toggleCat(cat.id)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] transition-colors group text-left"
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: cat.bg }}
                >
                  <Icon className="w-3 h-3" style={{ color: cat.color }} />
                </div>
                <span className="flex-1 text-xs font-semibold text-[#9CA3AF] group-hover:text-white transition-colors uppercase tracking-wider">
                  {cat.title}
                </span>
                <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight className="w-3 h-3 text-[#374151]" />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="ml-4 pl-3 border-l border-white/[0.05] py-1 space-y-0.5">
                      {cat.articles.map(article => {
                        const isActive = activeSlug === article.slug
                        return (
                          <button
                            key={article.slug}
                            onClick={() => handleArticleClick(article.slug)}
                            className="relative w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors"
                            style={{ background: isActive ? cat.bg : 'transparent' }}
                          >
                            <AnimatePresence>
                              {isActive && (
                                <motion.div
                                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                                  style={{ background: cat.color }}
                                  initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} exit={{ scaleY: 0 }}
                                  transition={{ duration: 0.2 }}
                                />
                              )}
                            </AnimatePresence>
                            <span
                              className="w-1 h-1 rounded-full flex-shrink-0"
                              style={{ background: isActive ? cat.color : '#374151' }}
                            />
                            <span
                              className="flex-1 text-xs line-clamp-1"
                              style={{ color: isActive ? cat.color : '#9CA3AF' }}
                            >
                              {article.title}
                            </span>
                            {isActive && (
                              <span className="text-[10px] text-[#4B5563]">{article.readTime}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/[0.05]">
        <Link
          to="/chat"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium hover:bg-violet-500/15 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Ask AI Assistant
        </Link>
      </div>
    </aside>
  )
}

/* ─── Table of Contents ─── */
function TableOfContents({ sections, activeSectionId }) {
  return (
    <div className="w-52 flex-shrink-0 hidden xl:block">
      <div className="sticky top-24">
        <p className="text-[11px] font-semibold text-[#4B5563] uppercase tracking-widest mb-3">On this page</p>
        <nav className="space-y-1">
          {sections.map(s => {
            const isActive = activeSectionId === s.id
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 text-xs py-1 transition-colors group"
                style={{ color: isActive ? '#7C3AED' : '#6B7280' }}
              >
                <span
                  className="w-0.5 h-4 rounded-full flex-shrink-0 transition-all"
                  style={{ background: isActive ? '#7C3AED' : 'transparent' }}
                />
                <span className="group-hover:text-white transition-colors line-clamp-2">{s.heading}</span>
              </a>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

/* ─── Main Page ─── */
export default function DocsArticlePage() {
  const { slug } = useParams()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState(null)
  const [helpfulVote, setHelpfulVote] = useState(null) // 'yes' | 'no' | null
  const sectionRefs = useRef({})

  const article = ARTICLE_CONTENT[slug] || FALLBACK_ARTICLE

  // Find category data
  const categoryData = CATEGORIES.find(c => c.id === article.categoryId)

  // Find prev/next articles in same category
  const catArticles = categoryData?.articles || []
  const currentIdx = catArticles.findIndex(a => a.slug === slug)
  const prevArticle = currentIdx > 0 ? catArticles[currentIdx - 1] : null
  const nextArticle = currentIdx < catArticles.length - 1 ? catArticles[currentIdx + 1] : null

  // Intersection observer for ToC
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSectionId(entry.target.id)
        })
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    )
    article.sections.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) { sectionRefs.current[s.id] = el; observer.observe(el) }
    })
    return () => observer.disconnect()
  }, [slug, article.sections])

  return (
    <div className="min-h-screen bg-[#0A0A0F] pt-16">
      <div className="flex relative" style={{ minHeight: 'calc(100vh - 64px)' }}>

        {/* Desktop Sidebar */}
        <div className="hidden lg:flex flex-col sticky top-16 h-[calc(100vh-64px)]">
          <DocsSidebar activeSlug={slug} />
        </div>

        {/* Mobile Sidebar Drawer */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setMobileSidebarOpen(false)}
              />
              <motion.div
                className="fixed left-0 top-0 bottom-0 z-50 w-72 lg:hidden"
                initial={{ x: -288 }} animate={{ x: 0 }} exit={{ x: -288 }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              >
                <DocsSidebar activeSlug={slug} onClose={() => setMobileSidebarOpen(false)} isMobile />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 lg:px-8 py-3 border-b border-white/[0.05] bg-[#0A0A0F]/80 backdrop-blur-md sticky top-16 z-20">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-1.5 rounded-lg hover:bg-white/[0.05] text-[#6B7280] transition-colors"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu className="w-4 h-4" />
              </button>
              <nav className="flex items-center gap-1.5 text-xs text-[#4B5563]">
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
                <ChevronRight className="w-3 h-3" />
                <Link to="/docs" className="hover:text-white transition-colors">Docs</Link>
                <ChevronRight className="w-3 h-3" />
                {categoryData && (
                  <>
                    <span className="hover:text-white transition-colors" style={{ color: categoryData.color }}>
                      {categoryData.title}
                    </span>
                    <ChevronRight className="w-3 h-3" />
                  </>
                )}
                <span className="text-[#9CA3AF] line-clamp-1 max-w-[200px]">{article.title}</span>
              </nav>
            </div>
            <Link
              to="/chat"
              className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors border border-violet-500/20 px-3 py-1.5 rounded-lg hover:bg-violet-500/10"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ask AI
            </Link>
          </div>

          {/* Content + ToC */}
          <div className="flex gap-8 px-5 lg:px-10 xl:px-16 pt-10 pb-16 flex-1">
            {/* Article */}
            <article className="flex-1 min-w-0 max-w-3xl">
              {/* Article header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                {categoryData && (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase mb-4 px-2.5 py-1 rounded-full"
                    style={{ color: categoryData.color, background: categoryData.bg, border: `1px solid ${categoryData.border}` }}
                  >
                    <categoryData.icon className="w-3 h-3" />
                    {categoryData.title}
                  </span>
                )}
                <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight tracking-tight mb-4">
                  {article.title}
                </h1>
                <div className="flex items-center gap-4 text-xs text-[#4B5563] mb-6">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Updated {article.lastUpdated}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {article.readTime} read
                  </span>
                </div>
                <p className="text-base text-[#9CA3AF] leading-relaxed mb-8 border-l-2 border-violet-500/40 pl-4">
                  {article.intro}
                </p>
              </motion.div>

              {/* Sections */}
              <div className="space-y-10">
                {article.sections.map((section, i) => (
                  <motion.section
                    key={section.id}
                    id={section.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                        <Hash className="w-3.5 h-3.5 text-violet-400" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">{section.heading}</h2>
                    </div>
                    <p className="text-[#9CA3AF] leading-relaxed text-[0.9375rem] ml-9">
                      {section.content}
                    </p>
                  </motion.section>
                ))}
              </div>

              {/* Was this helpful? */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-12 pt-8 border-t border-white/[0.06]"
              >
                <p className="text-sm font-medium text-white mb-3">Was this article helpful?</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setHelpfulVote('yes')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all duration-200 ${
                      helpfulVote === 'yes'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                        : 'border-white/[0.08] text-[#6B7280] hover:border-white/[0.15] hover:text-white'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Yes
                  </button>
                  <button
                    onClick={() => setHelpfulVote('no')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all duration-200 ${
                      helpfulVote === 'no'
                        ? 'border-red-500/50 bg-red-500/10 text-red-400'
                        : 'border-white/[0.08] text-[#6B7280] hover:border-white/[0.15] hover:text-white'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    No
                  </button>
                  <AnimatePresence>
                    {helpfulVote && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-[#6B7280]"
                      >
                        {helpfulVote === 'yes' ? '🎉 Thanks for the feedback!' : '😢 We\'ll work on improving this.'}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Prev / Next */}
              {(prevArticle || nextArticle) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="mt-8 grid grid-cols-2 gap-4"
                >
                  {prevArticle ? (
                    <Link
                      to={`/docs/${prevArticle.slug}`}
                      className="group flex flex-col gap-1 p-4 rounded-xl border border-white/[0.06] bg-[#0D0D14] hover:border-violet-500/25 transition-all duration-200"
                    >
                      <span className="flex items-center gap-1 text-[11px] text-[#4B5563] group-hover:text-violet-400 transition-colors">
                        <ArrowLeft className="w-3 h-3" />
                        Previous
                      </span>
                      <span className="text-sm font-medium text-[#9CA3AF] group-hover:text-white transition-colors line-clamp-2">
                        {prevArticle.title}
                      </span>
                    </Link>
                  ) : <div />}
                  {nextArticle ? (
                    <Link
                      to={`/docs/${nextArticle.slug}`}
                      className="group flex flex-col gap-1 p-4 rounded-xl border border-white/[0.06] bg-[#0D0D14] hover:border-violet-500/25 transition-all duration-200 text-right"
                    >
                      <span className="flex items-center justify-end gap-1 text-[11px] text-[#4B5563] group-hover:text-violet-400 transition-colors">
                        Next
                        <ArrowRight className="w-3 h-3" />
                      </span>
                      <span className="text-sm font-medium text-[#9CA3AF] group-hover:text-white transition-colors line-clamp-2">
                        {nextArticle.title}
                      </span>
                    </Link>
                  ) : <div />}
                </motion.div>
              )}
            </article>

            {/* Right ToC */}
            <TableOfContents sections={article.sections} activeSectionId={activeSectionId} />
          </div>
        </div>
      </div>
    </div>
  )
}
