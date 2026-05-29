import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

const MODELS = [
  { id: 'gemini', label: 'Gemini 2.5 Flash', color: '#4285F4', emoji: '🧠', x: 50, y: 220 },
  { id: 'mistral', label: 'Mistral Large', color: '#FF7000', emoji: '⚙️', x: 250, y: 220 },
  { id: 'groq', label: 'Llama 3.3 70B', color: '#F5415F', emoji: '⚡', x: 450, y: 220 },
  { id: 'openrouter', label: 'GPT-4o Mini', color: '#10A37F', emoji: '🔬', x: 650, y: 220 },
]

const PHASES = [
  { id: 'idle', label: 'Ready' },
  { id: 'routing', label: 'Routing Prompts' },
  { id: 'executing', label: '4 Models Running' },
  { id: 'collecting', label: 'Collecting Replies' },
  { id: 'synthesizing', label: 'Synthesizing' },
  { id: 'done', label: 'Answer Ready' },
]

function Particle({ from, to, color, delay, duration = 1.5 }) {
  return (
    <motion.circle
      r="3"
      fill={color}
      initial={{ cx: from.x, cy: from.y, opacity: 0 }}
      animate={{ cx: to.x, cy: to.y, opacity: [0, 1, 1, 0] }}
      transition={{ delay, duration, ease: 'linear' }}
    />
  )
}

