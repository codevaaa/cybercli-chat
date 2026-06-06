import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Chrome, Zap, Globe, FileText, Code2, Shield, ArrowRight, Download } from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'
import SEOHead from '@components/seo/SEOHead'
import { Tooltip } from '@components/ui/Tooltip'

/**
 * /chrome-extension — CyberCoder for Chrome product page.
 * Matches claude.com/claude-for-chrome structure: hero, features, safety, FAQ.
 */

const FEATURES = [
  { icon: FileText, title: 'Summarize any page', desc: 'Get concise bullet-point summaries of articles, docs, and research papers in one click.' },
  { icon: Globe, title: 'Translate content', desc: 'Translate page content or selected text to any language instantly.' },
  { icon: Code2, title: 'Explain code', desc: 'Highlight code on any page and get a clear explanation with examples.' },
  { icon: Zap, title: 'Extract structured data', desc: 'Pull tables, lists, and key facts from pages as JSON or Markdown.' },
  { icon: Shield, title: 'Browse safely', desc: 'CyberCoder never stores page content on our servers. Processing happens via your chosen provider.' },
  { icon: Chrome, title: 'Works everywhere', desc: 'Side panel, popup, context menu, floating button — access AI from any tab without switching.' },
]

export default function ChromeExtensionPage() {
  return (
    <div className="min-h-screen bg-[#1a1a18] pt-32 pb-20 px-6">
      <SEOHead title="CyberCoder for Chrome — AI in your browser" path="/chrome-extension" />
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <ScrollReveal>
          <div className="text-center mb-16">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#C96442]/30 bg-[#C96442]/10 text-[#C96442] text-sm font-medium mb-6">
              <Chrome className="w-4 h-4" /> Chrome Extension
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-serif font-normal text-[#f5f4ef] mb-5" style={{ fontFamily: "'Instrument Serif', serif" }}>
              A helping hand<br/>across all your tabs
            </h1>
            <p className="text-lg text-gray-400 max-w-xl mx-auto mb-8">
              CyberCoder in Chrome summarizes pages, explains code, extracts data, translates content, and chats — all without leaving your browser. Free tier available.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Tooltip content="Download the Chrome Extension">
                <a href="https://chromewebstore.google.com/search/cybercoder" target="_blank" rel="noopener noreferrer" className="px-7 py-3.5 bg-[#f5f4ef] text-[#1a1a18] rounded-xl font-bold transition-all hover:bg-white flex items-center gap-2">
                  <Download className="w-5 h-5" /> Add to Chrome
                </a>
              </Tooltip>
              <Tooltip content="Connect to an AI Provider">
                <Link to="/providers" className="px-7 py-3.5 border border-white/10 text-[#f5f4ef] rounded-xl font-medium hover:bg-white/5 transition-colors">
                  Connect a provider
                </Link>
              </Tooltip>
            </div>
          </div>
        </ScrollReveal>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 gap-5 mb-16">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <ScrollReveal key={f.title} delay={i * 0.05}>
                <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#211f1c]">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(201,100,66,0.15)' }}>
                    <Icon className="w-5 h-5 text-[#C96442]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#f5f4ef] mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </ScrollReveal>
            )
          })}
        </div>

        {/* How it works */}
        <ScrollReveal>
          <div className="p-8 rounded-2xl border border-white/[0.06] bg-[#211f1c] mb-16">
            <h2 className="text-2xl font-serif font-normal text-[#f5f4ef] mb-6" style={{ fontFamily: "'Instrument Serif', serif" }}>A refreshing way to work on the web</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              <div>
                <div className="text-2xl mb-2">1️⃣</div>
                <h4 className="text-sm font-semibold text-[#f5f4ef] mb-1">Install & connect</h4>
                <p className="text-xs text-gray-400">Add to Chrome, connect a free provider (Groq or Gemini), done.</p>
              </div>
              <div>
                <div className="text-2xl mb-2">2️⃣</div>
                <h4 className="text-sm font-semibold text-[#f5f4ef] mb-1">Use anywhere</h4>
                <p className="text-xs text-gray-400">Right-click, keyboard shortcut, or click the icon. Works on any page.</p>
              </div>
              <div>
                <div className="text-2xl mb-2">3️⃣</div>
                <h4 className="text-sm font-semibold text-[#f5f4ef] mb-1">Get results</h4>
                <p className="text-xs text-gray-400">Summaries, translations, explanations, and data — streamed in real time.</p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal>
          <div className="text-center">
            <h2 className="text-2xl font-serif font-normal text-[#f5f4ef] mb-4" style={{ fontFamily: "'Instrument Serif', serif" }}>CyberCoder can work in your browser and desktop</h2>
            <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">Use the Chrome extension for web tasks, the VS Code extension for coding, and the desktop app for everything else.</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Tooltip content="Download Desktop App">
                <Link to="/downloads" className="px-5 py-2.5 rounded-xl border border-white/[0.1] text-[#f5f4ef] text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-1.5">
                  <Download className="w-4 h-4" /> Desktop app
                </Link>
              </Tooltip>
              <Tooltip content="Get VS Code Extension">
                <Link to="/product" className="px-5 py-2.5 rounded-xl border border-white/[0.1] text-[#f5f4ef] text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-1.5">
                  VS Code extension <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Tooltip>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  )
}
