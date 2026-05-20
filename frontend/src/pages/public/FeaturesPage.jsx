import { motion } from 'framer-motion'
import { Cpu, Users, Shield, Mic, GitBranch, Globe, MessageSquare, Brain, Clock, Lock, Zap, Sparkles, BarChart3, Code, FileText, Image, Layers, Palette, Keyboard, Share2, BookOpen, Bell, Terminal } from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'

function Pin({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg> }
function Search({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg> }
function TagIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2 2 0 0 0 2.828 0l7.172-7.172a2 2 0 0 0 0-2.828z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg> }

const ALL_FEATURES = [
  {
    category: 'Intelligence',
    categoryIcon: Brain,
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
    categoryIcon: Mic,
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
    categoryIcon: GitBranch,
    items: [
      { icon: GitBranch, title: 'Conversation Branching', desc: 'Right-click any message to fork a new thread. Explore multiple paths without losing context.' },
      { icon: Layers, title: 'Chat Folders', desc: 'Drag-and-drop organize threads into nested folders. Color-coded for quick identification.' },
      { icon: Pin, title: 'Pinned Messages', desc: 'Pin critical answers in long threads for instant reference.' },
      { icon: FileText, title: 'Chat Summaries', desc: 'Auto-generated 3-line summaries for every thread. Scan your library at a glance.' },
      { icon: Search, title: 'Search Everything', desc: 'Full-text search across all your chats, messages, and snippets instantly.' },
      { icon: TagIcon, title: 'Tags & Labels', desc: 'Color-coded tags: #coding, #research, #creative. Filter your library by topic.' },
    ],
  },
  {
    category: 'Power User',
    categoryIcon: Code,
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

const CATEGORY_COLORS = {
  'Intelligence': { border: 'rgba(124,58,237,0.4)', glow: 'rgba(124,58,237,0.15)', text: '#A78BFA', bg: 'rgba(124,58,237,0.12)' },
  'Voice & Multimodal': { border: 'rgba(217,119,87,0.4)', glow: 'rgba(217,119,87,0.15)', text: '#FB923C', bg: 'rgba(217,119,87,0.12)' },
  'Organization': { border: 'rgba(16,185,129,0.4)', glow: 'rgba(16,185,129,0.15)', text: '#34D399', bg: 'rgba(16,185,129,0.12)' },
  'Power User': { border: 'rgba(59,130,246,0.4)', glow: 'rgba(59,130,246,0.15)', text: '#60A5FA', bg: 'rgba(59,130,246,0.12)' },
}

function FeatureCard({ item, delay, categoryColor }) {
  return (
    <ScrollReveal delay={delay}>
      <motion.div
        className="group relative p-6 rounded-2xl h-full cursor-pointer"
        style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        whileHover={{
          borderColor: categoryColor.border,
          boxShadow: `0 0 30px ${categoryColor.glow}`,
          y: -4,
          transition: { duration: 0.3 },
        }}
      >
        <motion.div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: categoryColor.bg }}
          whileHover={{ rotate: 15, transition: { duration: 0.3 } }}
        >
          <item.icon className="w-6 h-6" style={{ color: categoryColor.text }} />
        </motion.div>
        <h3 className="text-base font-semibold text-white mb-2 group-hover:text-white/90 transition-colors">
          {item.title}
        </h3>
        <p className="text-sm text-[#9CA3AF] leading-relaxed">{item.desc}</p>
        {/* Hover gradient border */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(217,119,87,0.06), rgba(124,58,237,0.06))',
          }}
        />
      </motion.div>
    </ScrollReveal>
  )
}

export default function FeaturesPage() {
  return (
    <div className="pt-28 pb-20 bg-[#0A0A0F]">
      {/* Hero */}
      <section className="section-padding mb-20 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/8 rounded-full blur-[100px]" />
        </div>
        <div className="container-custom text-center relative z-10">
          <ScrollReveal>
            <span className="inline-block text-xs font-semibold text-accent tracking-widest uppercase mb-5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
              Features
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold tracking-tight leading-[1.1] text-white mb-5">
              Built for{' '}
              <span
                className="bg-gradient-to-r from-orange-400 to-violet-500 bg-clip-text text-transparent"
                style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                power users
              </span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <p className="text-lg text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
              Every feature is designed to make your AI experience faster, deeper, and more personal.
              This is what ChatGPT, Claude, and Gemini still do not offer.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Feature Categories */}
      <div className="section-padding space-y-24">
        <div className="container-custom">
          {ALL_FEATURES.map((category, catIdx) => {
            const colors = CATEGORY_COLORS[category.category]
            return (
              <div key={category.category} className={catIdx > 0 ? 'mt-24' : ''}>
                <ScrollReveal>
                  <div className="flex items-center gap-3 mb-10">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: colors.bg }}
                    >
                      <category.categoryIcon className="w-4 h-4" style={{ color: colors.text }} />
                    </div>
                    <h2 className="text-xl font-bold text-white">{category.category}</h2>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                    <span className="text-xs text-[#4B5563]">{category.items.length} features</span>
                  </div>
                </ScrollReveal>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.items.map((item, i) => (
                    <FeatureCard
                      key={item.title}
                      item={item}
                      delay={i * 0.06}
                      categoryColor={colors}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom CTA */}
      <section className="section-padding mt-24">
        <div className="container-custom max-w-2xl text-center">
          <ScrollReveal>
            <div className="rounded-3xl border border-white/[0.06] bg-gradient-to-br from-violet-900/20 to-orange-900/10 p-12">
              <h2 className="text-3xl font-bold text-white mb-4">Experience all 24 features</h2>
              <p className="text-[#9CA3AF] mb-8">
                Start for free. No credit card required. Full access to all features.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <a href="/auth/signup" className="btn-primary">Start for Free</a>
                <a href="/docs" className="btn-secondary">Read the Docs</a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
