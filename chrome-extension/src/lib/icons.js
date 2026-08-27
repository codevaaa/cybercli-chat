/**
 * Codeva Extension — Inline icon set (stroke-based, 24x24 viewBox)
 * Replaces emoji with clean line icons for a professional UI.
 * Usage: el.innerHTML = ICONS.sparkles
 */

const stroke = 'stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"'

export const ICONS = {
  logo: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="2" opacity="0.25"/><circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"/><circle cx="50" cy="50" r="9" fill="currentColor"/><g fill="currentColor">
    ${Array.from({ length: 8 }).map((_, i) => {
      const a = (i / 8) * Math.PI * 2
      const tipX = (50 + Math.cos(a + 0.28) * 42).toFixed(1)
      const tipY = (50 + Math.sin(a + 0.28) * 42).toFixed(1)
      const outX = (50 + Math.cos(a + 0.12) * 33).toFixed(1)
      const outY = (50 + Math.sin(a + 0.12) * 33).toFixed(1)
      const baseX = (50 + Math.cos(a) * 16).toFixed(1)
      const baseY = (50 + Math.sin(a) * 16).toFixed(1)
      const cutX = (50 + Math.cos(a + 0.24) * 24).toFixed(1)
      const cutY = (50 + Math.sin(a + 0.24) * 24).toFixed(1)
      return `<polygon points="${baseX},${baseY} ${outX},${outY} ${tipX},${tipY} ${cutX},${cutY}" opacity="0.9"/>`
    }).join('')}
  </g></svg>`,

  spellcheck: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4 20l4-11 4 11M5.5 15.5h5M14 12l3-8 3 8M15.2 9.5h3.6"/><path d="M9 20a9 9 0 1 1 12.5-8.3" opacity="0"/></svg>`,
  wand: `<svg viewBox="0 0 24 24" ${stroke}><path d="M15 4V2M15 16v-2M8 9h2M2 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5"/></svg>`,
  scissors: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.5 15.5M20 20L8.5 8.5"/></svg>`,
  expand: `<svg viewBox="0 0 24 24" ${stroke}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`,
  lightbulb: `<svg viewBox="0 0 24 24" ${stroke}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.4.3.6.8.6 1.3v1h6.8v-1c0-.5.2-1 .6-1.3A7 7 0 0 0 12 2z"/></svg>`,
  list: `<svg viewBox="0 0 24 24" ${stroke}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>`,
  code: `<svg viewBox="0 0 24 24" ${stroke}><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" ${stroke}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" ${stroke}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  check: `<svg viewBox="0 0 24 24" ${stroke}><path d="M20 6L9 17l-5-5"/></svg>`,
  x: `<svg viewBox="0 0 24 24" ${stroke}><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" ${stroke}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>`,
  sparkles: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.5 5L19 9l-5.5 2L12 16l-1.5-5L5 9l5.5-2L12 2z"/><path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16z" opacity="0.6"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" ${stroke}><path d="M12 9v4M12 17h.01M10.3 3.9L2.4 18a1.85 1.85 0 0 0 1.6 2.8h16a1.85 1.85 0 0 0 1.6-2.8L13.7 3.9a1.85 1.85 0 0 0-3.4 0z"/></svg>`,
  chevronDown: `<svg viewBox="0 0 24 24" ${stroke}><path d="M6 9l6 6 6-6"/></svg>`,
  loader: `<svg viewBox="0 0 24 24" ${stroke}><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" ${stroke}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
}

export function icon(name, size = 16) {
  return `<span class="cv-icon" style="width:${size}px;height:${size}px;display:inline-flex">${ICONS[name] || ''}</span>`
}