export default function CouncilFlowVisualization() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [phase, setPhase] = useState(0)
  const [particles, setParticles] = useState([])

  useEffect(() => {
    if (!isInView) return
    const timers = []
    const advance = (step, delay) => {
      timers.push(setTimeout(() => setPhase(step), delay))
    }

    advance(1, 800)   // routing
    advance(2, 2500)  // executing
    advance(3, 5500)  // collecting
    advance(4, 7500)  // synthesizing
    advance(5, 10500) // done
    advance(0, 13500) // reset

    return () => timers.forEach(clearTimeout)
  }, [isInView])

  // Generate particles based on phase
  useEffect(() => {
    if (phase === 1) {
      // Particles from center to 4 models
      const p = []
      MODELS.forEach((m, i) => {
        for (let j = 0; j < 4; j++) {
          p.push({ from: { x: 350, y: 80 }, to: { x: m.x, y: m.y }, color: m.color, delay: i * 0.15 + j * 0.08 })
        }
      })
      setParticles(p)
    } else if (phase === 3) {
      // Particles from models to synthesis
      const p = []
      MODELS.forEach((m, i) => {
        for (let j = 0; j < 3; j++) {
          p.push({ from: { x: m.x, y: m.y }, to: { x: 350, y: 380 }, color: m.color, delay: i * 0.2 + j * 0.1 })
        }
      })
      setParticles(p)
    } else if (phase === 5) {
      // Particles from synthesis to output
      const p = []
      for (let j = 0; j < 8; j++) {
        p.push({ from: { x: 350, y: 380 }, to: { x: 350, y: 480 }, color: '#D97757', delay: j * 0.1 })
      }
      setParticles(p)
    } else {
      setParticles([])
    }
  }, [phase])

  const currentPhase = PHASES[phase]

  return (
    <div ref={ref} className="relative w-full max-w-3xl mx-auto">
      {/* Phase indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {PHASES.map((p, i) => (
          <div key={p.id} className="flex items-center gap-1.5">
            <div 
              className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                i === phase ? 'bg-[#D97757] scale-125' : i < phase ? 'bg-[#D97757]/50' : 'bg-white/10'
              }`}
            />
            {i < PHASES.length - 1 && (
              <div className={`w-6 h-px transition-all duration-500 ${i < phase ? 'bg-[#D97757]/40' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
        <span className="ml-3 text-sm font-medium text-[#D97757]">{currentPhase.label}</span>
      </div>

      {/* SVG Visualization */}
      <div className="relative bg-[#0f0f15] rounded-2xl border border-white/[0.08] overflow-hidden">
        <svg viewBox="0 0 700 540" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
            </pattern>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect width="700" height="540" fill="url(#grid)" />

          {/* Connection lines */}
          {/* User to Router */}
          <motion.line
            x1="350" y1="40" x2="350" y2="80"
            stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="6 4"
            animate={{ strokeDashoffset: phase >= 0 ? -20 : 0 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />

          {/* Router to Models */}
          {MODELS.map((m) => (
            <motion.line
              key={`router-${m.id}`}
              x1="350" y1="80" x2={m.x} y2={m.y}
              stroke={phase >= 1 ? `${m.color}40` : 'rgba(255,255,255,0.05)'}
              strokeWidth="1.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: phase >= 1 ? 1 : 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          ))}

          {/* Models to Synthesis */}
          {MODELS.map((m) => (
            <motion.line
              key={`synth-${m.id}`}
              x1={m.x} y1={m.y} x2="350" y2="380"
              stroke={phase >= 3 ? `${m.color}40` : 'rgba(255,255,255,0.05)'}
              strokeWidth="1.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: phase >= 3 ? 1 : 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            />
          ))}

          {/* Synthesis to Output */}
          <motion.line
            x1="350" y1="380" x2="350" y2="480"
            stroke={phase >= 5 ? '#D9775760' : 'rgba(255,255,255,0.05)'}
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: phase >= 5 ? 1 : 0 }}
            transition={{ duration: 0.6 }}
          />

          {/* Particles */}
          {particles.map((p, i) => (
            <Particle key={`${phase}-${i}`} {...p} />
          ))}

          {/* USER NODE */}
          <motion.g animate={{ scale: phase >= 0 ? [1, 1.05, 1] : 1 }} transition={{ duration: 2, repeat: Infinity }}>
            <circle cx="350" cy="40" r="18" fill="#0f0f15" stroke="#D97757" strokeWidth="2" />
            <text x="350" y="45" textAnchor="middle" fill="#D97757" fontSize="14">You</text>
          </motion.g>

          {/* ROUTER NODE */}
          <motion.g
            animate={{ 
              scale: phase === 1 ? [1, 1.1, 1] : 1,
              filter: phase === 1 ? 'url(#glow)' : 'none'
            }}
            transition={{ duration: 1.5, repeat: phase === 1 ? Infinity : 0 }}
          >
            <rect x="310" y="60" width="80" height="40" rx="8" fill="#15151a" stroke={phase >= 1 ? '#D97757' : 'rgba(255,255,255,0.1)'} strokeWidth="1.5" />
            <text x="350" y="85" textAnchor="middle" fill={phase >= 1 ? '#D97757' : '#888888'} fontSize="11" fontWeight="500">Router</text>
          </motion.g>

          {/* MODEL NODES */}
          {MODELS.map((m, i) => (
            <motion.g
              key={m.id}
              animate={{ 
                scale: phase === 2 ? [1, 1.08, 1] : 1,
                filter: phase === 2 ? 'url(#glow)' : 'none'
              }}
              transition={{ duration: 1.2, repeat: phase === 2 ? Infinity : 0, delay: i * 0.15 }}
            >
              <rect 
                x={m.x - 60} y={m.y - 25} width="120" height="50" rx="10" 
                fill="#15151a" 
                stroke={phase >= 2 ? m.color : 'rgba(255,255,255,0.1)'} 
                strokeWidth="1.5"
              />
              <text x={m.x} y={m.y - 5} textAnchor="middle" fill="white" fontSize="10" fontWeight="600">{m.label}</text>
              <text x={m.x} y={m.y + 10} textAnchor="middle" fill={phase >= 2 ? m.color : '#666666'} fontSize="9">
                {phase === 2 ? 'Analyzing...' : phase >= 3 ? 'Done ✓' : 'Waiting'}
              </text>
            </motion.g>
          ))}

          {/* SYNTHESIS NODE */}
          <motion.g
            animate={{ 
              scale: phase === 4 ? [1, 1.1, 1] : 1,
              filter: phase === 4 ? 'url(#glow)' : 'none'
            }}
            transition={{ duration: 1.5, repeat: phase === 4 ? Infinity : 0 }}
          >
            <rect 
              x="280" y="360" width="140" height="40" rx="10" 
              fill="#15151a" 
              stroke={phase >= 4 ? '#D97757' : 'rgba(255,255,255,0.1)'} 
              strokeWidth="1.5"
            />
            <text x="350" y="385" textAnchor="middle" fill={phase >= 4 ? '#D97757' : '#888888'} fontSize="11" fontWeight="500">
              {phase === 4 ? 'Synthesizing...' : 'Synthesis Engine'}
            </text>
          </motion.g>

          {/* OUTPUT NODE */}
          <motion.g
            animate={{ 
              scale: phase === 5 ? [1, 1.08, 1] : 1,
              filter: phase === 5 ? 'url(#glow)' : 'none'
            }}
            transition={{ duration: 2, repeat: phase === 5 ? Infinity : 0 }}
          >
            <rect 
              x="270" y="460" width="160" height="50" rx="12" 
              fill="#15151a" 
              stroke={phase >= 5 ? '#D97757' : 'rgba(255,255,255,0.1)'} 
              strokeWidth="2"
            />
            <text x="350" y="480" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Best Combined Answer</text>
            <text x="350" y="495" textAnchor="middle" fill={phase >= 5 ? '#D97757' : '#666666'} fontSize="10">
              {phase >= 5 ? '~10 seconds total' : 'Pending...'}
            </text>
          </motion.g>
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 px-4 pb-4 text-xs text-[#888888]">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#4285F4]" /> Gemini</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#FF7000]" /> Mistral</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#F5415F]" /> Groq</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#10A37F]" /> OpenRouter</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#D97757]" /> Synthesis</span>
        </div>
      </div>
    </div>
  )
}
