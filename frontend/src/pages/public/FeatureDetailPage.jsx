import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Users, Mic, GitBranch, Cpu, Globe, Shield, Brain, FileText, ChevronDown, ChevronUp, Check, Star, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'

const FEATURE_DATA = {
  'council-mode': {
    icon: Users,
    iconColor: '#7C3AED',
    gradient: 'from-[#1a0a2e] via-[#16082a] to-[#0D0D12]',
    title: 'Council Mode',
    tagline: 'Three minds are better than one.',
    description: 'Council Mode puts three elite CyberCli models in simultaneous debate over your query — Cyber-Smart, Cyber-Balanced, and Cyber-Mini — then synthesizes their perspectives into a consensus answer no single model could produce alone.',
    badge: 'Intelligence',
    badgeColor: '#7C3AED',
    stats: [
      { label: 'AI Models Debating', value: '3' },
      { label: 'Accuracy Improvement', value: '+47%' },
      { label: 'Blind Spots Eliminated', value: '~92%' },
    ],
    sections: [
      {
        title: 'How Council Mode Works',
        content: 'When you activate Council Mode, CyberCli routes your message to three different AI providers simultaneously. Each model reasons independently — no cross-contamination of thinking. Then a synthesis layer analyzes all three responses, identifies consensus points, flags disagreements, and produces a final unified answer that represents the best of all three perspectives.',
      },
      {
        title: 'Real Use Cases',
        content: 'Council Mode excels where single-model answers fall short: code reviews (three models catch different bugs), medical questions (diverse clinical reasoning), legal analysis (multiple interpretations), threat assessment (red-team + blue-team perspectives), and any question where nuance matters.',
      },
      {
        title: 'The Science of Ensemble Reasoning',
        content: 'Ensemble learning — combining multiple models — has been a cornerstone of machine learning since Random Forests. CyberCli applies the same principle to LLMs: by averaging over diverse model architectures, training data, and RLHF policies, we systematically reduce individual model biases and hallucinations.',
      },
      {
        title: 'Why No Other Platform Offers This',
        content: 'Building Council Mode requires a unified AI gateway that can hit multiple providers simultaneously, a synthesis layer that understands model agreement vs. divergence, and a UI that shows reasoning transparently. CyberCli is the only free platform where all of these come together.',
      },
    ],
    faq: [
      { q: 'Does Council Mode cost extra?', a: 'Council Mode is available on all tiers. Free users get 5 Council sessions per day. Pro users get unlimited.' },
      { q: 'Which models participate in Council Mode?', a: 'By default: Cyber-Smart, Cyber-Balanced, and Cyber-Mini. You can customize which models participate in Settings → Agents.' },
      { q: 'How long does a Council response take?', a: 'Roughly 2-4x a standard response (parallel processing). We run all three requests concurrently — total time is limited by the slowest model, not the sum.' },
      { q: "Can I see each model's individual response?", a: "Yes. Click the \"Expand Council\" button on any Council response to see each model's raw answer before synthesis." },
    ],
    relatedSlugs: ['chain-of-thought', 'research-mode', 'multi-provider'],
  },
  'voice-chat': {
    icon: Mic,
    iconColor: '#D97757',
    gradient: 'from-[#1a0f06] via-[#130c04] to-[#0D0D12]',
    title: 'Voice Chat',
    tagline: 'Talk naturally. Think faster.',
    description: 'Walkie-talkie voice mode with ElevenLabs voices via Puter.js — completely free, unlimited. Hold Space to speak, release to let CyberCli respond in a natural human voice. Five voices. Zero latency.',
    badge: 'Voice & Multimodal',
    badgeColor: '#D97757',
    stats: [
      { label: 'Unique AI Voices', value: '5' },
      { label: 'Avg Response Latency', value: '<800ms' },
      { label: 'Monthly Cost', value: '$0' },
    ],
    sections: [
      {
        title: 'The Puter.js Advantage',
        content: 'ElevenLabs charges $0.30 per 1,000 characters for their premium voices. CyberCli uses Puter.js — a client-side runtime that provides free, unlimited access to ElevenLabs voices directly from your browser. No server costs. No usage limits. Ava, Nova, Luna, Orion, and Echo are yours indefinitely.',
      },
      {
        title: 'Walkie-Talkie Mode',
        content: 'Hold the Spacebar (or tap the microphone button on mobile) to activate your microphone. Speak naturally. Release to transmit. CyberCli processes your speech, generates a response, and speaks it back — creating a true conversational rhythm. Interrupt at any point to take back the floor.',
      },
      {
        title: 'Voice Interruption',
        content: "Unlike most voice AI implementations that queue responses, CyberCli supports real interruption. If you start speaking while CyberCli is talking, it immediately stops and listens. This creates the natural conversational flow you expect from human conversation.",
      },
      {
        title: 'Server-Side TTS Fallback',
        content: "When Puter.js is unavailable, CyberCli falls back to server-side TTS — also free, with excellent prosody and natural speech patterns. You're never left without voice.",
      },
    ],
    faq: [
      { q: 'Do I need to install anything for voice?', a: 'No. Voice Chat runs entirely in your browser via Puter.js. No extensions, no downloads, no setup.' },
      { q: 'Which voices are available?', a: 'Ava (warm female), Nova (professional female), Luna (soft female), Orion (deep male), Echo (neutral male). Switch in Settings → Voice.' },
      { q: 'Does voice work on mobile?', a: 'Yes. Tap the microphone icon to speak. Voice interruption requires a browser that supports the Web Audio API (Chrome, Safari, Edge).' },
      { q: 'Is my voice data stored?', a: 'No. Speech is processed locally or via the browser API. CyberCli does not store audio recordings.' },
    ],
    relatedSlugs: ['privacy-first', 'custom-agents', 'multi-provider'],
  },
  'conversation-branching': {
    icon: GitBranch,
    iconColor: '#06B6D4',
    gradient: 'from-[#061014] via-[#050d11] to-[#0D0D12]',
    title: 'Conversation Branching',
    tagline: 'Explore every path. Lose nothing.',
    description: 'Fork any message in a conversation into a parallel thread. Explore alternative answers, different prompt formulations, or completely separate topics — all while keeping your original conversation intact.',
    badge: 'Organization',
    badgeColor: '#06B6D4',
    stats: [
      { label: 'Branches Per Thread', value: 'Unlimited' },
      { label: 'Context Preserved', value: '100%' },
      { label: 'Branch Nesting Depth', value: 'Infinite' },
    ],
    sections: [
      {
        title: 'Why Branching Matters',
        content: 'Every AI conversation is a directed path through possibility space. When you want to explore "what if I had phrased that differently" or "what if I took the conversation in a different direction", you currently have no choice but to start over and lose all context. Branching solves this permanently.',
      },
      {
        title: 'How to Branch',
        content: "Hover over any message in a conversation — yours or the AI's — and click the branch icon. A new thread opens with the full conversation context up to that point. Continue exploring. Your original thread is untouched and you can switch between branches at any time.",
      },
      {
        title: 'Branch Organization',
        content: 'All branches are visible in the Thread Sidebar with a tree visualization showing parent-child relationships. Color-coded by creation time. You can name branches, pin important ones, and archive dead ends.',
      },
      {
        title: 'Use Cases',
        content: 'Code debugging (branch to try different fix approaches), creative writing (branch to explore different plot directions), research (branch for different research angles), prompt engineering (compare prompt variations side-by-side).',
      },
    ],
    faq: [
      { q: 'How many branches can I create?', a: 'Unlimited on all tiers. Branches are stored in MongoDB and compressed efficiently.' },
      { q: 'Can I merge branches back together?', a: 'Not automatically — but you can copy content from any branch into another. Full merge is on our roadmap for Q3 2026.' },
      { q: "Do branches count toward my message limit?", a: "Yes. Each message in a branch counts toward your tier's rate limit. Branch context (shared parent messages) is not double-counted." },
      { q: 'Can I share a specific branch?', a: 'Yes. Each branch has its own shareable URL if you enable public sharing for that thread.' },
    ],
    relatedSlugs: ['council-mode', 'custom-agents', 'privacy-first'],
  },
  'custom-agents': {
    icon: Cpu,
    iconColor: '#10B981',
    gradient: 'from-[#061410] via-[#050d0a] to-[#0D0D12]',
    title: 'Custom Agents',
    tagline: 'Your AI. Your rules.',
    description: 'Build specialized AI personas with custom system prompts, model selection, temperature controls, and personality icons. Deploy them in any conversation. Share them with your team.',
    badge: 'Power User',
    badgeColor: '#10B981',
    stats: [
      { label: 'Agents You Can Create', value: 'Unlimited' },
      { label: 'Model Choices', value: '8+' },
      { label: 'System Prompt Length', value: '32K tokens' },
    ],
    sections: [
      {
        title: 'What Is a Custom Agent?',
        content: "A Custom Agent is a saved AI configuration — a specific model, system prompt, temperature, and persona — that you can reuse across conversations. Instead of repasting system prompts every time, you select your agent from the model picker and it's ready instantly.",
      },
      {
        title: 'Agent Configuration',
        content: 'Every agent has: a name and icon, a system prompt (up to 32K tokens), a base model (any of the 8+ providers), temperature (0.0 to 2.0), top-p, presence penalty, frequency penalty, and optionally a voice (for voice-enabled agents). Full parameter control.',
      },
      {
        title: 'Agent Use Cases',
        content: "Security Analyst (MITRE ATT&CK expert), Code Reviewer (strict security-focused reviewer), Legal Assistant (structured legal reasoning), SEO Writer (keyword-optimized content), Data Scientist (pandas, numpy, matplotlib expert), Customer Support (your product's knowledge base).",
      },
      {
        title: 'Agent Sharing (Coming Soon)',
        content: 'Export any agent as a JSON file and share it. Import agents from the community marketplace. This is the foundation of the CyberCli Agent Ecosystem — launching Q4 2026.',
      },
    ],
    faq: [
      { q: 'How many agents can I create?', a: 'Free: 3 agents. Pro: unlimited agents.' },
      { q: 'Can agents have memory?', a: 'Yes. Enable "Agent Memory" in agent settings and CyberCli will automatically append relevant facts from your past conversations with that agent.' },
      { q: 'Can I use agents in Council Mode?', a: 'Yes! You can assign custom agents to specific Council seats — meaning your customized Security Analyst debates your customized Code Reviewer.' },
      { q: 'Are agents private?', a: 'Yes, by default. Agents are private to your account. Sharing is opt-in.' },
    ],
    relatedSlugs: ['council-mode', 'conversation-branching', 'multi-provider'],
  },
  'multi-provider': {
    icon: Globe,
    iconColor: '#F59E0B',
    gradient: 'from-[#14100a] via-[#110d07] to-[#0D0D12]',
    title: 'Multi-Provider Gateway',
    tagline: 'Never locked in. Always online.',
    description: 'A distributed multi-cluster gateway unified under one interface — with automatic routing and fallback when any computing node has an outage.',
    badge: 'Infrastructure',
    badgeColor: '#F59E0B',
    stats: [
      { label: 'AI Providers', value: '8+' },
      { label: 'Models Available', value: '50+' },
      { label: 'Uptime (with fallback)', value: '99.9%' },
    ],
    sections: [
      {
        title: 'The Provider Problem',
        content: 'Every AI platform is dependent on a single provider. When OpenAI has an outage, ChatGPT goes down. When Anthropic throttles traffic, Claude slows to a crawl. CyberCli routes around failures automatically — you never see a "service unavailable" screen.',
      },
      {
        title: 'Provider Routing Logic',
        content: "Our AI gateway selects the optimal provider based on: current provider health, your tier's rate limits, the specific model requested, estimated response latency, and cost efficiency. If your primary choice is degraded, we silently fail over — you see the same interface either way.",
      },
      {
        title: 'Speed Optimization via Cyber Speed Cluster',
        content: 'For speed-sensitive use cases (voice chat, quick queries), CyberCli routes to the Cyber Speed Cluster — which runs Llama 3.1 70B at 500+ tokens/second on dedicated hardware. This is 10x faster than standard GPU-based inference, making voice interactions feel instantaneous.',
      },
      {
        title: 'Cost Optimization',
        content: 'Free tier users are automatically routed to the most capable free models across providers. No degraded experience. As providers release new free tiers, CyberCli integrates them immediately.',
      },
    ],
    faq: [
      { q: 'Can I manually choose which provider to use?', a: 'Yes. The model picker shows all available models grouped by provider. You can pin your favorite and it will be your default.' },
      { q: 'What happens when my chosen provider is down?', a: "CyberCli automatically fails over to an equivalent model at another provider. You're notified via a subtle badge on the response." },
      { q: 'Are all providers free?', a: 'The providers CyberCli uses all have generous free tiers. CyberCli absorbs the cost for free users up to the tier limits.' },
      { q: 'Do you support local models (Ollama)?', a: 'Local model support via Ollama is planned for Phase 6 (Q3 2026).' },
    ],
    relatedSlugs: ['council-mode', 'custom-agents', 'privacy-first'],
  },
  'privacy-first': {
    icon: Shield,
    iconColor: '#EF4444',
    gradient: 'from-[#140606] via-[#110404] to-[#0D0D12]',
    title: 'Privacy First',
    tagline: 'Your conversations. Not our training data.',
    description: 'Zero-logging architecture. GDPR compliant. Your conversations are encrypted at rest, never used for model training, and fully exportable and deletable at any time.',
    badge: 'Security',
    badgeColor: '#EF4444',
    stats: [
      { label: 'Data Used for Training', value: '0%' },
      { label: 'Encryption Standard', value: 'AES-256' },
      { label: 'GDPR Compliant', value: 'Yes' },
    ],
    sections: [
      {
        title: 'What "Privacy First" Actually Means',
        content: "Most AI platforms use your conversations to improve their models. CyberCli does not. We have no incentive to — our value comes from routing to the best external models, not from training our own. Your conversations are your intellectual property.",
      },
      {
        title: 'Encryption Architecture',
        content: 'All chat data is encrypted at rest using AES-256 in MongoDB Atlas. Sensitive fields (custom system prompts, API keys) are additionally encrypted at the field level before storage. In transit, all data uses TLS 1.3. We do not have plaintext access to your conversations.',
      },
      {
        title: 'Data Portability',
        content: 'Export your entire conversation history as JSON or Markdown at any time from Settings → Data. Delete individual chats, all chats in a date range, or your entire account — all data is removed within 24 hours per GDPR Article 17.',
      },
      {
        title: 'What We Do Log',
        content: "We log: API request metadata (timestamp, model, token count) for billing and rate limiting. We do NOT log message content beyond what's needed to display your conversation history. Usage analytics are aggregated and anonymized.",
      },
    ],
    faq: [
      { q: 'Is CyberCli GDPR compliant?', a: 'Yes. We are a UK-registered entity complying with UK GDPR. See our GDPR page for the full DPA.' },
      { q: 'Do the AI providers see my messages?', a: 'Your messages are transmitted to the distributed computing nodes to generate responses — this is unavoidable for AI to work. We pass no PII beyond the message content.' },
      { q: 'Can I use CyberCli for sensitive work?', a: 'For classified or highly sensitive work, we recommend our Enterprise tier with private cloud deployment. For standard professional use, CyberCli is appropriate.' },
      { q: 'How do I delete my account?', a: 'Settings → Account → Delete Account. All data is removed within 24 hours. We will email you confirmation.' },
    ],
    relatedSlugs: ['custom-agents', 'multi-provider', 'conversation-branching'],
  },
  'chain-of-thought': {
    icon: Brain,
    iconColor: '#8B5CF6',
    gradient: 'from-[#0f0a1e] via-[#0d0918] to-[#0D0D12]',
    title: 'Chain-of-Thought Viewer',
    tagline: 'See the thinking. Trust the answer.',
    description: "Collapsible reasoning chains reveal exactly how the AI arrived at its answer — step by step. Full transparency into the model's internal logic, assumptions, and inference path.",
    badge: 'Intelligence',
    badgeColor: '#8B5CF6',
    stats: [
      { label: 'Reasoning Steps Visible', value: 'All' },
      { label: 'Collapsible UI', value: 'Yes' },
      { label: 'Models Supported', value: '5+' },
    ],
    sections: [
      {
        title: 'Why Transparency Matters',
        content: "An AI that gives you an answer without showing reasoning is a black box. You can't evaluate its confidence, catch its errors, or learn from its process. CyberCli's Chain-of-Thought Viewer makes the reasoning visible — turning AI from oracle into collaborator.",
      },
      {
        title: 'How It Works',
        content: 'When using models that support extended thinking, CyberCli captures the reasoning trace and displays it in an expandable panel above the final answer. Each reasoning step is timestamped and can be referenced.',
      },
      {
        title: 'Catching Errors Early',
        content: 'The most valuable use of Chain-of-Thought Viewer is error detection. If the AI makes a wrong assumption in step 3 of 12, you can see exactly where the reasoning went wrong — and provide a targeted correction rather than a vague restatement of your question.',
      },
      {
        title: 'Educational Value',
        content: 'For learning, Chain-of-Thought is invaluable. Watching a model reason through a complex math proof, legal analysis, or code debugging problem teaches you the systematic approaches that experts use — not just the final answers.',
      },
    ],
    faq: [
      { q: 'Which models show Chain-of-Thought?', a: 'Our reasoning-enabled models, including Cyber-Quantum and Cyber-Pro. Models without native reasoning show a simplified summary.' },
      { q: 'Can I hide the reasoning by default?', a: 'Yes. Settings → Chat → Hide reasoning by default. You can still expand it per-response with a single click.' },
      { q: 'Is the reasoning authentic?', a: "The reasoning shown is the actual model output from extended thinking mode — not a post-hoc rationalization. What you see is what the model actually computed." },
      { q: 'Does it slow down responses?', a: 'Yes, reasoning models are slower. You can choose non-reasoning model variants for speed-sensitive tasks.' },
    ],
    relatedSlugs: ['council-mode', 'research-mode', 'custom-agents'],
  },
  'research-mode': {
    icon: FileText,
    iconColor: '#06B6D4',
    gradient: 'from-[#061014] via-[#050d11] to-[#0D0D12]',
    title: 'Research Mode',
    tagline: 'From prompt to publishable report.',
    description: 'Generate structured, PDF-ready research reports complete with table of contents, executive summary, detailed sections, citations, and conclusion — in a single prompt.',
    badge: 'Intelligence',
    badgeColor: '#06B6D4',
    stats: [
      { label: 'Avg Report Length', value: '3,000+ words' },
      { label: 'Export Formats', value: 'PDF, MD, DOCX' },
      { label: 'Citation Styles', value: 'APA, MLA, Chicago' },
    ],
    sections: [
      {
        title: 'What Research Mode Produces',
        content: 'Research Mode generates structured long-form documents with: an executive summary, table of contents, 5-8 detailed sections with headers and subheaders, inline citations (where supported by web search), key findings callouts, and a conclusion with recommendations. It looks like something a junior analyst spent 3 hours writing — produced in 90 seconds.',
      },
      {
        title: 'How to Activate',
        content: 'Type /research followed by your topic, or click the Research Mode toggle in the compose bar. You can specify: report length (brief/standard/comprehensive), citation style, target audience (technical/executive/general), and output format (PDF/Markdown/DOCX).',
      },
      {
        title: 'Web-Grounded Research',
        content: 'When combined with web search (available on Pro tier), Research Mode queries live sources and produces reports grounded in current information — not just training data. Perfect for market research, competitive analysis, and rapidly evolving technical topics.',
      },
      {
        title: 'PDF Export',
        content: "Export any Research Mode output as a professionally formatted PDF with your organization's logo (Pro), proper typography, and print-ready layout. Share directly or save to your library.",
      },
    ],
    faq: [
      { q: 'What topics can Research Mode cover?', a: 'Any topic the underlying AI models know about. Best results for: technical documentation, market analysis, literature reviews, security assessments, and educational content.' },
      { q: 'Are citations real sources?', a: 'With web search enabled (Pro), citations link to real sources. Without web search, citations are based on training data and should be verified.' },
      { q: 'Can I edit the report after generation?', a: 'Yes. Research Mode outputs are fully editable in the rich text editor. Regenerate individual sections without redoing the whole report.' },
      { q: 'Is Research Mode available on Free tier?', a: 'Yes — 2 research reports per day on Free, unlimited on Pro.' },
    ],
    relatedSlugs: ['chain-of-thought', 'council-mode', 'privacy-first'],
  },
}

