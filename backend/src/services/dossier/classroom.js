import { randomUUID } from 'node:crypto'
import { event, fault, newDossier, ready } from './domain.js'
import { initializePhase3 } from './roles.js'

export function validateClassroom(doc, body) {
  ready(doc.data)
  if (!doc.data.design?.selected) throw fault('Choose the teacher design before locking the classroom spec')
  if (!Array.isArray(body.student_ids) || !body.student_ids.length || body.student_ids.length > 100 || body.student_ids.some(id => typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(id)) || new Set(body.student_ids).size !== body.student_ids.length) throw fault('Provide 1–100 distinct existing student account ids', 400)
  const deadline = new Date(body.deadline)
  if (!Number.isFinite(deadline.getTime()) || deadline.getTime() <= Date.now()) throw fault('A future deadline is required', 400)
  return { source_project_id: doc.project_id, prompt_original: doc.data.prompt_original, locked_spec: structuredClone(doc.data.spec), design: structuredClone(doc.data.design), pack: doc.data.pack, student_ids: body.student_ids, deadline, consent: { teacher: body.consent?.teacher === true, school: body.consent?.school === true } }
}
export function studentDossier(id, classroom, student) {
  if (!classroom.student_ids.includes(student.supabase_id)) throw fault('This classroom is not assigned to your account', 403)
  if (new Date(classroom.deadline).getTime() <= Date.now()) throw fault('Classroom deadline has passed', 423)
  if (student.under18 === true && classroom.consent?.teacher !== true && classroom.consent?.school !== true) throw fault('Teacher or school consent is required before storing student project data', 403)
  const d = initializePhase3(newDossier(id, classroom.prompt_original, classroom.pack))
  d.spec = structuredClone(classroom.locked_spec); d.design = structuredClone(classroom.design); d.state = 'wait_for_user'
  d.classroom = { id: String(classroom._id), teacher_id: classroom.teacher_id, deadline: new Date(classroom.deadline).toISOString(), locked_spec_line_ids: Object.values(d.spec).flat().map(l => l.id), consent: structuredClone(classroom.consent), under18: student.under18 === true }
  d.training_opt_in = false
  event(d, 'Conductor', { kind: 'classroom_assigned' })
  return d
}
export function readmeFromSpec(d) {
  const sections = [['will_build', 'Build goals'], ['must_never', 'Constraints'], ['acceptance', 'Acceptance']]
  return `# Generated Codeva project\n\n${d.prompt_original}\n\n${sections.map(([key, title]) => `## ${title}\n\n${d.spec[key].filter(l => l.status !== 'rejected').map(l => `- [${l.id}] ${l.final_text}`).join('\n')}`).join('\n\n')}\n\n## Run\n\nRequires Python 3.12.8. From this directory run:\n\n\`\`\`sh\npython run.py\n\`\`\`\n\nOpen http://127.0.0.1:8000. Only loopback preview routes are supported. Demo fixture users are sample-a and sample-b. The development preview supplies the demo login instructions.\n`
}
