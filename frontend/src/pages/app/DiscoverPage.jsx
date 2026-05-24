import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Compass, Search, Sparkles, Code2, BookOpen, Layers, Check } from 'lucide-react'

export default function DiscoverPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const categories = [
    { id: 'all', label: 'All Packs', icon: Compass },
    { id: 'code', label: 'Development', icon: Code2 },
    { id: 'writing', label: 'Writing & Editorial', icon: BookOpen },
    { id: 'analysis', label: 'Research & Analysis', icon: Layers }
  ]

  const promptPacks = [
    {
      id: 'p-1',
      category: 'code',
      title: 'Zod Validator Generator',
      description: 'Creates typescript-safe Zod validation schemas from sample JSON database inputs.',
      prompt: 'Generate a Zod schema based on the following JSON object. Include field descriptions, nested validations, and appropriate custom error messages.',
      difficulty: 'Intermediate'
    },
    {
      id: 'p-2',
      category: 'code',
      title: 'Docker Security hardening',
      description: 'Reviews standard Dockerfiles and suggests container safety hardening changes.',
      prompt: 'Analyze this Dockerfile for security vulnerabilities. Suggest hardening measures including multi-stage builds, non-root user permissions, and minimal base images.',
      difficulty: 'Advanced'
    },
    {
      id: 'p-3',
      category: 'writing',
      title: 'SEO Blog Post Structurer',
      description: 'Generates detailed blog post outlines structured for search engine ranking optimization.',
      prompt: 'Write a comprehensive SEO-friendly blog post outline for the topic. Include target keywords, heading hierarchy (H1-H4), metadata description, and primary user intent summaries.',
      difficulty: 'Beginner'
    },
    {
      id: 'p-4',
      category: 'analysis',
      title: 'Competitive Feature Auditor',
      description: 'Performs feature matrix reviews against primary competitive products.',
      prompt: 'Create a competitive analysis matrix comparing our proposed product features to these top 3 competitors. Highlight primary feature gaps and potential areas of differentiation.',
      difficulty: 'Advanced'
    },
    {
      id: 'p-5',
      category: 'writing',
      title: 'Technical JSDoc Annotator',
      description: 'Annotates functions with JSDoc structures based on JavaScript parameters.',
      prompt: 'Review the following JavaScript functions. Add complete JSDoc annotations detailing type signatures, return values, parameter validations, and descriptive comments.',
      difficulty: 'Beginner'
    }
  ]

  const filteredPacks = useMemo(() => {
    return promptPacks.filter(pack => {
      const matchesTab = activeTab === 'all' || pack.category === activeTab
      const matchesSearch = pack.title.toLowerCase().includes(searchQuery.toLowerCase()) || pack.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesTab && matchesSearch
    })
  }, [activeTab, searchQuery])

  const handleRunPrompt = (promptText) => {
    navigate(`/chat?prompt=${encodeURIComponent(promptText)}`)
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background-primary text-foreground-primary">
      <div className="section-padding">
        <div className="container-custom max-w-5xl">
          {/* Header row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
            <div>
              <Link to="/chat" className="inline-flex items-center gap-2 text-xs font-semibold text-foreground-muted hover:text-foreground-primary transition-colors mb-4 group">
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                Back to chat
              </Link>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
                <Compass className="w-7 h-7 text-accent" />
                Discover prompts
              </h1>
              <p className="text-xs text-foreground-muted mt-1 leading-normal">
                Browse through curated, expert-tested prompts designed for maximum accuracy.
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full bg-background-secondary text-sm text-foreground-primary placeholder:text-foreground-muted border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2.5 mb-8 border-b border-border-subtle/30 pb-4">
            {categories.map(c => {
              const Icon = c.icon
              const isActive = activeTab === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveTab(c.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-accent/15 border border-accent/30 text-accent'
                      : 'bg-background-tertiary border border-border-subtle text-foreground-muted hover:text-foreground-primary'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{c.label}</span>
                </button>
              )}
            )}
          </div>

          {/* Cards Grid */}
          <motion.div layout className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredPacks.map((pack) => (
                <motion.div
                  key={pack.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="card p-6 flex flex-col justify-between hover:border-white/[0.12] transition-all group cursor-pointer"
                  onClick={() => handleRunPrompt(pack.prompt)}
                >
                  <div>
                    <div className="flex justify-between items-center mb-4 text-[10px] font-extrabold uppercase tracking-widest">
                      <span className="text-accent">{pack.category}</span>
                      <span className="px-2.5 py-0.5 rounded-full border border-border-subtle text-foreground-muted">
                        {pack.difficulty}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground-primary mb-2 group-hover:text-accent transition-colors">
                      {pack.title}
                    </h3>
                    <p className="text-xs text-foreground-muted leading-relaxed font-medium line-clamp-3">
                      {pack.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border-subtle/50 mt-6 flex justify-between items-center text-[11px] font-bold text-accent">
                    <span>Try prompt</span>
                    <Sparkles className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Empty State */}
          {filteredPacks.length === 0 && (
            <div className="text-center py-20 card flex flex-col items-center justify-center gap-4">
              <Search className="w-12 h-12 text-foreground-muted opacity-30" />
              <h3 className="text-base font-bold text-foreground-primary">No prompts match your search</h3>
              <p className="text-xs text-foreground-muted max-w-xs leading-normal">
                Try using a different query or select a different filter category tab above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
