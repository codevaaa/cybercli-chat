import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll } from 'framer-motion'
import { ArrowLeft, Clock, Tag, ChevronRight } from 'lucide-react'
import { BLOG_POSTS } from './BlogPage'

function MarkdownContent({ content }) {
  const lines = content.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(
        <h2
          key={i}
          id={line.replace('## ', '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
          className="text-2xl font-bold text-white mt-12 mb-5 scroll-mt-24"
        >
          {line.replace('## ', '')}
        </h2>
      )
    } else if (line.startsWith('**') && line.endsWith('**:')) {
      elements.push(
        <p key={i} className="text-base font-semibold text-white mt-5 mb-2">
          {line.replace(/\*\*/g, '').replace(/:$/, ':')}
        </p>
      )
    } else if (line.startsWith('- **')) {
      elements.push(
        <li key={i} className="text-[#9CA3AF] leading-relaxed ml-4">
          <span dangerouslySetInnerHTML={{
            __html: line.replace(/^- /, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
          }} />
        </li>
      )
    } else if (line.startsWith('- ') || line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ') || line.startsWith('4. ')) {
      elements.push(
        <li key={i} className="text-[#9CA3AF] leading-relaxed ml-4">
          <span dangerouslySetInnerHTML={{
            __html: (line.replace(/^[-\d.] /, '').replace(/^  - /, '')).replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
          }} />
        </li>
      )
    } else if (line.startsWith('`') && line.endsWith('`')) {
      elements.push(
        <code key={i} className="inline-block px-3 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-sm font-mono text-violet-300 my-1">
          {line.replace(/`/g, '')}
        </code>
      )
    } else if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
      elements.push(
        <p key={i} className="text-sm text-[#6B7280] italic my-2">
          {line.replace(/\*/g, '')}
        </p>
      )
    } else if (line.trim() === '') {
      // empty line - skip
    } else {
      // Regular paragraph
      const html = line
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-violet-400 hover:text-violet-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer">$1</a>')
        .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/[0.06] text-sm font-mono text-violet-300">$1</code>')

      elements.push(
        <p
          key={i}
          className="text-[#9CA3AF] leading-[1.85] mb-4 text-[15px]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )
    }
    i++
  }

  return <div className="prose-custom">{elements}</div>
}

export default function BlogPostPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const post = BLOG_POSTS.find(p => p.slug === slug)
  const { scrollYProgress } = useScroll()
  const [activeSection, setActiveSection] = useState(0)
  const sectionRefs = useRef([])

  useEffect(() => {
    if (!post) {
      navigate('/blog')
    }
  }, [post, navigate])

  useEffect(() => {
    const handleScroll = () => {
      if (!post) return
      const sectionIds = post.sections.map(s =>
        s.replace(/['"]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      )
      const scrollPos = window.scrollY + 120
      let active = 0
      sectionIds.forEach((id, i) => {
        const el = document.getElementById(id)
        if (el && el.offsetTop <= scrollPos) active = i
      })
      setActiveSection(active)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [post])

  if (!post) return null

  const sectionIds = post.sections.map(s =>
    s.replace(/['"]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  )

  return (
    <div className="pt-20 pb-20 bg-[#0A0A0F] min-h-screen">
      {/* Read Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-600 to-indigo-500 z-50 origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      <div className="section-padding">
        <div className="container-custom max-w-6xl mx-auto">
          {/* Back link */}
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          <div className="grid lg:grid-cols-[1fr_280px] gap-12 items-start">
            {/* Main Content */}
            <article>
              {/* Header */}
              <header className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${post.categoryColor}`}>
                    {post.category}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-[#6B7280]">
                    <Clock className="w-3.5 h-3.5" />
                    {post.readTime}
                  </div>
                </div>

                <h1 className="text-[clamp(1.8rem,3.5vw,3rem)] font-extrabold text-white leading-[1.15] mb-6 tracking-tight">
                  {post.title}
                </h1>

                <p className="text-lg text-[#9CA3AF] leading-relaxed mb-6">{post.excerpt}</p>

                <div className="flex items-center gap-3 pb-6 border-b border-white/[0.06]">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{post.authorInitials}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{post.author}</p>
                    <p className="text-xs text-[#6B7280]">{post.date} · CyberMindCLI Research</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-5">
                  {post.tags.map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-white/[0.04] text-[#6B7280] border border-white/[0.06] flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </header>

              {/* Article content */}
              <div className="article-body">
                <MarkdownContent content={post.content} />
              </div>

              {/* Footer CTA */}
              <div className="mt-16 p-8 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-violet-900/20 to-indigo-900/10 text-center">
                <h3 className="text-xl font-bold text-white mb-2">Explore CyberCli Chat</h3>
                <p className="text-sm text-[#9CA3AF] mb-5">
                  The platform built by the same cybersecurity researcher who wrote this article.
                </p>
                <Link to="/auth/signup" className="btn-primary inline-flex">
                  Get Started Free
                </Link>
              </div>
            </article>

            {/* Sticky Sidebar — Table of Contents */}
            <aside className="sticky top-24 hidden lg:block">
              <div className="rounded-2xl border border-white/[0.06] bg-[#0D0D14] p-5">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-4">
                  Table of Contents
                </p>
                <nav className="space-y-1">
                  {post.sections.map((section, i) => (
                    <a
                      key={i}
                      href={`#${sectionIds[i]}`}
                      className={`flex items-start gap-2 text-sm py-1.5 px-2 rounded-lg transition-all duration-200 ${
                        activeSection === i
                          ? 'text-white bg-violet-500/10 border-l-2 border-violet-500 pl-3'
                          : 'text-[#6B7280] hover:text-white hover:bg-white/[0.03]'
                      }`}
                    >
                      <ChevronRight className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 transition-colors ${activeSection === i ? 'text-violet-400' : 'text-[#374151]'}`} />
                      {section}
                    </a>
                  ))}
                </nav>

                <div className="mt-6 pt-5 border-t border-white/[0.06]">
                  <p className="text-xs text-[#6B7280] mb-2">Written by</p>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-white">{post.authorInitials}</span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">{post.author}</p>
                      <p className="text-[10px] text-[#6B7280]">Founder, CyberMindCLI</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other articles */}
              <div className="mt-4 rounded-2xl border border-white/[0.06] bg-[#0D0D14] p-5">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-4">
                  More Articles
                </p>
                <div className="space-y-3">
                  {BLOG_POSTS.filter(p => p.slug !== slug).map(other => (
                    <Link key={other.slug} to={`/blog/${other.slug}`} className="block group">
                      <p className="text-xs text-[#9CA3AF] group-hover:text-white transition-colors leading-snug line-clamp-2">
                        {other.title}
                      </p>
                      <p className="text-[10px] text-[#4B5563] mt-1">{other.readTime}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
