import { useState, type FormEvent } from 'react'
import './PetWindow.css'

function CodicSprite() {
  return <div className="companion-stage" aria-hidden="true">
    <div className="companion-orbit companion-orbit-a" />
    <div className="companion-orbit companion-orbit-b" />
    <div className="companion-shadow" />
    <svg className="companion-character" viewBox="0 0 160 156" role="presentation">
      <defs>
        <radialGradient id="petShell" cx="34%" cy="27%" r="82%"><stop stopColor="#ffc49f"/><stop offset=".34" stopColor="#e78a63"/><stop offset=".75" stopColor="#9d4a34"/><stop offset="1" stopColor="#522a24"/></radialGradient>
        <linearGradient id="petFace" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#31332e"/><stop offset="1" stopColor="#111310"/></linearGradient>
        <linearGradient id="petFoot" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#f2a17b"/><stop offset="1" stopColor="#a64d36"/></linearGradient>
        <filter id="petGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <ellipse cx="54" cy="131" rx="17" ry="12" fill="url(#petFoot)" />
      <ellipse cx="106" cy="131" rx="17" ry="12" fill="url(#petFoot)" />
      <path d="M36 90c-12 1-21 12-18 23 2 8 9 13 19 12l10-11-4-20zM124 90c12 1 21 12 18 23-2 8-9 13-19 12l-10-11 4-20z" fill="url(#petShell)" stroke="#572d25" strokeWidth="3"/>
      <path d="M30 59c0-24 19-44 43-46 17-2 31 5 40 17 22 4 36 23 34 45-1 13-9 24-20 31-7 17-24 29-45 30-22 1-42-10-51-28-17-7-28-23-26-40 1-13 10-24 25-29z" fill="url(#petShell)" stroke="#6d3a2b" strokeWidth="4"/>
      <path d="M44 36c10-13 24-18 38-17" fill="none" stroke="#ffe0c8" strokeLinecap="round" strokeWidth="5" opacity=".82"/>
      <ellipse cx="82" cy="73" rx="43" ry="34" fill="url(#petFace)" stroke="#683a2e" strokeWidth="3"/>
      <path d="M67 68c0-4 3-7 7-7s7 3 7 7v8c0 4-3 7-7 7s-7-3-7-7z" fill="#a9e8d1"/>
      <path d="M93 75h15" stroke="#a9e8d1" strokeLinecap="round" strokeWidth="5"/>
      <circle cx="127" cy="51" r="10" fill="#ffd1ae" filter="url(#petGlow)"/>
      <circle cx="127" cy="51" r="5" fill="#fff1de"/>
      <path d="M64 113c10 8 25 10 37 4" fill="none" stroke="#ffd1ae" strokeLinecap="round" strokeWidth="3" opacity=".8"/>
    </svg>
    <span className="companion-spark companion-spark-one">✦</span>
    <span className="companion-spark companion-spark-two">·</span>
  </div>
}

export default function PetWindow() {
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState('Here with you')
  const [busy, setBusy] = useState(false)

  const submitPrompt = async (event: FormEvent) => {
    event.preventDefault()
    const draft = prompt.trim()
    if (!draft || busy) return
    setBusy(true)
    try {
      await window.codic.companion.submitPrompt(draft)
      setPrompt('')
      setStatus('Draft placed in Codic · review and send there')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not open the Codic composer.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="companion-root" aria-label="Codic desktop companion">
    <div className="companion-drag-region" aria-hidden="true" />
    <section className="companion-card" aria-label="Codic companion controls">
      <CodicSprite />
      <div className="companion-wordmark"><span className="companion-mark" aria-hidden="true">C</span><span><strong>Codic</strong><small>your desktop companion</small></span></div>
      <p className="companion-status" role="status" aria-live="polite">{status}</p>
      <form className="companion-prompt" onSubmit={(event) => void submitPrompt(event)}>
        <label className="companion-sr-only" htmlFor="companion-prompt">Draft a message for Codic</label>
        <input id="companion-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={4000} placeholder="Ask Codic…" autoComplete="off" />
        <button type="submit" disabled={!prompt.trim() || busy} aria-label="Place draft in Codic composer" title="Place draft in Codic composer">↗</button>
      </form>
      <div className="companion-actions">
        <button type="button" onClick={() => void window.codic.companion.focusApp()}>Open Codic</button>
        <button type="button" onClick={() => void window.codic.companion.hide()}>Hide pet</button>
      </div>
      <p className="companion-note">Your draft is not sent automatically.</p>
    </section>
  </main>
}
