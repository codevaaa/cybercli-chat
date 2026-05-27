import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Cpu, Users, Shield, Mic, GitBranch, Globe, MessageSquare, Brain, Clock, Lock, Zap, Sparkles, BarChart3, Code, FileText, Image, Layers, Palette, Keyboard, Share2, BookOpen, Bell, Terminal, ArrowRight } from 'lucide-react'
import ScrollReveal, { ScrollRevealGroup } from '@components/ui/ScrollReveal'

const ALL_FEATURES = [
  {
    category: 'Intelligence',
    color: '#D97757',
    items: [
      { slug: 'council-mode', icon: Users, title: 'Council Mode', desc: 'Three AI models debate your question and synthesize the best possible answer. No other platform offers multi-model deliberation.' },
      { slug: 'chain-of-thought', icon: Brain, title: 'Chain-of-Thought Viewer', desc: 'See exactly how the AI is reasoning, step by step. Collapsible reasoning chains for full transparency.' },
      { slug: 'council-mode', icon: BarChart3, title: 'Confidence Score', desc: 'Every answer includes a self-rated confidence score (0–100%). Know when to verify and when to trust.' },
      { slug: 'research-mode', icon: Sparkles, title: 'Auto-Fact-Check', desc: 'Flag uncertain claims automatically. One click to verify via integrated web search.' },
      { slug: 'research-mode', icon: BookOpen, title: 'Research Mode', desc: 'Generate full PDF-ready reports with table of contents, citations, and structured sections.' },
      { slug: 'privacy-first', icon: Clock, title: 'Persistent Memory', desc: 'CyberCli remembers facts from all your past chats, not just the current thread.' },
    ],
  },
  {
    category: 'Voice & Multimodal',
    color: '#D97757',
    items: [
      { slug: 'voice-chat', icon: Mic, title: 'Walkie-Talkie Voice Chat', desc: 'Hold Spacebar to talk. CyberCli hears, thinks, and responds automatically via natural TTS.' },
      { slug: 'voice-chat', icon: Zap, title: 'Voice Interruption', desc: 'Cut CyberCli mid-sentence. It stops and listens immediately. True conversational flow.' },
      { slug: 'voice-chat', icon: Palette, title: 'Unique AI Voices', desc: 'High-quality female and male voices powered by Gemini Flash and Web Speech APIs.' },
      { slug: 'voice-chat', icon: Image, title: 'Image Understanding', desc: 'Upload any image. Vision-capable models analyze, describe, and reason about visual content.' },
      { slug: 'voice-chat', icon: voiceChatGen(), iconName: 'Image Generation', title: 'Image Generation', desc: 'Use /generate to create images from text prompts via free image generation APIs.' },
      { slug: 'voice-chat', icon: Terminal, title: 'Voice Model Selection', desc: 'Choose your preferred voice model — high-speed Gemini Flash TTS or browser native Web Speech.' },
    ],
  },
  {
    category: 'Organization',
    color: '#06B6D4',
    items: [
      { slug: 'conversation-branching', icon: GitBranch, title: 'Conversation Branching', desc: 'Fork any message into a new thread. Explore multiple paths without losing context.' },
      { slug: 'conversation-branching', icon: Layers, title: 'Chat Folders', desc: 'Organize threads into nested folders. Color-coded for quick identification.' },
      { slug: 'conversation-branching', icon: FileText, title: 'Chat Summaries', desc: 'Auto-generated 3-line summaries for every thread. Scan your library at a glance.' },
      { slug: 'conversation-branching', icon: MessageSquare, title: 'Thread Search', desc: 'Full-text search across all your chats, messages, and snippets instantly.' },
      { slug: 'conversation-branching', icon: Shield, title: 'Pinned Messages', desc: 'Pin critical answers in long threads for instant reference.' },
      { slug: 'conversation-branching', icon: Globe, title: 'Public Share Links', desc: 'Share any chat as a read-only public page. Control visibility per thread.' },
    ],
  },
  {
    category: 'Power User',
    color: '#10B981',
    items: [
      { slug: 'custom-agents', icon: Keyboard, title: 'Slash Commands', desc: '/summarize, /translate, /code, /research, /brainstorm. Instant actions from the input bar.' },
      { slug: 'custom-agents', icon: Code, title: 'Keyboard Shortcuts', desc: 'Ctrl+K command palette, Ctrl+N new chat. Built for speed, designed for flow.' },
      { slug: 'custom-agents', icon: BookOpen, title: 'Snippets Library', desc: 'Save reusable prompt templates. Insert them with a shortcut in any chat.' },
      { slug: 'privacy-first', icon: Lock, title: 'Privacy First', desc: 'No training on your data. Export or delete everything at any time. GDPR compliant.' },
      { slug: 'custom-agents', icon: Bell, title: 'Scheduled Chats', desc: 'Automated recurring AI sessions. Every Monday at 9 AM: your weekly goals brief.' },
      { slug: 'custom-agents', icon: Cpu, title: 'Custom Agents', desc: 'Build and deploy specialized AI personas with custom system prompts, temperature, and icons.' },
    ],
  },
]

