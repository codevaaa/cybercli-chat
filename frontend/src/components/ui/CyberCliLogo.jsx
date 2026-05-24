/**
 * CyberCli brand logo components
 *
 * Exports:
 *   CyberCliMark      — Animated Sudarshan Chakra SVG icon
 *   CyberCliWordmark  — icon + "CyberCli" text side-by-side
 *   default           — CyberCliMark
 *
 * Props:
 *   size        {number}  pixel size of the icon square  (default 28)
 *   className   {string}  extra classes on the wrapper element
 */

/**
 * CyberCliMark
 * Stylized, animated Sudarshan Chakra in terracotta (#D97757).
 */
export function CyberCliMark({ size = 28, className = '' }) {
  const s = size
  
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} logo-chakra-spin`}
      aria-label="CyberCli logo mark"
      role="img"
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    >
      <style>{`
        @keyframes chakra-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .logo-chakra-spin {
          animation: chakra-rotate 24s linear infinite;
          transform-origin: center;
        }
        .logo-chakra-spin:hover {
          animation: chakra-rotate 4s linear infinite;
        }
      `}</style>
      
      {/* 12 Outer Serrated Blades of the Sudarshan Chakra */}
      <g fill="#D97757">
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2
          const nextAngle = ((i + 0.55) / 12) * Math.PI * 2
          const innerR = 38
          const outerR = 48
          
          // Each blade is a curved triangular wing pointing clockwise
          const x1 = 50 + Math.cos(angle) * innerR
          const y1 = 50 + Math.sin(angle) * innerR
          const x2 = 50 + Math.cos(nextAngle) * outerR
          const y2 = 50 + Math.sin(nextAngle) * outerR
          const x3 = 50 + Math.cos((i + 1) / 12 * Math.PI * 2) * innerR
          const y3 = 50 + Math.sin((i + 1) / 12 * Math.PI * 2) * innerR
          
          return (
            <path
              key={i}
              d={`M ${x1.toFixed(2)} ${y1.toFixed(2)} Q ${x2.toFixed(2)} ${y2.toFixed(2)} ${x3.toFixed(2)} ${y3.toFixed(2)} Z`}
            />
          )
        })}
      </g>

      {/* Main outer ring body */}
      <circle cx="50" cy="50" r="38" stroke="#D97757" strokeWidth="3.5" />
      
      {/* Inner dashed ring decoration for depth */}
      <circle cx="50" cy="50" r="28" stroke="#D97757" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />

      {/* 8 Inner spokes (diamond rays connecting center to outer ring) */}
      <g fill="#D97757">
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2
          const perpAngle = angle + Math.PI / 2
          
          const tipX = 50 + Math.cos(angle) * 36
          const tipY = 50 + Math.sin(angle) * 36
          const baseX = 50 + Math.cos(angle) * 12
          const baseY = 50 + Math.sin(angle) * 12
          const leftX = 50 + Math.cos(perpAngle) * 3 + Math.cos(angle) * 24
          const leftY = 50 + Math.sin(perpAngle) * 3 + Math.sin(angle) * 24
          const rightX = 50 - Math.cos(perpAngle) * 3 + Math.cos(angle) * 24
          const rightY = 50 - Math.sin(perpAngle) * 3 + Math.sin(angle) * 24
          
          return (
            <path
              key={i}
              d={`M ${baseX.toFixed(2)} ${baseY.toFixed(2)} L ${leftX.toFixed(2)} ${leftY.toFixed(2)} L ${tipX.toFixed(2)} ${tipY.toFixed(2)} L ${rightX.toFixed(2)} ${rightY.toFixed(2)} Z`}
            />
          )
        })}
      </g>

      {/* Multi-layered transparent central hub */}
      {/* Ring with outer radius 12, inner radius 8 */}
      <path
        d="M 50 38 A 12 12 0 1 0 50 62 A 12 12 0 1 0 50 38 M 50 42 A 8 8 0 1 1 50 58 A 8 8 0 1 1 50 42"
        fill="#D97757"
        fillRule="evenodd"
      />
      {/* Central hub dot */}
      <circle cx="50" cy="50" r="4.5" fill="#D97757" />
    </svg>
  )
}

/**
 * CyberCliWordmark
 * Horizontal lock-up: [icon] [CyberCli text]
 * The text is set in Inter 600 at ~64 % of the icon size.
 */
export function CyberCliWordmark({ size = 28, className = '', textClassName = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-2 select-none ${className}`}
      aria-label="CyberCli"
    >
      <CyberCliMark size={size} />
      <span
        className={`font-semibold tracking-tight text-foreground-primary ${textClassName}`}
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 600,
          fontSize: size * 0.64,
          letterSpacing: '-0.015em',
          lineHeight: 1,
        }}
      >
        CyberCli
      </span>
    </span>
  )
}

export default CyberCliMark
