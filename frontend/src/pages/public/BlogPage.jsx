import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Clock, Tag, User } from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'
import SEOHead, { StructuredData } from '@components/seo/SEOHead'

export const BLOG_POSTS = [
  {
    slug: 'codeva-ecosystem-security-tools',
    title: 'Advanced Cybersecurity Ecosystem: Offensive and Defensive Developer-Level Tools Powered by Codeva',
    excerpt: 'Explore the suite of secure security modules and tools created under founder Chandan Pandey. A deep dive into offensive and defensive tools, agentic penetration testing, and code analysis hubs.',
    author: 'Chandan Pandey',
    date: 'May 21, 2026',
    readTime: '15 min read',
    category: 'Security Ecosystem',
    categoryColor: '#E11D48',
    gradient: 'from-[#1c0c10] via-[#14080b] to-[#0D0D12]',
    image: '/logo-mark.png',
    tags: ['security-tools', 'chandan-pandey', 'offensive-security', 'defensive-security', 'code-auditing'],
  },
  {
    slug: 'ai-ide-comparison-cursor-windsurf-copilot-codeva',
    title: 'The Battle of the AI IDEs: A Comparative Analysis of Cursor, Windsurf, GitHub Copilot, and Codeva',
    excerpt: 'Which AI assistant reigns supreme for professional developer workflows? We compare Cursor, Windsurf, Copilot, and Codeva on capabilities, agentic execution, local control, and cost, using a detailed comparison table.',
    author: 'Chandan Pandey',
    date: 'May 21, 2026',
    readTime: '12 min read',
    category: 'AI Development',
    categoryColor: '#10B981',
    gradient: 'from-[#0b1c14] via-[#08140f] to-[#0D0D12]',
    image: '/blog-comparison.png',
    tags: ['ai-ide', 'cursor', 'windsurf', 'copilot', 'agentic-coding', 'comparison'],
  },
  {
    slug: 'autonomous-security-agents-vs-cobalt-strike',
    title: 'Autonomous Security Agents vs. Cobalt Strike: The Evolution of Penetration Testing',
    excerpt: 'Is legacy offensive software obsolete? We compare Cobalt Strike, pentesting frameworks, and autonomous agentic vulnerability scanners in real-world scenarios.',
    author: 'Chandan Pandey',
    date: 'May 21, 2026',
    readTime: '13 min read',
    category: 'Offensive Security',
    categoryColor: '#F59E0B',
    gradient: 'from-[#1c180b] via-[#141108] to-[#0D0D12]',
    image: '/blog-myths.png',
    tags: ['autonomous-agents', 'cobalt-strike', 'pentesting', 'red-teaming', 'agentic-scanners'],
  },
  {
    slug: 'quantum-cryptography-post-quantum-security',
    title: 'The Quantum Horizon: Why Post-Quantum Cryptography Is the Biggest Security Challenge of the Decade',
    excerpt: 'Quantum computers will shatter RSA and ECC encryption. Here\'s exactly how Shor\'s algorithm works, what NIST\'s post-quantum standards mean, and how organizations should migrate today.',
    author: 'Chandan Pandey',
    date: 'May 20, 2026',
    readTime: '12 min read',
    category: 'Quantum Security',
    categoryColor: '#D97757',
    gradient: 'from-[#1a0a0a] via-[#140808] to-[#0D0D12]',
    image: '/blog-quantum.png',
    tags: ['quantum-computing', 'cryptography', 'NIST', 'post-quantum', 'lattice-algorithms'],
  },
  {
    slug: 'cybersecurity-myths-debunked-2025',
    title: 'Cybersecurity Myths That Are Getting Organizations Hacked in 2025',
    excerpt: 'From "we\'re too small to be a target" to "HTTPS means it\'s safe" — these dangerous misconceptions are responsible for most modern breaches. Chandan Pandey debunks them with real CVE data.',
    author: 'Chandan Pandey',
    date: 'May 15, 2026',
    readTime: '10 min read',
    category: 'Security Research',
    categoryColor: '#D97757',
    gradient: 'from-[#1a0f06] via-[#130c04] to-[#0D0D12]',
    image: '/blog-myths.png',
    tags: ['cybersecurity', 'myths', 'social-engineering', 'zero-day', 'defense'],
  },
  {
    slug: 'ai-offensive-defensive-security',
    title: 'AI-Powered Offensive and Defensive Security: How LLMs Are Reshaping Cybersecurity Operations',
    excerpt: 'Large language models are now both the weapon and the shield. From AI-assisted penetration testing to automated threat hunting — the security operations center will never be the same.',
    author: 'Chandan Pandey',
    date: 'May 10, 2026',
    readTime: '14 min read',
    category: 'AI Security',
    categoryColor: '#06B6D4',
    gradient: 'from-[#061014] via-[#050d11] to-[#0D0D12]',
    image: '/blog-comparison.png',
    tags: ['AI', 'red-teaming', 'blue-team', 'LLM', 'SIEM', 'automation'],
  },
  {
    slug: 'council-mode-vs-single-model-ai',
    title: 'Council Mode vs. Single-Model AI: Why Multi-Model Deliberation Is the Future of Intelligence',
    excerpt: 'Is a single massive LLM always the best answer? We explore the limits of individual models, the cognitive science of ensemble reasoning, and why Codeva\'s Council Mode beats the competition.',
    author: 'Chandan Pandey',
    date: 'May 05, 2026',
    readTime: '11 min read',
    category: 'AI Innovation',
    categoryColor: '#10B981',
    gradient: 'from-[#061410] via-[#050d0a] to-[#0D0D12]',
    image: '/blog-council.png',
    tags: ['AI-models', 'council-mode', 'ensemble-learning', 'artificial-intelligence', 'multi-agent'],
  },
]

