import { Link } from 'react-router-dom'
import { Calendar, Clock, ArrowRight } from 'lucide-react'

const BLOG_POSTS = [
  { slug: 'introducing-council-mode', title: 'Introducing Council Mode: Three Models, One Answer', excerpt: 'We built something no other AI platform has: multi-model deliberation. Here is how it works and why it matters.', date: 'May 15, 2026', readTime: '5 min read', category: 'Product' },
  { slug: 'uncensored-ai-ethics', title: 'Uncensored AI With Ethics: Our Approach', excerpt: 'How we balance access to truth-seeking models with responsible guardrails and transparency.', date: 'May 10, 2026', readTime: '7 min read', category: 'Ethics' },
  { slug: 'free-elevenlabs-tts', title: 'How We Offer Free ElevenLabs TTS via Puter.js', excerpt: 'A deep dive into our TTS architecture and how we provide unlimited ElevenLabs voice synthesis at zero cost.', date: 'May 5, 2026', readTime: '6 min read', category: 'Engineering' },
  { slug: 'hybrid-database', title: 'Why We Chose Supabase + MongoDB Hybrid Architecture', excerpt: 'The story behind our dual-database approach and how it powers CyberCli at scale.', date: 'April 28, 2026', readTime: '8 min read', category: 'Engineering' },
]

export default function BlogPage() {
  return (
    <div className="pt-28 pb-20">
      <div className="section-padding mb-16">
        <div className="container-custom text-center">
          <span className="text-sm font-medium text-accent tracking-wide uppercase mb-4 block">Blog</span>
          <h1 className="text-h1 mb-5">Latest from <span className="text-gradient-accent">CyberCli</span></h1>
          <p className="text-body-lg text-foreground-muted max-w-2xl mx-auto">
            Product updates, engineering deep dives, and AI research.
          </p>
        </div>
      </div>

      <div className="section-padding">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {BLOG_POSTS.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="card p-6 group gpu-accelerate"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium shadow-[0_0_10px_rgba(217,119,87,0.2)]">
                    {post.category}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-foreground-muted">
                    <Calendar className="w-3.5 h-3.5" />
                    {post.date}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-foreground-muted">
                    <Clock className="w-3.5 h-3.5" />
                    {post.readTime}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-foreground-primary mb-3 group-hover:text-accent transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-foreground-muted leading-relaxed mb-4">
                  {post.excerpt}
                </p>
                <span className="text-sm text-accent flex items-center gap-1 group-hover:gap-2 transition-all">
                  Read more <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
