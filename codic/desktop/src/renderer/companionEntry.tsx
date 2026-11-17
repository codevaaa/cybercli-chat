import React, { type ComponentType } from 'react'
import type { Root } from 'react-dom/client'

type CompanionModule = { default: ComponentType }
type CompanionLoader = () => Promise<CompanionModule>

function CompanionLoadError() {
  const available = Boolean(window.codic?.companion)
  return <main role="alert" style={{
    boxSizing: 'border-box',
    width: '100%',
    height: '100%',
    padding: 16,
    display: 'grid',
    placeItems: 'center',
    color: 'var(--text, #f0f2eb)',
    background: 'var(--canvas, #11130f)',
    fontFamily: 'inherit',
    textAlign: 'center',
  }}>
    <section style={{
      width: '100%',
      padding: 20,
      border: '1px solid var(--border, #2d312a)',
      borderRadius: 18,
      background: 'var(--surface, #191c18)',
    }}>
      <div aria-hidden="true" style={{ fontSize: 30, marginBottom: 10 }}>◉</div>
      <h1 style={{ fontSize: 17, lineHeight: 1.3, margin: '0 0 8px' }}>Codi couldn’t start</h1>
      <p style={{ color: 'var(--text-muted, #858b7f)', fontSize: 12, lineHeight: 1.5, margin: '0 0 16px' }}>
        Reopen the companion from Codic to try again.
      </p>
      {available && <button type="button" onClick={() => void window.codic?.companion?.hide()} style={{
        minHeight: 36,
        padding: '0 14px',
        border: '1px solid var(--accent-border, rgba(217, 119, 87, .28))',
        borderRadius: 9,
        color: 'var(--text, #f0f2eb)',
        background: 'var(--accent-soft, rgba(217, 119, 87, .13))',
        font: 'inherit',
        cursor: 'pointer',
      }}>Hide Codi</button>}
    </section>
  </main>
}

/** Mount the lazy companion entry with an actionable fallback if its chunk fails. */
export function mountCompanionWindow(
  root: Root,
  load: CompanionLoader = () => import('./PetWindow.js'),
): Promise<void> {
  return load().then(({ default: PetWindow }) => {
    root.render(<React.StrictMode><PetWindow /></React.StrictMode>)
  }).catch(() => {
    root.render(<React.StrictMode><CompanionLoadError /></React.StrictMode>)
  })
}
