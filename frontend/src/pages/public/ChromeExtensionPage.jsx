import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Chrome, Zap, Globe, FileText, Code2, Shield, ArrowRight, Download } from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'
import SEOHead from '@components/seo/SEOHead'
import { Tooltip } from '@components/ui/Tooltip'
import BrowserMark from '@components/ui/BrowserMark'

/**
 * /chrome-extension — Codeva browser workspace and unpacked installation.
 */

const FEATURES = [
  { icon: FileText, title: 'Understand the current page', desc: 'Attach readable page text for summaries and explanations with the source URL included.' },
  { icon: Globe, title: 'Refine your writing', desc: 'Review grammar, spelling, and clarity. Preview six rewrite styles, apply or undo edits, and set your own dictionary and writing goals.' },
  { icon: Code2, title: 'Explain code', desc: 'Highlight code on any page and get a clear explanation with examples.' },
  { icon: Zap, title: 'Pick up where you left off', desc: 'Search saved conversations, recover drafts, and export chats. History stays in this browser, separately for each account.' },
  { icon: Shield, title: 'Choose what you share', desc: 'Page context starts off. Pause writing assistance per website or in Settings. Submitted text is processed through Codeva and its AI providers.' },
  { icon: Chrome, title: 'A workspace beside your page', desc: 'Use the side panel, context menu, or selection toolbar on supported websites, with system, light, and dark themes.' },
]

export default function ChromeExtensionPage() {
  return (
    <div className="min-h-screen bg-[#1a1a18] pt-32 pb-20 px-6">
      <SEOHead title="Codeva for Chrome — Your browser workspace" path="/chrome-extension" />
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <ScrollReveal>
          <div className="text-center mb-16">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#C96442]/30 bg-[#C96442]/10 text-[#C96442] text-sm font-medium mb-6">
              <BrowserMark size={24} /> Chrome Extension
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-serif font-normal text-[#f5f4ef] mb-5" style={{ fontFamily: "'Instrument Serif', serif" }}>
              A helping hand<br/>across all your tabs
            </h1>
            <p className="text-lg text-gray-400 max-w-xl mx-auto mb-8">
              Chat beside your work, understand a page, and refine your writing with your existing Codeva account.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Tooltip content="Download Codeva 1.5.0 for an unpacked Chrome installation">
                <a href="https://github.com/codevaaa/cybercli-chat/raw/refs/heads/main/artifacts/codeva-extension-1.5.0-2026-11-04.zip" className="px-7 py-3.5 bg-[#f5f4ef] text-[#1a1a18] rounded-xl font-bold transition-all hover:bg-white flex items-center gap-2">
                  <Download className="w-5 h-5" /> Download extension ZIP
                </a>
              </Tooltip>
              <Tooltip content="Connect your existing Codeva account">
                <Link to="/auth/login?from=extension" className="px-7 py-3.5 border border-white/10 text-[#f5f4ef] rounded-xl font-medium hover:bg-white/5 transition-colors">
                  Sign in to Codeva
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
                <div className="text-2xl mb-2" aria-hidden="true">01</div>
                <h4 className="text-sm font-semibold text-[#f5f4ef] mb-1">Load the extension</h4>
                <p className="text-xs text-gray-400">Extract the ZIP. Open chrome://extensions, enable Developer mode, and choose Load unpacked. Select the extracted folder.</p>
              </div>
              <div>
                <div className="text-2xl mb-2" aria-hidden="true">02</div>
                <h4 className="text-sm font-semibold text-[#f5f4ef] mb-1">Connect your account</h4>
                <p className="text-xs text-gray-400">Sign in on the Codeva website, reload existing webpages, and click the extension icon to open your workspace.</p>
              </div>
              <div>
                <div className="text-2xl mb-2" aria-hidden="true">03</div>
                <h4 className="text-sm font-semibold text-[#f5f4ef] mb-1">Get results</h4>
                <p className="text-xs text-gray-400">Chat, attach a page, or review a draft in Writing. Chrome internal pages and some specialized editors restrict access.</p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal>
          <div className="text-center">
            <h2 className="text-2xl font-serif font-normal text-[#f5f4ef] mb-4" style={{ fontFamily: "'Instrument Serif', serif" }}>Codeva across your browser and desktop</h2>
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
