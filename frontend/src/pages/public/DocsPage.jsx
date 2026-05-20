import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, BookOpen, Zap, Lock, Cpu, Mic, Layers, ArrowRight, ChevronRight } from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'

const CATEGORIES = [
  {
    icon: Zap,
    title: 'Getting Started',
    desc: 'Set up your account, make your first chat, and explore key features in under 5 minutes.',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    articles: [
      'Quick Start Guide',
      'Creating Your Account',
      'Choosing Your First Model',
      'Understanding the Chat Interface',
      'Keyboard Shortcuts Reference',
    ],
  },
  {
    icon: Cpu,
    title: 'API Reference',
    desc: 'Integrate CyberCli Chat into your own apps using our REST API and streaming endpoints.',
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.2)',
    articles: [
      'Authentication & API Keys',
      'Chat Completions Endpoint',
      'Streaming SSE Responses',
      'Model Selection Parameters',
      'Rate Limits & Quotas',
    ],
  },
  {
    icon: Layers,
    title: 'Integrations',
    desc: 'Connect CyberCli Chat to your tools: VS Code, Obsidian, Notion, and more.',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.2)',
    articles: [
      'VS Code Extension',
      'Chrome Extension Setup',
      'Zapier & Make Automation',
      'Slack Bot Integration',
      'REST API with Postman',
    ],
  },
  {
    icon: Lock,
    title: 'Security',
    desc: 'Learn about our security architecture, data handling, and compliance posture.',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    articles: [
      'Data Privacy Overview',
      'Encryption at Rest & Transit',
      'GDPR Compliance Guide',
      'Security Disclosure Policy',
      'SOC 2 Type II Roadmap',
    ],
  },
  {
    icon: Mic,
    title: 'Voice & TTS',
    desc: 'Everything about voice chat, TTS voices, voice cloning, and walkie-talkie mode.',
    color: '#EC4899',
    bg: 'rgba(236,72,153,0.08)',
    border: 'rgba(236,72,153,0.2)',
    articles: [
      'Setting Up Voice Chat',
      'Available TTS Voices',
      'Walkie-Talkie Mode Guide',
      'Voice Cloning Setup',
      'Troubleshooting Audio Issues',
    ],
  },
  {
    icon: BookOpen,
    title: 'Advanced Features',
    desc: 'Council Mode, conversation branching, slash commands, and power user workflows.',
    color: '#F97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.2)',
    articles: [
      'Council Mode Deep Dive',
      'Conversation Branching',
      'Custom Personas & System Prompts',
      'Slash Commands Reference',
      'Research Mode & PDF Export',
    ],
  },
]

export default function DocsPage() {
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const filtered = CATEGORIES.filter(c =>
    search === '' ||
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.articles.some(a => a.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="pt-28 pb-20 bg-[#0A0A0F]">
      {/* Hero */}
      <section className="section-padding mb-16 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-violet-600/8 rounded-full blur-[100px]" />
        </div>
        <div className="container-custom text-center relative z-10 max-w-3xl mx-auto">
          <ScrollReveal>
            <span className="inline-block text-xs font-semibold text-accent tracking-widest uppercase mb-5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
              Documentation
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <h1 className="text-[clamp(2.2rem,5vw,4rem)] font-extrabold tracking-tight leading-[1.1] text-white mb-5">
              Everything you need to{' '}
              <span
                className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent"
                style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                get started
              </span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <p className="text-lg text-[#9CA3AF] mb-8">
              Comprehensive guides, API references, and tutorials for CyberCli Chat.
            </p>
            {/* Animated Search Bar */}
            <div className="relative max-w-lg mx-auto">
              <div
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 ${searchFocused ? 'border-violet-500/50 bg-white/[0.04] shadow-lg shadow-violet-900/20' : 'border-white/[0.08] bg-white/[0.03]'}`}
              >
                <Search className={`w-4 h-4 transition-colors ${searchFocused ? 'text-violet-400' : 'text-[#4B5563]'}`} />
                <input
                  type="text"
                  placeholder="Search documentation..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-xs text-[#4B5563] hover:text-white transition-colors px-1">
                    ✕
                  </button>
                )}
              </div>
              {/* Animated focus underline */}
              <motion.div
                className="absolute -bottom-px left-1/2 h-[2px] rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                animate={searchFocused ? { width: '100%', x: '-50%' } : { width: '0%', x: '0%' }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Category Cards */}
      <section className="section-padding mb-16">
        <div className="container-custom">
          {search && filtered.length === 0 ? (
            <div className="text-center py-16 text-[#6B7280]">
              <Search className="w-10 h-10 mx-auto mb-4 opacity-30" />
              <p>No results for "{search}"</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((cat, i) => (
                <ScrollReveal key={cat.title} delay={i * 0.07}>
                  <motion.div
                    className="group rounded-2xl border border-white/[0.06] bg-[#0D0D14] p-6 h-full"
                    whileHover={{
                      borderColor: cat.border,
                      boxShadow: `0 0 30px ${cat.bg}`,
                      transition: { duration: 0.3 },
                    }}
                  >
                    <div className="flex items-start gap-4 mb-5">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: cat.bg, border: `1px solid ${cat.border}` }}
                      >
                        <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white mb-1">{cat.title}</h3>
                        <p className="text-xs text-[#6B7280] leading-relaxed">{cat.desc}</p>
                      </div>
                    </div>

                    <ul className="space-y-2">
                      {cat.articles.map((article) => (
                        <li key={article}>
                          <Link
                            to={`/docs/${article.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                            className="flex items-center gap-2 text-sm text-[#9CA3AF] hover:text-white transition-colors py-1 group/item"
                          >
                            <ChevronRight className="w-3 h-3 flex-shrink-0 text-[#374151] group-hover/item:text-accent transition-colors" />
                            {article}
                          </Link>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 pt-4 border-t border-white/[0.04]">
                      <Link
                        to={`/docs/${cat.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                        className="flex items-center gap-1 text-xs font-medium transition-colors"
                        style={{ color: cat.color }}
                      >
                        View all articles
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </motion.div>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick Links */}
      <section className="section-padding">
        <div className="container-custom max-w-3xl">
          <ScrollReveal>
            <div className="rounded-2xl border border-white/[0.06] bg-[#0D0D14] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Can't find what you need?</h3>
                <p className="text-sm text-[#6B7280]">
                  Ask our AI-powered docs assistant or reach out to the team.
                </p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <Link to="/contact" className="btn-secondary text-sm">Contact Us</Link>
                <Link to="/chat" className="btn-primary text-sm">Ask AI</Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
