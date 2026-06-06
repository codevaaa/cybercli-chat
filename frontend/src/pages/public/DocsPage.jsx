import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, BookOpen, Zap, Lock, Cpu, Mic, Layers, ChevronRight,
  Menu, X, Sparkles, ArrowRight, Star, TrendingUp, Code2, Terminal
} from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'
import SEOHead, { StructuredData } from '@components/seo/SEOHead'
import { Tooltip } from '@components/ui/Tooltip'

/* ─── Data ─── */
export const CATEGORIES = [
  {
    id: 'getting-started',
    icon: Zap,
    title: 'Getting Started',
    desc: 'Set up your account and make your first chat in under 5 minutes.',
    color: '#D97757',
    articles: [
      { title: 'Quick Start Guide', slug: 'quick-start-guide', readTime: '3 min' },
      { title: 'Changelog', slug: 'changelog', readTime: '3 min' },
      { title: 'Creating Your Account', slug: 'creating-your-account', readTime: '2 min' },
      { title: 'Choosing Your First Model', slug: 'choosing-your-first-model', readTime: '4 min' },
      { title: 'Understanding the Chat Interface', slug: 'understanding-the-chat-interface', readTime: '5 min' },
    ],
  },
  {
    id: 'api-reference',
    icon: Code2,
    title: 'API Reference',
    desc: 'Integrate Codeva into your apps using our REST API.',
    color: '#3B82F6',
    articles: [
      { title: 'Authentication & API Keys', slug: 'authentication-api-keys', readTime: '4 min' },
      { title: 'Chat Completions Endpoint', slug: 'chat-completions-endpoint', readTime: '6 min' },
      { title: 'Streaming SSE Responses', slug: 'streaming-sse-responses', readTime: '5 min' },
      { title: 'Rate Limits & Quotas', slug: 'rate-limits-quotas', readTime: '5 min' },
      { title: 'Local CLI Daemon Bridge', slug: 'local-cli-daemon-bridge', readTime: '5 min' },
    ],
  },
  {
    id: 'integrations',
    icon: Layers,
    title: 'Integrations',
    desc: 'Connect Codeva to VS Code, Obsidian, Notion, and more.',
    color: '#10B981',
    articles: [
      { title: 'VS Code Extension', slug: 'vs-code-extension', readTime: '5 min' },
      { title: 'Chrome Extension Setup', slug: 'chrome-extension-setup', readTime: '3 min' },
      { title: 'Zapier & Make Automation', slug: 'zapier-make-automation', readTime: '6 min' },
      { title: 'Slack Bot Integration', slug: 'slack-bot-integration', readTime: '7 min' },
    ],
  },
  {
    id: 'advanced-features',
    icon: Terminal,
    title: 'Advanced Features',
    desc: 'Council Mode, conversation branching, and power user workflows.',
    color: '#8B5CF6',
    articles: [
      { title: 'Council Mode Deep Dive', slug: 'council-mode-deep-dive', readTime: '7 min' },
      { title: 'Conversation Branching', slug: 'conversation-branching', readTime: '5 min' },
      { title: 'Custom Personas & System Prompts', slug: 'custom-personas-system-prompts', readTime: '6 min' },
      { title: 'Slash Commands Reference', slug: 'slash-commands-reference', readTime: '4 min' },
    ],
  },
  {
    id: 'voice-tts',
    icon: Mic,
    title: 'Voice & TTS',
    desc: 'Walkie-talkie voice chat and text-to-speech voices.',
    color: '#EC4899',
    articles: [
      { title: 'Setting Up Voice Chat', slug: 'setting-up-voice-chat', readTime: '4 min' },
    ],
  },
]

const POPULAR = [
  { title: 'Quick Start Guide', cat: 'Getting Started', slug: 'quick-start-guide', views: '12.4k' },
  { title: 'Council Mode Deep Dive', cat: 'Advanced Features', slug: 'council-mode-deep-dive', views: '8.1k' },
  { title: 'Authentication & API Keys', cat: 'API Reference', slug: 'authentication-api-keys', views: '7.3k' },
  { title: 'Setting Up Voice Chat', cat: 'Voice & TTS', slug: 'setting-up-voice-chat', views: '5.9k' },
]

