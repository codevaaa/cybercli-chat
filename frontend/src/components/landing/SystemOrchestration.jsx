import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Monitor, Terminal, Globe, Cpu, RefreshCw, Zap, Server, Shield } from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'

const NODES = [
  {
    id: 'web',
    name: 'Web Chat Interface',
    tech: 'React 19 + Vite',
    desc: 'High-fidelity browser interface featuring dynamic tsParticles, interactive chat channels, and realtime voice streaming via Gemini Flash.',
    icon: Globe,
    color: '#7C3AED',
    x: 120,
    y: 120,
  },
  {
    id: 'desktop',
    name: 'Electron App',
    tech: 'Electron + HTML5',
    desc: 'Desktop workspace integration with offline configuration, native local-daemon WebSockets, session persistence, and secure credential caching.',
    icon: Monitor,
    color: '#D97757',
    x: 120,
    y: 360,
  },
  {
    id: 'cli',
    name: 'CyberCoder CLI',
    tech: 'React + Ink + Node',
    desc: 'A Claude-Code-class command line developer terminal equipped with multi-line prompts, automated tool approval, and session history.',
    icon: Terminal,
    color: '#06B6D4',
    x: 580,
    y: 240,
  },
]

export default function SystemOrchestration() {
  const [activeNode, setActiveNode] = useState(null)
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => (p + 1) % 4)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="py-16 bg-gradient-to-b from-[#07070a] to-[#0A0A0F] border-t border-b border-white/[0.04]">
      <div className="container-custom">
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-accent mb-3 block">Neural Architecture</span>
            <h2 className="text-4xl md:text-5xl font-serif font-light text-foreground-primary mb-6">
              Unified System <span className="text-gradient-accent italic">Orchestration</span>
            </h2>
            <p className="text-sm md:text-base text-foreground-muted leading-relaxed">
              Explore how Codeva merges Web, Desktop, and CLI experiences. Tap or hover on each node of the diagram to inspect its role in our 3D-lit intelligence framework.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid lg:grid-cols-5 gap-12 items-center">
          {/* Left — Dynamic Inspector Panel */}
          <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
            <ScrollReveal direction="right">
              <div className="card-glass p-8 min-h-[300px] flex flex-col justify-between border border-white/[0.05] relative overflow-hidden group">
                {/* Background Accent glow */}
                <div 
                  className="absolute -right-24 -bottom-24 w-48 h-48 rounded-full blur-[80px] opacity-10 transition-all duration-500" 
                  style={{ backgroundColor: activeNode ? NODES.find(n => n.id === activeNode)?.color : '#7C3AED' }}
                />
                
                {activeNode ? (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300"
                        style={{ 
                          backgroundColor: `${NODES.find(n => n.id === activeNode)?.color}10`, 
                          borderColor: `${NODES.find(n => n.id === activeNode)?.color}40`,
                        }}
                      >
                        {(() => {
                          const IconComponent = NODES.find(n => n.id === activeNode)?.icon
                          return IconComponent ? <IconComponent className="w-6 h-6 animate-pulse" style={{ color: NODES.find(n => n.id === activeNode)?.color }} /> : null
                        })()}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white leading-tight">
                          {NODES.find(n => n.id === activeNode)?.name}
                        </h4>
                        <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                          {NODES.find(n => n.id === activeNode)?.tech}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-foreground-secondary leading-relaxed pt-2">
                      {NODES.find(n => n.id === activeNode)?.desc}
                    </p>

                    <div className="pt-4 flex flex-wrap gap-2">
                      {activeNode === 'web' && (
                        <>
                          <span className="text-[10px] bg-white/[0.03] border border-white/[0.06] px-2 py-1 rounded text-gray-400">Gemini Voice Core</span>
                          <span className="text-[10px] bg-white/[0.03] border border-white/[0.06] px-2 py-1 rounded text-gray-400">tsParticles UI</span>
                          <span className="text-[10px] bg-white/[0.03] border border-white/[0.06] px-2 py-1 rounded text-gray-400">Consensus Engine</span>
                        </>
                      )}
                      {activeNode === 'desktop' && (
                        <>
                          <span className="text-[10px] bg-white/[0.03] border border-white/[0.06] px-2 py-1 rounded text-gray-400">Native IPC Daemon</span>
                          <span className="text-[10px] bg-white/[0.03] border border-white/[0.06] px-2 py-1 rounded text-gray-400">SQLite Vault</span>
                          <span className="text-[10px] bg-white/[0.03] border border-white/[0.06] px-2 py-1 rounded text-gray-400">Auto-Update Ring</span>
                        </>
                      )}
                      {activeNode === 'cli' && (
                        <>
                          <span className="text-[10px] bg-white/[0.03] border border-white/[0.06] px-2 py-1 rounded text-gray-400">Autopilot Tools</span>
                          <span className="text-[10px] bg-white/[0.03] border border-white/[0.06] px-2 py-1 rounded text-gray-400">Interactive Diff</span>
                          <span className="text-[10px] bg-white/[0.03] border border-white/[0.06] px-2 py-1 rounded text-gray-400">Secure AES Vault</span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 my-auto text-center py-8">
                    <Cpu className="w-10 h-10 text-accent/50 mx-auto animate-spin" style={{ animationDuration: '6s' }} />
                    <h4 className="text-lg font-bold text-white">System Inspector</h4>
                    <p className="text-xs text-foreground-muted max-w-xs mx-auto leading-relaxed">
                      Select or hover over any node in the orchestration cluster diagram to inspect details.
                    </p>
                  </div>
                )}

                {/* Footer Info */}
                <div className="border-t border-white/[0.04] pt-4 mt-6 flex items-center justify-between text-xs text-foreground-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Secure Link
                  </span>
                  <span className="font-mono text-[10px] tracking-wider text-accent uppercase">
                    Cluster Status: ACTIVE
                  </span>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Right — 3D Lit Animated SVG Diagram */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <ScrollReveal direction="left">
              <div className="relative bg-[#09090e] rounded-3xl border border-white/[0.05] p-6 overflow-hidden">
                {/* SVG */}
                <svg viewBox="0 0 700 480" className="w-full h-auto drop-shadow-2xl">
                  {/* Grid Defs and Glowing Filters */}
                  <defs>
                    <pattern id="diagonal-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 30 M 0 0 L 30 30" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="0.5"/>
                    </pattern>
                    <filter id="glow-3d" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <linearGradient id="gateway-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#7C3AED" />
                      <stop offset="50%" stopColor="#D97757" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Background */}
                  <rect width="700" height="480" fill="url(#diagonal-grid)" />

                  {/* Connecting lines */}
                  {NODES.map(node => {
                    const isActive = activeNode === node.id
                    return (
                      <g key={`link-${node.id}`}>
                        {/* Shadow path (glowing) */}
                        <motion.line
                          x1={node.x} y1={node.y} x2="350" y2="240"
                          stroke={node.color}
                          strokeWidth={isActive ? 6 : 2}
                          strokeOpacity={isActive ? 0.35 : 0.08}
                          filter="url(#glow-3d)"
                          animate={{ strokeWidth: isActive ? [6, 9, 6] : 2 }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        {/* Main path */}
                        <line
                          x1={node.x} y1={node.y} x2="350" y2="240"
                          stroke={node.color}
                          strokeWidth="1.5"
                          strokeOpacity={isActive ? 0.8 : 0.25}
                        />
                      </g>
                    )
                  })}

                  {/* Animated Data Packets (flowing to gateway) */}
                  <motion.circle
                    r="4" fill="#7C3AED" filter="url(#glow-3d)"
                    initial={{ cx: 120, cy: 120, opacity: 0 }}
                    animate={{ cx: [120, 350], cy: [120, 240], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.circle
                    r="4" fill="#D97757" filter="url(#glow-3d)"
                    initial={{ cx: 120, cy: 360, opacity: 0 }}
                    animate={{ cx: [120, 350], cy: [360, 240], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                  />
                  <motion.circle
                    r="4" fill="#06B6D4" filter="url(#glow-3d)"
                    initial={{ cx: 580, cy: 240, opacity: 0 }}
                    animate={{ cx: [580, 350], cy: [240, 240], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                  />

                  {/* Bi-directional feedback packets (flowing back to clients) */}
                  <motion.circle
                    r="3.5" fill="#FFFFFF" filter="url(#glow-3d)"
                    initial={{ cx: 350, cy: 240, opacity: 0 }}
                    animate={{ cx: [350, 120], cy: [240, 120], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 1.1 }}
                  />
                  <motion.circle
                    r="3.5" fill="#FFFFFF" filter="url(#glow-3d)"
                    initial={{ cx: 350, cy: 240, opacity: 0 }}
                    animate={{ cx: [350, 120], cy: [240, 360], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 1.9 }}
                  />
                  <motion.circle
                    r="3.5" fill="#FFFFFF" filter="url(#glow-3d)"
                    initial={{ cx: 350, cy: 240, opacity: 0 }}
                    animate={{ cx: [350, 580], cy: [240, 240], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut', delay: 1.4 }}
                  />

                  {/* CENTRAL GATEWAY NODE */}
                  <g>
                    {/* Glowing ring */}
                    <circle cx="350" cy="240" r="45" fill="none" stroke="url(#gateway-grad)" strokeWidth="1.5" strokeDasharray="5 3" />
                    <motion.circle
                      cx="350" cy="240" r="45" fill="none" stroke="url(#gateway-grad)" strokeWidth="3"
                      filter="url(#glow-3d)" strokeOpacity="0.4"
                      animate={{ scale: [1, 1.08, 1], rotate: 360 }}
                      transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                    />
                    {/* Inner core */}
                    <circle cx="350" cy="240" r="34" fill="#0f0f15" stroke="url(#gateway-grad)" strokeWidth="2.5" />
                    <Server className="w-7 h-7 text-white" x="336" y="226" />
                  </g>

                  {/* NODES GRAPHICS */}
                  {NODES.map(node => {
                    const IconComponent = node.icon
                    const isActive = activeNode === node.id
                    return (
                      <g 
                        key={node.id} 
                        className="cursor-pointer"
                        onMouseEnter={() => setActiveNode(node.id)}
                        onMouseLeave={() => setActiveNode(null)}
                        onClick={() => setActiveNode(node.id)}
                      >
                        {/* Glowing shadow circle */}
                        <motion.circle
                          cx={node.x} cy={node.y} r="38"
                          fill="none" stroke={node.color} strokeWidth={isActive ? 3 : 1}
                          strokeOpacity={isActive ? 0.7 : 0.25}
                          filter={isActive ? 'url(#glow-3d)' : 'none'}
                          animate={{ r: isActive ? [38, 42, 38] : 38 }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        {/* Outer plate */}
                        <circle cx={node.x} cy={node.y} r="34" fill="#111118" stroke={isActive ? node.color : 'rgba(255,255,255,0.06)'} strokeWidth="2" />
                        {/* Inner icon plate */}
                        <circle cx={node.x} cy={node.y} r="26" fill="#09090e" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                        {/* Icon */}
                        {IconComponent && (
                          <IconComponent 
                            className="w-7 h-7 transition-colors duration-300"
                            style={{ color: isActive ? node.color : '#888888' }}
                            x={node.x - 14} y={node.y - 14}
                          />
                        )}
                        {/* Text Label */}
                        <text
                          x={node.x} y={node.y + 55}
                          textAnchor="middle"
                          fill={isActive ? 'white' : '#888888'}
                          fontSize="11"
                          fontWeight={isActive ? '600' : '500'}
                          className="transition-colors duration-300"
                        >
                          {node.id === 'cli' ? 'CyberCoder CLI' : node.id === 'web' ? 'Web Client' : 'Electron App'}
                        </text>
                      </g>
                    )
                  })}
                </svg>

                {/* Subtext info */}
                <div className="absolute top-4 left-4 bg-black/40 border border-white/[0.04] px-3 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-accent animate-pulse" />
                  <span className="text-[10px] text-white font-mono uppercase tracking-wider">AES-256 E2EE Link Mapped</span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </div>
  )
}
