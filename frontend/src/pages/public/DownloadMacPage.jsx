/**
 * Download Mac Page — Platform-specific download page for macOS
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Apple, Check, ShieldCheck, ArrowLeft, Cpu, HardDrive, RefreshCw } from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'
import SEOHead from '@components/seo/SEOHead'
import { Link } from 'react-router-dom'

const FEATURES = [
  'Native macOS title bar with traffic lights',
  'Global keyboard shortcuts (Cmd+Shift+C toggle)',
  'Menu bar quick access',
  'File drag & drop into chat',
  'Local file system access via workspace daemon',
  'Auto-updates with Sparkle',
]

const STEPS = [
  { num: '1', text: 'Download the .dmg file' },
  { num: '2', text: 'Open the DMG and drag CyberCli to Applications' },
  { num: '3', text: 'Launch from Launchpad or Applications folder' },
  { num: '4', text: 'Sign in with your CyberCli account' },
]

export default function DownloadMacPage() {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = () => {
    setDownloading(true)
    const link = document.createElement('a')
    link.href = '/downloads/CyberCli-macOS-universal.dmg'
    link.download = 'CyberCli-macOS-universal.dmg'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => setDownloading(false), 3000)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] pt-32 pb-24 overflow-hidden relative">
      <SEOHead title="Download CyberCli for Mac" />

      <div className="absolute top-0 right-0 w-3/4 h-[500px] bg-[#D97757]/5 blur-[150px] rounded-bl-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/2 h-[400px] bg-blue-500/5 blur-[150px] rounded-tr-full pointer-events-none" />

      <div className="max-w-[900px] mx-auto px-6 relative z-10">
        <Link to="/downloads" className="inline-flex items-center gap-2 text-[#707070] hover:text-[#ECECEC] transition-colors text-sm mb-8">
          <ArrowLeft className="w-4 h-4" />
          All Downloads
        </Link>

        <div className="mb-16">
          <ScrollReveal>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#D97757]/10 flex items-center justify-center">
                <Apple className="w-5 h-5 text-[#D97757]" />
              </div>
              <span className="text-sm text-[#A0A0A0] font-medium">macOS</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-normal tracking-tight text-[#ECECEC] mb-4 leading-[1.1] font-serif">
              Download CyberCli for Mac
            </h1>
            <p className="text-[17px] text-[#A0A0A0] max-w-xl leading-relaxed font-light">
              All of CyberCli, in one app for macOS. Works with your files and apps to get things done.
            </p>
          </ScrollReveal>
        </div>

        <ScrollReveal>
          <div className="p-8 md:p-10 rounded-3xl bg-[#ECECEC] text-[#0A0A0F] mb-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">CyberCli for Mac</h3>
                <p className="text-[14px] text-[#0A0A0F]/70 mb-1">Version 0.1.0 (latest) · Universal (Intel + Apple Silicon)</p>
                <p className="text-[12px] text-[#0A0A0F]/50">Requires macOS 12.0 or later</p>
              </div>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="px-8 py-4 rounded-xl bg-[#0A0A0F] text-white hover:bg-[#1A1A22] transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
              >
                {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {downloading ? 'Downloading...' : 'Download for Mac'}
              </button>
            </div>
            <div className="mt-6 pt-6 border-t border-[#0A0A0F]/10 flex items-center gap-2 text-[12px] text-[#0A0A0F]/50">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Signed and notarized by Apple. Scanned for malware.</span>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <h2 className="text-2xl font-serif text-[#ECECEC] mb-8">What you get</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-16">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-[#14141A] border border-white/[0.06]">
                <div className="w-6 h-6 rounded-full bg-[#D97757]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-[#D97757]" />
                </div>
                <span className="text-[14px] text-[#A0A0A0]">{f}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <h2 className="text-2xl font-serif text-[#ECECEC] mb-8">Installation steps</h2>
          <div className="space-y-4 mb-16">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-[#14141A] border border-white/[0.06]">
                <div className="w-8 h-8 rounded-full bg-[#D97757]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-[#D97757]">{s.num}</span>
                </div>
                <span className="text-[15px] text-[#ECECEC]">{s.text}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <h2 className="text-2xl font-serif text-[#ECECEC] mb-8">System requirements</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#14141A] border border-white/[0.06] flex items-center gap-4">
              <Cpu className="w-5 h-5 text-[#A0A0A0]" />
              <div>
                <p className="text-[14px] text-[#ECECEC] font-medium">Processor</p>
                <p className="text-[13px] text-[#707070]">Intel (x64) or Apple Silicon (arm64)</p>
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-[#14141A] border border-white/[0.06] flex items-center gap-4">
              <HardDrive className="w-5 h-5 text-[#A0A0A0]" />
              <div>
                <p className="text-[14px] text-[#ECECEC] font-medium">Storage</p>
                <p className="text-[13px] text-[#707070]">~300 MB free space</p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  )
}
