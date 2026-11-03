import { useState } from 'react'
import api from '../../lib/api.js'
import { materialDisplay } from '../../lib/materialAnswer.js'

export default function DossierResources({ projectId, record, onRecord }) {
  const [notes, setNotes] = useState(''), [question, setQuestion] = useState(''), [answer, setAnswer] = useState(null)
  const [replay, setReplay] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const base = `/studio/projects/${projectId}`
  const request = async (path, body) => {
    setBusy(true); setError('')
    try { const { data } = body === undefined ? await api.get(base + path) : await api.post(base + path, body); if (data.dossier) onRecord(data); return data }
    catch (error) { setError(error.response?.data?.error || error.message); return null }
    finally { setBusy(false) }
  }
  const upload = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 5000000) { setError('PDF must be smaller than 5 MB'); return }
    const bytes = new Uint8Array(await file.arrayBuffer())
    let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
    await request('/materials', { kind: 'pdf', name: file.name, data_base64: btoa(binary) })
    event.target.value = ''
  }
  const meter = record.meter || { free: 0, mid: 0, frontier: 0 }
  return <section className="space-y-5 rounded-xl border border-border-subtle p-4">
    <h2 className="text-xl">Project evidence / प्रोजेक्ट के प्रमाण</h2>
    {error && <p role="alert">{error}</p>}
    <p>Model attempts / मॉडल प्रयास: Free {meter.free} · Mid {meter.mid} · Frontier {meter.frontier}</p>
    <details><summary>Original request / मूल अनुरोध</summary><pre className="whitespace-pre-wrap">{record.dossier.prompt_original}</pre></details>
    <h3>PDF and notes / PDF और नोट्स</h3>
    <label className="block">Upload PDF / PDF जोड़ें<input aria-label="Upload PDF" type="file" accept="application/pdf,.pdf" disabled={busy} onChange={upload} /></label>
    <ul>{(record.dossier.materials || []).map(file => <li key={file.id}>{file.name} · {file.chunks.length} indexed chunks</li>)}</ul>
    <form onSubmit={async e => { e.preventDefault(); if (await request('/materials', { kind: 'notes', name: 'Notes', text: notes })) setNotes('') }}>
      <label>Notes / नोट्स<textarea aria-label="Notes" required maxLength={100000} value={notes} onChange={e => setNotes(e.target.value)} className="block w-full bg-background-secondary p-3" /></label>
      <button disabled={busy} className="px-3 py-2">Save notes / नोट्स जोड़ें</button>
    </form>
    <form onSubmit={async e => { e.preventDefault(); const data = await request('/material-question', { question }); if (data) setAnswer(materialDisplay(data)) }}>
      <label>Ask about uploaded material / सामग्री से पूछें<textarea aria-label="Material question" required maxLength={2000} value={question} onChange={e => setQuestion(e.target.value)} className="block w-full bg-background-secondary p-3" /></label>
      <button disabled={busy} className="px-3 py-2">Find cited excerpts / स्रोत सहित खोजें</button>
    </form>
    {answer && <div role="status"><p className="whitespace-pre-wrap">{answer.answer}</p>{answer.citations.map(c => <p key={c.chunk_id} className="text-sm text-foreground-secondary">{c.name}: {c.page ? `page ${c.page}` : `note ${c.note_id}`}</p>)}</div>}
    <button disabled={busy} className="px-3 py-2" onClick={async () => { const data = await request('/replay'); if (data) setReplay(data) }}>Replay stored tools / रिकॉर्ड किए टूल देखें</button>
    {replay && <div><p role="status">Replay: {replay.status}</p>{replay.reason && <p>{replay.reason}</p>}<ol>{replay.steps.map(step => <li key={step.tool_call_id}><p>{step.seq}. {step.tool} — {step.status}</p><pre className="whitespace-pre-wrap max-h-52 overflow-auto">{JSON.stringify({ input: step.input, output: step.output }, null, 2)}</pre></li>)}</ol></div>}
    {record.dossier.tasks.filter(t => t.screen?.visual_diff).map(task => <p key={task.id}>Screenshot / स्क्रीनशॉट: {task.screenshot} · Visual change / दृश्य बदलाव: {(task.screen.visual_diff.ratio * 100).toFixed(2)}% {task.screen.visual_diff.path || '(first baseline)'}</p>)}
  </section>
}
