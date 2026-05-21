/**
 * CyberCli brand logo components
 *
 * Exports:
 *   CyberCliMark      — 8-pointed asterisk SVG icon only
 *   CyberCliWordmark  — icon + "CyberCli" text side-by-side
 *   default           — CyberCliMark
 *
 * Props:
 *   size        {number}  pixel size of the icon square  (default 28)
 *   className   {string}  extra classes on the wrapper element
 */

/**
 * CyberCliMark
 * Eight arms, each arm is a thin elongated diamond/rhombus radiating from center.
 * Rendered purely with SVG paths — no external deps.
 */
export function CyberCliMark({ size = 28, className = '' }) {
  const s = size
  const cx = s / 2
  const cy = s / 2
  // Outer reach of each arm tip
  const outerR = s * 0.46
  // Half-width of each arm at its base (controls "thinness")
  const innerR = s * 0.09
  const numArms = 8

  // Build one elongated diamond per arm:
  // The diamond has 4 vertices:
  //   – tip   (along the arm direction, outerR from center)
  //   – left  (90° to the arm, innerR from center)
  //   – base  (opposite tip, a tiny stub inward at the center)
  //   – right (–90° to the arm, innerR from center)
  const arms = Array.from({ length: numArms }, (_, i) => {
    const angle = (i / numArms) * Math.PI * 2 - Math.PI / 2
    const perpL = angle + Math.PI / 2
    const perpR = angle - Math.PI / 2

    const tipX  = cx + Math.cos(angle) * outerR
    const tipY  = cy + Math.sin(angle) * outerR
    const leftX = cx + Math.cos(perpL) * innerR
    const leftY = cy + Math.sin(perpL) * innerR
    const rightX = cx + Math.cos(perpR) * innerR
    const rightY = cy + Math.sin(perpR) * innerR
    // Base knot: a tiny point opposite the tip, very close to center
    const baseX = cx + Math.cos(angle + Math.PI) * (s * 0.04)
    const baseY = cy + Math.sin(angle + Math.PI) * (s * 0.04)

    return `M ${leftX.toFixed(2)} ${leftY.toFixed(2)} L ${tipX.toFixed(2)} ${tipY.toFixed(2)} L ${rightX.toFixed(2)} ${rightY.toFixed(2)} L ${baseX.toFixed(2)} ${baseY.toFixed(2)} Z`
  })

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="CyberCli logo mark"
      role="img"
    >
      {arms.map((d, i) => (
        <path key={i} d={d} fill="#D97757" />
      ))}
      {/* Tiny centre dot for crispness */}
      <circle cx={cx} cy={cy} r={s * 0.055} fill="#D97757" />
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
        className={`font-semibold tracking-tight text-white ${textClassName}`}
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
