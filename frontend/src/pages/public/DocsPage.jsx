import { Link } from 'react-router-dom'
import { BookOpen, Code, Zap, Shield, Mic, GitBranch, Settings, HelpCircle } from 'lucide-react'

const DOC_SECTIONS = [
  {
    title: 'Getting Started',
    icon: BookOpen,
    items: [
      { label: 'Quick Start', href: '/docs/quick-start' },
      { label: 'Authentication', href: '/docs/authentication' },
      { label: 'First Chat', href: '/docs/first-chat' },
    ],
  },
  {
    title: 'Features',
    icon: Zap,
    items: [
      { label: 'Council Mode', href: '/docs/council-mode' },
      { label: 'Voice Chat', href: '/docs/voice-chat' },
      { label: 'Conversation Branching', href: '/docs/branching' },
      { label: 'Custom Personas', href: '/docs/personas' },
    ],
  },
  {
    title: 'API Reference',
    icon: Code,
    items: [
      { label: 'Authentication', href: '/docs/api/auth' },
      { label: 'Chat Completions', href: '/docs/api/completions' },
      { label: 'Models', href: '/docs/api/models' },
      { label: 'TTS', href: '/docs/api/tts' },
    ],
  },
  {
    title: 'Security',
    icon: Shield,
    items: [
      { label: 'Data Privacy', href: '/docs/privacy' },
      { label: 'Encryption', href: '/docs/encryption' },
      { label: 'Compliance', href: '/docs/compliance' },
    ],
  },
  {
    title: 'Voice',
    icon: Mic,
    items: [
      { label: 'Voice Agents', href: '/docs/voice-agents' },
      { label: 'TTS Configuration', href: '/docs/tts-config' },
      { label: 'Voice Cloning', href: '/docs/voice-cloning' },
    ],
  },
  {
    title: 'Advanced',
    icon: GitBranch,
    items: [
      { label: 'Local Models', href: '/docs/local-models' },
      { label: 'Custom CSS', href: '/docs/custom-css' },
      { label: 'Keyboard Shortcuts', href: '/docs/shortcuts' },
    ],
  },
]

export default function DocsPage() {
  return (
    <div className="pt-28 pb-20">
      <div className="section-padding mb-16">
        <div className="container-custom text-center">
          <span className="text-sm font-medium text-accent tracking-wide uppercase mb-4 block">Documentation</span>
          <h1 className="text-h1 mb-5">Everything you need to <span className="text-gradient-accent">know</span></h1>
          <p className="text-body-lg text-foreground-muted max-w-2xl mx-auto">
            Guides, API reference, and feature documentation.
          </p>
        </div>
      </div>

      <div className="section-padding">
        <div className="container-custom">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {DOC_SECTIONS.map((section) => (
              <div key={section.title} className="card p-6">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <section.icon className="w-5 h-5 text-accent" />
                </div>
                <h2 className="text-lg font-semibold text-foreground-primary mb-4">{section.title}</h2>
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link to={item.href} className="text-sm text-foreground-muted hover:text-accent transition-colors flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-border-medium" />
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
