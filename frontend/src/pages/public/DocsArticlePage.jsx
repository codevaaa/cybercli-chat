import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const ARTICLES = {
  'quick-start': { title: 'Quick Start', content: '<p>Welcome to CyberCli. This guide will get you up and running in under 5 minutes.</p><h2>Step 1: Create an account</h2><p>Sign up with email, Google, or GitHub. Verify your email address.</p><h2>Step 2: Start your first chat</h2><p>Click &quot;New Chat&quot; and select a model. Type your message and press Enter.</p><h2>Step 3: Explore features</h2><p>Try Council Mode, voice chat, and conversation branching from the settings panel.</p>' },
  'authentication': { title: 'Authentication', content: '<p>CyberCli uses Supabase Auth for secure authentication.</p>' },
  'first-chat': { title: 'First Chat', content: '<p>Your first chat experience with CyberCli.</p>' },
  'council-mode': { title: 'Council Mode', content: '<p>Council Mode sends your question to three models and synthesizes the best answer.</p>' },
  'voice-chat': { title: 'Voice Chat', content: '<p>Hold Spacebar to talk. The AI responds automatically via TTS.</p>' },
  'branching': { title: 'Conversation Branching', content: '<p>Right-click any message to fork a new thread.</p>' },
  'personas': { title: 'Custom Personas', content: '<p>Create custom AI personalities with system prompts.</p>' },
  'api': { title: 'API Reference', content: '<p>CyberCli provides a REST API for programmatic access.</p>' },
  'privacy': { title: 'Data Privacy', content: '<p>Your data is yours. We do not train on your conversations.</p>' },
  'local-models': { title: 'Local Models', content: '<p>Run models in your browser with WebGPU for zero-latency privacy.</p>' },
}

export default function DocsArticlePage() {
  const { slug } = useParams()
  const article = ARTICLES[slug] || ARTICLES['quick-start']

  return (
    <div className="pt-28 pb-20">
      <div className="section-padding">
        <div className="container-custom max-w-3xl">
          <Link to="/docs" className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground-primary transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to docs
          </Link>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground-primary mb-8 tracking-tight">
            {article.title}
          </h1>

          <div className="prose prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: article.content }} />
          </div>
        </div>
      </div>
    </div>
  )
}
