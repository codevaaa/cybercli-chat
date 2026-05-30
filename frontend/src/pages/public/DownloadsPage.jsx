import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Download, Monitor, Apple, ShieldCheck,
  Terminal, Chrome, Code2, ChevronDown, ChevronUp,
  ArrowUpRight, Smartphone
} from 'lucide-react'
import { Link } from 'react-router-dom'
import ScrollReveal from '@components/ui/ScrollReveal'
import SEOHead from '@components/seo/SEOHead'
import { API_BASE } from '@lib/api'

/* Downloads — matched to claude.ai/downloads (warm palette, Desktop + Mobile +
 * extensions). Real download endpoints (R2 CDN with GitHub fallback server-side). */

const BG = '#1a1a18'
const CARD = '#211f1c'
const CARD_HOVER = '#262521'
const BORDER = 'rgba(255,255,255,0.07)'
const ACCENT = '#C96442'
const CREAM = '#f5f4ef'

const OS_MAP = {
  win32: { name: 'Windows', icon: Monitor, file: 'Codeva-win-x64.exe', ext: 'EXE', req: 'Windows 10+' },
  darwin: { name: 'macOS', icon: Apple, file: 'Codeva-mac-universal.dmg', ext: 'DMG', req: 'macOS 12.0+' },
  linux: { name: 'Linux', icon: Terminal, file: 'Codeva-linux-x64.AppImage', ext: 'AppImage', req: 'Ubuntu 20.04+' },
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

function Section({ title, subtitle, children }) {
  return (
    <section className="mb-16">
      <ScrollReveal>
        <h2 className="text-2xl font-serif font-normal mb-1.5" style={{ color: CREAM, fontFamily: "'Instrument Serif', serif" }}>{title}</h2>
        {subtitle && <p className="text-sm text-gray-400 mb-7 max-w-2xl">{subtitle}</p>}
      </ScrollReveal>
      {children}
    </section>
  )
}

function DownloadCard({ os, primary }) {
  const meta = OS_MAP[os] || OS_MAP.win32
  const Icon = meta.icon
  const downloadUrl = `${API_BASE}/downloads/${meta.file}`

  return (
    <ScrollReveal>
      <a
        href={downloadUrl}
        download
        className="block p-7 rounded-2xl border transition-all duration-300 group flex flex-col h-full"
        style={{
          backgroundColor: primary ? CREAM : CARD,
          borderColor: primary ? 'transparent' : BORDER,
          color: primary ? BG : CREAM,
        }}
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: primary ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }}>
          <Icon className="w-6 h-6" style={{ color: primary ? BG : CREAM }} />
        </div>
        <h3 className="text-lg font-semibold mb-2">{meta.name}</h3>
        <p className="text-sm mb-6 flex-1 leading-relaxed" style={{ color: primary ? 'rgba(26,26,24,0.7)' : '#a0a0a0' }}>
          All of Codeva, in one app. Works with your files and apps to get things done.
        </p>
        <div className="w-full py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 text-sm transition-colors"
          style={{ backgroundColor: primary ? BG : 'rgba(255,255,255,0.05)', color: primary ? '#fff' : CREAM, border: primary ? 'none' : `1px solid ${BORDER}` }}>
          <Download className="w-4 h-4" />
          Download {meta.ext}
          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-center text-[11px] mt-3" style={{ color: primary ? 'rgba(26,26,24,0.5)' : '#707070' }}>Requires {meta.req}</p>
      </a>
    </ScrollReveal>
  )
}

function MobileRow({ label, store, href }) {
  return (
    <div className="flex items-center justify-between py-3.5 px-4 rounded-xl border" style={{ borderColor: BORDER, backgroundColor: CARD }}>
      <div className="flex items-center gap-3">
        <Smartphone className="w-4 h-4" style={{ color: ACCENT }} />
        <span className="text-sm" style={{ color: CREAM }}>{label}</span>
      </div>
      <a href={href} target="_blank" rel="noopener noreferrer" className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:bg-white/5" style={{ borderColor: BORDER, color: CREAM }}>
        {store}
      </a>
    </div>
  )
}

function ExtensionCard({ title, desc, icon: Icon, href, label, to }) {
  const inner = (
    <>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <Icon className="w-5 h-5" style={{ color: ACCENT }} />
        </div>
        <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: ACCENT }}>{label} →</span>
      </div>
      <h4 className="text-[15px] font-semibold mb-1" style={{ color: CREAM }}>{title}</h4>
      <p className="text-[13px] text-gray-400 leading-relaxed">{desc}</p>
    </>
  )
  const cls = 'block p-6 rounded-2xl border transition-all group'
  const style = { backgroundColor: CARD, borderColor: BORDER }
  return (
    <ScrollReveal>
      {to ? <Link to={to} className={cls} style={style}>{inner}</Link>
          : <a href={href} target="_blank" rel="noopener noreferrer" className={cls} style={style}>{inner}</a>}
    </ScrollReveal>
  )
}

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b" style={{ borderColor: BORDER }}>
      <button onClick={() => setOpen(!open)} className="w-full py-5 flex items-center justify-between text-left">
        <span className="text-[15px] font-medium" style={{ color: CREAM }}>{question}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pb-5 text-[14px] text-gray-400 leading-relaxed max-w-3xl">
          {answer}
        </motion.div>
      )}
    </div>
  )
}

