/**
 * CyberCli brand logo components
 *
 * Exports:
 *   CyberCliMark      — Animated Sudarshan Chakra SVG icon (stealth geometric redesign)
 *   CyberCliWordmark  — icon + "CyberCli" text side-by-side
 *   default           — CyberCliMark
 *
 * Props:
 *   size        {number}  pixel size of the icon square (default 40)
 *   className   {string}  extra classes on the wrapper element
 */

import { motion } from 'framer-motion'

/**
 * CyberCliMark
 * Stylized, animated Sudarshan Chakra in theme-adaptive currentColor with a stealth tech aesthetic.
 */
export function CyberCliMark({ size = 40, className = '' }) {
  const s = size
  
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} logo-chakra-spin logo-chakra-entrance`}
      aria-label="CyberCli logo mark"
      role="img"
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    >
      <defs>
        {/* Radial glow for central hub */}
        <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.75" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      <style>{`
        @keyframes chakra-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes chakra-entrance {
          0%   { transform: scale(0); opacity: 0; }
          65%  { transform: scale(1.12); opacity: 1; }
          85%  { transform: scale(0.98); }
          100% { transform: scale(1); }
        }
        .logo-chakra-entrance {
          animation: chakra-entrance 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .logo-chakra-spin {
          animation: chakra-entrance 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards, chakra-rotate 28s linear 0.75s infinite;
          transform-origin: center;
        }
        .logo-chakra-spin:hover {
          animation: chakra-rotate 5s linear infinite;
        }
      `}</style>
      
      {/* Cardinal crosshair markers (radar/alignment style) */}
      <g stroke="currentColor" strokeWidth="1.2" opacity="0.35">
        <line x1="50" y1="12" x2="50" y2="28" />
        <line x1="50" y1="72" x2="50" y2="88" />
        <line x1="12" y1="50" x2="28" y2="50" />
        <line x1="72" y1="50" x2="88" y2="50" />
      </g>

      {/* Decorative dashed outer ring */}
      <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="1" strokeDasharray="3 6" opacity="0.2" />

      {/* Symmetrical concentric rings */}
      <circle cx="50" cy="50" r="36" stroke="currentColor" strokeWidth="1.5" opacity="0.15" />
      <circle cx="50" cy="50" r="26" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" opacity="0.3" />
      <circle cx="50" cy="50" r="18" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />

      {/* 8 Geometric Stealth Blades of the Sudarshan Chakra */}
      <g fill="currentColor">
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2
          
          // Tip of the blade (radius 42, slightly offset for clockwise rotation feeling)
          const angleTip = angle + 0.28
          const tipX = 50 + Math.cos(angleTip) * 42
          const tipY = 50 + Math.sin(angleTip) * 42

          // Wide outer base corner (radius 36, slightly back)
          const angleOuterCorner = angle + 0.12
          const outX = 50 + Math.cos(angleOuterCorner) * 36
          const outY = 50 + Math.sin(angleOuterCorner) * 36

          // Inner base corner (radius 18, starting angle)
          const baseX = 50 + Math.cos(angle) * 18
          const baseY = 50 + Math.sin(angle) * 18

          // Cutting edge inner corner (radius 26, clockwise direction)
          const angleCut = angle + 0.24
          const cutX = 50 + Math.cos(angleCut) * 26
          const cutY = 50 + Math.sin(angleCut) * 26

          return (
            <polygon
              key={i}
              points={`${baseX.toFixed(2)},${baseY.toFixed(2)} ${outX.toFixed(2)},${outY.toFixed(2)} ${tipX.toFixed(2)},${tipY.toFixed(2)} ${cutX.toFixed(2)},${cutY.toFixed(2)}`}
              opacity="0.85"
            />
          )
        })}
      </g>

      {/* Cardinal tiny dots representing cosmic nodes */}
      <g fill="currentColor" opacity="0.75">
        <circle cx="50" cy="8" r="1.5" />
        <circle cx="92" cy="50" r="1.5" />
        <circle cx="50" cy="92" r="1.5" />
        <circle cx="8" cy="50" r="1.5" />
      </g>

      {/* Multi-layered transparent central hub with glow */}
      {/* Radial Hub Glow */}
      <circle cx="50" cy="50" r="12" fill="url(#hubGlow)" opacity="0.4" />

      {/* Center geometric octagon representing stability */}
      <g stroke="currentColor" strokeWidth="1.2" opacity="0.8">
        {Array.from({ length: 8 }).map((_, i) => {
          const a1 = (i / 8) * Math.PI * 2
          const a2 = ((i + 1) / 8) * Math.PI * 2
          const r = 9
          const x1 = 50 + Math.cos(a1) * r
          const y1 = 50 + Math.sin(a1) * r
          const x2 = 50 + Math.cos(a2) * r
          const y2 = 50 + Math.sin(a2) * r
          return (
            <line key={i} x1={x1.toFixed(2)} y1={y1.toFixed(2)} x2={x2.toFixed(2)} y2={y2.toFixed(2)} />
          )
        })}
      </g>

      {/* Central hub core dot */}
      <circle cx="50" cy="50" r="3.5" fill="currentColor" />
    </svg>
  )
}

/**
 * CyberCliWordmark
 * Horizontal lock-up: [icon] [CyberCli text]
 * The text is set in Inter with a custom high-end styling.
 */
export function CyberCliWordmark({ size = 40, className = '', textClassName = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-3 select-none ${className}`}
      aria-label="CyberCli"
    >
      <CyberCliMark size={size} />
      <span
        className={`font-semibold tracking-tight text-foreground-primary ${textClassName}`}
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 650,
          fontSize: size * 0.66,
          letterSpacing: '-0.025em',
          lineHeight: 1,
        }}
      >
        CyberCli
      </span>
    </span>
  )
}

export default CyberCliMark
