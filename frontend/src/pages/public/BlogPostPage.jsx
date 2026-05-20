import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, Share2 } from 'lucide-react'

const POSTS = {
  'introducing-council-mode': {
    title: 'Introducing Council Mode: Three Models, One Answer',
    date: 'May 15, 2026',
    readTime: '5 min read',
    category: 'Product',
    content: `
<p>Today we are launching Council Mode — a feature that no other AI chat platform offers.</p>

<h2>The Problem With Single-Model Answers</h2>
<p>When you ask ChatGPT, Claude, or Gemini a question, you get one model's perspective. That perspective is shaped by its training data, fine-tuning, and safety filters. It is one point of view, and it might be wrong.</p>

<h2>How Council Mode Works</h2>
<p>Council Mode sends your question to three different models simultaneously. Each model generates its own answer. Then, a synthesis engine:</p>
<ul>
<li>Identifies where all three models agree (high confidence facts)</li>
<li>Highlights where they disagree (areas requiring human judgment)</li>
<li>Combines the best reasoning from each into one superior response</li>
</ul>

<h2>Why This Matters</h2>
<p>For factual questions, Council Mode dramatically reduces hallucination rates. For subjective questions, it surfaces multiple perspectives so you can decide. For complex reasoning, it combines the strengths of different model architectures.</p>

<p>Council Mode is available on all Pro and Enterprise plans. Try it today.</p>
    `,
  },
  'uncensored-ai-ethics': {
    title: 'Uncensored AI With Ethics: Our Approach',
    date: 'May 10, 2026',
    readTime: '7 min read',
    category: 'Ethics',
    content: `<p>We believe in access to truth, not access controlled by corporate safety teams.</p>`,
  },
  'free-elevenlabs-tts': {
    title: 'How We Offer Free ElevenLabs TTS via Puter.js',
    date: 'May 5, 2026',
    readTime: '6 min read',
    category: 'Engineering',
    content: `<p>Puter.js enables free, unlimited ElevenLabs TTS through their User-Pays model.</p>`,
  },
  'hybrid-database': {
    title: 'Why We Chose Supabase + MongoDB Hybrid Architecture',
    date: 'April 28, 2026',
    readTime: '8 min read',
    category: 'Engineering',
    content: `<p>Two databases, one cohesive system. Here is why we made this choice.</p>`,
  },
}

export default function BlogPostPage() {
  const { slug } = useParams()
  const post = POSTS[slug]

  if (!post) {
    return (
      <div className="pt-28 pb-20 section-padding">
        <div className="container-custom text-center">
          <h1 className="text-h2 mb-4">Post not found</h1>
          <Link to="/blog" className="text-accent hover:underline">Back to blog</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-28 pb-20">
      <div className="section-padding">
        <div className="container-custom max-w-3xl">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground-primary transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to blog
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <span className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
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

          <h1 className="text-3xl md:text-4xl font-bold text-foreground-primary mb-8 tracking-tight">
            {post.title}
          </h1>

          <div className="prose prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          </div>

          <div className="mt-12 pt-8 border-t border-border-subtle flex items-center justify-between">
            <span className="text-sm text-foreground-muted">Share this post</span>
            <button className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground-primary transition-colors">
              <Share2 className="w-4 h-4" />
              Copy link
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
