import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Download, Monitor, Apple, Smartphone, ArrowRight, ShieldCheck, Sparkles, Server, Terminal } from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'
import SEOHead from '@components/seo/SEOHead'

export default function DownloadsPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] pt-32 pb-24 overflow-hidden relative">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-3/4 h-[500px] bg-[#D97757]/5 blur-[150px] rounded-bl-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/2 h-[400px] bg-blue-500/5 blur-[150px] rounded-tr-full pointer-events-none" />

      <div className="max-w-[1000px] mx-auto px-6 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <ScrollReveal>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#D97757] uppercase tracking-[0.15em] mb-6 px-3.5 py-1.5 rounded-full bg-[#D97757]/10 border border-[#D97757]/20">
              <Download className="w-4 h-4" />
              Apps & Integrations
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-normal tracking-tight text-[#ECECEC] mb-6 leading-[1.1] font-serif">
              CyberCoder CLI for every device
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <p className="text-[17px] md:text-lg text-[#A0A0A0] max-w-2xl mx-auto leading-relaxed font-light">
              Install CyberCoder CLI on macOS, Windows, or Linux. Code faster with 8+ AI providers directly in your terminal.
            </p>
          </ScrollReveal>
        </div>

        {/* Desktop Downloads */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <ScrollReveal delay={0.3}>
            <div className="p-8 md:p-10 rounded-3xl bg-[#14141A] border border-white/[0.06] hover:bg-[#1A1A22] transition-all duration-300 group flex flex-col h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-6 h-6 text-[#D97757]" />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-8">
                <Apple className="w-8 h-8 text-[#ECECEC]" />
              </div>
              <h2 className="text-2xl font-serif text-[#ECECEC] mb-3">Download for Mac</h2>
              <p className="text-[#A0A0A0] mb-8 flex-1 leading-relaxed">
                Native app for macOS with global keyboard shortcuts, inline access, and deeply integrated system functionality. Apple Silicon & Intel supported.
              </p>
              <button className="w-full py-3.5 rounded-xl bg-[#ECECEC] hover:bg-white text-[#0A0A0F] font-medium transition-colors flex items-center justify-center gap-2 text-[15px]">
                <Download className="w-4 h-4" />
                Download DMG
              </button>
              <p className="text-center text-[11px] text-[#707070] mt-3">Requires macOS 12.0 or later</p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.4}>
            <div className="p-8 md:p-10 rounded-3xl bg-[#14141A] border border-white/[0.06] hover:bg-[#1A1A22] transition-all duration-300 group flex flex-col h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-6 h-6 text-[#D97757]" />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-8">
                <Monitor className="w-8 h-8 text-[#ECECEC]" />
              </div>
              <h2 className="text-2xl font-serif text-[#ECECEC] mb-3">Download for Windows</h2>
              <p className="text-[#A0A0A0] mb-8 flex-1 leading-relaxed">
                Full terminal AI experience on Windows. Includes PowerShell integration, system-tray access, and native file editing.
              </p>
              <button className="w-full py-3.5 rounded-xl bg-[#1c1c24] border border-white/[0.1] hover:bg-white/[0.08] text-[#ECECEC] font-medium transition-colors flex items-center justify-center gap-2 text-[15px]">
                <Download className="w-4 h-4" />
                Download EXE
              </button>
              <p className="text-center text-[11px] text-[#707070] mt-3">Requires Windows 10 or later</p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.5}>
            <div className="p-8 md:p-10 rounded-3xl bg-[#14141A] border border-white/[0.06] hover:bg-[#1A1A22] transition-all duration-300 group flex flex-col h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-6 h-6 text-[#D97757]" />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-8">
                <Terminal className="w-8 h-8 text-[#ECECEC]" />
              </div>
              <h2 className="text-2xl font-serif text-[#ECECEC] mb-3">Download for Linux</h2>
              <p className="text-[#A0A0A0] mb-8 flex-1 leading-relaxed">
                Native Linux support with bash/zsh/fish integration. Works on Ubuntu, Debian, Fedora, and Arch distributions.
              </p>
              <button className="w-full py-3.5 rounded-xl bg-[#1c1c24] border border-white/[0.1] hover:bg-white/[0.08] text-[#ECECEC] font-medium transition-colors flex items-center justify-center gap-2 text-[15px]">
                <Download className="w-4 h-4" />
                Download AppImage
              </button>
              <p className="text-center text-[11px] text-[#707070] mt-3">Requires Ubuntu 20.04+ or equivalent</p>
            </div>
          </ScrollReveal>
        </div>

        {/* Mobile App & CLI Section */}
        <div className="grid md:grid-cols-2 gap-6">
          <ScrollReveal delay={0.5}>
            <div className="p-8 rounded-3xl bg-gradient-to-br from-[#14141A] to-[#0A0A0F] border border-white/[0.06] flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-[#D97757]/10 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-6 h-6 text-[#D97757]" />
              </div>
              <div>
                <h3 className="text-lg font-serif text-[#ECECEC] mb-1">CyberCli for iOS & Android</h3>
                <p className="text-[13px] text-[#A0A0A0] mb-3">Take the smartest AI on the go. Coming Fall 2024.</p>
                <button className="text-[13px] font-medium text-[#D97757] hover:text-[#C4613A] transition-colors flex items-center gap-1">
                  Join Waitlist <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.6}>
            <div className="p-8 rounded-3xl bg-gradient-to-br from-[#14141A] to-[#0A0A0F] border border-white/[0.06] flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Server className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-serif text-[#ECECEC] mb-1">CyberCoder CLI</h3>
                <p className="text-[13px] text-[#A0A0A0] mb-3">The fastest way to install. Works on all platforms with Node.js 20+.</p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0A0A0F] border border-white/[0.08]">
                  <code className="text-[12px] text-blue-300 font-mono">npm i -g @cybermind/cli</code>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Security badge */}
        <ScrollReveal delay={0.7}>
          <div className="mt-16 flex items-center justify-center gap-2 text-[#707070] text-[13px]">
            <ShieldCheck className="w-4 h-4" />
            <span>All downloads are signed and notarized for your security.</span>
          </div>
        </ScrollReveal>

      </div>
    </div>
  )
}
