import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Terminal, ArrowRight, Check, Copy, Code2, Zap, Shield,
  Cpu, Globe, Sparkles, ChevronRight, Play, Star,
  MessageSquare, GitBranch, FileCode, Search, Settings,
  ExternalLink, CheckCircle2, X, Download, ChevronDown,
  Monitor, Smartphone, Mail, Lock, DollarSign, Gauge,
  Hexagon, Bot, Layers, Workflow, Wrench, Clock
} from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
};

const fadeIn = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  initial: {},
  whileInView: {},
  viewport: { once: true, margin: "-60px" },
  transition: { staggerChildren: 0.1 }
};

const ACCENT = '#D97736';
const BG_DARK = '#0C0C0C';
const CARD_BG = '#141414';
const BORDER = 'rgba(255,255,255,0.08)';

function AccordionItem({ question, answer, isOpen, onClick }) {
  return (
    <div className="border-b" style={{ borderColor: BORDER }}>
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between py-6 text-left group"
      >
        <span className="text-lg font-medium text-white pr-4">{question}</span>
        <ChevronDown
          className="w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-300"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-gray-400 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ClaudeCodePage() {
  const containerRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  const [activeTab, setActiveTab] = useState('npm');

  const installCommands = {
    npm: 'npm install -g @cybercli_chat/cli@latest',
    curl: 'curl -fsSL https://cybermindcli.info/install.sh | bash',
    ps1: 'irm https://cybermindcli.info/install.ps1 | iex',
    cmd: 'curl -fsSL https://cybermindcli.info/install.cmd -o install.cmd && install.cmd && del install.cmd',
  };

  const copyInstallCommand = () => {
    navigator.clipboard.writeText(installCommands[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const features = [
    {
      icon: <Search className="w-6 h-6" />,
      title: 'Code Onboarding',
      desc: 'CyberCoder maps and explains entire codebases in seconds. It uses agentic search to understand project structure and dependencies without manually selecting context files.'
    },
    {
      icon: <GitBranch className="w-6 h-6" />,
      title: 'Turn Issues into PRs',
      desc: 'Stop bouncing between tools. CyberCoder integrates with GitHub and your CLI tools to handle the entire workflow — reading issues, writing code, running tests, and submitting PRs.'
    },
    {
      icon: <FileCode className="w-6 h-6" />,
      title: 'Make Powerful Edits',
      desc: 'CyberCoder\'s understanding of your codebase enables powerful, multi-file edits that actually work across your entire project.'
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: 'Powerful Intelligence',
      desc: 'Uses agentic search across 8+ AI providers. Makes coordinated changes across multiple files with consensus-based reasoning.'
    },
    {
      icon: <Monitor className="w-6 h-6" />,
      title: 'Works Where You Work',
      desc: 'Lives inside your terminal — no context switching. Integrates with VS Code, JetBrains, and all your existing development tools.'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'You\'re in Control',
      desc: 'Never modifies files without explicit approval. Adapts to your coding standards. Configurable via SDK or CI/CD pipelines.'
    }
  ];

  const platforms = [
    {
      icon: <Terminal className="w-8 h-8" />,
      title: 'Start in Your Terminal',
      desc: 'Super powerful terminal integration. Works with all your CLI tools alongside any IDE.',
      cta: 'Try CyberCoder',
      ctaLink: '/chat'
    },
    {
      icon: <Code2 className="w-8 h-8" />,
      title: 'Integrate with Your Editor',
      desc: 'Native support for VS Code, Cursor, Windsurf, and JetBrains IDEs via LSP and extensions.',
      cta: 'VS Code Extension',
      ctaLink: '/docs'
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: 'Access Anywhere',
      desc: 'Quick access from browser, mobile app, or desktop. Great for parallel work or on-the-go coding.',
      cta: 'Open in Browser',
      ctaLink: '/chat'
    }
  ];

  const testimonials = [
    {
      quote: 'CyberCoder has dramatically accelerated our team\'s coding efficiency. Multi-model consensus catches bugs that single models miss. This saves 1-2 days of routine work per feature.',
      author: 'Senior Software Engineer',
      company: 'Tech Startup'
    },
    {
      quote: 'The 8+ provider fallback is a game-changer. When one AI is down, CyberCoder seamlessly switches to another. Our CI/CD pipelines never break anymore.',
      author: 'DevOps Lead',
      company: 'Enterprise Team'
    },
    {
      quote: 'Council Mode is incredible for critical code reviews. Getting 3 different AI perspectives on a refactor before merging has reduced our bug rate by 60%.',
      author: 'Staff Engineer',
      company: 'FinTech Company'
    }
  ];

  const faqs = [
    {
      q: 'How do I get started with CyberCoder?',
      a: 'Install CyberCoder with npm: npm install -g @cybercli_chat/cli. Then run cm /init to set up your project and configure your API key. You can get an API key from your CyberCli dashboard after signing up.'
    },
    {
      q: 'What kinds of tasks can CyberCoder handle?',
      a: 'CyberCoder excels at routine development tasks like bug fixes, testing, and documentation, as well as transformative work like refactors and feature implementation that require deep codebase understanding across multiple files.'
    },
    {
      q: 'How does CyberCoder work with my existing tools?',
      a: 'CyberCoder runs in your terminal and works alongside your preferred IDE without changing your workflow. It integrates with Git, GitHub, and supports MCP servers to extend capabilities using your existing tools.'
    },
    {
      q: 'Is CyberCoder secure?',
      a: 'Yes. CyberCoder runs locally in your terminal and talks directly to AI APIs. It asks for permission before making changes to files or running commands. Your code never leaves your machine unless you explicitly share it.'
    },
    {
      q: 'Which AI models does CyberCoder use?',
      a: 'CyberCoder intelligently routes requests across 8+ providers: OpenAI, Anthropic, Groq, Gemini, OpenRouter, Cerebras, Cloudflare, and local Ollama models. You can also use Council Mode for multi-model consensus.'
    },
    {
      q: 'What are the system requirements?',
      a: 'CyberCoder works on macOS, Linux, and Windows with Node.js 20+. The terminal-based interface is lightweight and runs on any modern development machine.'
    },
    {
      q: 'How much does CyberCoder cost?',
      a: 'CyberCoder offers a generous free tier with 50 requests/hour. Pro plans start at $9/month with 500 requests/hour and priority access to all AI providers. Enterprise plans available for teams.'
    },
    {
      q: 'Does CyberCoder work with the CyberCli Chat web app?',
      a: 'Yes. Your CyberCoder CLI account syncs with the CyberCli Chat web interface. You can start a conversation in the browser and continue it in the terminal, or vice versa.'
    },
    {
      q: 'What is Council Mode?',
      a: 'Council Mode sends your request to 3 different AI models simultaneously and returns a consensus answer. This dramatically improves accuracy for critical tasks like security reviews and architecture decisions.'
    }
  ];

  return (
    <div ref={containerRef} className="min-h-screen overflow-x-hidden pt-16" style={{ backgroundColor: BG_DARK }}>
      
      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-12 pb-20">
        {/* Background gradient */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            style={{ y: backgroundY }}
            className="absolute inset-0 opacity-20"
          >
            <div
              className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full blur-[120px]"
              style={{ backgroundColor: ACCENT }}
            />
          </motion.div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8"
            style={{ backgroundColor: 'rgba(217,119,54,0.15)', color: ACCENT, border: '1px solid rgba(217,119,54,0.3)' }}
          >
            <Zap className="w-4 h-4" />
            AI Coding Agent for Your Terminal
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight leading-[1.1]"
          >
            Built for{' '}
            <span style={{ color: ACCENT }}>developers</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Work with 8+ AI providers directly in your codebase. Build, debug, and ship from your terminal, IDE, or the web.
          </motion.p>

          {/* Install Command Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-2xl mx-auto mb-8"
          >
            {/* Tabs */}
            <div className="flex items-center justify-center gap-1 mb-3">
              {[
                { id: 'npm', label: 'npm' },
                { id: 'curl', label: 'macOS / Linux' },
                { id: 'ps1', label: 'Windows (PowerShell)' },
                { id: 'cmd', label: 'Windows (CMD)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    backgroundColor: activeTab === tab.id ? 'rgba(217,119,54,0.2)' : 'transparent',
                    color: activeTab === tab.id ? ACCENT : '#888',
                    border: activeTab === tab.id ? `1px solid ${ACCENT}` : '1px solid transparent',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Command Box */}
            <div className="flex items-center gap-3 px-5 py-3 rounded-lg font-mono text-sm border" style={{ backgroundColor: CARD_BG, borderColor: BORDER }}>
              <span style={{ color: ACCENT }}>$</span>
              <span className="text-gray-300 truncate">{installCommands[activeTab]}</span>
              <button
                onClick={copyInstallCommand}
                className="ml-auto p-1.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-500" />}
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 mt-4">
              <Link
                to="/signup"
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: ACCENT, color: '#000' }}
              >
                <Download className="w-5 h-5" />
                Get API Key
              </Link>
              <Link
                to="/docs"
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all hover:bg-white/5 border"
                style={{ borderColor: BORDER, color: '#ccc' }}
              >
                <ExternalLink className="w-5 h-5" />
                Documentation
              </Link>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-gray-500 mb-12"
          >
            Or read the{' '}
            <Link to="/docs" className="underline hover:text-gray-300" style={{ color: ACCENT }}>documentation</Link>
          </motion.p>

          {/* Terminal Demo */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="max-w-3xl mx-auto"
          >
            <div className="rounded-xl overflow-hidden border" style={{ backgroundColor: '#0A0A0A', borderColor: BORDER }}>
              {/* Terminal Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: BORDER, backgroundColor: '#111' }}>
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-4 text-xs text-gray-500 font-mono">cybercoder — zsh</span>
              </div>
              {/* Terminal Body */}
              <div className="p-6 font-mono text-sm text-left">
                <div className="flex items-start gap-2 mb-3">
                  <span style={{ color: ACCENT }}>$</span>
                  <div>
                    <span className="text-white">cm</span>
                    <span className="text-gray-500"> ask </span>
                    <span className="text-green-400">"Refactor this auth middleware to use JWT"</span>
                  </div>
                </div>
                <div className="text-gray-400 mb-2 pl-4">
                  Analyzing codebase structure...
                </div>
                <div className="text-gray-400 mb-2 pl-4">
                  Found <span className="text-white">auth.js</span>, <span className="text-white">middleware/</span>, <span className="text-white">utils/token.js</span>
                </div>
                <div className="text-gray-400 mb-2 pl-4">
                  Planning multi-file edits...
                </div>
                <div className="border-l-2 pl-4 my-3" style={{ borderColor: ACCENT }}>
                  <p className="text-gray-300 mb-2">I&apos;ll refactor the auth middleware to use JWT. This involves:</p>
                  <ul className="text-gray-400 space-y-1">
                    <li>1. Update <span className="text-yellow-400">auth.js</span> to use jwt.verify</li>
                    <li>2. Create <span className="text-yellow-400">utils/jwt.js</span> helper</li>
                    <li>3. Update all route middleware imports</li>
                  </ul>
                </div>
                <div className="flex items-start gap-2">
                  <span style={{ color: ACCENT }}>$</span>
                  <span className="animate-pulse text-gray-500">_</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== DESKTOP APP BANNER ===== */}
      <section className="py-8 px-4">
        <motion.div
          {...fadeInUp}
          className="max-w-5xl mx-auto rounded-2xl p-8 sm:p-12 border text-center"
          style={{ backgroundColor: CARD_BG, borderColor: BORDER }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            CyberCoder on Desktop
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-6">
            Download the native desktop app for macOS, Windows, and Linux. Run multiple coding agents in parallel with a beautiful GUI.
          </p>
          <Link
            to="/downloads"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: ACCENT, color: '#000' }}
          >
            <Download className="w-5 h-5" />
            Download Desktop App
          </Link>
        </motion.div>
      </section>

      {/* ===== WHAT COULD YOU DO ===== */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              What could you do with CyberCoder?
            </h2>
          </motion.div>

          <motion.div
            {...staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="p-6 rounded-xl border transition-all hover:border-white/20"
                style={{ backgroundColor: CARD_BG, borderColor: BORDER }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(217,119,54,0.15)', color: ACCENT }}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== MEETS YOU WHERE YOU CODE ===== */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Meets you where you code
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {platforms.map((platform, i) => (
              <motion.div
                key={i}
                {...fadeInUp}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-xl border text-center"
                style={{ backgroundColor: CARD_BG, borderColor: BORDER }}
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(217,119,54,0.15)', color: ACCENT }}>
                  {platform.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{platform.title}</h3>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">{platform.desc}</p>
                <Link
                  to={platform.ctaLink}
                  className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
                  style={{ color: ACCENT }}
                >
                  {platform.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURE ANNOUNCEMENTS ===== */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Latest feature announcements
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Monitor className="w-6 h-6" />,
                title: 'Redesigned Desktop App',
                desc: 'Built to help you run more CyberCoder tasks at once. New tabbed interface and workspace management.'
              },
              {
                icon: <Workflow className="w-6 h-6" />,
                title: 'Routines',
                desc: 'Configure a routine once, and it can run on a schedule, from an API call, or in response to a Git event.'
              },
              {
                icon: <Bot className="w-6 h-6" />,
                title: 'Auto Mode',
                desc: 'A safer long-running alternative that asks for permission before file changes but runs tests automatically.'
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                {...fadeInUp}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-xl border"
                style={{ backgroundColor: CARD_BG, borderColor: BORDER }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(217,119,54,0.15)', color: ACCENT }}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              What developers are saying
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                {...fadeInUp}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-xl border"
                style={{ backgroundColor: CARD_BG, borderColor: BORDER }}
              >
                <p className="text-gray-300 mb-6 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="text-white font-medium">{t.author}</p>
                  <p className="text-gray-500 text-sm">{t.company}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CLI TOOLS INTEGRATION ===== */}
      <section className="py-24 px-4 sm:px-6">
        <motion.div
          {...fadeInUp}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Connects with your favorite command line tools
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Your terminal is where real work happens. CyberCoder connects with the tools that power development — deployment, databases, monitoring, version control. Rather than adding another interface to juggle, it enhances your existing stack.
          </p>
        </motion.div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">FAQ</h2>
          </motion.div>

          <motion.div {...fadeIn}>
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                question={faq.q}
                answer={faq.a}
                isOpen={openFaq === i}
                onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
              />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== TECHNICAL RUNDOWN ===== */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Get the technical rundown
            </h2>
          </motion.div>

          <motion.div
            {...staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              { title: 'CyberCoder Documentation', desc: 'Full guides and API reference', icon: <FileCode className="w-5 h-5" /> },
              { title: 'Common Workflows', desc: 'Best practices for daily use', icon: <Workflow className="w-5 h-5" /> },
              { title: 'Using CLAUDE.md Files', desc: 'Customize AI behavior per project', icon: <FileCode className="w-5 h-5" /> },
              { title: 'Introduction to Agentic Coding', desc: 'How AI agents transform development', icon: <Sparkles className="w-5 h-5" /> }
            ].map((doc, i) => (
              <motion.a
                key={i}
                variants={fadeInUp}
                href="/docs"
                className="p-6 rounded-xl border block transition-all hover:border-white/20 group"
                style={{ backgroundColor: CARD_BG, borderColor: BORDER }}
              >
                <div className="text-gray-500 mb-4 group-hover:text-white transition-colors">
                  {doc.icon}
                </div>
                <h3 className="text-white font-medium mb-1">{doc.title}</h3>
                <p className="text-gray-500 text-sm">{doc.desc}</p>
                <ArrowRight className="w-4 h-4 mt-4 text-gray-600 group-hover:text-white transition-colors" />
              </motion.a>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== NEWSLETTER / CTA ===== */}
      <section className="py-24 px-4 sm:px-6">
        <motion.div
          {...fadeInUp}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Create what&apos;s exciting. Maintain what&apos;s essential.
          </h2>
          <p className="text-gray-400 mb-8">
            Get the developer newsletter with tips, new features, and workflow ideas.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 border outline-none focus:border-white/30"
              style={{ backgroundColor: CARD_BG, borderColor: BORDER }}
            />
            <button
              className="w-full sm:w-auto px-6 py-3 rounded-lg font-medium transition-all hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: ACCENT, color: '#000' }}
            >
              Subscribe
            </button>
          </div>
        </motion.div>
      </section>

      {/* ===== FOOTER CTA ===== */}
      <section className="py-16 px-4 sm:px-6 border-t" style={{ borderColor: BORDER }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Ready to ship faster?</h3>
            <p className="text-gray-400">Install CyberCoder and start coding with AI today.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/docs"
              className="px-6 py-3 rounded-lg font-medium border transition-all hover:bg-white/5"
              style={{ borderColor: BORDER, color: '#fff' }}
            >
              Read Documentation
            </Link>
            <Link
              to="/signup"
              className="px-6 py-3 rounded-lg font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: ACCENT, color: '#000' }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
