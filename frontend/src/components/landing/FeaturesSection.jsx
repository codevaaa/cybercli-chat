import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Users,
  Mic,
  GitBranch,
  Bot,
  Layers,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'
import ScrollReveal, { ScrollRevealGroup } from '@components/ui/ScrollReveal'

const FEATURES = [
  {
    slug: 'council-mode',
    icon: Users,
    title: 'Council Mode',
    description:
      'Three AI models deliberate simultaneously on your question. Watch them debate and synthesise a consensus — see every perspective at once.',
    color: '#D97757',
    colorMuted: 'rgba(217,119,87,0.12)',
  },
  {
    slug: 'voice-chat',
    icon: Mic,
    title: 'Voice Chat',
    description:
      'Speak naturally with five distinct ElevenLabs voices powered by Puter.js — unlimited, client-side, no quota to burn through.',
    color: '#D97757',
    colorMuted: 'rgba(217,119,87,0.12)',
  },
  {
    slug: 'conversation-branching',
    icon: GitBranch,
    title: 'Conversation Branching',
    description:
      'Fork any message in your chat history, explore an alternative path, then merge insights back — like git for ideas.',
    color: '#06B6D4',
    colorMuted: 'rgba(6,182,212,0.12)',
  },
  {
    slug: 'custom-agents',
    icon: Bot,
    title: 'Custom Agents',
    description:
      'Build domain-expert agents with custom system prompts, memory, and tool access. Deploy them in seconds for any workflow.',
    color: '#10B981',
    colorMuted: 'rgba(16,185,129,0.12)',
  },
  {
    slug: 'multi-provider',
    icon: Layers,
    title: 'Multi-Provider',
    description:
      'OpenRouter, Groq, Gemini, Cerebras, Cloudflare, HuggingFace, NVIDIA, and Bytez unified under one roof with intelligent failover.',
    color: '#F59E0B',
    colorMuted: 'rgba(245,158,11,0.12)',
  },
  {
    slug: 'privacy-first',
    icon: ShieldCheck,
    title: 'Privacy First',
    description:
      'Field-level encryption in MongoDB, Supabase RLS policies, and zero third-party tracking. Your data stays yours — always.',
    color: '#D97757',
    colorMuted: 'rgba(217,119,87,0.12)',
  },
]

export default function FeaturesSection() {
  return (
    <section className="section-padding py-28 lg:py-36">
      <div className="container-custom">
        {/* Section header */}
        <ScrollReveal direction="up" delay={0} className="text-center mb-16 lg:mb-20">
          <span className="inline-block text-xs font-semibold text-accent tracking-[0.2em] uppercase mb-4 px-4 py-1.5 rounded-full bg-accent/5 border border-accent/10">
            Features
          </span>
          <h2
            className="font-serif text-[clamp(2.2rem,4.5vw,3.8rem)] font-normal italic leading-[1.1] mb-5 text-white"
          >
            Everything you need
          </h2>
          <p className="text-base sm:text-lg text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
            Built for power users who refuse to compromise. Every feature is crafted
            to make your AI experience faster, deeper, and more personal.
          </p>
        </ScrollReveal>

        {/* 3 × 2 card grid */}
        <ScrollRevealGroup
          direction="up"
          stagger={0.09}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.slug}
                className="card-glass group relative p-7 flex flex-col"
              >
                {/* Coloured icon wrapper */}
                <motion.div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 flex-shrink-0 transition-colors duration-300"
                  style={{ background: feature.colorMuted }}
                  whileHover={{ scale: 1.12, rotate: 6 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                >
                  <Icon className="w-5 h-5" style={{ color: feature.color }} />
                </motion.div>

                <h3 className="text-base font-semibold text-white mb-2 group-hover:text-accent transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-sm text-[#9CA3AF] leading-relaxed flex-1">
                  {feature.description}
                </p>

                <Link
                  to={`/features#${feature.slug}`}
                  className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-accent hover:gap-2 transition-all duration-200"
                >
                  Learn more
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )
          })}
        </ScrollRevealGroup>
      </div>
    </section>
  )
}
