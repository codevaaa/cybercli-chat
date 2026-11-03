import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { API_BASE, getFreshToken } from '../../lib/api.js'
import { readSSE } from '../../lib/readSSE.js'
import DossierResources from './DossierResources.jsx'
import ClassroomPanel from './ClassroomPanel.jsx'

export const studioLabels = {
  title: 'App studio / ऐप स्टूडियो', spec: 'Specification / विनिर्देश', progress: 'Progress / प्रगति',
  will_build: 'Will build / क्या बनाएंगे', must_never: 'Must never / क्या नहीं होना चाहिए', acceptance: 'Acceptance / स्वीकृति',
  run: 'Build accepted lines / स्वीकृत लाइनों को बनाएं', listener: 'Ask without stopping / काम रोके बिना पूछें', fix: 'Request a fix / सुधार मांगें',
}
const groups = ['will_build', 'must_never', 'acceptance']
const base = id => `/studio/projects/${id}`

export default function DossierStudio() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [record, setRecord] = useState(null)
  const [needsDossier, setNeedsDossier] = useState(projectId === 'new')
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [pack, setPack] = useState('general')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [question, setQuestion] = useState('')
  const [fix, setFix] = useState('')
  const [answer, setAnswer] = useState(null)
  const [buttonLabel, setButtonLabel] = useState('')
  const [edits, setEdits] = useState({})
  const refresh = useCallback(async () => {
    if (!projectId || projectId === 'new') { setRecord(null); setNeedsDossier(true); return }
    try {
      const { data } = await api.get(`${base(projectId)}/dossier`)
      setRecord(data); setNeedsDossier(false)
    } catch (error) {
      if (error.response?.status === 404) setNeedsDossier(true)
      else setError(error.response?.data?.error || 'Could not load dossier')
    }
  }, [projectId])
  useEffect(() => { setError(''); setRecord(null); refresh() }, [refresh])
  useEffect(() => {
    if (projectId === 'new' || needsDossier) return
    const controller = new AbortController()
    let after = 0
    const connect = async () => {
      while (!controller.signal.aborted) {
        try {
          const token = await getFreshToken()
          const response = await fetch(`${API_BASE}${base(projectId)}/progress?after=${after}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
          if (!response.ok) throw new Error('Progress connection unavailable')
          for await (const event of readSSE(response.body, controller.signal)) { after = event.seq; await refresh() }
        } catch (error) { if (controller.signal.aborted) return; setError(error.message) }
        await new Promise(resolve => {
          const finish = () => { clearTimeout(timer); controller.signal.removeEventListener('abort', finish); resolve() }
          const timer = setTimeout(finish, 3000)
          controller.signal.addEventListener('abort', finish, { once: true })
          if (controller.signal.aborted) finish()
        })
      }
    }
    connect()
    return () => controller.abort() // Disconnecting the UI does not cancel the worker.
  }, [projectId, needsDossier, refresh])
  const action = async (path, body, method = 'post') => {
    setBusy(true); setError('')
    try {
      const { data } = await api[method](`${base(projectId)}${path}`, body)
      if (data.dossier) setRecord(data)
      if (method === 'patch') setEdits(previous => { const next = { ...previous }; delete next[path.split('/').at(-1)]; return next })
      return data
    } catch (error) { setError(error.response?.data?.error || error.message); return null }
    finally { setBusy(false) }
  }
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const { data } = projectId === 'new' ? await api.post('/studio/projects', { name, prompt, pack }) : await api.post(`${base(projectId)}/dossier`, { prompt, pack })
      setRecord(data); setNeedsDossier(false); navigate(`/projects/studio/${data.project_id}`, { replace: true })
    } catch (error) { setError(error.response?.data?.error || error.message) }
    finally { setBusy(false) }
  }
  const openPreview = async () => {
    // A POST form consumes a short-lived one-time token; no token is put in a URL.
    const popup = window.open('', 'codeva-project-preview')
    const data = await action('/preview', {})
    if (!data) { popup?.close(); return }
    const form = document.createElement('form')
    form.method = 'POST'; form.action = data.launch_url; form.target = 'codeva-project-preview'
    const input = document.createElement('input'); input.type = 'hidden'; input.name = 'token'; input.value = data.launch_token
    form.appendChild(input); document.body.appendChild(form); form.submit(); form.remove()
  }
  const d = record?.dossier
  const remaining = d ? groups.flatMap(g => d.spec[g]).filter(l => l.status !== 'rejected') : []
  const canBuild = d && ['wait_for_user', 'blocked'].includes(d.state) && record.lint.length === 0 && remaining.some(l => d.spec.will_build.includes(l)) && remaining.some(l => d.spec.acceptance.includes(l)) && remaining.every(l => ['accepted', 'edited'].includes(l.status)) && (d.pipeline_version !== 3 || d.design?.selected) && !d.editor_reviews?.some(r => r.status === 'pending')
  const canReview = d?.state === 'blocked' && (d.blocked?.resume_state === 'wait_for_user' || remaining.some(l => !['accepted', 'edited'].includes(l.status)))
  const canRetrySpec = d?.state === 'blocked' && d.blocked?.resume_state === 'spec'
  const field = 'w-full rounded-lg border border-border-subtle bg-background-secondary p-3 text-foreground-primary'
  const button = 'rounded-lg border border-border-subtle px-3 py-2 text-sm hover:border-accent disabled:opacity-40'
  return (
    <main className="min-h-screen bg-background-primary pt-24 pb-12 text-foreground-primary">
      <div className="mx-auto max-w-6xl px-5 space-y-6">
        <Link to="/projects" className="text-accent">← Projects / प्रोजेक्ट</Link>
        <h1 className="text-3xl font-serif">{studioLabels.title}</h1>
        {error && <p role="alert" className="rounded-lg border border-red-500 p-3">{error}</p>}
        {needsDossier ? (
          <form onSubmit={submit} className="max-w-2xl space-y-4">
            {projectId === 'new' && <label className="block">Project name / प्रोजेक्ट नाम<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} className={field} /></label>}
            <label className="block">Original request / मूल अनुरोध<textarea required value={prompt} onChange={e => setPrompt(e.target.value)} rows={6} className={field} /></label>
            <p className="text-sm text-foreground-secondary">Your exact request is saved. Review every spec line before building. / आपका मूल अनुरोध सुरक्षित रहेगा। बनाने से पहले हर लाइन स्वीकार करें।</p>
            <label className="block">Pack / पैक<select value={pack} onChange={e => setPack(e.target.value)} className={field}><option value="general">General app / सामान्य ऐप</option><option value="cs">CS / कंप्यूटर विज्ञान</option><option value="commerce">Commerce / वाणिज्य</option></select></label>
            <button disabled={busy} className={button}>Prepare specification / विनिर्देश तैयार करें</button>
          </form>
        ) : !d ? <p>Loading dossier / डॉसियर लोड हो रहा है…</p> : (
          <>
            <section className="space-y-3" aria-labelledby="progress-title">
              <h2 id="progress-title" className="text-xl">{studioLabels.progress}</h2>
              <p role="status">State / स्थिति: <strong>{d.state}</strong> · Tasks / कार्य: {d.tasks.filter(t => t.status === 'tested').length}/{d.tasks.length}</p>
              {d.blocked && <p role="alert" className="text-red-400">Blocked / अवरुद्ध: {d.blocked.reason}</p>}
              <ol className="max-h-44 overflow-auto text-sm text-foreground-secondary">{d.events.slice(-15).map(e => <li key={e.seq}>{e.seq}. {e.agent_id} → {e.state} · {e.kind} {e.provider && `· ${e.provider}/${e.model}`}</li>)}</ol>
            </section>
            <section aria-labelledby="spec-title" className="space-y-4">
              <h2 id="spec-title" className="text-xl">{studioLabels.spec}</h2>
              <div className="grid gap-4 md:grid-cols-3">{groups.map(group => <div key={group} className="rounded-xl border border-border-subtle p-4 space-y-3">
                <h3 className="font-semibold">{studioLabels[group]}</h3>
                {d.spec[group].map(line => <div key={line.id} className="space-y-2 border-t border-border-subtle pt-3">
                  <textarea aria-label={`${studioLabels[group]}: ${line.text}`} disabled={d.state !== 'wait_for_user'} value={edits[line.id] ?? line.final_text} onChange={e => setEdits({ ...edits, [line.id]: e.target.value })} className={field} rows={3} />
                  <p className="text-xs">{line.status}</p>
                  {d.state === 'wait_for_user' && <div className="flex flex-wrap gap-1">
                    <button disabled={busy} className={button} onClick={() => action(`/spec/${line.id}`, (edits[line.id] ?? line.final_text) !== line.text ? { status: 'edited', text: edits[line.id] ?? line.final_text } : { status: 'accepted' }, 'patch')}>Accept / स्वीकार</button>
                    <button disabled={busy} className={button} onClick={() => action(`/spec/${line.id}`, { status: 'edited', text: edits[line.id] ?? line.final_text }, 'patch')}>Save edit / बदलाव</button>
                    <button disabled={busy} className={button} onClick={() => action(`/spec/${line.id}`, { status: 'rejected' }, 'patch')}>Reject / अस्वीकार</button>
                  </div>}
                </div>)}
              </div>)}</div>
              {record.lint.map((issue, i) => <p role="alert" key={i} className="text-red-400">{issue.reason}</p>)}
              <button className={button} disabled={busy || !(canBuild || canReview || canRetrySpec)} onClick={() => action('/run', {})}>{canReview ? 'Review specification / विनिर्देश की समीक्षा करें' : d.state === 'blocked' ? 'Retry from checkpoint / फिर प्रयास करें' : studioLabels.run}</button>
            </section>
            {d.design?.proposals.length > 0 && <section className="space-y-3" aria-label="Design proposals">
              <h2 className="text-xl">Choose a design / डिज़ाइन चुनें</h2>
              <div className="grid gap-4 md:grid-cols-2">{d.design.proposals.map(p => <article key={p.id} className="rounded-xl border border-border-subtle p-4 space-y-2">
                <h3>{p.title}</h3><p>{p.summary}</p><small>Spec lines: {p.spec_line_ids.join(', ')}</small>
                <button className={button} disabled={busy || d.state !== 'wait_for_user'} onClick={() => action('/design', { id: p.id })}>{d.design.selected?.id === p.id ? 'Selected / चुना गया' : 'Choose / चुनें'}</button>
              </article>)}</div>
            </section>}
            {d.editor_reviews?.filter(r => r.status === 'pending').map(r => <section key={r.id} className="space-y-3" aria-label="Pending agent changes">
              <h2 className="text-xl">Review generated changes / बदलाव की समीक्षा</h2>
              <p>{r.diff.map(f => f.path).join(', ')}</p>
              <p className="text-sm text-foreground-secondary">Review the app changes before applying them. Detailed code diffs are available in MrCodevaa.</p>
              <button className={button} disabled={busy} onClick={() => action(`/reviews/${r.id}`, { decision: 'accept' })}>Accept changes / बदलाव स्वीकार</button>
              <button className={button} disabled={busy} onClick={() => action(`/reviews/${r.id}`, { decision: 'reject' })}>Reject changes / बदलाव अस्वीकार</button>
            </section>)}
            <section className="grid gap-4 md:grid-cols-2">
              <form onSubmit={async e => { e.preventDefault(); const reply = await action('/listener', { question }); if (reply) setAnswer(reply) }} className="space-y-3">
                <h2>{studioLabels.listener}</h2><textarea required value={question} onChange={e => setQuestion(e.target.value)} className={field} />
                <button disabled={busy} className={button}>Ask / पूछें</button>
                {answer && <p>{answer.answer} <small>Source / स्रोत: dossier revision {answer.source.revision}</small></p>}
              </form>
              <form onSubmit={async e => { e.preventDefault(); const result = await action('/fix', { text: fix }); if (result) setFix('') }} className="space-y-3">
                <h2>{studioLabels.fix}</h2><textarea required value={fix} onChange={e => setFix(e.target.value)} className={field} />
                <button disabled={busy} className={button}>Add fix line / सुधार लाइन जोड़ें</button>
              </form>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl">Judge lines / जज के परिणाम</h2>
              {d.judge.map(j => <div key={j.agent_id}><h3>{j.agent_id} · {j.model}</h3>{j.lines.map(l => <p key={l.id}>{l.verdict}: {l.evidence}</p>)}</div>)}
              {['live', 'done'].includes(d.state) && <button disabled={busy} className={button} onClick={openPreview}>Open private preview / निजी प्रीव्यू खोलें</button>}
              {d.state === 'live' && <form onSubmit={e => { e.preventDefault(); action('/click', { path: '/', button_label: buttonLabel }) }} className="flex flex-wrap gap-2">
                <label>Button to try / कौन सा बटन चलाएं<input required maxLength={200} value={buttonLabel} onChange={e => setButtonLabel(e.target.value)} placeholder="Enter the button's visible name / बटन का नाम" className={field} /></label>
                <button disabled={busy} className={button}>Record and run click / क्लिक चलाकर रिकॉर्ड करें</button>
              </form>}
              <div className="flex gap-3">
                <button disabled={busy || !d.last_green} className={button} onClick={() => action('/rollback', {})}>Restore last green / अंतिम सही स्थिति लौटाएं</button>
                {d.state === 'live' && <button disabled={busy} className={button} onClick={() => action('/complete', {})}>Confirm completion / पूर्णता पुष्टि</button>}
              </div>
            </section>
            <DossierResources projectId={projectId} record={record} onRecord={setRecord} />
            <ClassroomPanel projectId={projectId} record={record} />
          </>
        )}
      </div>
    </main>
  )
}