/* ─── Sidebar ─── */
export function DocsSidebar({ activeSlug, onClose, isMobile = false }) {
  const [openCats, setOpenCats] = useState(() => {
    const initial = {}
    CATEGORIES.forEach(c => {
      initial[c.id] = activeSlug ? c.articles.some(a => a.slug === activeSlug) : true
    })
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
      style={{ width: isMobile ? '100%' : 280 }}
      className="flex flex-col h-full bg-[#0A0A0F] border-r border-white/[0.06] overflow-hidden flex-shrink-0 relative z-10"
    >
      {/* Header (Mobile Only) */}
      {isMobile && (
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <Link to="/docs" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#D97757]" />
            <span className="text-[15px] font-semibold text-[#ECECEC] tracking-tight">Documentation</span>
          </Link>
          <Tooltip content="Close sidebar">
            <button onClick={onClose} className="p-1 rounded hover:bg-white/5 text-[#A0A0A0]">
              <X className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      )}

      {/* Search */}
      <div className={`px-4 ${isMobile ? 'pb-4' : 'py-5'}`}>
        <div
          className="relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200"
          style={{
            borderColor: searchFocused ? '#D97757' : 'rgba(255,255,255,0.1)',
            background: searchFocused ? 'rgba(217,119,87,0.05)' : 'rgba(255,255,255,0.03)',
            boxShadow: searchFocused ? '0 0 0 3px rgba(217,119,87,0.1)' : 'none'
          }}
        >
          <Search className={`w-4 h-4 flex-shrink-0 transition-colors ${searchFocused ? 'text-[#D97757]' : 'text-[#707070]'}`} />
          <input
            type="text"
            placeholder="Search docs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="flex-1 bg-transparent text-[13px] text-[#ECECEC] placeholder-[#707070] focus:outline-none"
          />
          {!search && (
            <span className="text-[10px] text-[#707070] border border-white/[0.1] rounded px-1.5 py-0.5 font-mono">⌘K</span>
          )}
        </div>
      </div>

      {/* Nav tree */}
      <nav className="flex-1 overflow-y-auto px-2 pb-6 space-y-1">
        {filtered.map(cat => {
          const isOpen = openCats[cat.id] ?? true
          return (
            <div key={cat.id}>
              {/* Category header */}
              <button
                onClick={() => toggleCat(cat.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group text-left"
              >
                <span className="flex-1 text-[13px] font-semibold text-[#A0A0A0] group-hover:text-[#ECECEC] transition-colors uppercase tracking-wider">
                  {cat.title}
                </span>
                <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight className="w-3.5 h-3.5 text-[#707070] group-hover:text-[#ECECEC]" />
                </motion.div>
              </button>

              {/* Articles */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="ml-3 pl-3 border-l border-white/[0.08] py-1 space-y-0.5 mb-2">
                      {cat.articles.map(article => {
                        const isActive = activeSlug === article.slug
                        return (
                          <button
                            key={article.slug}
                            onClick={() => handleArticleClick(article.slug)}
                            className="relative w-full flex items-center px-3 py-2 rounded-md text-left transition-colors group"
                            style={{
                              background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                            }}
                          >
                            <AnimatePresence>
                              {isActive && (
                                <motion.div
                                  className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-0.5 h-full rounded-r-full"
                                  style={{ background: '#D97757' }}
                                  initial={{ scaleY: 0, opacity: 0 }}
                                  animate={{ scaleY: 1, opacity: 1 }}
                                  exit={{ scaleY: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                />
                              )}
                            </AnimatePresence>
                            <span
                              className="text-[13px] transition-colors line-clamp-1"
                              style={{ color: isActive ? '#ECECEC' : '#A0A0A0' }}
                            >
                              {article.title}
                            </span>
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
    </aside>
  )
}

/* ─── Main Page ─── */
export default function DocsPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Close mobile sidebar on resize
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 1024) setMobileSidebarOpen(false) }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return (
    <div className="min-h-screen bg-[#0A0A0F] pt-28">
      <SEOHead
        title="Documentation — Getting Started"
        description="Complete documentation for Codeva. Setup guides, API quickstart, voice chat, Council Mode, and advanced configuration."
        keywords="AI documentation, Codeva docs, getting started, API guide, user guide"
        path="/docs"
        structuredData={StructuredData.breadcrumb([
          { name: 'Home', path: '/' },
          { name: 'Documentation', path: '/docs' }
        ])}
      />
      <div className="flex relative" style={{ minHeight: 'calc(100vh - 112px)' }}>
        
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-3/4 h-[400px] bg-[#D97757]/5 blur-[150px] rounded-bl-full pointer-events-none" />

        {/* Desktop Sidebar */}
        <div className="hidden lg:flex flex-col sticky top-28 h-[calc(100vh-112px)]">
          <DocsSidebar activeSlug={null} />
        </div>

        {/* Mobile Sidebar Drawer */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileSidebarOpen(false)}
              />
              <motion.div
                className="fixed left-0 top-0 bottom-0 z-50 w-[280px] lg:hidden bg-[#0A0A0F]"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              >
                <DocsSidebar
                  activeSlug={null}
                  onClose={() => setMobileSidebarOpen(false)}
                  isMobile
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-x-hidden relative z-10 pb-20">
          
          {/* Mobile Top Bar */}
          <div className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-[#0A0A0F]/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <Tooltip content="Open sidebar">
                <button
                  className="p-1.5 rounded-lg bg-white/5 text-[#ECECEC] transition-colors"
                  onClick={() => setMobileSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </button>
              </Tooltip>
              <span className="text-[15px] font-semibold text-[#ECECEC] font-serif">Documentation</span>
            </div>
          </div>

          <div className="max-w-[880px] mx-auto px-6 md:px-12 pt-16">
            
            {/* Hero */}
            <ScrollReveal>
              <h1 className="text-4xl md:text-5xl lg:text-[56px] font-normal tracking-tight text-[#ECECEC] mb-6 leading-[1.1] font-serif">
                Build with Codeva
              </h1>
              <p className="text-[17px] text-[#A0A0A0] max-w-2xl leading-relaxed mb-16 font-light">
                Explore our comprehensive guides, API reference, and interactive tutorials to integrate the world's most powerful AI gateway into your workflow.
              </p>
            </ScrollReveal>

            {/* Premium Category Grid */}
            <ScrollReveal delay={0.1}>
              <h2 className="text-[13px] font-bold text-[#ECECEC] uppercase tracking-[0.1em] mb-6 font-sans">
                Explore Topics
              </h2>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 gap-5 mb-20">
              {CATEGORIES.map((cat, i) => {
                const Icon = cat.icon
                return (
                  <ScrollReveal key={cat.id} delay={i * 0.05}>
                    <motion.div
                      className="group block relative p-6 rounded-2xl bg-[#14141A] border border-white/[0.06] hover:bg-[#1A1A22] transition-colors cursor-pointer"
                      whileHover={{ y: -2 }}
                    >
                      <div className="absolute top-6 right-6 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                        <ArrowRight className="w-5 h-5 text-[#ECECEC]" />
                      </div>
                      
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                          <Icon className="w-5 h-5" style={{ color: cat.color }} />
                        </div>
                        <h3 className="text-lg font-semibold text-[#ECECEC]">{cat.title}</h3>
                      </div>
                      <p className="text-[14px] text-[#A0A0A0] leading-relaxed mb-6">
                        {cat.desc}
                      </p>
                      
                      <div className="space-y-2">
                        {cat.articles.slice(0, 3).map(article => (
                          <Link
                            key={article.slug}
                            to={`/docs/${article.slug}`}
                            className="flex items-center gap-2 text-[14px] text-[#A0A0A0] hover:text-[#D97757] transition-colors py-1 group/item w-fit"
                          >
                            <span className="line-clamp-1">{article.title}</span>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  </ScrollReveal>
                )
              })}
            </div>

            {/* Popular Articles List */}
            <ScrollReveal delay={0.15}>
              <h2 className="text-[13px] font-bold text-[#ECECEC] uppercase tracking-[0.1em] mb-6 font-sans">
                Most Read
              </h2>
            </ScrollReveal>
            
            <div className="bg-[#14141A] rounded-2xl border border-white/[0.06] overflow-hidden mb-20">
              {POPULAR.map((item, i) => (
                <ScrollReveal key={item.slug} delay={i * 0.05}>
                  <Link
                    to={`/docs/${item.slug}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-4 h-4 text-[#707070] group-hover:text-[#D97757] transition-colors" />
                      <span className="text-[15px] font-medium text-[#ECECEC]">{item.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[13px] text-[#A0A0A0] sm:ml-auto">
                      <span className="hidden sm:inline bg-white/[0.04] px-2.5 py-1 rounded-md">{item.cat}</span>
                      <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5"/> {item.views}</span>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>

            {/* Support CTA */}
            <ScrollReveal delay={0.2}>
              <div className="relative rounded-2xl bg-[#14141A] border border-white/[0.06] p-8 md:p-10 text-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#D97757]/5 to-transparent pointer-events-none" />
                <h3 className="text-2xl font-serif text-[#ECECEC] mb-3 relative z-10">Still need help?</h3>
                <p className="text-[#A0A0A0] mb-8 max-w-md mx-auto relative z-10">
                  Can't find what you're looking for? Reach out to our support team or use our AI assistant.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                  <Tooltip content="Get in touch">
                    <Link to="/contact" className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-[#ECECEC] text-[14px] font-semibold hover:bg-white/[0.08] transition-colors">
                      Contact Support
                    </Link>
                  </Tooltip>
                  <Tooltip content="Open AI Assistant">
                    <Link to="/chat" className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#D97757] text-white text-[14px] font-semibold hover:bg-[#C4613A] transition-colors shadow-[0_0_20px_rgba(217,119,87,0.3)] flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Ask AI Assistant
                    </Link>
                  </Tooltip>
                </div>
              </div>
            </ScrollReveal>

          </div>
        </main>
      </div>
    </div>
  )
}
