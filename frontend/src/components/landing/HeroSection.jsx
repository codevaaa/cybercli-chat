import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Terminal, Search, Zap, Check } from 'lucide-react'
import { CyberCliMark } from '../../components/ui/CyberCliLogo'
import { useAuthStore } from '@stores/authStore.js'
const TYPING_SPEED = 40

const HERO_COMMANDS = [
  { cmd: 'cybercli "design a highly resilient microservices architecture"', time: 2000 },
  { cmd: 'cybercli --council "audit this smart contract for reentrancy"', time: 2500 },
  { cmd: 'cybercli "build a fullstack dashboard using React and Node"', time: 3000 },
]

export default function HeroSection() {
  const [cmdIndex, setCmdIndex] = useState(0)
  const [typedText, setTypedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  useEffect(() => {
    let currentCmd = HERO_COMMANDS[cmdIndex].cmd
    let i = 0
    setIsTyping(true)
    setTypedText('')

    const typingInterval = setInterval(() => {
      if (i < currentCmd.length) {
        setTypedText(currentCmd.substring(0, i + 1))
        i++
      } else {
        clearInterval(typingInterval)
        setIsTyping(false)
        
        setTimeout(() => {
          setCmdIndex((prev) => (prev + 1) % HERO_COMMANDS.length)
        }, HERO_COMMANDS[cmdIndex].time)
      }
    }, TYPING_SPEED)

    return () => clearInterval(typingInterval)
  }, [cmdIndex])

  return (
    <div className="bg-[#0C0A09] text-white min-h-screen relative flex flex-col items-center pt-32 pb-24 overflow-hidden selection:bg-[#D97757]/30">
      
      {/* ── Background Glow ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] bg-[#D97757]/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="container-custom max-w-6xl mx-auto relative z-10 px-6">
        
        <div className="text-center mb-16 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-8"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#D97757]/30 bg-[#D97757]/10 text-[#D97757] text-sm font-medium">
              <SparkleIcon />
              <span>CyberCli Council Mode is live</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[clamp(3.5rem,8vw,7rem)] leading-[0.95] tracking-tight mb-8 font-serif"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            The premium multi-model<br/>
            <span className="text-[#D97757] italic">AI workspace</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-[#A1A1AA] max-w-2xl mx-auto mb-10 font-medium leading-relaxed"
          >
            CyberCli combines the world's most capable AI models into a unified, lightning-fast chat interface and command-line assistant.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to={useAuthStore().user ? "/chat" : "/auth/signup"}
              className="px-8 py-4 bg-[#D97757] hover:bg-[#c26549] text-white rounded-xl font-bold transition-all shadow-[0_0_30px_rgba(217,119,87,0.3)] w-full sm:w-auto"
            >
              Get Started for Free
            </Link>
            <Link
              to="/product"
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold transition-all w-full sm:w-auto text-[#e5e5e5]"
            >
              Explore CyberCoder CLI
            </Link>
          </motion.div>
        </div>

        {/* ── Terminal/App Mockup ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden border border-white/10 bg-[#121212] shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center px-4 py-3 bg-[#1A1A1A] border-b border-white/5">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
            </div>
            <div className="mx-auto flex items-center gap-2">
              <CyberCliMark size={14} />
              <span className="text-xs font-mono text-[#888888]">cybercli-agent</span>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 font-mono text-[13px] md:text-sm leading-relaxed text-[#D4D4D4] min-h-[300px]">
            <div className="flex gap-3 mb-6">
              <span className="text-emerald-400 shrink-0">➜</span>
              <span className="text-blue-400 shrink-0">~</span>
              <span className="text-white relative">
                {typedText}
                <span className={`inline-block w-2 h-4 ml-1 bg-white ${isTyping ? 'opacity-100' : 'animate-pulse'}`} />
              </span>
            </div>

            <AnimatePresence mode="wait">
              {!isTyping && (
                <motion.div
                  key={cmdIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="text-[#888888]">
                    [CyberCli Council is assembling 3 models...]
                  </div>
                  <div className="bg-white/5 border border-[#D97757]/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[#D97757] font-bold">Consensus Reached</span>
                      <span className="text-[10px] bg-[#D97757]/20 text-[#D97757] px-2 py-0.5 rounded">GPT-4o + Claude 3.5 + DeepSeek</span>
                    </div>
                    <div className="text-gray-300">
                      Executing multi-step reasoning plan...<br/>
                      <span className="text-emerald-400">✓</span> Analysis complete<br/>
                      <span className="text-emerald-400">✓</span> Architecture generated<br/>
                      <span className="text-emerald-400">✓</span> Security constraints verified
                    </div>
                  </div>
                  <div className="text-emerald-400">Done in 2.4s</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* ── Feature Highlights under Hero ── */}
      <div className="container-custom max-w-5xl mx-auto px-6 mt-32">
        <div className="grid md:grid-cols-3 gap-8 border-t border-white/5 pt-16">
          
          <div className="text-center md:text-left">
            <div className="w-12 h-12 rounded-xl bg-[#D97757]/10 flex items-center justify-center mx-auto md:mx-0 mb-6">
              <Terminal className="w-6 h-6 text-[#D97757]" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Agentic Code</h3>
            <p className="text-[#A1A1AA] leading-relaxed">
              CyberCli Code lives in your terminal. It writes files, runs tests, and fixes bugs autonomously.
            </p>
          </div>

          <div className="text-center md:text-left">
            <div className="w-12 h-12 rounded-xl bg-[#D97757]/10 flex items-center justify-center mx-auto md:mx-0 mb-6">
              <Search className="w-6 h-6 text-[#D97757]" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Deep Research</h3>
            <p className="text-[#A1A1AA] leading-relaxed">
              Search your entire codebase or the open web instantly with advanced RAG.
            </p>
          </div>

          <div className="text-center md:text-left">
            <div className="w-12 h-12 rounded-xl bg-[#D97757]/10 flex items-center justify-center mx-auto md:mx-0 mb-6">
              <Zap className="w-6 h-6 text-[#D97757]" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Council Mode</h3>
            <p className="text-[#A1A1AA] leading-relaxed">
              Force multiple AI models to debate and reach a consensus before generating complex code.
            </p>
          </div>

        </div>
      </div>

    </div>
  )
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L13.8858 9.11416L20 11L13.8858 12.8858L12 19L10.1142 12.8858L4 11L10.1142 9.11416L12 3Z" fill="currentColor" />
    </svg>
  )
}
