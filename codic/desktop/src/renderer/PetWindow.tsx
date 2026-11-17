import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { CompanionActivity } from '../shared/contracts.js'
import CompanionModel3D from './CompanionModel3D.js'
import './PetWindow.css'

const activityCopy: Record<CompanionActivity, string> = {
  idle: 'Here with you',
  thinking: 'Thinking through your task',
  working: 'Working in your project',
  approval: 'Waiting for your approval',
  completed: 'Task completed',
  error: 'Task needs attention',
  cancelled: 'Task stopped',
}

function CompanionFallback() {
  return <div className="companion-fallback" aria-hidden="true">
    <div className="fallback-orbit fallback-orbit-one" />
    <div className="fallback-orbit fallback-orbit-two" />
    <div className="fallback-shell"><div className="fallback-face"><i /><i /><b /></div></div>
    <span className="fallback-foot fallback-foot-one" />
    <span className="fallback-foot fallback-foot-two" />
  </div>
}

export default function PetWindow() {
  const [prompt, setPrompt] = useState('')
  const [activity, setActivity] = useState<CompanionActivity>('idle')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [webglUnavailable, setWebglUnavailable] = useState(false)
  const showFallback = useCallback(() => setWebglUnavailable(true), [])

  useEffect(() => {
    const companion = window.codic?.companion
    if (!companion) {
      setNotice('Desktop controls are unavailable in this preview.')
      return
    }
    let active = true
    let receivedActivityEvent = false
    const unsubscribe = companion.onActivityChange((nextActivity) => {
      if (active) {
        receivedActivityEvent = true
        setActivity(nextActivity)
        setNotice('')
      }
    })
    void companion.getActivity().then((currentActivity) => {
      if (active && !receivedActivityEvent) setActivity(currentActivity)
    }).catch(() => undefined)
    return () => { active = false; unsubscribe() }
  }, [])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 3_200)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const submitPrompt = async (event: FormEvent) => {
    event.preventDefault()
    const draft = prompt.trim()
    if (!draft || busy) return
    const companion = window.codic?.companion
    if (!companion) {
      setNotice('Open this companion in Codic desktop to place a draft.')
      return
    }
    setBusy(true)
    try {
      await companion.submitPrompt(draft)
      setPrompt('')
      setNotice('Draft placed in Codic for review')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not open the Codic composer.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="companion-root" aria-label="Codic desktop companion">
    <div className="companion-drag-region" aria-hidden="true" />
    <section className={`companion-card companion-mood-${activity}`} aria-label="Codic companion controls">
      <div className="companion-stage" aria-hidden="true">
        {!webglUnavailable && <CompanionModel3D activity={activity} onFallback={showFallback} />}
        {webglUnavailable && <CompanionFallback />}
        <span className="companion-stage-status"><i />{activity === 'idle' ? 'Codi is nearby' : activityCopy[activity]}</span>
      </div>
      <div className="companion-wordmark"><span className="companion-mark" aria-hidden="true"><i /><b /></span><span><strong>Codi</strong><small>Codic desktop companion</small></span></div>
      <p className="companion-status" role="status" aria-live="polite">{notice || activityCopy[activity]}</p>
      <form className="companion-prompt" onSubmit={(event) => void submitPrompt(event)}>
        <label className="companion-sr-only" htmlFor="companion-prompt">Draft a message for Codic</label>
        <input id="companion-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={4000} placeholder="Ask Codic…" autoComplete="off" />
        <button type="submit" disabled={!prompt.trim() || busy} aria-label="Place draft in Codic composer" title="Place draft in Codic composer">↗</button>
      </form>
      <div className="companion-actions">
        <button type="button" disabled={!window.codic?.companion} onClick={() => void window.codic?.companion?.focusApp()}>Open Codic</button>
        <button type="button" disabled={!window.codic?.companion} onClick={() => void window.codic?.companion?.hide()}>Hide Codi</button>
      </div>
      <p className="companion-note">Drafts open in Codic for your review.</p>
    </section>
  </main>
}
