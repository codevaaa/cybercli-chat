import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { API_BASE, getFreshToken } from '../../lib/api.js'

export default function ClassroomPanel({ projectId, record }) {
  const navigate = useNavigate(), [account, setAccount] = useState(null), [classrooms, setClassrooms] = useState([])
  const [students, setStudents] = useState(''), [deadline, setDeadline] = useState(''), [consent, setConsent] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    Promise.all([api.get('/studio/account'), api.get('/studio/classrooms')]).then(([a, c]) => { if (active) { setAccount(a.data); setClassrooms(c.data.classrooms || []) } }).catch(e => { if (active) setError(e.response?.data?.error || 'Could not load classroom permissions') })
    return () => { active = false }
  }, [projectId])
  const action = async run => { setBusy(true); setError(''); try { await run() } catch (e) { setError(e.response?.data?.error || e.message) } finally { setBusy(false) } }
  const download = () => action(async () => {
    const token = await getFreshToken()
    const response = await fetch(`${API_BASE}/studio/projects/${projectId}/export`, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) throw new Error((await response.json()).error || 'Snapshot export failed')
    const url = URL.createObjectURL(await response.blob()), link = document.createElement('a')
    link.href = url; link.download = `codeva-${projectId}-snapshot.zip`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  })
  const button = 'rounded-lg border border-border-subtle px-3 py-2 text-sm disabled:opacity-40'
  return <section className="space-y-3" aria-label="Classroom and project privacy">
    <h2 className="text-xl">Classroom and export / कक्षा और एक्सपोर्ट</h2>
    {error && <p role="alert">{error}</p>}
    {record.dossier.classroom && <p>Locked teacher spec · Deadline: {record.dossier.classroom.deadline} · Training opt-in: off</p>}
    {account?.teacher_enabled && <form className="space-y-2" onSubmit={e => { e.preventDefault(); action(async () => {
      const { data } = await api.post('/studio/classrooms', { project_id: projectId, student_ids: students.split(',').map(id => id.trim()).filter(Boolean), deadline: new Date(deadline).toISOString(), consent: { teacher: consent } })
      setClassrooms(previous => [...previous, { ...data, id: data._id }])
    }) }}>
      <p>Lock this accepted specification and chosen design for your students.</p>
      <label className="block">Existing student account IDs<input required value={students} onChange={e => setStudents(e.target.value)} className="block w-full bg-background-secondary p-2" /></label>
      <label className="block">Deadline<input required type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} className="block bg-background-secondary p-2" /></label>
      <label className="block"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> I record the required teacher consent for under-18 students.</label>
      <button className={button} disabled={busy}>Create locked classroom / कक्षा बनाएं</button>
    </form>}
    {classrooms.map(c => <article key={c.id} className="rounded-xl border border-border-subtle p-3 space-y-2">
      <p>{c.prompt_original} · {c.deadline}</p>
      {c.student_ids ? c.student_ids.map(student => <button key={student} className={button} disabled={busy} onClick={() => action(async () => { await api.post(`/studio/classrooms/${c.id}/projects`, { student_id: student }) })}>Assign isolated project: {student}</button>) : <button className={button} disabled={busy} onClick={() => action(async () => { const { data } = await api.post(`/studio/classrooms/${c.id}/projects`, {}); navigate(`/projects/studio/${data.project_id}`) })}>Open my classroom project</button>}
    </article>)}
    <button className={button} disabled={busy} onClick={download}>Export snapshot ZIP and git repo / एक्सपोर्ट</button>
    <button className={button} disabled={busy} onClick={() => { if (window.confirm('Delete this generated dossier, its files, database, preview objects and events? Your normal Codeva account and chats remain.')) action(async () => { await api.delete(`/studio/projects/${projectId}/dossier`); navigate('/projects') }) }}>Delete generated project data / डेटा हटाएं</button>
  </section>
}
