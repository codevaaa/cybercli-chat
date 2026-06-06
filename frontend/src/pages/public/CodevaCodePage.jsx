import { motion } from 'framer-motion'
import { Terminal, Code2, Zap, ArrowRight, Check, ChevronDown, Monitor, FileCode, Cpu, Search, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { CodevaMark } from '../../components/ui/CodevaLogo'
import SEOHead, { StructuredData } from '@components/seo/SEOHead'
import { Tooltip } from '@components/ui/Tooltip'

const FEATURES = [
  {
    title: 'Edits files and architecture',
    desc: 'Codeva can write and edit code across multiple files, manage complex architectural changes, and directly execute commands in your terminal.',
    icon: FileCode
  },
  {
    title: 'Answers questions about your code',
    desc: 'Powered by advanced RAG capabilities, Codeva instantly searches your entire codebase to explain logic, find bugs, or summarize project structure.',
    icon: Search
  },
  {
    title: 'Executes builds and tests',
    desc: 'Codeva autonomously runs builds, linters, and tests. If it encounters a bug, it seamlessly debugs and fixes the error without breaking your flow.',
    icon: Monitor
  }
]

const FAQS = [
  {
    q: 'What is Codeva Code?',
    a: 'Codeva Code is an agentic coding assistant that lives in your terminal. It understands your codebase, writes code, runs tests, and interacts with tools using 200K+ elite models.'
  },
  {
    q: 'How does it compare to GitHub Copilot?',
    a: 'Unlike Copilot which primarily focuses on inline autocompletion, Codeva Code is an autonomous agent. You can ask it to "build a new authentication flow", and it will create files, install dependencies, and test the code across your entire repository.'
  },
  {
    q: 'Is my codebase secure?',
    a: 'Yes. Codeva operates with a zero-trust architecture. You must explicitly approve terminal commands and file operations before they are executed. Data is encrypted and models do not train on your private code by default.'
  },
  {
    q: 'Which models does it use?',
    a: 'Codeva integrates with the OpenRouter Gateway, allowing you to seamlessly switch between GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, and specialized coding models like DeepSeek Coder V2.'
  }
]

export default function CodevaCodePage() {
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <div className="min-h-screen bg-[#0C0A09] text-white selection:bg-[#D97757]/30">
      
      {/* ─── Hero Section ─── */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-[#D97757]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="container-custom max-w-5xl mx-auto text-center relative z-10">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-8"
          >
            <div className="flex items-center gap-3 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
              <CodevaMark size={20} />
              <span className="text-sm font-medium tracking-wide">Codeva Code</span>
            </div>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[clamp(3.5rem,8vw,6.5rem)] leading-[0.95] tracking-tight text-[#FAF9F7] mb-8 font-serif"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            The agentic AI <br/>
            coding assistant
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-[#A1A1AA] max-w-2xl mx-auto mb-10 font-medium"
          >
            Built for the terminal, Codeva Code empowers you to ship faster by letting AI write, test, and debug code right inside your local environment.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Tooltip content="Copy installation command">
              <button className="px-8 py-4 bg-[#D97757] hover:bg-[#c26549] text-white rounded-xl font-bold transition-all shadow-[0_0_30px_rgba(217,119,87,0.3)]">
                npm install -g codeva
              </button>
            </Tooltip>
            <Tooltip content="Read documentation">
              <Link to="/docs" className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold transition-all">
                Read the docs
              </Link>
            </Tooltip>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-sm text-[#71717A]"
          >
            Available for macOS, Linux, and Windows WSL.
          </motion.p>

        </div>
      </section>

      {/* ─── Terminal Showcase ─── */}
      <section className="py-12 px-6">
        <div className="container-custom max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#121212] shadow-2xl"
          >
            {/* Terminal Header */}
            <div className="flex items-center px-4 py-3 bg-[#1A1A1A] border-b border-white/5">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
              </div>
              <div className="mx-auto text-xs font-mono text-[#888888]">~/projects/codeva-app</div>
            </div>
            {/* Terminal Body */}
            <div className="p-6 font-mono text-sm leading-relaxed text-[#D4D4D4] overflow-x-auto">
              <div className="flex gap-3 mb-2">
                <span className="text-emerald-400">➜</span>
                <span className="text-blue-400">codeva-app</span>
                <span className="text-white">codeva "add a Stripe webhook endpoint to the backend"</span>
              </div>
              <div className="text-[#888888] mb-4">
                [Codeva is analyzing the repository...]
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
                <div className="text-orange-400 font-bold mb-2">Codeva Planner</div>
                <div>I will create a new route <span className="text-[#D97757]">src/routes/webhook.js</span> and update <span className="text-[#D97757]">server.js</span> to parse raw bodies for Stripe signature verification.</div>
              </div>

              <div className="text-[#888888] mb-2">
                <span className="text-emerald-400">✓</span> Created src/routes/webhook.js (42 lines)
              </div>
              <div className="text-[#888888] mb-4">
                <span className="text-emerald-400">✓</span> Modified server.js (+4 lines)
              </div>

              <div className="flex gap-2">
                <span className="text-[#FFBD2E]">?</span>
                <span>Run `npm run test` to verify the webhook handler? (Y/n)</span>
              </div>
              <div className="mt-1 text-white">y</div>
              
              <div className="mt-4 text-emerald-400">
                PASS tests/webhook.test.js<br/>
                Done in 1.42s
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="py-24 px-6 bg-[#09090B]">
        <div className="container-custom max-w-6xl mx-auto">
          
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-serif mb-6" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Built for <span className="text-[#D97757] italic">power users</span>
            </h2>
            <p className="text-[#A1A1AA] text-lg max-w-2xl mx-auto">
              Codeva doesn't just autocomplete code—it takes ownership of full tasks, reasoning about complex architectures autonomously.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {FEATURES.map((feat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/[0.07] transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-[#D97757]/10 flex items-center justify-center mb-6">
                  <feat.icon className="w-6 h-6 text-[#D97757]" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
                <p className="text-[#A1A1AA] leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── Comparison Section ─── */}
      <section className="py-24 px-6">
        <div className="container-custom max-w-5xl mx-auto text-center">
          
          <h2 className="text-3xl md:text-5xl font-serif mb-16" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Other assistants autocomplete.<br/>
            Codeva <span className="text-emerald-400 italic">completes</span>.
          </h2>

          <div className="grid md:grid-cols-2 gap-8 text-left">
            <div className="bg-[#121212] border border-white/10 p-8 rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <Code2 className="text-[#71717A] w-6 h-6" />
                <h3 className="text-xl font-bold text-[#A1A1AA]">Traditional AI</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex gap-3 text-[#71717A]"><Check className="shrink-0 w-5 h-5 text-[#52525B]" /> Predicts the next few words</li>
                <li className="flex gap-3 text-[#71717A]"><Check className="shrink-0 w-5 h-5 text-[#52525B]" /> Operates only within your active file</li>
                <li className="flex gap-3 text-[#71717A]"><Check className="shrink-0 w-5 h-5 text-[#52525B]" /> Needs constant manual guidance</li>
              </ul>
            </div>
            
            <div className="bg-[#D97757]/10 border border-[#D97757]/30 p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#D97757]/20 blur-3xl rounded-full" />
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <Zap className="text-[#D97757] w-6 h-6" />
                <h3 className="text-xl font-bold text-white">Codeva Code</h3>
              </div>
              <ul className="space-y-4 relative z-10">
                <li className="flex gap-3 text-white"><Check className="shrink-0 w-5 h-5 text-[#D97757]" /> Executes full multi-file engineering tasks</li>
                <li className="flex gap-3 text-white"><Check className="shrink-0 w-5 h-5 text-[#D97757]" /> Reads and understands your whole repo instantly</li>
                <li className="flex gap-3 text-white"><Check className="shrink-0 w-5 h-5 text-[#D97757]" /> Autonomously fixes errors by reading terminal output</li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      {/* ─── FAQ Section ─── */}
      <section className="py-24 px-6 bg-[#09090B] border-t border-white/5">
        <div className="container-custom max-w-3xl mx-auto">
          
          <h2 className="text-3xl md:text-5xl font-serif text-center mb-12" style={{ fontFamily: "'Instrument Serif', serif" }}>
            FAQ
          </h2>

          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-white/10 bg-[#121212] rounded-xl overflow-hidden transition-all">
                <button 
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between font-bold text-lg hover:bg-white/5"
                >
                  {faq.q}
                  <ChevronDown className={`w-5 h-5 text-[#71717A] transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <motion.div 
                  initial={false}
                  animate={{ height: openFaq === i ? 'auto' : 0, opacity: openFaq === i ? 1 : 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 text-[#A1A1AA] leading-relaxed">
                    {faq.a}
                  </div>
                </motion.div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── Bottom CTA ─── */}
      <section className="py-32 px-6 text-center border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[300px] bg-[#D97757]/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <h2 className="text-4xl md:text-6xl font-serif mb-8" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Start shipping faster.
          </h2>
          <Tooltip content="Download Codeva Code">
            <button className="px-10 py-5 bg-white text-black hover:bg-gray-200 rounded-xl font-bold text-lg transition-all">
              Get Codeva Code
            </button>
          </Tooltip>
        </div>
      </section>

    </div>
  )
}
