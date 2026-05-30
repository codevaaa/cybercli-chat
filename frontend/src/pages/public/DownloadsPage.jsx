import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Download, Monitor, Apple, ArrowRight, ShieldCheck,
  Terminal, Chrome, Code2, ChevronDown, ChevronUp,
  ArrowUpRight
} from 'lucide-react'
import { Link } from 'react-router-dom'
import ScrollReveal from '@components/ui/ScrollReveal'
import SEOHead from '@components/seo/SEOHead'
import { API_BASE } from '@lib/api'

const OS_MAP = {
  win32: { name: 'Windows', icon: Monitor, primary: true, file: 'Codeva-win-x64.exe', ext: 'EXE', req: 'Windows 10+' },
  darwin: { name: 'macOS', icon: Apple, primary: true, file: 'Codeva-mac-universal.dmg', ext: 'DMG', req: 'macOS 12.0+' },
  linux: { name: 'Linux', icon: Terminal, primary: false, file: 'Codeva-linux-x64.AppImage', ext: 'AppImage', req: 'Ubuntu 20.04+' },
}

function useDetectedOS() {
  const [os, setOs] = useState('win32')
  useEffect(() => {
    const platform = navigator.platform.toLowerCase()
    if (platform.includes('mac') || platform.includes('darwin')) setOs('darwin')
    else if (platform.includes('linux')) setOs('linux')
    else setOs('win32')
  }, [])
  return os
}

function Section({ title, children, className = '' }) {
  return (
    <section className={`mb-20 ${className}`}>
      <h2 className="text-2xl font-serif text-[#ECECEC] mb-8">{title}</h2>
      {children}
    </section>
  )
}

function DownloadCard({ os, primary }) {
  const meta = OS_MAP[os] || OS_MAP.win32
  const Icon = meta.icon
  const name = meta.name
  const ext = meta.ext
  const req = meta.req
  // Real download endpoint (R2 CDN with GitHub fallback, handled server-side).
  const downloadUrl = `${API_BASE}/downloads/${meta.file}`

  return (
    <ScrollReveal>
      <a
        href={downloadUrl}
        download
        className={`block p-8 md:p-10 rounded-3xl border transition-all duration-300 group flex flex-col h-full relative overflow-hidden ${
          primary
            ? 'bg-[#ECECEC] text-[#0A0A0F] border-transparent'
            : 'bg-[#14141A] border-white/[0.06] hover:bg-[#1A1A22]'
        }`}
      >
        <div className="w-14 h-14 rounded-2xl bg-white/[0.08] flex items-center justify-center mb-6">
          <Icon className={`w-7 h-7 ${primary ? 'text-[#0A0A0F]' : 'text-[#ECECEC]'}`} />
        </div>
        <h3 className={`text-xl font-semibold mb-2 ${primary ? 'text-[#0A0A0F]' : 'text-[#ECECEC]'}`}>
          {name}
        </h3>
        <p className={`text-sm mb-6 flex-1 leading-relaxed ${primary ? 'text-[#0A0A0F]/70' : 'text-[#A0A0A0]'}`}>
          All of Codeva, in one app. Works with your files and apps to get things done.
        </p>
        <div className={`w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-[14px] ${
          primary
            ? 'bg-[#0A0A0F] text-white group-hover:bg-[#1A1A22]'
            : 'bg-[#1c1c24] border border-white/[0.1] group-hover:bg-white/[0.08] text-[#ECECEC]'
        }`}>
          <Download className="w-4 h-4" />
          Download {ext}
          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className={`text-center text-[11px] mt-3 ${primary ? 'text-[#0A0A0F]/50' : 'text-[#707070]'}`}>
          Requires {req}
        </p>
      </a>
    </ScrollReveal>
  )
}

function ExtensionCard({ title, desc, icon: Icon, href = '#', label = 'Install' }) {
  return (
    <ScrollReveal>
      <a href={href} className="block p-6 rounded-2xl bg-[#14141A] border border-white/[0.06] hover:bg-[#1A1A22] hover:border-white/[0.1] transition-all group">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
            <Icon className="w-5 h-5 text-[#D97757]" />
          </div>
          <span className="text-xs text-[#D97757] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            {label} →
          </span>
        </div>
        <h4 className="text-[15px] font-semibold text-[#ECECEC] mb-1">{title}</h4>
        <p className="text-[13px] text-[#A0A0A0] leading-relaxed">{desc}</p>
      </a>
    </ScrollReveal>
  )
}

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/[0.06]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full py-5 flex items-center justify-between text-left group"
      >
        <span className="text-[15px] text-[#ECECEC] font-medium group-hover:text-[#D97757] transition-colors">
          {question}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-[#A0A0A0]" /> : <ChevronDown className="w-4 h-4 text-[#A0A0A0]" />}
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="pb-5 text-[14px] text-[#A0A0A0] leading-relaxed max-w-3xl"
        >
          {answer}
        </motion.div>
      )}
    </div>
  )
}

