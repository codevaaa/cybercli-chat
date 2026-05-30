import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Terminal, ArrowRight, Check, Copy, Code2, Shield,
  Globe, Sparkles, ChevronDown, Download, FileSpreadsheet,
  FileText, Presentation, Mail, Smartphone, Monitor, Chrome,
  GitBranch, Search, FileCode, Workflow, Bot
} from 'lucide-react';
import SEOHead from '@components/seo/SEOHead';

/* Claude Code product page — matched to claude.com/product/claude-code */

const ACCENT = '#C96442';        // Claude terracotta
const BG = '#1a1a18';            // warm near-black
const CARD = '#211f1c';
const CARD2 = '#262521';
const BORDER = 'rgba(255,255,255,0.08)';

const fadeInUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
};

function AccordionItem({ question, answer, isOpen, onClick }) {
  return (
    <div className="border-b" style={{ borderColor: BORDER }}>
      <button onClick={onClick} className="w-full flex items-center justify-between py-6 text-left">
        <span className="text-lg font-medium text-[#f5f4ef] pr-4">{question}</span>
        <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-300" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
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
  const [activeTab, setActiveTab] = useState('npm');

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);

  const installCommands = {
    npm: 'npm install -g @codeva_chat/cli@latest',
    curl: 'curl -fsSL https://cybermindcli.info/install.sh | bash',
    ps1: 'irm https://cybermindcli.info/install.ps1 | iex',
    cmd: 'curl -fsSL https://cybermindcli.info/install.cmd -o install.cmd && install.cmd && del install.cmd',
  };

  const copyInstall = () => {
    navigator.clipboard.writeText(installCommands[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const features = [
    { icon: <Search className="w-5 h-5" />, title: 'Code onboarding', desc: 'CyberCoder maps and explains entire codebases in seconds using agentic search — no manual context selection.' },
    { icon: <GitBranch className="w-5 h-5" />, title: 'Turn issues into PRs', desc: 'Reads issues, writes code, runs tests, and submits pull requests — the whole workflow, from your terminal.' },
    { icon: <FileCode className="w-5 h-5" />, title: 'Make powerful edits', desc: 'Deep codebase understanding enables coordinated, multi-file edits that actually work across your project.' },
    { icon: <Sparkles className="w-5 h-5" />, title: 'Powerful intelligence', desc: 'Agentic search across 8+ AI providers with consensus-based reasoning for changes you can trust.' },
    { icon: <Monitor className="w-5 h-5" />, title: 'Works where you work', desc: 'Lives in your terminal — no context switching. Integrates with VS Code, JetBrains, and your existing tools.' },
    { icon: <Shield className="w-5 h-5" />, title: "You're in control", desc: 'Never modifies files without explicit approval. Adapts to your standards. Configurable via SDK or CI/CD.' },
  ];

  // "Do more with Codeva, everywhere you work" — matches Claude screenshot grid
  const everywhere = {
    m365: {
      title: 'Microsoft 365',
      desc: 'Analyze data, build presentations, draft documents, and triage your inbox with Codeva alongside you.',
      items: [
        { icon: <FileSpreadsheet className="w-4 h-4 text-emerald-400" />, label: 'Excel' },
        { icon: <Presentation className="w-4 h-4 text-orange-400" />, label: 'PowerPoint' },
        { icon: <FileText className="w-4 h-4 text-blue-400" />, label: 'Word' },
        { icon: <Mail className="w-4 h-4 text-sky-400" />, label: 'Outlook', beta: true },
      ],
    },
  };

  const faqs = [
    { q: 'How do I get started with CyberCoder?', a: 'Install with npm: npm install -g @codeva_chat/cli. Then run cm /init to set up your project and configure your API key from your Codeva dashboard after signing up.' },
    { q: 'What kinds of tasks can CyberCoder handle?', a: 'Routine work like bug fixes, tests, and docs, plus transformative work like refactors and feature implementation that need deep codebase understanding across many files.' },
    { q: 'How does CyberCoder work with my existing tools?', a: 'It runs in your terminal and works alongside your IDE without changing your workflow. It integrates with Git, GitHub, and supports MCP servers to extend its capabilities.' },
    { q: 'Is CyberCoder secure?', a: 'Yes. It runs locally in your terminal and talks directly to AI APIs. It asks permission before changing files or running commands. Your code stays on your machine unless you share it.' },
    { q: 'Which AI models does CyberCoder use?', a: 'It routes across 8+ providers: OpenRouter, Groq, Gemini, Cerebras, Cloudflare, HuggingFace, NVIDIA, and local Ollama. Council Mode adds multi-model consensus.' },
    { q: 'How much does CyberCoder cost?', a: 'There is a generous free tier (50 requests/hour). Pro unlocks 500 requests/hour, Cowork, and reasoning models. Max adds the highest limits and priority access.' },
    { q: 'Does it work with the Codeva web app?', a: 'Yes. Your CLI account syncs with the Codeva web interface — start in the browser and continue in the terminal, or vice versa.' },
  ];

  return (
    <div ref={containerRef} className="min-h-screen overflow-x-hidden pt-16" style={{ backgroundColor: BG }}>
      <SEOHead
        title="CyberCoder — AI coding agent for your terminal"
        description="Build, debug, and ship from your terminal, IDE, or the web. CyberCoder works with 8+ AI providers directly in your codebase."
        path="/product"
      />

      {/* ===== HERO ===== */}
      <section className="relative min-h-[88vh] flex items-center justify-center pt-12 pb-20">
        <div className="absolute inset-0 overflow-hidden">
          <motion.div style={{ y: backgroundY }} className="absolute inset-0 opacity-[0.18]">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full blur-[120px]" style={{ backgroundColor: ACCENT }} />
          </motion.div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8"
            style={{ backgroundColor: 'rgba(201,100,66,0.15)', color: ACCENT, border: '1px solid rgba(201,100,66,0.3)' }}>
            <Terminal className="w-4 h-4" />
            AI coding agent for your terminal
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-serif font-normal text-[#f5f4ef] mb-6 tracking-tight leading-[1.05]"
            style={{ fontFamily: "'Instrument Serif', serif" }}>
            Build for <span style={{ color: ACCENT }}>developers</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Work with 8+ AI providers directly in your codebase. Build, debug, and ship from your terminal, IDE, or the web.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="max-w-2xl mx-auto mb-8">
            <div className="flex flex-wrap items-center justify-center gap-1 mb-3">
              {[
                { id: 'npm', label: 'npm' },
                { id: 'curl', label: 'macOS / Linux' },
                { id: 'ps1', label: 'Windows (PowerShell)' },
                { id: 'cmd', label: 'Windows (CMD)' },
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    backgroundColor: activeTab === tab.id ? 'rgba(201,100,66,0.2)' : 'transparent',
                    color: activeTab === tab.id ? ACCENT : '#888',
                    border: activeTab === tab.id ? `1px solid ${ACCENT}` : '1px solid transparent',
                  }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 px-5 py-3 rounded-lg font-mono text-sm border" style={{ backgroundColor: CARD, borderColor: BORDER }}>
              <span style={{ color: ACCENT }}>$</span>
              <span className="text-gray-300 truncate">{installCommands[activeTab]}</span>
              <button onClick={copyInstall} className="ml-auto p-1.5 rounded hover:bg-white/10 transition-colors flex-shrink-0" title="Copy">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-500" />}
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 mt-5">
              <Link to="/auth/signup" className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90" style={{ backgroundColor: '#f5f4ef', color: BG }}>
                Get started
              </Link>
              <Link to="/downloads" className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all hover:bg-white/5 border" style={{ borderColor: BORDER, color: '#ccc' }}>
                <Download className="w-5 h-5" />
                Download desktop
              </Link>
            </div>
          </motion.div>

          {/* Terminal demo */}
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, delay: 0.4 }} className="max-w-3xl mx-auto">
            <div className="rounded-xl overflow-hidden border text-left" style={{ backgroundColor: '#16140f', borderColor: BORDER }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: BORDER, backgroundColor: '#1d1b16' }}>
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-4 text-xs text-gray-500 font-mono">cybercoder — zsh</span>
              </div>
              <div className="p-6 font-mono text-sm">
                <div className="flex items-start gap-2 mb-3">
                  <span style={{ color: ACCENT }}>$</span>
                  <div><span className="text-white">cm</span><span className="text-gray-500"> ask </span><span className="text-green-400">"Fix the auth bug in signup flow"</span></div>
                </div>
                <div className="text-gray-400 mb-2 pl-4">Analyzing codebase structure...</div>
                <div className="text-gray-400 mb-2 pl-4">Found <span className="text-white">auth.js</span>, <span className="text-white">middleware/</span>, <span className="text-white">utils/token.js</span></div>
                <div className="pl-4 mb-2" style={{ color: ACCENT }}>Contemplating…</div>
                <div className="border-l-2 pl-4 my-3" style={{ borderColor: ACCENT }}>
                  <p className="text-gray-300 mb-2">I'll fix the signup auth bug. This involves:</p>
                  <ul className="text-gray-400 space-y-1">
                    <li>1. Patch <span className="text-yellow-400">auth.js</span> token validation</li>
                    <li>2. Add a missing <span className="text-yellow-400">await</span> in the signup handler</li>
                    <li>3. Run the auth test suite</li>
                  </ul>
                </div>
                <div className="flex items-start gap-2"><span style={{ color: ACCENT }}>$</span><span className="animate-pulse text-gray-500">_</span></div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-[#f5f4ef]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Get more done with CyberCoder
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div key={i} {...fadeInUp} transition={{ ...fadeInUp.transition, delay: i * 0.06 }} className="p-6 rounded-2xl border" style={{ backgroundColor: CARD, borderColor: BORDER }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(201,100,66,0.15)', color: ACCENT }}>{f.icon}</div>
                <h3 className="text-lg font-semibold text-[#f5f4ef] mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DO MORE, EVERYWHERE YOU WORK ===== */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.h2 {...fadeInUp} className="text-2xl sm:text-3xl font-serif font-normal text-[#f5f4ef] text-center mb-12" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Do more with Codeva, everywhere you work
          </motion.h2>

          {/* M365 wide card */}
          <motion.div {...fadeInUp} className="rounded-2xl border p-6 mb-4" style={{ backgroundColor: CARD, borderColor: BORDER }}>
            <h3 className="text-sm font-semibold text-[#f5f4ef] mb-2">{everywhere.m365.title}</h3>
            <p className="text-sm text-gray-400 max-w-md mb-4">{everywhere.m365.desc}</p>
            <Link to="/upgrade" className="inline-block px-3.5 py-1.5 rounded-lg text-xs font-semibold mb-5 border" style={{ borderColor: BORDER, color: '#f5f4ef' }}>Upgrade</Link>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1 max-w-md">
              {everywhere.m365.items.map((it) => (
                <div key={it.label} className="flex items-center gap-2.5 py-2.5 border-b" style={{ borderColor: BORDER }}>
                  {it.icon}
                  <span className="text-sm text-gray-300">{it.label}</span>
                  {it.beta && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">Beta</span>}
                  <ArrowRight className="w-3.5 h-3.5 text-gray-600 ml-auto -rotate-45" />
                </div>
              ))}
            </div>
          </motion.div>

          {/* 2x2 grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { tag: 'CyberCoder', icon: <Terminal className="w-4 h-4" />, title: 'CyberCoder', desc: 'Build, debug, and ship from your terminal or IDE.', items: ['Terminal', 'VS Code', 'Desktop app', 'JetBrains', 'Slack'] },
              { tag: 'Mobile', icon: <Smartphone className="w-4 h-4" />, title: 'Mobile', desc: 'Chat hands-free, connect Codeva to your favorite apps, and kick off tasks on the go.', dl: ['iOS', 'Android'] },
              { tag: 'Chrome', icon: <Chrome className="w-4 h-4" />, title: 'Chrome', desc: 'Codeva navigates, clicks buttons, and fills forms in your browser. Works in Cowork.', upgrade: true },
              { tag: 'Desktop', icon: <Monitor className="w-4 h-4" />, title: 'Desktop', desc: 'Chat, cowork, and code in one app. Codeva works with your files, apps, and browser tabs.', desktop: true },
            ].map((c) => (
              <motion.div key={c.tag} {...fadeInUp} className="rounded-2xl border p-6 flex flex-col" style={{ backgroundColor: CARD, borderColor: BORDER }}>
                <h3 className="text-sm font-semibold text-[#f5f4ef] mb-2">{c.title}</h3>
                <p className="text-sm text-gray-400 mb-4 flex-grow">{c.desc}</p>
                {c.upgrade && <Link to="/upgrade" className="inline-block w-fit px-3.5 py-1.5 rounded-lg text-xs font-semibold border" style={{ borderColor: BORDER, color: '#f5f4ef' }}>Upgrade</Link>}
                {c.desktop && <Link to="/downloads/windows" className="inline-flex w-fit items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: '#f5f4ef', color: BG }}><Download className="w-3.5 h-3.5" />Download for Windows</Link>}
                {c.items && (
                  <div className="space-y-0.5 mt-1">
                    {c.items.map((i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b text-sm text-gray-300" style={{ borderColor: BORDER }}>
                        <span>{i}</span><ArrowRight className="w-3.5 h-3.5 text-gray-600 -rotate-45" />
                      </div>
                    ))}
                  </div>
                )}
                {c.dl && (
                  <div className="space-y-2 mt-1">
                    {c.dl.map((i) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-gray-300">{i}</span>
                        <Link to="/downloads" className="px-3 py-1 rounded-md text-xs font-semibold border" style={{ borderColor: BORDER, color: '#f5f4ef' }}>Download</Link>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURE ANNOUNCEMENTS ===== */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-[#f5f4ef]" style={{ fontFamily: "'Instrument Serif', serif" }}>Latest features</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: <Monitor className="w-5 h-5" />, title: 'Redesigned desktop app', desc: 'Run more CyberCoder tasks at once with a tabbed interface and workspace management.' },
              { icon: <Workflow className="w-5 h-5" />, title: 'Cowork', desc: 'Delegate autonomous tasks that run in the background while you keep working.' },
              { icon: <Bot className="w-5 h-5" />, title: 'Auto mode', desc: 'A safer long-running mode that asks before file changes but runs tests automatically.' },
            ].map((item, i) => (
              <motion.div key={i} {...fadeInUp} transition={{ ...fadeInUp.transition, delay: i * 0.06 }} className="p-6 rounded-2xl border" style={{ backgroundColor: CARD, borderColor: BORDER }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(201,100,66,0.15)', color: ACCENT }}>{item.icon}</div>
                <h3 className="text-lg font-semibold text-[#f5f4ef] mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-[#f5f4ef]" style={{ fontFamily: "'Instrument Serif', serif" }}>FAQ</h2>
          </motion.div>
          <div>
            {faqs.map((faq, i) => (
              <AccordionItem key={i} question={faq.q} answer={faq.a} isOpen={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? -1 : i)} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 px-4 sm:px-6 border-t" style={{ borderColor: BORDER }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-serif font-normal text-[#f5f4ef] mb-2" style={{ fontFamily: "'Instrument Serif', serif" }}>Ready to ship faster?</h3>
            <p className="text-gray-400">Install CyberCoder and start building with AI today.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/docs" className="px-6 py-3 rounded-lg font-medium border transition-all hover:bg-white/5" style={{ borderColor: BORDER, color: '#fff' }}>Read docs</Link>
            <Link to="/auth/signup" className="px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90" style={{ backgroundColor: '#f5f4ef', color: BG }}>Get started</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