export default function DownloadsPage() {
  const detectedOS = useDetectedOS()

  const faqs = [
    { q: 'Do I need a paid plan to use the desktop app?', a: 'No. The desktop app is free to download and use with your existing Codeva account. Free tier users get 50 messages per hour. Pro and Max plans offer higher limits.' },
    { q: "What's the difference between the desktop app and the web app?", a: 'The desktop app offers system-level integrations like global keyboard shortcuts, system tray access, file drag-and-drop, and local file system access via our workspace daemon. The web app works in any browser.' },
    { q: 'Can I use the same account across desktop, web, and CLI?', a: 'Yes. Your Codeva account, chats, settings, and API keys sync across all platforms automatically.' },
    { q: 'How do I connect Codeva to my local files?', a: 'The desktop app includes a local workspace daemon that lets Codeva read, write, and execute files in your project directories with your explicit approval.' },
    { q: 'Does my computer need to be on for background tasks?', a: 'The desktop app can run background tasks even when the main window is closed (minimized to tray), as long as the computer is on.' },
  ]

  return (
    <div className="min-h-screen pt-32 pb-24 relative overflow-hidden" style={{ backgroundColor: BG }}>
      <SEOHead title="Download Codeva | Desktop App for Windows, Mac & Linux" path="/downloads" />

      <div className="absolute top-0 right-0 w-3/4 h-[500px] blur-[150px] rounded-bl-full pointer-events-none" style={{ backgroundColor: 'rgba(201,100,66,0.06)' }} />

      <div className="max-w-[1080px] mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <ScrollReveal>
            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-serif font-normal tracking-tight mb-5 leading-[1.1]" style={{ color: CREAM, fontFamily: "'Instrument Serif', serif" }}>
              Download Codeva
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="text-[17px] text-gray-400 max-w-xl mx-auto leading-relaxed">Get the Codeva desktop app for your computer, or grab it on mobile.</p>
          </ScrollReveal>
        </div>

        <Section title="Desktop" subtitle="All of Codeva, in one app. Works with your files and apps to get things done.">
          <div className="grid md:grid-cols-3 gap-5">
            {['darwin', 'win32', 'linux'].map((os) => (
              <DownloadCard key={os} os={os} primary={os === detectedOS} />
            ))}
          </div>
          <div className="mt-6 flex items-center gap-2 text-[12px]" style={{ color: '#707070' }}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>All downloads are signed and notarized for your security.</span>
          </div>
        </Section>

        <Section title="Mobile" subtitle="Chat hands-free and kick off tasks on the go.">
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
            <MobileRow label="iOS" store="App Store" href="https://apps.apple.com/app/codeva" />
            <MobileRow label="Android" store="Google Play" href="https://play.google.com/store/apps/details?id=com.codeva.app" />
          </div>
        </Section>

        <Section title="Go further" subtitle="Bring Codeva to the rest of your workflow.">
          <div className="grid md:grid-cols-3 gap-5">
            <ExtensionCard title="VS Code Extension" desc="Chat with Codeva directly inside your editor. Code completion and inline suggestions." icon={Code2} href="https://marketplace.visualstudio.com/search?term=codeva" label="Install" />
            <ExtensionCard title="Chrome Extension" desc="Access Codeva from any web page. Summarize articles, rewrite text, and more." icon={Chrome} href="https://chromewebstore.google.com/search/codeva" label="Install" />
            <ExtensionCard title="CyberCoder CLI" desc="The fastest way to install. Works on all platforms with Node.js 20+." icon={Terminal} to="/product" label="Learn more" />
          </div>
        </Section>

        <Section title="Quick install">
          <div className="p-6 rounded-2xl border" style={{ backgroundColor: CARD, borderColor: BORDER }}>
            <p className="text-sm text-gray-400 mb-4">Install the CyberCoder CLI with a single command:</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 px-4 py-3 rounded-xl font-mono text-[13px]" style={{ backgroundColor: '#16140f', border: `1px solid ${BORDER}`, color: '#e0a98f' }}>
                npm install -g @codeva_chat/cli
              </code>
              <button onClick={() => navigator.clipboard.writeText('npm install -g @codeva_chat/cli')} className="px-4 py-3 rounded-xl text-[13px] transition-colors hover:bg-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: CREAM }}>
                Copy
              </button>
            </div>
          </div>
        </Section>

        <Section title="FAQ">
          <div>{faqs.map((f, i) => <FAQItem key={i} question={f.q} answer={f.a} />)}</div>
        </Section>
      </div>
    </div>
  )
}
