import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Compass, Search, Sparkles, Code2, BookOpen, Layers } from 'lucide-react'
import { Tooltip } from '@components/ui/Tooltip.jsx'

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
    <div className="min-h-screen pt-24 pb-16 bg-background-primary text-foreground-primary selection:bg-accent/20 selection:text-accent font-sans">
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        {/* Header row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <Link to="/chat" className="inline-flex items-center gap-2 text-xs font-medium text-foreground-secondary hover:text-foreground-primary transition-colors mb-4 group">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              Return to Workspace
            </Link>
            <h1 className="text-3xl md:text-4xl font-serif font-medium tracking-tight flex items-center gap-3 text-foreground-primary">
              <div className="p-2 rounded-xl bg-accent/10 border border-accent/20 shadow-sm">
                <Compass className="w-6 h-6 text-accent" />
              </div>
              Discover
            </h1>
            <p className="text-sm text-foreground-secondary/80 mt-3 leading-relaxed max-w-lg">
              Browse through curated, expert-tested prompts designed to maximize the reasoning capabilities of Codeva models.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full bg-background-elevated/50 text-sm text-foreground-primary placeholder:text-foreground-secondary/40 border border-border-subtle rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-accent transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-3 mb-10 border-b border-border-subtle/50 pb-5">
          {categories.map(c => {
            const Icon = c.icon
            const isActive = activeTab === c.id
            return (
              <button
                key={c.id}
                onClick={() => setActiveTab(c.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-foreground-primary text-background-primary shadow-md'
                    : 'bg-background-elevated border border-border-subtle text-foreground-secondary hover:text-foreground-primary hover:border-border-medium'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{c.label}</span>
              </button>
            )}
          )}
        </div>

        {/* Cards Grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredPacks.map((pack) => (
              <motion.div
                key={pack.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-background-elevated/40 backdrop-blur-sm border border-border-subtle hover:border-accent/30 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 group cursor-pointer hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
                onClick={() => handleRunPrompt(pack.prompt)}
              >
                <div>
                  <div className="flex justify-between items-center mb-5 text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-accent flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      {pack.category}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-background-primary border border-border-subtle text-foreground-secondary/70 shadow-sm">
                      {pack.difficulty}
                    </span>
                  </div>
                  <h3 className="text-lg font-serif font-medium text-foreground-primary mb-2 group-hover:text-accent transition-colors">
                    {pack.title}
                  </h3>
                  <p className="text-sm text-foreground-secondary/80 leading-relaxed line-clamp-3">
                    {pack.description}
                  </p>
                </div>

                <div className="pt-5 mt-6 border-t border-border-subtle/50 flex justify-between items-center text-xs font-semibold text-accent opacity-80 group-hover:opacity-100 transition-opacity">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    Use this prompt
                  </span>
                  <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                    <ArrowLeft className="w-3 h-3 text-accent rotate-180" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty State */}
        {filteredPacks.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-24 bg-background-elevated/20 border border-border-subtle border-dashed rounded-3xl flex flex-col items-center justify-center gap-4 mt-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-background-primary border border-border-subtle shadow-sm flex items-center justify-center mb-2">
              <Search className="w-8 h-8 text-foreground-secondary/40" />
            </div>
            <h3 className="text-xl font-serif font-medium text-foreground-primary">No prompts found</h3>
            <p className="text-sm text-foreground-secondary/70 max-w-sm leading-relaxed mb-4">
              We couldn't find any templates matching "{searchQuery}". Try using a different term or category.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setActiveTab('all'); }}
              className="px-6 py-2.5 rounded-xl bg-background-primary border border-border-subtle text-foreground-primary text-sm font-medium hover:border-accent/50 hover:text-accent transition-all shadow-sm cursor-pointer"
            >
              Clear filters
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