export default function DownloadsPage() {
  const detectedOS = useDetectedOS()

  const faqs = [
    {
      q: 'Do I need a paid plan to use the desktop app?',
      a: 'No. The desktop app is free to download and use with your existing Codeva account. Free tier users get 50 messages per hour. Pro and Max plans offer higher limits.',
    },
    {
      q: 'What\'s the difference between the desktop app and the web app?',
      a: 'The desktop app offers system-level integrations like global keyboard shortcuts, system tray access, file drag-and-drop, and local file system access via our workspace daemon. The web app works in any browser.',
    },
    {
      q: 'Can I use the same account across desktop, web, and CLI?',
      a: 'Yes. Your Codeva account, chats, settings, and API keys sync across all platforms automatically.',
    },
    {
      q: 'How do I connect Codeva to my local files?',
      a: 'The desktop app includes a local workspace daemon that allows Codeva to read, write, and execute files in your project directories with your explicit approval.',
    },
    {
      q: 'Does my computer need to be on for background tasks?',
      a: 'No. The desktop app can run background tasks even when the main window is closed (minimized to tray).',
    },
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0F] pt-32 pb-24 overflow-hidden relative">
      <SEOHead title="Download Codeva | Desktop App for Windows, Mac & Linux" />

      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-3/4 h-[500px] bg-[#D97757]/5 blur-[150px] rounded-bl-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/2 h-[400px] bg-blue-500/5 blur-[150px] rounded-tr-full pointer-events-none" />

      <div className="max-w-[1100px] mx-auto px-6 relative z-10">

        {/* Header */}
        <div className="text-center mb-20">
          <ScrollReveal>
            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-normal tracking-tight text-[#ECECEC] mb-6 leading-[1.1] font-serif">
              Download Codeva
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="text-[17px] md:text-lg text-[#A0A0A0] max-w-xl mx-auto leading-relaxed font-light">
              Get the Codeva desktop app for your computer.
            </p>
          </ScrollReveal>
        </div>

        {/* Desktop */}
        <Section title="Desktop">
          <p className="text-[#A0A0A0] mb-8 max-w-2xl">
            All of Codeva, in one app. Works with your files and apps to get things done.
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            {(['darwin', 'win32', 'linux']).map((os) => (
              <DownloadCard
                key={os}
                os={os}
                primary={os === detectedOS}
              />
            ))}
          </div>
          <div className="mt-6 flex items-center gap-2 text-[#707070] text-[12px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>All downloads are signed and notarized for your security.</span>
          </div>
        </Section>

        {/* Go Further */}
        <Section title="Go Further">
          <p className="text-[#A0A0A0] mb-8 max-w-2xl">
            Bring Codeva to your workflow.
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            <ExtensionCard
              title="VS Code Extension"
              desc="Chat with Codeva directly inside your editor. Code completion and inline suggestions."
              icon={Code2}
              href="https://marketplace.visualstudio.com/search?term=codeva"
              label="Install"
            />
            <ExtensionCard
              title="Chrome Extension"
              desc="Access Codeva from any web page. Summarize articles, rewrite text, and more."
              icon={Chrome}
              href="https://chromewebstore.google.com/search/codeva"
              label="Install"
            />
            <ExtensionCard
              title="CyberCoder CLI"
              desc="The fastest way to install. Works on all platforms with Node.js 20+."
              icon={Terminal}
              href="/product"
              label="Learn more"
            />
          </div>
        </Section>

        {/* CLI Quick Install */}
        <Section title="Quick Install">
          <div className="p-6 rounded-2xl bg-[#14141A] border border-white/[0.06]">
            <p className="text-[#A0A0A0] text-sm mb-4">Install the CyberCoder CLI with a single command:</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 px-4 py-3 rounded-xl bg-[#0A0A0F] border border-white/[0.08] text-[13px] text-blue-300 font-mono">
                npm install -g @codeva_chat/cli
              </code>
              <button
                onClick={() => navigator.clipboard.writeText('npm install -g @codeva_chat/cli')}
                className="px-4 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[13px] text-[#ECECEC] transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        </Section>

        {/* FAQ */}
        <Section title="FAQ">
          <div>
            {faqs.map((f, i) => (
              <FAQItem key={i} question={f.q} answer={f.a} />
            ))}
          </div>
        </Section>

      </div>
    </div>
  )
}