// Helper for generating conditional icons or custom styles if needed, but we keep lucide components
function voiceChatGen() {
  return Layers;
}

export default function FeaturesPage() {
  return (
    <div className="pt-28 pb-20">
      {/* Header */}
      <div className="section-padding mb-20">
        <div className="container-custom text-center">
          <ScrollReveal>
            <span className="text-sm font-medium text-accent tracking-widest uppercase mb-4 block">Features</span>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-light text-foreground-primary mb-6">
              Built for{' '}
              <span className="text-gradient-accent italic">power users</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <p className="text-lg text-foreground-muted max-w-2xl mx-auto leading-relaxed">
              Every feature is designed to make your AI experience faster, deeper, and more personal.
              This is what ChatGPT, Claude, and Gemini still don't offer.
            </p>
          </ScrollReveal>
        </div>
      </div>

      {/* Feature Categories */}
      <div className="section-padding">
        <div className="container-custom space-y-24">
          {ALL_FEATURES.map((category, ci) => (
            <div key={category.category}>
              <ScrollReveal>
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-1 h-8 rounded-full" style={{ background: category.color }} />
                  <h2 className="text-2xl font-semibold text-foreground-primary">{category.category}</h2>
                  <div className="flex-1 h-px bg-border-subtle" />
                </div>
              </ScrollReveal>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {category.items.map((item, i) => (
                  <ScrollReveal key={item.title} delay={i * 0.07}>
                    <Link to={`/features/${item.slug}`} className="block h-full">
                      <motion.div
                        className="card-glass p-6 h-full group cursor-pointer flex flex-col justify-between"
                        whileHover={{ y: -5, scale: 1.01 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        <div>
                          {/* Icon */}
                          <motion.div
                            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 animate-transition"
                            style={{ background: `${category.color}18`, border: `1px solid ${category.color}30` }}
                            whileHover={{ rotate: 8, scale: 1.1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                          >
                            <item.icon className="w-6 h-6" style={{ color: category.color }} />
                          </motion.div>

                          <h3 className="text-base font-semibold text-foreground-primary mb-2 group-hover:text-accent transition-colors flex items-center gap-2">
                            {item.title}
                          </h3>
                          <p className="text-sm text-foreground-muted leading-relaxed mb-4">{item.desc}</p>
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-accent flex items-center gap-1 group-hover:gap-2 transition-all mt-2">
                            Learn more <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                          
                          {/* Bottom accent line on hover */}
                          <div className="mt-4 h-px w-0 group-hover:w-full transition-all duration-500 rounded-full animate-transition"
                            style={{ background: `linear-gradient(to right, ${category.color}, transparent)` }} />
                        </div>
                      </motion.div>
                    </Link>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
