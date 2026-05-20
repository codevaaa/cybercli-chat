import { useEffect, useRef } from 'react'
import { Cpu, Users, Shield, Mic, GitBranch, Globe, MessageSquare, Brain, Clock, Lock, Zap, Sparkles, BarChart3, Code, FileText, Image, Layers, Palette, Keyboard, Share2, BookOpen, Bell, Terminal } from 'lucide-react'

const ALL_FEATURES = [
  {
    category: 'Intelligence',
    items: [
      { icon: Users, title: 'Council Mode', desc: 'Three AI models debate your question and synthesize the best possible answer. No other platform offers multi-model deliberation.' },
      { icon: Brain, title: 'Chain-of-Thought Viewer', desc: 'See exactly how the AI is reasoning, step by step. Collapsible reasoning chains for transparency.' },
      { icon: BarChart3, title: 'Confidence Score', desc: 'Every answer includes a self-rated confidence score (0-100%). Know when to verify.' },
      { icon: Sparkles, title: 'Auto-Fact-Check', desc: 'Flag uncertain claims automatically. One click to verify via web search.' },
      { icon: BookOpen, title: 'Research Mode', desc: 'Generate full PDF-ready reports with table of contents, citations, and structured sections.' },
      { icon: Clock, title: 'Persistent Memory', desc: 'The AI remembers facts from all your past chats, not just the current thread.' },
    ],
  },
  {
    category: 'Voice & Multimodal',
    items: [
      { icon: Mic, title: 'Walkie-Talkie Voice Chat', desc: 'Hold Spacebar to talk. The AI hears, thinks, and responds automatically via TTS.' },
      { icon: Zap, title: 'Voice Interruption', desc: 'Cut the AI mid-sentence. It stops and listens immediately. True conversational flow.' },
      { icon: Palette, title: '5 Unique AI Voices', desc: 'Ava, Nova, Luna, Orion, Echo. 3 female, 2 male voices from Gemini Flash and ElevenLabs.' },
      { icon: Image, title: 'Image Understanding', desc: 'Upload any image. Vision-capable models analyze, describe, and reason about visual content.' },
      { icon: Layers, title: 'Image Generation', desc: 'Use /generate to create images from text prompts via free image generation APIs.' },
      { icon: Terminal, title: 'Voice Cloning', desc: 'Upload a 30-second voice sample to create your own custom AI voice.' },
    ],
  },
  {
    category: 'Organization',
    items: [
      { icon: GitBranch, title: 'Conversation Branching', desc: 'Right-click any message to fork a new thread. Explore multiple paths without losing context.' },
      { icon: Layers, title: 'Chat Folders', desc: 'Drag-and-drop organize threads into nested folders. Color-coded for quick identification.' },
      { icon: Pin, title: 'Pinned Messages', desc: 'Pin critical answers in long threads for instant reference.' },
      { icon: FileText, title: 'Chat Summaries', desc: 'Auto-generated 3-line summaries for every thread. Scan your library at a glance.' },
      { icon: Search, title: 'Search Everything', desc: 'Full-text search across all your chats, messages, and snippets instantly.' },
      { icon: Tag, title: 'Tags & Labels', desc: 'Color-coded tags: #coding, #research, #creative. Filter your library by topic.' },
    ],
  },
  {
    category: 'Power User',
    items: [
      { icon: Keyboard, title: 'Slash Commands', desc: '/summarize, /translate, /code, /research, /brainstorm. Instant actions from the input bar.' },
      { icon: Code, title: 'Keyboard Shortcuts', desc: 'Vim navigation, Ctrl+K command palette, Ctrl+N new chat. Built for speed.' },
      { icon: BookOpen, title: 'Snippets Library', desc: 'Save reusable prompt templates. Insert them with a shortcut in any chat.' },
      { icon: Palette, title: 'Custom CSS', desc: 'Power users can inject custom CSS to personalize their entire UI.' },
      { icon: Share2, title: 'Public Share Links', desc: 'Share any chat as a read-only public page. Control visibility per thread.' },
      { icon: Bell, title: 'Scheduled Chats', desc: 'Every Monday at 9 AM, ask me about my weekly goals. Automated recurring AI sessions.' },
    ],
  },
]

function Pin({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg> }
function Search({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg> }
function Tag({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2 2 0 0 0 2.828 0l7.172-7.172a2 2 0 0 0 0-2.828z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg> }

export default function FeaturesPage() {
  const sectionRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cards = entry.target.querySelectorAll('.feature-detail-card')
            cards.forEach((card, i) => {
              setTimeout(() => {
                card.style.opacity = '1'
                card.style.transform = 'translateY(0)'
              }, i * 60)
            })
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.05 }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="pt-28 pb-20">
      <div className="section-padding mb-16">
        <div className="container-custom text-center">
          <span className="text-sm font-medium text-accent tracking-wide uppercase mb-4 block">Features</span>
          <h1 className="text-h1 mb-5">Built for <span className="text-gradient-accent">power users</span></h1>
          <p className="text-body-lg text-foreground-muted max-w-2xl mx-auto">
            Every feature is designed to make your AI experience faster, deeper, and more personal. 
            This is what ChatGPT, Claude, and Gemini still do not offer.
          </p>
        </div>
      </div>

      <div ref={sectionRef} className="section-padding">
        <div className="container-custom space-y-20">
          {ALL_FEATURES.map((category) => (
            <div key={category.category}>
              <h2 className="text-h3 mb-8 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-accent" />
                {category.category}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {category.items.map((item) => (
                  <div
                    key={item.title}
                    className="feature-detail-card card-glow p-6 gpu-accelerate"
                    style={{
                      opacity: 0,
                      transform: 'translateY(30px)',
                      transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shadow-[0_0_20px_rgba(217,119,87,0.3)]">
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground-primary mb-2">{item.title}</h3>
                    <p className="text-sm text-foreground-muted leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