const RELATED_LABELS = {
  'council-mode': 'Council Mode',
  'voice-chat': 'Voice Chat',
  'conversation-branching': 'Conversation Branching',
  'custom-agents': 'Custom Agents',
  'multi-provider': 'Multi-Provider Gateway',
  'privacy-first': 'Privacy First',
  'chain-of-thought': 'Chain-of-Thought Viewer',
  'research-mode': 'Research Mode',
}

export default function FeatureDetailPage() {
  const { slug } = useParams()
  const [openFaq, setOpenFaq] = useState(null)

  const feature = FEATURE_DATA[slug] || FEATURE_DATA['council-mode']
  const Icon = feature.icon

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    document.title = `${feature.title} — CyberCli Chat`
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) metaDesc.setAttribute('content', feature.description)
  }, [slug, feature])

  return (
    <div className="pt-24 pb-20">
      {/* Hero */}
      <div className="section-padding mb-16">
        <div className="container-custom max-w-5xl">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-10">
            <Link to="/features" className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground-primary transition-colors">
              <ArrowLeft className="w-4 h-4" />
              All Features
            </Link>
          </motion.div>

          <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${feature.gradient} border border-border-subtle p-10 lg:p-16 mb-12`}>
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: feature.iconColor }} />
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-5 blur-3xl" style={{ background: feature.iconColor }} />

            <div className="relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8"
                style={{ background: `${feature.iconColor}18`, border: `1px solid ${feature.iconColor}40` }}
              >
                <Icon className="w-10 h-10" style={{ color: feature.iconColor }} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full border mb-5 inline-block"
                  style={{ color: feature.badgeColor, borderColor: `${feature.badgeColor}40`, background: `${feature.badgeColor}12` }}
                >
                  {feature.badge}
                </span>
                <h1 className="text-5xl sm:text-6xl font-serif font-light text-foreground-primary mb-4 leading-tight">
                  {feature.title}
                </h1>
                <p className="text-xl text-foreground-muted italic mb-6">{feature.tagline}</p>
                <p className="text-lg text-foreground-secondary leading-relaxed max-w-3xl">{feature.description}</p>
              </motion.div>
            </div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-3 gap-4 mb-0"
          >
            {feature.stats.map((stat, i) => (
              <div key={i} className="card-glass p-6 text-center rounded-2xl">
                <div className="text-4xl font-bold mb-2" style={{ color: feature.iconColor }}>{stat.value}</div>
                <div className="text-sm text-foreground-muted">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Detail Sections */}
      <div className="section-padding mb-16">
        <div className="container-custom max-w-5xl">
          <div className="grid md:grid-cols-2 gap-6">
            {feature.sections.map((section, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="card-glass p-8 rounded-2xl group hover:border-accent/20 transition-colors"
              >
                <div className="w-8 h-1 rounded-full mb-5" style={{ background: feature.iconColor }} />
                <h2 className="text-xl font-semibold text-foreground-primary mb-4 group-hover:text-accent transition-colors">
                  {section.title}
                </h2>
                <p className="text-foreground-muted leading-relaxed">{section.content}</p>
              </motion.div>
            ))}
          </div>

          {/* Visual Mockup Placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 rounded-3xl overflow-hidden border border-border-subtle"
            style={{ background: `linear-gradient(135deg, ${feature.iconColor}08 0%, #0D0D12 50%, ${feature.iconColor}05 100%)` }}
          >
            <div className="h-80 flex items-center justify-center flex-col gap-5">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: `${feature.iconColor}20`, border: `1px solid ${feature.iconColor}30` }}
              >
                <Icon className="w-8 h-8" style={{ color: feature.iconColor }} />
              </motion.div>
              <p className="text-foreground-muted text-sm">{feature.title} — Live Demo</p>
              <Link
                to="/auth/signup"
                className="flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl text-white transition-all hover:opacity-90 hover:scale-105"
                style={{ background: feature.iconColor }}
              >
                Try it free <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* FAQ */}
      <div className="section-padding mb-16">
        <div className="container-custom max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10"
          >
            <h2 className="text-3xl font-serif font-light text-foreground-primary mb-2">
              Frequently asked <span className="text-gradient-accent italic">questions</span>
            </h2>
            <p className="text-foreground-muted">Everything you need to know about {feature.title}.</p>
          </motion.div>

          <div className="space-y-3">
            {feature.faq.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="card-glass rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="font-semibold text-foreground-primary pr-4">{item.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-5 h-5 text-foreground-muted flex-shrink-0" />
                    : <ChevronDown className="w-5 h-5 text-foreground-muted flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-6 pb-6"
                  >
                    <p className="text-foreground-muted leading-relaxed">{item.a}</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Related Features */}
      <div className="section-padding mb-16">
        <div className="container-custom max-w-5xl">
          <h2 className="text-2xl font-semibold text-foreground-primary mb-8">Related Features</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {feature.relatedSlugs.map((relSlug) => {
              const rel = FEATURE_DATA[relSlug]
              if (!rel) return null
              const RelIcon = rel.icon
              return (
                <Link
                  key={relSlug}
                  to={`/features/${relSlug}`}
                  className="card-glass p-6 rounded-2xl group hover:border-accent/20 transition-all block"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${rel.iconColor}18`, border: `1px solid ${rel.iconColor}30` }}
                  >
                    <RelIcon className="w-5 h-5" style={{ color: rel.iconColor }} />
                  </div>
                  <h3 className="font-semibold text-foreground-primary text-sm mb-1 group-hover:text-accent transition-colors">
                    {RELATED_LABELS[relSlug]}
                  </h3>
                  <p className="text-xs text-foreground-muted">{rel.tagline}</p>
                  <div className="flex items-center gap-1 mt-3 text-xs font-medium" style={{ color: rel.iconColor }}>
                    Learn more <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="section-padding">
        <div className="container-custom max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center card-glass rounded-3xl p-12"
            style={{ background: `linear-gradient(135deg, ${feature.iconColor}08 0%, #0D0D12 100%)` }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: `${feature.iconColor}20`, border: `1px solid ${feature.iconColor}40` }}
            >
              <Star className="w-7 h-7" style={{ color: feature.iconColor }} />
            </div>
            <h2 className="text-3xl font-serif font-light text-foreground-primary mb-4">
              Ready to experience <span className="text-gradient-accent italic">{feature.title}</span>?
            </h2>
            <p className="text-foreground-muted mb-8 max-w-md mx-auto">
              Join thousands of users who have already upgraded their AI experience. Free forever.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/auth/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 hover:scale-105"
                style={{ background: feature.iconColor }}
              >
                Get started free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/features"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-foreground-primary font-semibold text-sm border border-border-subtle hover:border-accent/30 transition-all"
              >
                View all features
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8">
              {['No credit card required', 'Free forever plan', 'GDPR compliant'].map(item => (
                <div key={item} className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
