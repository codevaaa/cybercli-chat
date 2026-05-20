import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Brain, Wrench, Settings2, Sparkles, Zap, Code, Search, Globe } from 'lucide-react'

const SAMPLE_AGENTS = [
  { id: '1', name: 'Code Reviewer', description: 'Reviews code for bugs, performance, and style.', icon: Code, tools: ['web_search', 'calculator'], color: 'accent' },
  { id: '2', name: 'Research Assistant', description: 'Deep research with citations and synthesis.', icon: Search, tools: ['web_search', 'document_read'], color: 'accent' },
  { id: '3', name: 'Creative Writer', description: 'Helps with stories, essays, and creative content.', icon: Sparkles, tools: ['image_gen'], color: 'accent' },
  { id: '4', name: 'Web Scout', description: 'Browses the web and summarizes findings.', icon: Globe, tools: ['web_search', 'browser'], color: 'accent' },
]

export default function AgentsPage() {
  const [agents] = useState(SAMPLE_AGENTS)

  return (
    <div className="min-h-screen pt-20 pb-12 bg-background-primary">
      <div className="section-padding">
        <div className="container-custom max-w-4xl">
          <Link to="/chat" className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground-primary transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to chat
          </Link>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-h2">AI Agents</h1>
              <p className="text-sm text-foreground-muted mt-1">Custom agents with tool access and specialized behavior.</p>
            </div>
            <button className="btn-primary">
              <Plus className="w-4 h-4" />
              New Agent
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {agents.map((agent) => (
              <div key={agent.id} className="card-glow p-6 gpu-accelerate">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <agent.icon className="w-6 h-6 text-accent" />
                  </div>
                  <button className="p-1.5 rounded-lg hover:bg-background-tertiary">
                    <Settings2 className="w-4 h-4 text-foreground-muted" />
                  </button>
                </div>
                <h3 className="text-lg font-semibold text-foreground-primary mb-2">{agent.name}</h3>
                <p className="text-sm text-foreground-muted mb-4">{agent.description}</p>
                <div className="flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5 text-foreground-muted" />
                  <div className="flex gap-1.5">
                    {agent.tools.map((tool) => (
                      <span key={tool} className="px-2 py-0.5 rounded-full bg-background-tertiary text-foreground-muted text-xs">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