export default function BlogPage() {
  return (
    <div className="pt-28 pb-20">
      <SEOHead
        title="Blog — AI & Security Deep Dives"
        description="Read the latest on AI technology, security best practices, and Codeva updates. Expert articles on Council Mode, encryption, and AI trends."
        keywords="AI blog, AI security, tech blog, AI trends, Codeva blog, AI news"
        path="/blog"
        ogType="blog"
        structuredData={StructuredData.breadcrumb([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' }
        ])}
      />
      {/* Header */}
      <div className="section-padding mb-16">
        <div className="container-custom">
          <ScrollReveal>
            <span className="text-sm font-medium text-accent tracking-widest uppercase mb-4 block">Blog</span>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h1 className="text-5xl sm:text-6xl font-serif font-light text-foreground-primary mb-5">
              Deep dives into{' '}
              <span className="text-gradient-accent italic">security & AI</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <p className="text-lg text-foreground-muted max-w-2xl leading-relaxed">
              Research-grade articles on cybersecurity, quantum computing, offensive tactics, and the future of AI — authored by Chandan Pandey and the Codeva team.
            </p>
          </ScrollReveal>
        </div>
      </div>

      {/* Featured Post */}
      <div className="section-padding mb-12">
        <div className="container-custom">
          <ScrollReveal>
            <Link to={`/blog/${BLOG_POSTS[0].slug}`} className="block group">
              <motion.div
                className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${BLOG_POSTS[0].gradient} border border-border-subtle p-8 lg:p-12`}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 280, damping: 20 }}
              >
                {/* Background glow */}
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl"
                  style={{ background: BLOG_POSTS[0].categoryColor }} />

                <div className="relative grid lg:grid-cols-12 gap-8 items-center">
                  {/* Left content */}
                  <div className="lg:col-span-7 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <span className="text-xs font-semibold px-3 py-1 rounded-full border"
                          style={{ color: BLOG_POSTS[0].categoryColor, borderColor: `${BLOG_POSTS[0].categoryColor}40`, background: `${BLOG_POSTS[0].categoryColor}12` }}>
                          {BLOG_POSTS[0].category}
                        </span>
                        <span className="text-xs text-foreground-muted">{BLOG_POSTS[0].readTime}</span>
                      </div>
                      <h2 className="text-3xl lg:text-4xl font-serif font-medium text-foreground-primary mb-5 leading-tight group-hover:text-accent transition-colors max-w-3xl">
                        {BLOG_POSTS[0].title}
                      </h2>
                      <p className="text-foreground-muted leading-relaxed mb-8">{BLOG_POSTS[0].excerpt}</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">CP</div>
                        <span className="text-sm text-foreground-secondary">{BLOG_POSTS[0].author}</span>
                      </div>
                      <span className="text-foreground-muted text-sm">{BLOG_POSTS[0].date}</span>
                      <span className="ml-auto flex items-center gap-1.5 text-sm font-medium text-accent group-hover:gap-3 transition-all">
                        Read article <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>

                  {/* Right Image */}
                  <div className="lg:col-span-5 relative aspect-video lg:aspect-[4/3] rounded-2xl overflow-hidden border border-white/10">
                    <img 
                      src={BLOG_POSTS[0].image} 
                      alt={BLOG_POSTS[0].title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>
              </motion.div>
            </Link>
          </ScrollReveal>
        </div>
      </div>

      {/* All Posts Grid */}
      <div className="section-padding">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BLOG_POSTS.slice(1).map((post, i) => (
              <ScrollReveal key={post.slug} delay={i * 0.1}>
                <Link to={`/blog/${post.slug}`} className="block group h-full">
                  <motion.div
                    className={`relative h-full overflow-hidden rounded-2xl bg-gradient-to-br ${post.gradient} border border-border-subtle p-0 flex flex-col`}
                    whileHover={{ y: -4, borderColor: `${post.categoryColor}40` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    {/* Card Image */}
                    <div className="relative aspect-video w-full overflow-hidden border-b border-white/5">
                      <img 
                        src={post.image} 
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-[#0A0A0F]/80 backdrop-blur-sm"
                          style={{ color: post.categoryColor, borderColor: `${post.categoryColor}40` }}>
                          {post.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-4 text-xs text-foreground-muted">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{post.readTime}</span>
                        <span className="ml-auto">{post.date}</span>
                      </div>

                      <h3 className="text-lg font-semibold text-foreground-primary mb-3 leading-snug group-hover:text-accent transition-colors flex-1 line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-foreground-muted leading-relaxed mb-5 line-clamp-3">{post.excerpt}</p>
                      
                      <div className="flex items-center gap-3 pt-4 border-t border-white/5 mt-auto">
                        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">CP</div>
                        <span className="text-xs text-foreground-muted">{post.author}</span>
                        <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                          Read <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
