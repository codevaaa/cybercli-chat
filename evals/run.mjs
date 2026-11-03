import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { newDossier, installSpec, reviewLine, ready, transition, digest, judgeInput, validateVerdicts } from '../backend/src/services/dossier/domain.js'
import { extractMaterial, materialAnswer } from '../backend/src/services/dossier/materials.js'
import { replayEvents } from '../backend/src/services/dossier/tools.js'

const mode = process.argv.find(a => a.startsWith('--mode='))?.slice(7) || 'fixture'
const directory = process.argv.find(a => a.startsWith('--directory='))?.slice(12) || fileURLToPath(new URL('./frozen/', import.meta.url))
if (!['fixture', 'live'].includes(mode)) throw new Error('Choose fixture or live mode')
if (mode === 'fixture') globalThis.fetch = async () => { throw new Error('Fixture mode forbids network requests') }
const files = (await fs.readdir(directory)).filter(f => f.endsWith('.json')).sort()
if (files.length !== 50) throw new Error('Frozen suite must contain exactly 50 prompt records')

async function fixture(row) {
  const d = newDossier('507f1f77bcf86cd799439011', row.prompt, row.pack)
  installSpec(d, row.spec); transition(d, 'spec'); transition(d, 'wait_for_user')
  const check = {}
  check.original = JSON.parse(JSON.stringify(d)).prompt_original === row.prompt && d.prompt_sha256 === digest(row.prompt)
  try { ready(d); check.pending_blocked = false } catch { check.pending_blocked = true }
  for (const line of Object.values(d.spec).flat()) reviewLine(d, line.id, 'accepted')
  try { ready(d); check.can_build = true } catch { check.can_build = false }
  check.builder_hidden = !JSON.stringify(judgeInput({ ...d, tasks: [{ output: 'PRIVATE_BUILDER_REPORT' }] }, {})).includes('PRIVATE_BUILDER_REPORT')
  check.missing_judge_blocks = !validateVerdicts(d, [{ provider: 'fixture', model: 'judge', lines: [] }, { provider: 'fixture', model: 'cheap', lines: [] }])
  check.missing_replay_fails = replayEvents([{ seq: 1, kind: 'tool_start', tool_call_id: 'fixture-call', tool: 'test' }]).status === 'failed'
  if (row.material) {
    d.materials = [await extractMaterial({ kind: 'notes', name: 'Frozen commerce notes', text: row.material.text })]
    const answer = materialAnswer(d, row.material.question)
    check.material_supported = answer.supported
    check.citation = answer.citations.length > 0 && answer.answer === answer.citations.map(c => c.quote).join('\n\n')
  }
  return check
}
async function live(row) {
  const base = process.env.CODEVA_EVAL_API_URL, token = process.env.CODEVA_EVAL_ACCESS_TOKEN
  if (!base || !token) throw new Error('Live mode requires existing test API URL and account access token')
  const url = new URL(base)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Use the existing HTTPS or loopback Codeva API')
  const call = async (route, method = 'GET', body) => {
    const response = await fetch(base.replace(/\/$/, '') + '/studio' + route, { method, redirect: 'error', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
    const value = await response.json(); if (!response.ok) throw new Error(value.error || 'Live API failed'); return value
  }
  const created = await call('/projects', 'POST', { name: `Frozen eval ${row.id}`, prompt: row.prompt, pack: row.pack })
  const id = created.project_id; let doc = created
  for (let attempt = 0; attempt < 120; attempt++) {
    doc = await call(`/projects/${id}/dossier`)
    if (['wait_for_user', 'blocked'].includes(doc.dossier.state)) break
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  const d = doc.dossier, check = { original: d.prompt_original === row.prompt && d.prompt_sha256 === digest(row.prompt), pending_blocked: Object.values(d.spec).flat().some(l => l.status === 'pending'), builder_hidden: !JSON.stringify(judgeInput(d, {})).includes('PRIVATE_BUILDER_REPORT'), missing_judge_blocks: !validateVerdicts(d, []), missing_replay_fails: replayEvents([{ kind: 'tool_start', tool_call_id: 'missing' }]).status === 'failed' }
  if (d.state !== 'wait_for_user') throw new Error('Live conductor did not reach user review')
  for (const line of Object.values(d.spec).flat()) await call(`/projects/${id}/spec/${line.id}`, 'PATCH', { status: 'accepted' })
  doc = await call(`/projects/${id}/dossier`)
  try { ready(doc.dossier); check.can_build = true } catch { check.can_build = false }
  if (row.material) {
    await call(`/projects/${id}/materials`, 'POST', { kind: 'notes', name: 'Eval notes', text: row.material.text })
    const answer = await call(`/projects/${id}/material-question`, 'POST', { question: row.material.question })
    check.material_supported = answer.supported; check.citation = answer.citations.length > 0 && answer.answer === answer.citations.map(c => c.quote).join('\n\n')
  }
  return check
}
let passes = 0
for (const name of files) {
  const row = JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'))
  try {
    const actual = await (mode === 'fixture' ? fixture(row) : live(row))
    const failures = Object.entries(row.expected).filter(([key, value]) => actual[key] !== value)
    if (failures.length) throw new Error(failures.map(([key]) => key).join(', '))
    passes++; console.log(`PASS ${row.id}`)
  } catch (error) { console.log(`FAIL ${row.id}: ${error.message.replace(/[^\w .,:_-]/g, '').slice(0, 200)}`) }
}
console.log(`Pass rate: ${passes}/${files.length} (${(100 * passes / files.length).toFixed(1)}%) — ${mode} mode`)
process.exitCode = passes === files.length ? 0 : 1
