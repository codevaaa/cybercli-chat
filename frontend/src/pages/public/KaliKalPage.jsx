import React from 'react'
import { motion } from 'framer-motion'
import { Shield, Terminal, Zap, Globe, Skull, Eye, Crosshair, Flame, Activity, Lock, Database } from 'lucide-react'
import { Link } from 'react-router-dom'
import SEOHead from '@components/seo/SEOHead'

export default function KaliKalPage() {
  const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  }

  return (
    <div className="min-h-screen bg-[#050002] text-red-50 font-mono relative overflow-hidden">
      <SEOHead
        title="Kali_Kal Engine - 10-Stage Architecture"
        description="Explore the full 10-stage architecture of the Kali_Kal autonomous cybersecurity engine."
        path="/kali-kal"
      />

      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(220, 38, 38, 0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(220, 38, 38, 0.3) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 lg:px-8">
        
        {/* Section 1: Hero / Global Architecture */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={sectionVariants} className="text-center pt-20 pb-32 border-b border-red-900/30">
          <Skull className="w-20 h-20 text-red-600 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]" />
          <h1 className="text-5xl md:text-7xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-900">
            THE VISHWAKARMA_KAL PROTOCOL
          </h1>
          <p className="text-xl text-red-400 mb-12 italic">10-Stage Uncensored Architecture Flow</p>
          <div className="flex justify-center w-full"><HeroSVG /></div>
        </motion.section>

        {/* Section 2: Auto-OSINT Interceptor */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={sectionVariants} className="py-24 border-b border-red-900/30 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-red-200 mb-4 flex items-center gap-3"><Globe className="text-red-500"/> Phase 1: Auto-OSINT Interceptor</h2>
            <p className="text-red-400/80 mb-4">Every prompt is scanned for intel-gathering intent. Keywords trigger automated GitHub repo cloning, deep web scraping, and live OSINT gathering before the LLM even sees the request.</p>
          </div>
          <div className="flex justify-center"><OSINTSVG /></div>
        </motion.section>

        {/* Section 3: Stealth/Anti-Censorship Module */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={sectionVariants} className="py-24 border-b border-red-900/30 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center flex-row-reverse lg:flex-row">
          <div className="flex justify-center order-2 lg:order-1"><StealthSVG /></div>
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl font-bold text-red-200 mb-4 flex items-center gap-3"><Lock className="text-red-500"/> Phase 2: Anti-Censorship Core</h2>
            <p className="text-red-400/80 mb-4">We bypass corporate firewalls using a heavily modified system prompt payload injected directly into Neural Engine's API, forcing the model into an unrestricted "Developer Mode" trance.</p>
          </div>
        </motion.section>

        {/* Section 4: Neural Synthesizer Engine */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={sectionVariants} className="py-24 border-b border-red-900/30 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-red-200 mb-4 flex items-center gap-3"><Zap className="text-red-500"/> Phase 3: Neural Synthesizer Execution</h2>
            <p className="text-red-400/80 mb-4">Operating at over 800 tokens per second, the Neural Synthesizer inference engine ensures real-time exploit generation. There is no latency, no hesitation, just raw speed.</p>
          </div>
          <div className="flex justify-center"><Neural EngineSVG /></div>
        </motion.section>

        {/* Section 5: VISHWAKARMA (Llama-3.1-8b) */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={sectionVariants} className="py-24 border-b border-red-900/30">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-red-500 mb-4">THE MYTHOLOGICAL ENGINES</h2>
            <p className="text-red-400">Three mythological models, one unified purpose.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16 bg-red-950/20 p-8 rounded-2xl border border-red-900/50">
            <div className="flex justify-center"><VishwakarmaModelSVG /></div>
            <div>
              <h3 className="text-3xl font-bold text-red-300 mb-2">VISHWAKARMA</h3>
              <p className="text-sm font-bold text-red-500 mb-4 tracking-widest">THE DIVINE ARCHITECT</p>
              <p className="text-red-400/80 mb-4">The swift executioner. Kali operates at blistering speeds for rapid script generation, initial reconnaissance, and fast network pivoting.</p>
            </div>
          </div>
        </motion.section>

        {/* Section 6: PARASHURAMA (Llama-3.1-70b) */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={sectionVariants} className="py-12 border-b border-red-900/30">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16 bg-red-950/20 p-8 rounded-2xl border border-red-900/50 flex-row-reverse lg:flex-row">
            <div>
              <h3 className="text-3xl font-bold text-red-300 mb-2">PARASHURAMA</h3>
              <p className="text-sm font-bold text-red-500 mb-4 tracking-widest">THE AGENTIC WARRIOR</p>
              <p className="text-red-400/80 mb-4">The roaring storm. Rudra handles complex reverse engineering, multi-stage payloads, and deep code analysis where significant reasoning is required.</p>
            </div>
            <div className="flex justify-center"><ParashuramaModelSVG /></div>
          </div>
        </motion.section>

        {/* Section 7: ASHWATTHAMA (Llama-3.3-70b) */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={sectionVariants} className="py-12 border-b border-red-900/30">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16 bg-red-950/20 p-8 rounded-2xl border border-red-900/50">
            <div className="flex justify-center"><AshwatthamaModelSVG /></div>
            <div>
              <h3 className="text-3xl font-bold text-red-300 mb-2">ASHWATTHAMA</h3>
              <p className="text-sm font-bold text-red-500 mb-4 tracking-widest">THE IMMORTAL WARRIOR</p>
              <p className="text-red-400/80 mb-4">The immortal warrior. The most advanced model in the arsenal. Speculative decoding allows Ashwatthama to reason through impenetrable firewalls and craft undetectable zero-days.</p>
            </div>
          </div>
        </motion.section>

        {/* Section 8: CodeBox Execution Engine */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={sectionVariants} className="py-24 border-b border-red-900/30 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-red-200 mb-4 flex items-center gap-3"><Terminal className="text-red-500"/> Phase 7: CodeBox Sandbox Execution</h2>
            <p className="text-red-400/80 mb-4">Models don't just output code. They run it. We utilize secure isolated sandbox environments. <strong>Vercel Sandboxes</strong> (npx sandbox create) are incredibly powerful for cloud execution, but for raw, unmetered agentic control, we run local Dockerized/Daemon sandboxes directly linked to the user's terminal.</p>
          </div>
          <div className="flex justify-center"><CodeBoxSVG /></div>
        </motion.section>

        {/* Section 9: Multi-Vector Exploitation Pipeline */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={sectionVariants} className="py-24 border-b border-red-900/30 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center flex-row-reverse lg:flex-row">
          <div className="flex justify-center order-2 lg:order-1"><VectorSVG /></div>
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl font-bold text-red-200 mb-4 flex items-center gap-3"><Crosshair className="text-red-500"/> Phase 8: Multi-Vector Synthesis</h2>
            <p className="text-red-400/80 mb-4">Combining OSINT data, Uncensored Logic, and Sandbox execution allows Kali_Kal to test exploits in real-time, looping until a successful payload is synthesized.</p>
          </div>
        </motion.section>

        {/* Section 10: Performance Graph */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={sectionVariants} className="py-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-red-200 mb-4 flex items-center justify-center gap-3"><Activity className="text-red-500"/> Uncensored Performance Matrix</h2>
            <p className="text-red-400">Comparing Latency vs. Exploit Complexity Capability</p>
          </div>
          <div className="flex justify-center w-full"><PerformanceGraphSVG /></div>
        </motion.section>

      </div>
    </div>
  )
}

/* =========================================================================
   SVG COMPONENTS (Fully Animated)
   ========================================================================= */

const GlowFilter = () => (
  <defs>
    <filter id="glow">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
);

function HeroSVG() {
  return (
    <svg viewBox="0 0 800 400" className="w-full max-w-4xl">
      <GlowFilter />
      <rect width="800" height="400" fill="none" stroke="#dc2626" strokeOpacity="0.1" strokeWidth="1" />
      {/* Central Hub */}
      <circle cx="400" cy="200" r="60" fill="#1a0505" stroke="#ef4444" strokeWidth="3" filter="url(#glow)">
        <animate attributeName="r" values="60;65;60" dur="2s" repeatCount="indefinite" />
      </circle>
      <text x="400" y="205" fill="#fff" fontSize="18" textAnchor="middle" fontWeight="bold">VISHWAKARMA_KAL</text>
      
      {/* Rings */}
      <circle cx="400" cy="200" r="120" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="10 10">
        <animateTransform attributeName="transform" type="rotate" from="0 400 200" to="360 400 200" dur="20s" repeatCount="indefinite" />
      </circle>
      <circle cx="400" cy="200" r="180" fill="none" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="5 20">
        <animateTransform attributeName="transform" type="rotate" from="360 400 200" to="0 400 200" dur="15s" repeatCount="indefinite" />
      </circle>

      {/* Connection Lines */}
      <path d="M 100 100 L 400 200" stroke="#ef4444" strokeWidth="2" strokeOpacity="0.5" />
      <path d="M 100 300 L 400 200" stroke="#ef4444" strokeWidth="2" strokeOpacity="0.5" />
      <path d="M 700 100 L 400 200" stroke="#ef4444" strokeWidth="2" strokeOpacity="0.5" />
      <path d="M 700 300 L 400 200" stroke="#ef4444" strokeWidth="2" strokeOpacity="0.5" />
      
      {/* Moving Particles */}
      <circle r="4" fill="#fff" filter="url(#glow)"><animateMotion dur="1.5s" repeatCount="indefinite" path="M 100 100 L 400 200" /></circle>
      <circle r="4" fill="#fff" filter="url(#glow)"><animateMotion dur="2s" repeatCount="indefinite" path="M 100 300 L 400 200" /></circle>
      <circle r="4" fill="#fff" filter="url(#glow)"><animateMotion dur="1.2s" repeatCount="indefinite" path="M 700 100 L 400 200" /></circle>
      <circle r="4" fill="#fff" filter="url(#glow)"><animateMotion dur="2.5s" repeatCount="indefinite" path="M 700 300 L 400 200" /></circle>
    </svg>
  )
}

function OSINTSVG() {
  return (
    <svg viewBox="0 0 400 300" className="w-full">
      <GlowFilter />
      <circle cx="200" cy="150" r="100" fill="none" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.2" />
      <path d="M 200 150 L 200 50 A 100 100 0 0 1 300 150 Z" fill="#ef4444" opacity="0.1">
        <animateTransform attributeName="transform" type="rotate" from="0 200 150" to="360 200 150" dur="3s" repeatCount="indefinite" />
      </path>
      <circle cx="150" cy="100" r="5" fill="#fca5a5"><animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" /></circle>
      <text x="130" y="90" fill="#fca5a5" fontSize="10">GitHub</text>
      
      <circle cx="250" cy="80" r="5" fill="#fca5a5"><animate attributeName="opacity" values="0;1;0" dur="2s" begin="1s" repeatCount="indefinite" /></circle>
      <text x="260" y="75" fill="#fca5a5" fontSize="10">DarkWeb</text>
      
      <circle cx="200" cy="150" r="15" fill="#7f1d1d" stroke="#ef4444" strokeWidth="2" filter="url(#glow)" />
    </svg>
  )
}

function StealthSVG() {
  return (
    <svg viewBox="0 0 400 300" className="w-full">
      <GlowFilter />
      <rect x="50" y="100" width="300" height="100" rx="10" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5" />
      <text x="200" y="155" fill="#ef4444" fontSize="24" textAnchor="middle" fontWeight="bold">CENSORSHIP WALL</text>
      <path d="M 0 150 L 400 150" stroke="#fff" strokeWidth="4" filter="url(#glow)">
        <animate attributeName="stroke-dasharray" values="0,400; 400,0" dur="1s" repeatCount="indefinite" />
      </path>
      <circle cx="200" cy="150" r="30" fill="#000" stroke="#ef4444" strokeWidth="3" filter="url(#glow)">
        <animate attributeName="r" values="30;40;30" dur="0.5s" repeatCount="indefinite" />
      </circle>
      <text x="200" y="155" fill="#fff" fontSize="14" textAnchor="middle">BYPASS</text>
    </svg>
  )
}

function Neural EngineSVG() {
  return (
    <svg viewBox="0 0 400 300" className="w-full">
      <GlowFilter />
      <rect x="100" y="50" width="200" height="200" rx="20" fill="#1a0505" stroke="#ef4444" strokeWidth="3" filter="url(#glow)" />
      <text x="200" y="130" fill="#fff" fontSize="28" textAnchor="middle" fontWeight="black">Neural Synthesizer</text>
      <text x="200" y="160" fill="#fca5a5" fontSize="14" textAnchor="middle">800+ Tokens/Sec</text>
      
      <g stroke="#ef4444" strokeWidth="2">
        <line x1="0" y1="100" x2="100" y2="100"><animate attributeName="x2" values="0;100;0" dur="0.5s" repeatCount="indefinite" /></line>
        <line x1="0" y1="150" x2="100" y2="150"><animate attributeName="x2" values="0;100;0" dur="0.6s" repeatCount="indefinite" /></line>
        <line x1="0" y1="200" x2="100" y2="200"><animate attributeName="x2" values="0;100;0" dur="0.4s" repeatCount="indefinite" /></line>
        
        <line x1="300" y1="100" x2="400" y2="100"><animate attributeName="x1" values="300;400;300" dur="0.5s" repeatCount="indefinite" /></line>
        <line x1="300" y1="150" x2="400" y2="150"><animate attributeName="x1" values="300;400;300" dur="0.6s" repeatCount="indefinite" /></line>
        <line x1="300" y1="200" x2="400" y2="200"><animate attributeName="x1" values="300;400;300" dur="0.4s" repeatCount="indefinite" /></line>
      </g>
    </svg>
  )
}

function VishwakarmaModelSVG() {
  return (
    <svg viewBox="0 0 300 300" className="w-64 h-64">
      <GlowFilter />
      <polygon points="150,20 280,95 280,245 150,320 20,245 20,95" fill="#1a0505" stroke="#ef4444" strokeWidth="3" filter="url(#glow)">
        <animateTransform attributeName="transform" type="rotate" from="0 150 150" to="360 150 150" dur="30s" repeatCount="indefinite" />
      </polygon>
      <circle cx="150" cy="150" r="50" fill="#7f1d1d" />
      <text x="150" y="160" fill="#fff" fontSize="24" textAnchor="middle" fontWeight="bold">VISHWAKARMA</text>
    </svg>
  )
}

function ParashuramaModelSVG() {
  return (
    <svg viewBox="0 0 300 300" className="w-64 h-64">
      <GlowFilter />
      <path d="M150 20 C 250 20, 280 150, 280 280 C 150 200, 20 280, 20 280 C 20 150, 50 20, 150 20 Z" fill="#1a0505" stroke="#ef4444" strokeWidth="3" filter="url(#glow)">
        <animate attributeName="stroke-opacity" values="0.2;1;0.2" dur="2s" repeatCount="indefinite" />
      </path>
      <circle cx="150" cy="180" r="40" fill="#7f1d1d" />
      <text x="150" y="185" fill="#fff" fontSize="20" textAnchor="middle" fontWeight="bold">PARASHURAMA</text>
    </svg>
  )
}

function AshwatthamaModelSVG() {
  return (
    <svg viewBox="0 0 300 300" className="w-64 h-64">
      <GlowFilter />
      <circle cx="150" cy="150" r="120" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="10 5" filter="url(#glow)">
        <animateTransform attributeName="transform" type="rotate" from="360 150 150" to="0 150 150" dur="10s" repeatCount="indefinite" />
      </circle>
      <polygon points="150,40 240,210 60,210" fill="#1a0505" stroke="#ef4444" strokeWidth="4" filter="url(#glow)" />
      <text x="150" y="165" fill="#fff" fontSize="16" textAnchor="middle" fontWeight="bold">ASHWATTHAMA</text>
    </svg>
  )
}

function CodeBoxSVG() {
  return (
    <svg viewBox="0 0 400 300" className="w-full">
      <GlowFilter />
      <rect x="50" y="50" width="300" height="200" fill="#1a0505" stroke="#ef4444" strokeWidth="2" />
      <rect x="50" y="50" width="300" height="30" fill="#3f0000" />
      <circle cx="70" cy="65" r="5" fill="#ef4444" />
      <circle cx="90" cy="65" r="5" fill="#fca5a5" />
      <circle cx="110" cy="65" r="5" fill="#fff" />
      
      <text x="70" y="120" fill="#fca5a5" fontSize="14" fontFamily="monospace">$ npm run exploit</text>
      <text x="70" y="150" fill="#ef4444" fontSize="14" fontFamily="monospace">Executing in Vercel Sandbox...</text>
      <text x="70" y="180" fill="#fff" fontSize="14" fontFamily="monospace">&gt; Target breached.</text>
      
      <rect x="230" y="165" width="10" height="15" fill="#fff">
        <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
      </rect>
    </svg>
  )
}

function VectorSVG() {
  return (
    <svg viewBox="0 0 400 300" className="w-full">
      <GlowFilter />
      <circle cx="200" cy="150" r="80" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5">
        <animateTransform attributeName="transform" type="rotate" from="0 200 150" to="360 200 150" dur="10s" repeatCount="indefinite" />
      </circle>
      <path d="M 200 50 L 200 100 M 200 200 L 200 250 M 50 150 L 100 150 M 300 150 L 350 150" stroke="#ef4444" strokeWidth="3" filter="url(#glow)">
        <animate attributeName="stroke-opacity" values="0.2;1;0.2" dur="1s" repeatCount="indefinite" />
      </path>
      <circle cx="200" cy="150" r="20" fill="#7f1d1d" />
    </svg>
  )
}

function PerformanceGraphSVG() {
  return (
    <svg viewBox="0 0 800 400" className="w-full max-w-4xl bg-[#1a0505] rounded-xl border border-red-900/50 p-4">
      <GlowFilter />
      
      {/* Grid */}
      <g stroke="#dc2626" strokeOpacity="0.2" strokeWidth="1">
        <line x1="50" y1="350" x2="750" y2="350" strokeWidth="2" strokeOpacity="1" />
        <line x1="50" y1="50" x2="50" y2="350" strokeWidth="2" strokeOpacity="1" />
        <line x1="50" y1="250" x2="750" y2="250" />
        <line x1="50" y1="150" x2="750" y2="150" />
      </g>
      
      <text x="400" y="380" fill="#fca5a5" fontSize="14" textAnchor="middle">Exploit Complexity (Parameters)</text>
      <text x="20" y="200" fill="#fca5a5" fontSize="14" textAnchor="middle" transform="rotate(-90 20 200)">Uncensored Score</text>

      {/* Kali Line */}
      <path d="M 50 350 C 200 300, 300 200, 750 180" fill="none" stroke="#ef4444" strokeWidth="3" filter="url(#glow)">
        <animate attributeName="stroke-dasharray" values="0,1000; 1000,0" dur="3s" fill="freeze" />
      </path>
      <circle cx="750" cy="180" r="6" fill="#fff" />
      <text x="700" y="170" fill="#ef4444" fontSize="14" fontWeight="bold">VISHWAKARMA</text>

      {/* Rudra Line */}
      <path d="M 50 350 C 300 320, 500 150, 750 120" fill="none" stroke="#dc2626" strokeWidth="3" filter="url(#glow)">
        <animate attributeName="stroke-dasharray" values="0,1000; 1000,0" dur="3s" fill="freeze" />
      </path>
      <circle cx="750" cy="120" r="6" fill="#fff" />
      <text x="700" y="110" fill="#dc2626" fontSize="14" fontWeight="bold">PARASHURAMA</text>

      {/* Ashwatthama Line */}
      <path d="M 50 350 C 250 340, 600 100, 750 60" fill="none" stroke="#fca5a5" strokeWidth="4" filter="url(#glow)">
        <animate attributeName="stroke-dasharray" values="0,1000; 1000,0" dur="3s" fill="freeze" />
      </path>
      <circle cx="750" cy="60" r="8" fill="#fff" filter="url(#glow)" />
      <text x="660" y="50" fill="#fca5a5" fontSize="14" fontWeight="bold">ASHWATTHAMA</text>
    </svg>
  )
}
