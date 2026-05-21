import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, BookOpen, Zap, Lock, Cpu, Mic, Layers, ChevronRight,
  ChevronDown, Menu, X, Sparkles, ArrowRight, Star, Clock, TrendingUp
} from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'

/* ─── Data ─── */
export const CATEGORIES = [
  {
    id: 'getting-started',
    icon: Zap,
    title: 'Getting Started',
    desc: 'Set up your account and make your first chat in under 5 minutes.',
    color: 'var(--accent)',
    bg: 'rgba(217,119,87,0.12)',
    border: 'rgba(217,119,87,0.25)',
    articles: [
      { title: 'Quick Start Guide', slug: 'quick-start-guide', readTime: '3 min' },
      { title: 'Creating Your Account', slug: 'creating-your-account', readTime: '2 min' },
      { title: 'Choosing Your First Model', slug: 'choosing-your-first-model', readTime: '4 min' },
      { title: 'Understanding the Chat Interface', slug: 'understanding-the-chat-interface', readTime: '5 min' },
      { title: 'Keyboard Shortcuts Reference', slug: 'keyboard-shortcuts-reference', readTime: '2 min' },
    ],
  },
  {
    id: 'api-reference',
    icon: Cpu,
    title: 'API Reference',
    desc: 'Integrate CyberCli Chat into your apps using our REST API.',
    color: 'var(--accent)',
    bg: 'rgba(217,119,87,0.12)',
    border: 'rgba(217,119,87,0.25)',
    articles: [
      { title: 'Authentication & API Keys', slug: 'authentication-api-keys', readTime: '4 min' },
      { title: 'Chat Completions Endpoint', slug: 'chat-completions-endpoint', readTime: '6 min' },
      { title: 'Local CLI Daemon Bridge', slug: 'local-cli-daemon-bridge', readTime: '5 min' },
      { title: 'Streaming SSE Responses', slug: 'streaming-sse-responses', readTime: '5 min' },
      { title: 'Model Selection Parameters', slug: 'model-selection-parameters', readTime: '4 min' },
      { title: 'Rate Limits & Quotas', slug: 'rate-limits-quotas', readTime: '3 min' },
    ],
  },
  {
    id: 'integrations',
    icon: Layers,
    title: 'Integrations',
    desc: 'Connect CyberCli Chat to VS Code, Obsidian, Notion, and more.',
    color: 'var(--accent)',
    bg: 'rgba(217,119,87,0.12)',
    border: 'rgba(217,119,87,0.25)',
    articles: [
      { title: 'VS Code Extension', slug: 'vs-code-extension', readTime: '5 min' },
      { title: 'Chrome Extension Setup', slug: 'chrome-extension-setup', readTime: '3 min' },
      { title: 'Zapier & Make Automation', slug: 'zapier-make-automation', readTime: '6 min' },
      { title: 'Slack Bot Integration', slug: 'slack-bot-integration', readTime: '7 min' },
      { title: 'REST API with Postman', slug: 'rest-api-with-postman', readTime: '4 min' },
    ],
  },
  {
    id: 'security-privacy',
    icon: Lock,
    title: 'Security & Privacy',
    desc: 'Our security architecture, data handling, and compliance posture.',
    color: 'var(--accent)',
    bg: 'rgba(217,119,87,0.12)',
    border: 'rgba(217,119,87,0.25)',
    articles: [
      { title: 'Data Privacy Overview', slug: 'data-privacy-overview', readTime: '5 min' },
      { title: 'Encryption at Rest & Transit', slug: 'encryption-at-rest-transit', readTime: '4 min' },
      { title: 'GDPR Compliance Guide', slug: 'gdpr-compliance-guide', readTime: '8 min' },
      { title: 'Security Disclosure Policy', slug: 'security-disclosure-policy', readTime: '3 min' },
      { title: 'SOC 2 Type II Roadmap', slug: 'soc2-type-ii-roadmap', readTime: '4 min' },
    ],
  },
  {
    id: 'voice-tts',
    icon: Mic,
    title: 'Voice & TTS',
    desc: 'Voice chat, TTS voices, voice cloning, and walkie-talkie mode.',
    color: 'var(--accent)',
    bg: 'rgba(217,119,87,0.12)',
    border: 'rgba(217,119,87,0.25)',
    articles: [
      { title: 'Setting Up Voice Chat', slug: 'setting-up-voice-chat', readTime: '4 min' },
      { title: 'Available TTS Voices', slug: 'available-tts-voices', readTime: '3 min' },
      { title: 'Walkie-Talkie Mode Guide', slug: 'walkie-talkie-mode-guide', readTime: '4 min' },
      { title: 'Voice Cloning Setup', slug: 'voice-cloning-setup', readTime: '6 min' },
      { title: 'Troubleshooting Audio Issues', slug: 'troubleshooting-audio-issues', readTime: '5 min' },
    ],
  },
  {
    id: 'advanced-features',
    icon: BookOpen,
    title: 'Advanced Features',
    desc: 'Council Mode, conversation branching, and power user workflows.',
    color: 'var(--accent)',
    bg: 'rgba(217,119,87,0.12)',
    border: 'rgba(217,119,87,0.25)',
    articles: [
      { title: 'Council Mode Deep Dive', slug: 'council-mode-deep-dive', readTime: '7 min' },
      { title: 'Conversation Branching', slug: 'conversation-branching', readTime: '5 min' },
      { title: 'Custom Personas & System Prompts', slug: 'custom-personas-system-prompts', readTime: '6 min' },
      { title: 'Slash Commands Reference', slug: 'slash-commands-reference', readTime: '4 min' },
      { title: 'Research Mode & PDF Export', slug: 'research-mode-pdf-export', readTime: '5 min' },
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
    if (activeSlug && !Object.values(initial).some(Boolean)) {
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
      className="flex flex-col h-full bg-background-secondary border-r border-border-subtle overflow-hidden flex-shrink-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <Link to="/docs" className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-foreground-primary tracking-tight">Documentation</span>
        </Link>
        {isMobile && (
          <button onClick={onClose} className="p-1 rounded hover:bg-background-tertiary text-foreground-muted">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div
          className="relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200"
          style={{
            borderColor: searchFocused ? 'var(--accent)' : 'var(--border-subtle)',
            background: searchFocused ? 'rgba(217,119,87,0.06)' : 'var(--bg-primary)',
          }}
        >
          <Search className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${searchFocused ? 'text-accent' : 'text-foreground-muted'}`} />
          <input
            type="text"
            placeholder="Search docs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="flex-1 bg-transparent text-xs text-foreground-primary placeholder-foreground-muted focus:outline-none"
          />
          {!search && (
            <span className="text-[10px] text-foreground-muted border border-border-subtle rounded px-1 py-0.5 font-mono">⌘K</span>
          )}
          {search && (
            <button onClick={() => setSearch('')} className="text-foreground-muted hover:text-foreground-primary">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Nav tree */}
      <nav className="flex-1 overflow-y-auto px-2 pb-6 space-y-0.5">
        {filtered.map(cat => {
          const Icon = cat.icon
          const isOpen = openCats[cat.id] ?? true
          return (
            <div key={cat.id}>
              {/* Category header */}
              <button
                onClick={() => toggleCat(cat.id)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-background-tertiary transition-colors group text-left"
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: cat.bg }}
                >
                  <Icon className="w-3 h-3" style={{ color: cat.color }} />
                </div>
                <span className="flex-1 text-xs font-semibold text-foreground-secondary group-hover:text-foreground-primary transition-colors uppercase tracking-wider">
                  {cat.title}
                </span>
                <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight className="w-3 h-3 text-foreground-muted" />
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
                    <div className="ml-4 pl-3 border-l border-border-subtle py-1 space-y-0.5">
                      {cat.articles.map(article => {
                        const isActive = activeSlug === article.slug
                        return (
                          <button
                            key={article.slug}
                            onClick={() => handleArticleClick(article.slug)}
                            className="relative w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors group"
                            style={{
                              background: isActive ? `${cat.bg}` : 'transparent',
                            }}
                          >
                            {/* Active indicator */}
                            <AnimatePresence>
                              {isActive && (
                                <motion.div
                                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                                  style={{ background: cat.color }}
                                  initial={{ scaleY: 0, opacity: 0 }}
                                  animate={{ scaleY: 1, opacity: 1 }}
                                  exit={{ scaleY: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                />
                              )}
                            </AnimatePresence>
                            <span
                              className="w-1 h-1 rounded-full flex-shrink-0 transition-colors"
                              style={{ background: isActive ? cat.color : 'var(--border-medium)' }}
                            />
                            <span
                              className="flex-1 text-xs transition-colors line-clamp-1"
                              style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}
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

      {/* Bottom CTA */}
      <div className="px-3 py-4 border-t border-border-subtle">
        <Link
          to="/chat"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-medium hover:bg-accent/15 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Ask AI Assistant
        </Link>
      </div>
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
    <div className="min-h-screen bg-background-primary pt-16">
      <div className="flex relative" style={{ minHeight: 'calc(100vh - 64px)' }}>

        {/* Desktop Sidebar */}
        <div className="hidden lg:flex flex-col sticky top-16 h-[calc(100vh-64px)]">
          <DocsSidebar activeSlug={null} />
        </div>

        {/* Mobile Sidebar Drawer */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileSidebarOpen(false)}
              />
              <motion.div
                className="fixed left-0 top-0 bottom-0 z-50 w-72 lg:hidden"
                initial={{ x: -288 }}
                animate={{ x: 0 }}
                exit={{ x: -288 }}
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
        <main className="flex-1 min-w-0 overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 lg:px-8 py-3 border-b border-border-subtle bg-background-primary/80 backdrop-blur-md sticky top-16 z-20">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted transition-colors"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu className="w-4 h-4" />
              </button>
              <nav className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <Link to="/" className="hover:text-foreground-primary transition-colors">Home</Link>
                <ChevronRight className="w-3 h-3" />
                <span className="text-foreground-secondary">Documentation</span>
              </nav>
            </div>
            <Link
              to="/chat"
              className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-light transition-colors border border-accent/20 px-3 py-1.5 rounded-lg hover:bg-accent/10"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ask AI
            </Link>
          </div>

          {/* Hero section */}
          <div className="px-5 lg:px-10 xl:px-16 pt-12 pb-8 relative overflow-hidden">
            <div className="absolute top-0 left-1/4 w-[400px] h-[300px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
            <ScrollReveal>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent tracking-widest uppercase mb-4 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                <BookOpen className="w-3 h-3" />
                Documentation
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.08}>
              <h1 className="text-3xl md:text-4xl xl:text-5xl font-semibold tracking-tight text-foreground-primary mb-4 leading-[1.1] font-serif">
                Everything you need to{' '}
                <span className="bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  get started
                </span>
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.15}>
              <p className="text-base text-foreground-secondary max-w-xl leading-relaxed">
                Comprehensive guides, API references, and tutorials for CyberCli Chat.
              </p>
            </ScrollReveal>
          </div>

          {/* Category cards */}
          <div className="px-5 lg:px-10 xl:px-16 pb-8">
            <ScrollReveal delay={0.1}>
              <h2 className="text-xs font-semibold text-foreground-muted uppercase tracking-widest mb-4">Browse by Category</h2>
            </ScrollReveal>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {CATEGORIES.map((cat, i) => {
                const Icon = cat.icon
                return (
                  <ScrollReveal key={cat.id} delay={i * 0.06}>
                    <motion.div
                      className="group rounded-xl border border-border-subtle bg-background-secondary p-5 cursor-pointer"
                      whileHover={{
                        borderColor: cat.border,
                        boxShadow: `0 0 30px ${cat.bg}`,
                        y: -3,
                        transition: { duration: 0.25 },
                      }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: cat.bg, border: `1px solid ${cat.border}` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: cat.color }} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground-primary">{cat.title}</h3>
                          <p className="text-[11px] text-foreground-muted">{cat.articles.length} articles</p>
                        </div>
                      </div>
                      <p className="text-xs text-foreground-secondary leading-relaxed mb-3">{cat.desc}</p>
                      <div className="space-y-1.5">
                        {cat.articles.slice(0, 3).map(article => (
                          <Link
                            key={article.slug}
                            to={`/docs/${article.slug}`}
                            className="flex items-center gap-2 text-xs text-foreground-secondary hover:text-foreground-primary transition-colors py-0.5 group/item"
                          >
                            <ChevronRight className="w-3 h-3 flex-shrink-0 text-foreground-muted group-hover/item:text-accent transition-colors" />
                            <span className="line-clamp-1">{article.title}</span>
                          </Link>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-border-subtle">
                        <Link
                          to={`/docs/${cat.articles[0].slug}`}
                          className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
                          style={{ color: cat.color }}
                        >
                          View all {cat.articles.length} articles
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </motion.div>
                  </ScrollReveal>
                )
              })}
            </div>
          </div>

          {/* Popular articles */}
          <div className="px-5 lg:px-10 xl:px-16 pb-16">
            <ScrollReveal>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-accent" />
                <h2 className="text-xs font-semibold text-foreground-muted uppercase tracking-widest">Popular Articles</h2>
              </div>
            </ScrollReveal>
            <div className="grid sm:grid-cols-2 gap-3">
              {POPULAR.map((item, i) => (
                <ScrollReveal key={item.slug} delay={i * 0.07}>
                  <Link
                    to={`/docs/${item.slug}`}
                    className="group flex items-center gap-3 p-4 rounded-xl border border-border-subtle bg-background-secondary hover:border-accent/25 hover:bg-accent/5 transition-all duration-200"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Star className="w-3.5 h-3.5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground-primary group-hover:text-accent transition-colors line-clamp-1">{item.title}</p>
                      <p className="text-[11px] text-foreground-muted mt-0.5">{item.cat} · {item.views} views</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-foreground-muted group-hover:text-accent transition-colors flex-shrink-0" />
                  </Link>
                </ScrollReveal>
              ))}
            </div>

            {/* Can't find section */}
            <ScrollReveal delay={0.2}>
              <div className="mt-8 rounded-2xl border border-border-subtle bg-background-secondary p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground-primary mb-1">Can't find what you need?</h3>
                  <p className="text-xs text-foreground-secondary">Ask our AI-powered docs assistant or reach out to the team.</p>
                </div>
                <div className="flex gap-2.5 flex-shrink-0">
                  <Link to="/contact" className="btn-secondary text-xs px-4 py-2">Contact Us</Link>
                  <Link to="/chat" className="btn-primary text-xs px-4 py-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    Ask AI
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </main>
      </div>
    </div>
  )
}
